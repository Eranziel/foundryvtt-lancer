// Import TypeScript modules
import { LANCER } from "../config";
import { rollTextMacro } from "./text";
import { LancerActor, LancerMECH } from "../actor/lancer-actor";
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

/**
 * Prepares a macro to present core passive information for
 * Checks whether they have a passive since that could get removed on swap
 * @param actor  Actor/UUID to roll the macro as/for whom core info comes from
 */
export async function prepareCorePassiveMacro(actor: string | LancerActor) {
  // Determine which Actor to speak as
  actor = LancerActor.fromUuidSync(actor);
  if (!actor.is_mech()) return;

  let frame = actor.system.loadout.frame?.value;
  if (!frame) return;

  let mData: LancerFlowState.TextRollData = {
    // docUUID: frame.uuid,
    title: frame.system.core_system.passive_name,
    description: frame.system.core_system.passive_effect,
    tags: frame.system.core_system.tags,
  };

  rollTextMacro(mData);
}

/**
 * Prepares a macro to present frame trait information
 * @param actor  Actor/UUID to roll the macro as/for whom core info comes from
 * @param index Index of the frame trait to roll
 */
export async function prepareFrameTraitMacro(actor: string | LancerActor, index: number) {
  // Determine which Actor to speak as
  actor = LancerActor.fromUuidSync(actor);
  if (!actor.is_mech()) return;

  let frame = actor.system.loadout.frame?.value;
  if (!frame) return;

  let trait = frame.system.traits[index];
  if (!trait) return;

  let mData: LancerFlowState.TextRollData = {
    // docUUID: frame.uuid,
    title: trait.name,
    description: trait.description,
  };

  rollTextMacro(mData);
}
