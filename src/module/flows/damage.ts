import { LancerActor } from "../actor/lancer-actor";
import { LancerItem } from "../item/lancer-item";
import { UUIDRef } from "../source-template";
import { Flow, FlowState } from "./flow";
import { LancerFlowState } from "./interfaces";

/**
 * Flow for rolling and applying damage to a token, typically from a weapon attack
 */
export class DamageApplyFlow extends Flow<LancerFlowState.WeaponRollData> {
  constructor(uuid: UUIDRef | LancerItem | LancerActor, data?: LancerFlowState.WeaponRollData) {
    super("DamageApplyFlow", uuid, data);
    this.steps.set("getDamages", dummyDamageStep);
    this.steps.set("checkTargetImmunity", dummyDamageStep);
    this.steps.set("checkTargetResist", dummyDamageStep);
    this.steps.set("promptDamageConfig", dummyDamageStep); // Includes bonus damage config?
    this.steps.set("rollDamages", dummyDamageStep);
    this.steps.set("applyOverkill", dummyDamageStep);
    this.steps.set("applyDamages", dummyDamageStep);
  }
}

async function dummyDamageStep(state: FlowState<LancerFlowState.WeaponRollData>) {
  await setTimeout(() => (console.log("dummyDamageStep"), 1000));
  return true;
}
