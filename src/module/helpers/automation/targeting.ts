import { LancerActor, LancerActorType } from "../../actor/lancer-actor";

export function getTargets(): LancerActor<LancerActorType>[] {
  const targets = game.user.targets;
  const ret: LancerActor<LancerActorType>[] = [];
  targets.forEach(token => {
    ret.push(token.actor as LancerActor<LancerActorType>);
  });

  return ret;
}

export function checkForHit(tech: boolean, roll: Roll, target: LancerActor<LancerActorType>): boolean {
  let def: number = tech ? target.data.data.derived.mmec.ent.EDefense : target.data.data.derived.mmec.ent.Evasion;
  !def && (def = 8);

  return roll._total >= def;
}
