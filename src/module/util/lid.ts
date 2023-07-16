import { LancerActor, LancerDEPLOYABLE } from "../actor/lancer-actor";
import { FetcherCache, PENDING, RepentantFetcherCache } from "./async";
import { LancerItem } from "../item/lancer-item";
import { EntryType } from "../enums";

// Converts the index into a map of LID -> index entry
const indexFastCache = new FetcherCache<string, Map<string, any> | null>(async (pack: string) => {
  let index = await (game.packs.get(pack)?.getIndex() ?? null);
  if (index) {
    let map = new Map<string, any>();
    for (let i of index.contents as any[]) {
      if (i.system?.lid != null) {
        map.set(i.system.lid, i);
      } else {
        console.error("Index item without lid:", i);
      }
    }
    return map;
  }
  return null;
}, 5000); // Only keep this once per second. It can't really miss, so best to

/**
 * Lookup all documents with the associated lid in the given types.
 * Document types are checked in order. If no type(s) supplied, all are queried.
 */
const lookupLIDPluralCache = new RepentantFetcherCache<string, Array<LancerActor | LancerItem>>(
  async (lid_and_types, retrying) => {
    let [lid, raw_types] = lid_and_types.split("|");
    let types = raw_types.split("/") as EntryType[];

    // If no types, all types
    if (types.length == 0) {
      types = Object.values(EntryType);
    }

    let result: Array<LancerActor | LancerItem> = [];
    // Dig through compendium
    for (let t of types) {
      let pack_name = `world.${t}`;
      let pack = game.packs.get(pack_name);
      if (!pack) {
        console.error(`Pack not found: ${pack_name}`);
        continue;
      }
      if (retrying) indexFastCache.flush(pack_name); // Better safe than sorry
      let index = await indexFastCache.fetch(pack_name);
      let id = index?.get(lid)?._id;
      let doc = id ? ((await pack.getDocument(id)) as LancerActor | LancerItem) : null;
      if (doc) {
        result.push(doc);
      }
    }

    // Also dig through world items
    for (let item of game.items!.contents as LancerItem[]) {
      // @ts-expect-error
      if (item.system.lid == lid && raw_types.includes(item.type)) {
        result.push(item);
      }
    }

    if (result.length == 0) {
      ui.notifications?.error(`Error looking up LID '${lid}'. Ensure you have all required LCPs for this actor.`);
    }

    return result;
  },
  x => !!x,
  999_999_000 // Since we are repentant, keep for a while
);

export async function lookupLIDPlural(
  lid: string,
  types?: EntryType | EntryType[]
): Promise<Array<LancerActor | LancerItem>> {
  if (!types) types = [];
  if (!Array.isArray(types)) types = [types];
  return lookupLIDPluralCache.fetch(`${lid}|${types.join("/")}`);
}

// As compendium_lookup_lid, but just takes first result
export async function lookupLID(
  lid: string,
  types?: EntryType | EntryType[]
): Promise<LancerActor | LancerItem | null> {
  let res = await lookupLIDPlural(lid, types);
  if (res.length) {
    return res[0];
  } else {
    return null;
  }
}

// As compendium_lookup_lid, but sync.
export function lookupLIDPluralSync(lid: string, types?: EntryType | EntryType[]): Array<LancerActor | LancerItem> {
  if (!types) types = [];
  if (!Array.isArray(types)) types = [types];
  let result = lookupLIDPluralCache.sync_fetch(`${lid}|${types.join("/")}`);
  if (result != PENDING) return result;
  return [];
}

// As compendium_lookup_lid, but just takes first result
export function lookupLIDSync(lid: string, types?: EntryType | EntryType[]): LancerActor | LancerItem | null {
  let res = lookupLIDPluralSync(lid, types);
  if (res.length) {
    return res[0];
  } else {
    return null;
  }
}

// A simplified helper for the quite-common task of looking up deployables
export async function lookupDeployables(lids: string[]) {
  let foundDeployables = await Promise.all(lids.map(lid => lookupLID(lid, EntryType.DEPLOYABLE)));
  return foundDeployables.filter(x => x);
}

// Lookup deployables that have the provided actor set as their owner, keyed by lid
export function lookupOwnedDeployables(owner: LancerActor): Record<string, LancerDEPLOYABLE> {
  if (owner.is_deployable()) return {};
  if (owner.isToken) return {}; // This might be possible if we could recover the original actor somehow?
  if (owner.is_mech() && owner.system.pilot?.value) {
    owner = owner.system.pilot.value;
  } else if (owner.is_mech()) {
    return {};
  }
  let foundDeployables = game.actors!.filter(a => !!(a.is_deployable() && a.system.owner?.value == owner));
  let result: Record<string, LancerDEPLOYABLE> = {};
  for (let dep of foundDeployables as unknown as LancerDEPLOYABLE[]) {
    result[dep.system.lid] = dep;
  }
  return result;
}

// A simplified helper for the quite-common task of looking up integrated
export async function lookupIntegrated(lids: string[]) {
  let foundDeployables = await Promise.all(lids.map(lid => lookupLID(lid)));
  return foundDeployables.filter(x => x);
}

// Converts things like "LEAVIATHAN HEAVY ASSAULT CANNON" into "leaviathan_heavy_assault_cannon"
export function slugify(name: string, dash: string = "_"): string {
  return name
    .trim()
    .replace(/[:\\\/-\s]+/g, dash)
    .toLowerCase();
}
