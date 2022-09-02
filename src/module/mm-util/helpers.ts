import { EntryType, License, LicensedItem, LiveEntryTypes, OpCtx, Pilot, RegEntry } from "machine-mind";
import { is_actor_type, LancerActor, LancerActorType } from "../actor/lancer-actor";
import { PACK_SCOPE } from "../compBuilder";
import { friendly_entrytype_name } from "../config";
import type { AnyMMItem, LancerItem, LancerItemType } from "../item/lancer-item";
import { FetcherCache } from "../util/async";
import { FoundryFlagData, FoundryReg } from "./foundry-reg";

export async function mm_wrap_item<T extends LancerItemType>(
  item: LancerItem,
  use_existing_ctx: OpCtx
): Promise<LiveEntryTypes<T>> {
  // Get the reg that'd hold this item
  let reg: FoundryReg;

  if (item.parent != null) {
    // We are an owned item
    if (item.pack != null) {
      // A compendium actor owned item
      reg = new FoundryReg({
        src: "comp_actor",
        comp_id: item.pack,
        actor_id: item.actor!.id!,
      });
    } else if (item.parent.isToken) {
      // A token actor owned item
      reg = new FoundryReg({
        src: "scene_token",
        scene_id: item.actor!.token!.parent!.id!,
        token_id: item.actor!.token!.id!,
      });
    } else {
      // A world actor owned item
      reg = new FoundryReg({
        src: "game_actor",
        actor_id: item.actor!.id!,
      });
    }
  } else {
    // We are an unowned item
    if (item.pack != null) {
      // An unowned compendium item
      if (is_core_pack_name(item.pack)) {
        // An unowned core compendium item
        reg = new FoundryReg({
          src: "comp_core",
        });
      } else {
        // An unowned custom compendium item
        reg = new FoundryReg({
          src: "comp",
          comp_id: item.pack,
        });
      }
    } else {
      // An unowned game item
      reg = new FoundryReg({
        src: "game",
      });
    }
  }

  let ctx = use_existing_ctx || new OpCtx();

  // Load up the item. This _should_ always work
  // let entry = (await reg.get_cat(item.type).get_live(ctx, item.id)) as LiveEntryTypes<T>;
  let cat = reg.get_cat(item.type);
  let entry = (await cat.dangerous_wrap_doc(ctx, item)) as LiveEntryTypes<T>;
  if (!entry) {
    throw new Error("Something went wrong while trying to contextualize an item...");
  }
  return entry;
}

export async function mm_wrap_actor<T extends EntryType & LancerActorType>(
  actor: LancerActor,
  use_existing_ctx: OpCtx
): Promise<LiveEntryTypes<T>> {
  // Get our reg. Thankfully simpler than mm_wrap_item since we don't really need to worry as much about parent
  let reg: FoundryReg;
  if (actor.isToken) {
    // Is a token actor. Note that we aren't trying to get its inventory, so we leave it at the scene scope, not scene_token
    reg = new FoundryReg({
      src: "scene",
      scene_id: actor.token!.parent!.id!,
    });
  } else if (actor.pack) {
    // Is a compendium actor. Note that we aren't trying to get its inventory, so we leave it at the compendium scope
    if (is_core_pack_name(actor.pack)) {
      // Is core
      reg = new FoundryReg({
        src: "comp_core",
      });
    } else {
      // Is non-core
      reg = new FoundryReg({
        src: "comp",
        comp_id: actor.pack,
      });
    }
  } else {
    // Is a game actor. Note that we aren't trying to get its inventory, so we leave it at game scope
    reg = new FoundryReg({
      src: "game",
    });
  }
  let ctx = use_existing_ctx || new OpCtx();

  // let entry = (await reg.get_cat(actor.data.type).get_live(ctx, id)) as LiveEntryTypes<T>;
  let cat = reg.get_cat(actor.type);
  let entry = (await cat.dangerous_wrap_doc(ctx, actor as any)) as LiveEntryTypes<T>;
  if (!entry) {
    throw new Error("Something went wrong while trying to contextualize an actor...");
  }

  return entry;
}

// Sort mm items. Moves moverand to dest, either before or after depending on third arg
export async function resort_item(moverand: LancerItem, dest: LancerItem, sort_before = true) {
  // Make sure owner is the same
  if (!dest.actor || !moverand.actor || dest.actor != moverand.actor) {
    console.warn("Cannot sort items from two separate actors / unowned items");
    return;
  }

  // Ok, now get siblings
  let siblings: LancerItem[] = dest.collection.contents;
  siblings = siblings.filter(s => s.id != moverand.id);

  // Now resort
  return moverand.sortRelative({ target: dest, siblings, sortBefore: sort_before });
}

// Same as above but takes mm
export async function mm_resort_item(moverand: AnyMMItem, dest: AnyMMItem, sort_before = true) {
  let m_doc = moverand.Flags.orig_doc;
  let d_doc = dest.Flags.orig_doc;

  if (!m_doc || !d_doc) {
    console.warn("Cannot sort items without flagged orig_docs");
    return;
  }

  return resort_item(m_doc, d_doc, sort_before);
}

