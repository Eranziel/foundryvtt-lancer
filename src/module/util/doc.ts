import {
  is_actor_type,
  LancerActor,
  LancerActorType,
  LancerDEPLOYABLE,
  LancerMECH,
  LancerNPC,
  LancerPILOT,
} from "../actor/lancer-actor";
import { PACK_SCOPE } from "../comp-builder";
import { friendly_entrytype_name } from "../config";
import { EntryType } from "../enums";
import type {
  LancerCORE_BONUS,
  LancerFRAME,
  LancerItem,
  LancerItemType,
  LancerLICENSE,
  LancerMECH_SYSTEM,
  LancerMECH_WEAPON,
  LancerNPC_CLASS,
  LancerNPC_FEATURE,
  LancerNPC_TEMPLATE,
  LancerORGANIZATION,
  LancerPILOT_ARMOR,
  LancerPILOT_GEAR,
  LancerPILOT_WEAPON,
  LancerRESERVE,
  LancerSKILL,
  LancerSTATUS,
  LancerTALENT,
  LancerWEAPON_MOD,
} from "../item/lancer-item";
import { SystemTemplates } from "../system-template";
import { FetcherCache } from "./async";
import { lookupDeployables, lookupLID, lookupOwnedDeployables } from "./lid";
import { requestImport } from "./requests";

// Sort items. Moves moverand to dest, either before or after depending on third arg
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

// Define a helper to check if a license includes the specified item. Checks by lid. Maybe change that in the future?
// export function license_has(license: License, item: LiveEntryTypes<LancerItemType>) {
// return license.FlatUnlocks.some(unlockable => unlockable.LID == (item as any).LID);
// }

// Helper for finding what license an item comes from. Checks by name, an inelegant solution but probably good enough
export async function find_license_for(item: LancerItem, in_actor?: LancerActor): Promise<LancerLICENSE | null> {
  // If the item does not have a license name, then we just bail
  let license_name = ((item as any).system as SystemTemplates.licensed).license;
  if (!license_name) {
    return null;
  }

  // If an actor was supplied, we first check their inventory.
  if (in_actor) {
    // Only pilots should have licenses, so for mechs we go to active pilot
    let pilot: LancerPILOT | null = null;
    if (in_actor.is_mech() && in_actor.system.pilot?.status == "resolved") {
      pilot = in_actor.system.pilot.value;
    }

    // Check pilot inventory, in case they have a weird custom license
    if (pilot) {
      let found = pilot.items
        .filter(i => i.is_license())
        .find(lic => (lic as LancerLICENSE).system.lid == license_name);
      if (found) {
        return found as LancerLICENSE;
      }
    }
  }

  // Actor was a bust. Try global
  return world_and_comp_license_cache.fetch(license_name);
}

// The cache to implement the above. Doesn't need to last long - this just happens in bursts
// Just keeps track of license refs by name
const world_and_comp_license_cache = new FetcherCache<string, LancerLICENSE | null>(async license_name => {
  // TODO
  /*
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
  */
  return null;
});

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

// Copy an item to an actor, also copying any necessary subitems
// (or at least, clearing links to them).
// Has no effect if destination is same as existing parent
// Items are not returned in order - returned items include additional integrated items that were imported as part of this
export async function insinuate(items: Array<LancerItem>, to: LancerActor): Promise<Array<LancerItem>> {
  let oldItems = [];
  let newItems = [];
  for (let item of items) {
    if (item.parent == to) {
      oldItems.push(item);
    } else {
      newItems.push(item.toObject());

      // Also get integrated!
      let integrated: string[] = [];
      if (item.is_frame()) {
        integrated = item.system.core_system.integrated;
      } else if (item.is_mech_system() || item.is_mech_weapon()) {
        integrated = item.system.integrated;
      }
      for (let i of integrated) {
        let found = await lookupLID(i);
        if (found) {
          newItems.push(found.toObject());
        }
      }
    }
  }

  // Await and recombine
  // @ts-expect-error
  let actualNewItems: LancerItem[] = await to.createEmbeddedDocuments("Item", newItems);

  // Prompt for deployables if they don't yet exist
  for (let item of actualNewItems) {
    await importDeployablesFor(item, to);
  }

  // Post-process
  return [...oldItems, ...actualNewItems];
}

/** Given an item, requests the import of all deployables referenced on that item, to be owned by the provided actor
 *
 * @param item The item to search for deployables
 * @param owner Who to associate the deployables with
 */
export async function importDeployablesFor(item: LancerItem, owner: LancerActor) {
  // Deployables owned by pilot, not mech
  if (owner.is_mech() && owner.system.pilot?.status == "resolved") owner = owner.system.pilot.value;

  let existing = lookupOwnedDeployables(owner);
  let existingLIDs = existing.map(d => d.system.lid);
  let deps: string[] = [];
  deps.push(...((item as any).system.deployables ?? []));
  if (item.is_frame()) {
    deps.push(...item.system.core_system.deployables);
  }
  let requiredLIDs = [];
  for (let d of deps) {
    if (!existingLIDs.includes(d)) {
      // We need to keep it! It's new
      requiredLIDs.push(d);
    }
  }

  if (!requiredLIDs.length) return;

  // Now find them
  let imports = await lookupDeployables(requiredLIDs);

  // And try to bring them in
  for (let i of imports) {
    if (i instanceof LancerActor) await requestImport(i, owner);
  }
}

type DataTypeMap = { [key in EntryType]: object };

// Maps EntryType to appropriate document actor/item
interface LancerDocMap extends DataTypeMap {
  // [EntryType.CONDITION]: IStatusData;
  [EntryType.CORE_BONUS]: LancerCORE_BONUS;
  [EntryType.DEPLOYABLE]: LancerDEPLOYABLE;
  [EntryType.FRAME]: LancerFRAME;
  [EntryType.LICENSE]: LancerLICENSE;
  [EntryType.MECH]: LancerMECH;
  [EntryType.MECH_SYSTEM]: LancerMECH_SYSTEM;
  [EntryType.MECH_WEAPON]: LancerMECH_WEAPON;
  [EntryType.NPC]: LancerNPC;
  [EntryType.NPC_CLASS]: LancerNPC_CLASS;
  [EntryType.NPC_FEATURE]: LancerNPC_FEATURE;
  [EntryType.NPC_TEMPLATE]: LancerNPC_TEMPLATE;
  [EntryType.ORGANIZATION]: LancerORGANIZATION;
  [EntryType.PILOT_ARMOR]: LancerPILOT_ARMOR;
  [EntryType.PILOT_GEAR]: LancerPILOT_GEAR;
  [EntryType.PILOT_WEAPON]: LancerPILOT_WEAPON;
  [EntryType.PILOT]: LancerPILOT;
  [EntryType.RESERVE]: LancerRESERVE;
  [EntryType.SKILL]: LancerSKILL;
  [EntryType.STATUS]: LancerSTATUS;
  [EntryType.TALENT]: LancerTALENT;
  [EntryType.WEAPON_MOD]: LancerWEAPON_MOD;
}
export type LancerDoc<T extends EntryType = EntryType> = T extends keyof LancerDocMap ? LancerDocMap[T] : never;
