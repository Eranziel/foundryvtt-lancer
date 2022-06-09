import { EntryType, License, LicensedItem, LiveEntryTypes, OpCtx, Pilot, RegEntry } from "machine-mind";
import { is_actor_type, LancerActor, LancerActorType } from "../actor/lancer-actor";
import { PACK_SCOPE } from "../compBuilder";
import { friendly_entrytype_name } from "../config";
import type { LancerItem, LancerItemType } from "../item/lancer-item";
import { FetcherCache } from "./async";


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
    // Only pilots should have licenses, so for mechs we go to active pilot
    let pilot: LancerActor<EntryType.PILOT> | null = null;
    if (in_actor.is_mech()) {
      pilot = in_actor.data.data.pilot;
    }

    // Check pilot inventory, in case they have a weird custom license
    if (pilot) {
      let found = pilot.data.data.licenses.find(lic => lic.key == license_name);
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
// Items are not returned in order
export async function insinuate<T extends LancerItemType>(items: Array<LancerItem<T>>, to: LancerActor): Promise<Array<LancerItem<T>>> {
  console.warn("TODO: Re-implement insinuate, more sanely this time");
  let old_items = [];
  let new_items = [];
  for(let item of items) {
    if(item.parent == to) {
      old_items.push(item);
    } else {
      new_items.push(item.toObject());
    }
  }
  // Await and recombine
  // @ts-ignore
  let actual_new_items = await to.createEmbeddedDocuments("Item", new_items);
  return [...old_items, ...new_items];
}

// 

type DataTypeMap = { [key in EntryType]: object };

// Maps EntryType to appropriate document actor/item
interface LancerDocMap extends DataTypeMap {
  // [EntryType.CONDITION]: IStatusData;
  [EntryType.CORE_BONUS]: LancerItem<EntryType.CORE_BONUS>;
  [EntryType.DEPLOYABLE]: LancerActor<EntryType.DEPLOYABLE>;
  [EntryType.ENVIRONMENT]: LancerItem<EntryType.ENVIRONMENT>;
  [EntryType.FACTION]: LancerItem<EntryType.FACTION>;
  [EntryType.FRAME]: LancerItem<EntryType.FRAME>;
  [EntryType.LICENSE]: LancerItem<EntryType.LICENSE>;
  [EntryType.MANUFACTURER]: LancerItem<EntryType.MANUFACTURER>;
  [EntryType.MECH]: LancerActor<EntryType.MECH>;
  [EntryType.MECH_SYSTEM]: LancerItem<EntryType.MECH_SYSTEM>;
  [EntryType.MECH_WEAPON]: LancerItem<EntryType.MECH_WEAPON>;
  [EntryType.NPC]: LancerActor<EntryType.NPC>;
  [EntryType.NPC_CLASS]: LancerItem<EntryType.NPC_CLASS>;
  [EntryType.NPC_FEATURE]: LancerItem<EntryType.NPC_FEATURE>;
  [EntryType.NPC_TEMPLATE]: LancerItem<EntryType.NPC_TEMPLATE>;
  [EntryType.ORGANIZATION]: LancerItem<EntryType.ORGANIZATION>;
  [EntryType.PILOT_ARMOR]: LancerItem<EntryType.PILOT_ARMOR>;
  [EntryType.PILOT_GEAR]: LancerItem<EntryType.PILOT_GEAR>;
  [EntryType.PILOT_WEAPON]: LancerItem<EntryType.PILOT_WEAPON>;
  [EntryType.PILOT]: LancerActor<EntryType.PILOT>;
  [EntryType.RESERVE]: LancerItem<EntryType.RESERVE>;
  [EntryType.SITREP]: LancerItem<EntryType.SITREP>;
  [EntryType.SKILL]: LancerItem<EntryType.SKILL>;
  [EntryType.STATUS]: LancerItem<EntryType.STATUS>;
  [EntryType.TAG]: LancerItem<EntryType.TAG>;
  [EntryType.TALENT]: LancerItem<EntryType.TALENT>;
  [EntryType.QUIRK]: LancerItem<EntryType.QUIRK>;
  [EntryType.WEAPON_MOD]: LancerItem<EntryType.WEAPON_MOD>;
}
export type LancerDoc<T extends EntryType = EntryType> = T extends keyof LancerDocMap
  ? LancerDocMap[T]
  : never;

