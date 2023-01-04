import type { LancerActor } from "../../actor/lancer-actor";

export function getTargets(): LancerActor[] {
  const targets = game.user!.targets;
  const ret: LancerActor[] = [];
  targets.forEach(token => {
    ret.push(token.actor!);
  });

  return ret;
}

export async function checkForHit(tech: boolean, roll: Roll, target: LancerActor): Promise<boolean> {
  // @ts-expect-error Should be fixed with v10 types
  let mm = await target.system.derived.mm_promise;
  let def: number = tech ? mm.EDefense || 8 : mm.Evasion || 5;

  return (roll.total ?? 0) >= def;
}

// Quickly computes the distance between two tokens as a number of grid units
// TODO: Make it size aware, using the token.document.mm.Size if it exists? Prefer htss size
export function gridDist(token1: Token, token2: Token) {
  let c1 = token1.center;
  let c2 = token2.center;
  let ray = new Ray(c1, c2);
  return canvas?.grid?.grid?.measureDistances([{ ray }], { gridSpaces: true })[0];
}
