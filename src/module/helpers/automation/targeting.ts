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
  let def: number = tech ? (mm.EDefense || 8) : (mm.Evasion || 5);

  return roll._total >= def;
}

// Quickly computes the distance between two tokens as a number of grid units
// TODO: Make it size aware, using the token.document.mm.Size if it exists? Prefer htss size
export function gridDist(token1: Token, token2: Token) {
  let c1 = token1.center;
  let c2 = token2.center;
  let ray = new Ray(c1, c2);
  canvas.grid.grid.measureDistances([{ray}], {gridSpaces: true})[0]
}