// Import TypeScript modules
import { LANCER } from "../config";
import { LancerActor } from "../actor/lancer-actor";
import { LancerFlowState } from "./interfaces";
import { ActivationFlow } from "./activation";
import type { FlowState, PostFlowHook, PreFlowHook } from "./flow";
import { LancerItem } from "../item/lancer-item";

const lp = LANCER.log_prefix;

export function registerCoreActiveSteps(flowSteps: Map<string, any>) {
  flowSteps.set("checkCorePower", checkCorePower);
  flowSteps.set("consumeCorePower", consumeCorePower);
}

declare module "fvtt-types/configuration" {
  namespace Hooks {
    interface HookConfig {
      "lancer.preFlow.CoreActiveFlow": PreFlowHook<CoreActiveFlow>;
      "lancer.postFlow.CoreActiveFlow": PostFlowHook<CoreActiveFlow>;
    }
  }
}

export class CoreActiveFlow extends ActivationFlow {
  // Same as ActivationFlow, except:
  //  - Add "checkCorePower" after "checkItemCharged"
  //  - Add "consumeCorePower" before "printActionUseCard"
  static steps = [
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

  override callAllPreFlowHooks(): void {
    Hooks.callAll("lancer.preFlow.CoreActiveFlow", this);
  }

  override callAllPostFlowHooks(success: boolean): void {
    Hooks.callAll("lancer.postFlow.CoreActiveFlow", this, success);
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
