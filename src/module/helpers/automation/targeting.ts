import { LancerActor, LancerActorType } from "../../actor/lancer-actor";

export function getTargets(): LancerActor<LancerActorType>[] {
  const targets = game.user.targets;
  const ret: LancerActor<LancerActorType>[] = [];
  targets.forEach(token => {
    ret.push(token.actor as LancerActor<LancerActorType>);
  });

  return ret;
}

export async function checkForHit(tech: boolean, roll: Roll, target: LancerActor<LancerActorType>): Promise<boolean> {
  let mm = await target.data.data.derived.mm_promise;
  let def: number = tech ? mm.EDefense : mm.Evasion;
  !def && (def = 8);

  return roll._total >= def;
}
