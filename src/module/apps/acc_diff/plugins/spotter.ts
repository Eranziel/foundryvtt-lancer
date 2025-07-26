import { stateless } from "../../serde";
import type { AccDiffHudPlugin, AccDiffHudPluginData } from "./plugin";
import type { AccDiffHudData, AccDiffHudTarget } from "../index";
import type { LancerActor } from "../../../actor/lancer-actor";
import type { LancerToken } from "../../../token";

// this is an example of a case implemented without defining a full class
function adjacentSpotter(actor: LancerActor): boolean {
  // only players can benefit from spotter
  if (!actor.is_mech()) {
    return false;
  }

  let token: LancerToken = actor.getActiveTokens()[0];

  let isSpotterNearby = actor
    .getActiveTokens()[0]
    //maxRange: 2 as opposed to 1 due to House Guard 1
    .areTargetsInRange(2, (o: QuadtreeObject<LancerToken>, distance: number) => {
      if (!o.t.actor?.is_mech() || o.t === token) return false;
      if (!o.t.actor.system.pilot?.value?.itemTypes.talent.some(t => t.system.lid === "t_spotter")) return false;

      const house_guard: boolean =
        o.t.actor.system.pilot?.value?.itemTypes.talent.some(t => t.system.lid === "t_house_guard") ?? false;
      const range = (house_guard ? 2 : 1) + 0.1;

      //If not in range, invalid
      if (distance > range) return false;

      return true;
    });
  return isSpotterNearby;
}

//Ought to rename to spotter_1
function spotter(): AccDiffHudPluginData {
  let sp = {
    actor: null as LancerActor | null,
    target: null as AccDiffHudTarget | null,
    uiElement: "checkbox" as "checkbox",
    slug: "spotter",
    category: "acc" as "acc",
    humanLabel: "Spotter",
    quickReference: "*",
    accBonus: 0,
    tooltip:
      "When an allied character adjacent to the Spotter attacks a target and consumes Lock On, they may roll twice and choose either result.",
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
  kind: "attack",
  codec: stateless(
    "Spotter",
    (t: unknown): t is AccDiffHudPluginData => typeof t == "object" && (t as any)?.slug == "spotter",
    spotter
  ),
  perTarget(_t: Token) {
    return spotter();
  },
};

export default Spotter;
