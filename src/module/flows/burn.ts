import { LancerActor } from "../actor/lancer-actor";
import { LancerItem } from "../item/lancer-item";
import { UUIDRef } from "../source-template";
import { Flow, FlowState, Step } from "./flow";
import { LancerFlowState } from "./interfaces";
import { StatRollFlow } from "./stat";

export function registerBurnSteps(flowSteps: Map<string, Step<any, any> | Flow<any>>) {
  flowSteps.set("checkBurnResult", checkBurnResult);
}

export class BurnFlow extends StatRollFlow {
  static steps = ["initStatRollData", "showStatRollHUD", "rollCheck", "checkBurnResult", "printStatRollCard"];

  constructor(uuid: UUIDRef | LancerItem | LancerActor, data: Partial<LancerFlowState.StatRollData>) {
    const state: LancerFlowState.StatRollData = {
      type: "stat",
      title: data?.title ?? "Burn Check",
      path: data?.path ?? "system.eng", // Burn checks are engineering by default
      bonus: data?.bonus ?? 0,
      acc_diff: data?.acc_diff ?? undefined,
      roll_str: data?.roll_str ?? "1d20",
      effect: data?.effect ?? undefined,
    };

    super(uuid, state);
  }
}

async function checkBurnResult(state: FlowState<LancerFlowState.StatRollData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Burn flow state missing!`);
  if (!state.data.result?.roll.total) throw new TypeError(`Burn check hasn't been rolled yet!`);
  const result = state.data.result.roll.total;
  if (result >= 10) {
    state.data.effect = `Burn cleared!`;
    await state.actor.update({ "system.burn": 0 });
  } else {
    state.data.effect = `<b>${state.actor.system.burn}</b> <i class="cci cci-burn i--m damage--burn"></i> damage taken`;
    await state.actor.update({ "system.hp.value": state.actor.system.hp.value - state.actor.system.burn });
  }
  return true;
}
