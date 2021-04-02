import { EntryType, License, LiveEntryTypes, OpCtx, Pilot, Registry, RegRef } from "machine-mind";
import type { LancerActor, LancerActorType, LancerMech, LancerPilot } from "../actor/lancer-actor";
import type { LancerItem, LancerItemType } from "../item/lancer-item";
import { FetcherCache } from "./db_abstractions";
import { FoundryReg } from "./foundry-reg";

// Provides an environment for interacting with a provided item.
// The registry is whatever registry is most sensibly "local" for the given item. If the item is from a compendium, the reg will be compendium local.
// If the item is from an actor, then the registry will be for that actor
// Otherwise (item is global / item is an actor), we do standard global space
export interface MMEntityContext<T extends EntryType> {
  reg: Registry;
  ctx: OpCtx; // Could just fetch from item but this cleaner
  ent: LiveEntryTypes<T>;
}

export async function mm_wrap_item<T extends EntryType & LancerItemType>(
  item: LancerItem<T>,
  use_existing_ctx?: OpCtx
): Promise<MMEntityContext<T>> {
  // Figure out what our context ought to be
  let is_compendium = item.compendium != null; // If compendium is set, we use that
  let actor: LancerActor<any> | null = item.options.actor ?? null; // If actor option is set, we use that
  let token: Token | null = actor?.token ?? null;

  // Get our reg. Actor arg doesn't really matter - we default to world
  let reg: FoundryReg;
  if (is_compendium) {
    // Is top level compendium item
    reg = new FoundryReg({
      actor_source: "compendium",
      item_source: ["compendium", null],
    });
  } else if (token) {
    // Is a token owned item
    reg = new FoundryReg({
      actor_source: "token", // Makes sense to provide tokens I guess? Doesn't seem incredibly relevant
      item_source: ["token", token],
    });
  } else if (actor) {
    // Is an actor owned item
    reg = new FoundryReg({
      actor_source: "world",
      item_source: ["actor", actor],
    });
  } else {
    // Is a world item
    reg = new FoundryReg({
      actor_source: "world",
      item_source: ["world", null],
    });
  }
  let ctx = use_existing_ctx || new OpCtx();

  // Load up the item. This _should_ always work
  let ent = (await reg.get_cat(item.type).get_live(ctx, item._id)) as LiveEntryTypes<T>;
  if (!ent) {
    console.error(is_compendium, token, actor, "world?", item, reg);
    throw new Error("Something went wrong while trying to contextualize an item...");
  }

  return {
    ctx,
    reg,
    ent: ent,
  };
}

export async function mm_wrap_actor<T extends EntryType & LancerActorType>(
  actor: LancerActor<T>,
  use_existing_ctx?: OpCtx
): Promise<MMEntityContext<T>> {
  // Get our reg
  let reg: FoundryReg;
  let id: string;
  if (actor.isToken) {
    reg = new FoundryReg({
      actor_source: "token",
      item_source: ["token", actor.token],
    });
    id = actor.token.id;
  } else if (actor.compendium) {
    reg = new FoundryReg({
      actor_source: "compendium",
      item_source: ["actor", actor],
    });
    id = actor.id;
  } else {
    reg = new FoundryReg({
      actor_source: "world",
      item_source: ["actor", actor],
    });
    id = actor.id;
  }
  let ctx = use_existing_ctx || new OpCtx();

  // Load up the item. This _should_ always work barring exceptional race conditions (like, deleting the actor while opening the sheet)
  let ent = (await reg.get_cat(actor.data.type).get_live(ctx, id)) as LiveEntryTypes<T>;
  if (!ent) {
    throw new Error("Something went wrong while trying to contextualize an actor...");
  }

  return {
    ctx,
    reg,
    ent: ent,
  };
}

// Define a helper to check if a license includes the specified item. Checks by mmid. Maybe change that in the future?
// export function license_has(license: License, item: LiveEntryTypes<LancerItemType>) {
// return license.FlatUnlocks.some(unlockable => unlockable.ID == (item as any).ID);
// }

// Helper for finding what license an item comes from. Checks by name, an inelegant solution but probably good enough
export async function find_license_for(
  mmec: MMEntityContext<LancerItemType>,
  in_actor?: LancerMech | LancerPilot
): Promise<RegRef<EntryType.LICENSE> | null> {
  // If the item does not have a license name, then we just bail
  let license_name = (mmec.ent as any).License;
  if (!license_name) {
    return null;
  }

  // If an actor was supplied, we first check their inventory.
  if (in_actor) {
    let actor_mmec = await in_actor.data.data.derived.mmec_promise;

    // Only pilots should have licenses
    let pilot: Pilot | null = null;
    if (actor_mmec.ent.Type == EntryType.MECH) {
      pilot = actor_mmec.ent.Pilot;
    }

    // Check pilot inventory, in case they have a weird custom license
    if (pilot) {
      let found = pilot.Licenses.find(lic => lic.Name == license_name);
      if (found) {
        return found.as_ref();
      }
    }
  }

  // Actor was a bust. Try global
  return world_and_comp_license_cache.fetch(license_name);
}

// The cache to implement the above. Doesn't need to last long - this just happens in bursts
// Just keeps track of license refs by name
const world_and_comp_license_cache = new FetcherCache<string, RegRef<EntryType.LICENSE> | null>(
  10_000,
  async license_name => {
    let world_reg = new FoundryReg({ item_source: ["world", null], actor_source: "world" }); // Actor src doesn't matter at all
    let world_licenses = await world_reg.get_cat(EntryType.LICENSE).raw_map();
    for (let [id, lic] of world_licenses.entries()) {
      if (lic.name == license_name) {
        return {
          id,
          reg_name: world_reg.name(),
          fallback_mmid: "",
          type: EntryType.LICENSE,
        };
      }
    }

    // Ok. Try compendium. This is most likely to be where it is, but best to try others
    let compendium_reg = new FoundryReg({
      item_source: ["compendium", null],
      actor_source: "world",
    }); // Actor src doesn't matter at all
    let compendium_licenses = await compendium_reg.get_cat(EntryType.LICENSE).raw_map();
    for (let [id, lic] of compendium_licenses.entries()) {
      if (lic.name == license_name) {
        return {
          id,
          reg_name: compendium_reg.name(),
          fallback_mmid: "",
          type: EntryType.LICENSE,
        };
      }
    }

    // Oh well!
    console.log(`Did not find ${license_name} in world/compendium`);
    return null;
  }
);
