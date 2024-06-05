import { LancerActor } from "../actor/lancer-actor";
import { LancerItem } from "../item/lancer-item";
import { UUIDRef } from "../source-template";
import { Flow, FlowState } from "./flow";
import { LancerFlowState } from "./interfaces";

/**
 * Flow for rolling and applying damage to a token, typically from a weapon attack
 */
export class DamageApplyFlow extends Flow<LancerFlowState.WeaponRollData> {
  static steps = [
    "emptyStep",
    // this.constructor.steps.set("getDamages", dummyDamageStep);
    // this.constructor.steps.set("checkTargetImmunity", dummyDamageStep);
    // this.constructor.steps.set("checkTargetResist", dummyDamageStep);
    // this.constructor.steps.set("promptDamageConfig", dummyDamageStep); // Includes bonus damage config?
    // this.constructor.steps.set("rollDamages", dummyDamageStep);
    // this.constructor.steps.set("applyOverkill", dummyDamageStep);
    // this.constructor.steps.set("applyDamages", dummyDamageStep);
  ];
  constructor(uuid: UUIDRef | LancerItem | LancerActor, data?: LancerFlowState.WeaponRollData) {
    super(uuid, data);
  }
}