// Define a helper to check if a license includes the specified item. Checks by lid. Maybe change that in the future?
// export function license_has(license: License, item: LiveEntryTypes<LancerItemType>) {
// return license.FlatUnlocks.some(unlockable => unlockable.LID == (item as any).LID);
// }

// Helper for finding what license an item comes from. Checks by name, an inelegant solution but probably good enough
export async function find_license_for(
  mm: LiveEntryTypes<LancerItemType>,
  in_actor?: LancerActor
): Promise<License | null> {
  // If the item does not have a license name, then we just bail
  let license_name = (mm as LicensedItem).License;
  if (!license_name) {
    return null;
  }

  // If an actor was supplied, we first check their inventory.
  if (in_actor) {
    // @ts-expect-error Should be fixed with v10 types
    let actor_mm = await in_actor.system.derived.mm_promise;

    // Only pilots should have licenses, so for mechs we go to active pilot
    let pilot: Pilot | null = null;
    if (actor_mm.Type == EntryType.MECH) {
      pilot = actor_mm.Pilot;
    }

    // Check pilot inventory, in case they have a weird custom license
    if (pilot) {
      let found = pilot.Licenses.find(lic => lic.LicenseKey == license_name);
      if (found) {
        return found;
      }
    }
  }

  // Actor was a bust. Try global
  return world_and_comp_license_cache.fetch(license_name);
}

// The cache to implement the above. Doesn't need to last long - this just happens in bursts
// Just keeps track of license refs by name
const world_and_comp_license_cache = new FetcherCache<string, License | null>(async license_name => {
  let ctx = new OpCtx();
  let world_reg = new FoundryReg("game"); // Actor src doesn't matter at all
  let world_license = await world_reg.get_cat(EntryType.LICENSE).lookup_live(ctx, { key: license_name });
  if (world_license.length) {
    return world_license[0];
  }

  // Ok. Try core compendium. This is most likely to be where it is, but best to try world first
  let compendium_reg = new FoundryReg("comp_core");
  let compendium_license = await compendium_reg.get_cat(EntryType.LICENSE).lookup_live(ctx, { key: license_name });
  if (compendium_license.length) {
    return compendium_license[0];
  }

  // Oh well!
  console.log(
    `Did not find ${license_name} in world/core compendium. Note that external compendiums are not (yet) scanned as part of this procedure`
  );
  return null;
}, 60_000);

// Get the owner of an item, or null if none exists
export function mm_owner<T extends LancerItemType>(item: RegEntry<T>): LancerActor | null {
  let flags = item.Flags as FoundryFlagData<T>;
  let owner = (flags.orig_doc as LancerItem).actor;
  if (owner) {
    return owner as LancerActor;
  } else {
    return null;
  }
}

// Returns true if this is one of the packs thats controlled by get_pack
export function is_core_pack_name(name: string): boolean {
  // Cut off leading stuff before .
  let imp = name.substr(name.indexOf(".") + 1);

  // Is it an entry type?
  for (let e of Object.values(EntryType)) {
    if (e == imp) {
      return true;
    }
  }
  return false;
}

// Lists all packs of specified type that aren't in the core pack. We cache this. Can clear cache by setting v to null
const cached_alt_packs = {
  Item: null as any,
  Actor: null as any,
};

export function get_secondary_packs(doc_type: "Actor" | "Item"): any[] {
  if (cached_alt_packs[doc_type] == null) {
    // Get all packs of items
    let candidates = game.packs.contents.filter(p => p.documentName == doc_type).map(p => p.collection) as string[];

    // Remove all that are just a core pack, and store
    cached_alt_packs[doc_type] = candidates.filter(name => !is_core_pack_name(name));
  }
  return cached_alt_packs[doc_type];
}

// Get a pack id
export function get_pack_id(type: EntryType): string {
  return `${PACK_SCOPE}.${type}`;
}

// Retrieve a pack, or create it as necessary
// async to handle the latter case
export async function get_pack(
  type: LancerItemType | LancerActorType
): Promise<CompendiumCollection<CompendiumCollection.Metadata>> {
  // Find existing world compendium
  let pack = game.packs.get(get_pack_id(type));
  if (pack) {
    return pack;
  } else {
    // Compendium doesn't exist yet. Create a new one.
    // Create our metadata
    const entity_type = is_actor_type(type) ? "Actor" : "Item";
    const metadata: CompendiumCollection.Metadata = {
      name: type,
      //@ts-ignore - entity property deprecated, v9 uses type instead.
      type: entity_type,
      label: friendly_entrytype_name(type),
      system: "lancer",
      package: "world",
      path: `./packs/${type}.db`,
      private: false,
    };

    return CompendiumCollection.createCompendium(metadata);
  }
}
