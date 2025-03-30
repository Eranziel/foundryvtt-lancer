import { LancerActor, LancerDEPLOYABLE } from "../actor/lancer-actor";

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

// Converts things like "LEAVIATHAN HEAVY ASSAULT CANNON" into "leaviathan_heavy_assault_cannon"
export function slugify(name: string, dash: string = "_"): string {
  return name
    .trim()
    .replace(/[:\\\/-\s]+/g, dash)
    .toLowerCase();
}

export function randomString(length: number): string {
  let result = "";
  const characters = "abcdefghijklmnopqrstuvwxyz0123456789";

  // Loop to generate characters for the specified length
  for (let i = 0; i < length; i++) {
    const randomInd = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomInd);
  }
  return result;
}
