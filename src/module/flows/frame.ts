// Import TypeScript modules
import { LANCER } from "../config";
import { LancerActor } from "../actor/lancer-actor";
import { LancerFlowState } from "./interfaces";
import { ActivationFlow } from "./activation";
import { FlowState } from "./flow";
import { LancerItem } from "../item/lancer-item";

const lp = LANCER.log_prefix;

export function registerCoreActiveSteps(flowSteps: Map<string, any>) {
  flowSteps.set("checkCorePower", checkCorePower);
  flowSteps.set("consumeCorePower", consumeCorePower);
}

export class CoreActiveFlow extends ActivationFlow {
  name = "CoreActiveFlow";
  // Same as ActivationFlow, except:
  //  - Add "checkCorePower" after "checkItemCharged"
  //  - Add "consumeCorePower" before "printActionUseCard"
  steps = [
    "initActivationData",
    "checkItemDestroyed",
    "checkItemLimited",
    "checkItemCharged",
    "checkCorePower",
    "applySelfHeat",
    "updateItemAfterAction",
    "consumeCorePower",
    // TODO: deduct action from actor's action tracker
    "printActionUseCard",
  ];

  constructor(uuid: string | LancerItem | LancerActor, data?: Partial<LancerFlowState.ActionUseData>) {
    super(uuid, data);
  }
}

export async function checkCorePower(state: FlowState<LancerFlowState.ActionUseData>) {
  if (!state.actor || !state.actor.is_mech()) throw new TypeError(`Cannot consume core power on a non-mech!`);
  if (state.actor.system.core_energy == 0) {
    ui.notifications!.warn(`No core power remaining on this frame!`);
    return false;
  }
  return true;
}

export async function consumeCorePower(state: FlowState<LancerFlowState.ActionUseData>) {
  if (!state.actor || !state.actor.is_mech()) throw new TypeError(`Cannot consume core power on a non-mech!`);
  state.actor.update({ "system.core_energy": 0 });
  console.log(`${lp} Automatically consumed core power for ${state.actor.system.lid}`);
}
