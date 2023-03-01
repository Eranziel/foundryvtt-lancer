import { LancerActor } from "../actor/lancer-actor";
import type { LancerDEPLOYABLE } from "../actor/lancer-actor";
import { FetcherCache } from "./async";
import { LancerItem } from "../item/lancer-item";
import { EntryType } from "../enums";

/**
 * Lookup all documents with the associated lid in the given types.
 * Document types are checked in order. If no type(s) supplied, all are queried.
 * short_circuit will make it stop with first valid result. Will still return all results of that category, but will not check further categories
 *
 * TODO: re-implement using bolts' lid performance imprvoements
 */
export async function lookupLIDPlural(
  lid: string,
  short_circuit: boolean = true,
  types?: EntryType | EntryType[]
): Promise<Array<LancerActor | LancerItem>> {
  // Note: typeless lookup is (somewhat obviously) up to 13x more expensive than non
  if (!types) {
    // TODO: Try to guess faster by using slug prefix. ex mw -> check mech weapons first
    types = Object.values(EntryType);
  } else if (!Array.isArray(types)) {
    types = [types];
  }

  let result: Array<LancerActor | LancerItem> = [];
  for (let t of types) {
    let pack = game.packs.get(`world.${t}`)!;
    let newDocs = await pack?.getDocuments({ "system.lid": lid });
    // @ts-expect-error v9
    result.push(...newDocs);
    if (short_circuit && result.length) break;
  }

  if (result.length == 0) {
    ui.notifications?.error(`Error looking up LID '${lid}'. Ensure you have all required LCPs for this actor.`);
  }

  return result;
}

// As compendium_lookup_lid, but just takes first result
export async function lookupLID(
  lid: string,
  types?: EntryType | EntryType[]
): Promise<LancerActor | LancerItem | null> {
  let res = await lookupLIDPlural(lid, true, types);
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
  // @ts-expect-error v10
  for (let dep of foundDeployables as LancerDEPLOYABLE[]) {
    result[dep.system.lid] = dep;
  }
  return result;
}

// A simplified helper for the quite-common task of looking up integrated
export async function lookupIntegrated(lids: string[]) {
  let foundDeployables = await Promise.all(lids.map(lid => lookupLID(lid)));
  return foundDeployables.filter(x => x);
}

// A fetcher cache for LIDs
export class LIDLookupCache extends FetcherCache<string, LancerActor | LancerItem | null> {
  constructor(timeout?: number) {
    super(key => lookupLID(key), timeout);
  }
}

// Converts things like "LEAVIATHAN HEAVY ASSAULT CANNON" into "leaviathan_heavy_assault_cannon"
export function slugify(name: string, dash: string = "_"): string {
  return name
    .trim()
    .replace(/[:\\\/-\s]+/g, dash)
    .toLowerCase();
}
