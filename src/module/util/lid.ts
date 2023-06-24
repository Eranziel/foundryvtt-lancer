import { LancerActor, LancerDEPLOYABLE } from "../actor/lancer-actor";
import { FetcherCache } from "./async";
import { LancerItem } from "../item/lancer-item";
import { EntryType } from "../enums";

const CACHE_DURATION = 10_000;

// Cache compendium index lookups for 5 second
// Converts the index into a map of LID -> index entry
const indexFastCache = new FetcherCache<string, Map<string, any> | null>(async (pack: string) => {
  let index = await (game.packs.get(pack)?.getIndex() ?? null);
  if (index) {
    let map = new Map<string, any>();
    for (let i of index.contents as any[]) {
      if (i.system?.lid) {
        map.set(i.system.lid, i);
      } else {
        console.log("Item without lid:", i);
      }
    }
    return map;
  }
  return null;
}, CACHE_DURATION);

/**
 * Lookup all documents with the associated lid in the given types.
 * Document types are checked in order. If no type(s) supplied, all are queried.
 * short_circuit will make it stop with first valid result. Will still return all results of that category, but will not check further categories
 */
const lookupLIDPluralCache = new FetcherCache<string, Array<LancerActor | LancerItem>>(async lid_and_types => {
  let [lid, raw_types] = lid_and_types.split("|");
  let types = raw_types.split("/") as EntryType[];

  // Note: typeless lookup is (somewhat obviously) up to 20x more expensive than non. Doesn't really matter, though
  if (types.length == 0) {
    types = Object.values(EntryType);
  }

  let result: Array<LancerActor | LancerItem> = [];
  for (let t of types) {
    let pack_name = `world.${t}`;
    let pack = game.packs.get(pack_name)!;
    let index = await indexFastCache.fetch(pack_name);
    let id = index?.get(lid)?._id;
    let doc = id ? ((await pack.getDocument(id)) as LancerActor | LancerItem) : null;
    if (doc) {
      result.push(doc);
    }
  }

  if (result.length == 0) {
    ui.notifications?.error(`Error looking up LID '${lid}'. Ensure you have all required LCPs for this actor.`);
  }

  return result;
}, CACHE_DURATION);

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
