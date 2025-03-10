import { LANCER } from "../config";
import { LancerActor, LancerDEPLOYABLE } from "../actor/lancer-actor";
import { LancerItem } from "../item/lancer-item";
import { EntryType } from "../enums";
import { get_pack_id } from "./doc";

const { log_prefix: lp } = LANCER;

export async function lookupLIDPlural(
  lid: string,
  types?: EntryType | EntryType[]
): Promise<Array<LancerActor | LancerItem>> {
  if (!types) types = [];
  if (!Array.isArray(types)) types = [types];
  const results: Promise<LancerActor | LancerItem>[] = [];
  for (const t of types) {
    const pack = await game.packs.get(get_pack_id(t));
    if (!pack) {
      console.error(`${lp} Pack not found: ${pack}`);
      continue;
    }
    await pack.getIndex();
    const entries = await pack.index.filter((e: any) => e.system?.lid === lid);
    if (!entries.length) continue;
    results.push(...entries.map(e => pack.getDocument(e._id) as Promise<LancerActor | LancerItem>));
  }
  return Promise.all(results);
}

// As lookupLIDPlural, but just takes first result
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
export function lookupOwnedDeployables(owner: LancerActor, filter?: string[]): Record<string, LancerDEPLOYABLE> {
  if (owner.is_deployable()) return {};
  if (owner.isToken) return {}; // This might be possible if we could recover the original actor somehow?
  let foundDeployables = game.actors!.filter(a => !!(a.is_deployable() && a.system.owner?.value == owner));
  let result: Record<string, LancerDEPLOYABLE> = {};
  for (let dep of foundDeployables as unknown as LancerDEPLOYABLE[]) {
    if (!filter || filter.includes(dep.system.lid)) {
      result[dep.system.lid] = dep;
    }
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
