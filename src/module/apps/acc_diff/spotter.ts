import type { AccDiffHudPlugin, AccDiffHudPluginData } from "./plugin";
import type { AccDiffHudData, AccDiffHudTarget } from "./index";
import type { LancerActor } from "../../actor/lancer-actor";
import type { LancerToken } from "../../token";

// this is an example of a case implemented without defining a full class
function adjacentSpotter(actor: LancerActor): boolean {
  // only players can benefit from spotter
  if (!actor.is_mech()) {
    return false;
  }

  let token: LancerToken = actor.getActiveTokens()[0];

  // Rough bounding box with allowance for hg1
  const aabb = new PIXI.Rectangle(
    token.bounds.x - 2 * canvas.grid!.sizeX,
    token.bounds.y - 2 * canvas.grid!.sizeY,
    token.bounds.right + 4 * canvas.grid!.sizeX,
    token.bounds.bottom + 4 * canvas.grid!.sizeY
  );

  const spotters: Set<LancerToken> = canvas.tokens!.quadtree!.getObjects(aabb, {
    collisionTest: (o: QuadtreeObject<LancerToken>) => {
      if (!o.t.actor?.is_mech() || o.t === token) return false;
      if (!o.t.actor.system.pilot?.value?.itemTypes.talent.some(t => t.system.lid === "t_spotter")) return false;
      const house_guard: boolean =
        o.t.actor.system.pilot?.value?.itemTypes.talent.some(t => t.system.lid === "t_house_guard") ?? false;
      const range = (house_guard ? 2 : 1) + 0.1;
      return o.t.document.computeRange(token.document) <= range;
    },
  }) as any;
  return spotters.size >= 1;
}

function spotter(): AccDiffHudPluginData {
  let sp = {
    actor: null as LancerActor | null,
    target: null as AccDiffHudTarget | null,
    uiElement: "checkbox" as "checkbox",
    slug: "spotter",
    category: "acc" as "acc",
    humanLabel: "Spotter (*)",
    get uiState() {
      return !!(this.actor && this.target?.usingLockOn && adjacentSpotter(this.actor));
    },
    set uiState(_v: boolean) {
      // noop
    },
    disabled: true,
    get visible() {
      return !!this.target?.usingLockOn;
    },
    modifyRoll(roll: string) {
      if (this.uiState) {
        return `{${roll},${roll}}kh[🎯 spotter]`;
      } else {
        return roll;
      }
    },
    rollPrecedence: -100, // after numeric modifiers
    hydrate(data: AccDiffHudData, target?: AccDiffHudTarget) {
      this.actor = data.lancerActor || null;
      this.target = target || null;
    },
  };

  return sp;
}

const Spotter: AccDiffHudPlugin<AccDiffHudPluginData> = {
  slug: "spotter",
  category: "acc",
  perTarget(_t: Token.Implementation) {
    return spotter();
  },
};

export default Spotter;
