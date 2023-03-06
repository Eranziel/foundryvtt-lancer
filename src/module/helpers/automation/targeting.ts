import type { LancerActor } from "../../actor/lancer-actor.js";
import type { SystemTemplates } from "../../system-template.js";

export function getTargets(): LancerActor[] {
  const targets = game.user!.targets;
  const ret: LancerActor[] = [];
  targets.forEach(token => {
    ret.push(token.actor!);
  });

  return ret;
}

export async function checkForHit(tech: boolean, roll: Roll, target: LancerActor): Promise<boolean> {
  let sysData = (target as any).system as SystemTemplates.actor_universal;
  let def: number = tech ? sysData.edef || 8 : sysData.evasion || 5;

  return (roll.total ?? 0) >= def;
}

// Quickly computes the distance between two tokens as a number of grid units
// TODO: Make it size aware, using the token.document.system.size if it exists? Prefer htss size
export function gridDist(token1: Token, token2: Token) {
  let c1 = token1.center;
  let c2 = token2.center;
  let ray = new Ray(c1, c2);
  return canvas?.grid?.grid?.measureDistances([{ ray }], { gridSpaces: true })[0];
}
