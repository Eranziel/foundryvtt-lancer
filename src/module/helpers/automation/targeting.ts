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
  let mm = await target.data.data.derived.mm_promise;
  let def: number = tech ? mm.EDefense : mm.Evasion;
  !def && (def = 8);

  return (roll.total ?? 0) >= def;
}
