// Import TypeScript modules
import { LANCER } from "../config";
import { LancerItem } from "../item/lancer-item";
import { UUIDRef } from "../source-template";
import { LancerFlowState } from "./interfaces";
import { Flow, FlowState } from "./flow";
import { renderTemplateStep } from "./_render";

const lp = LANCER.log_prefix;

export function registerSystemSteps(flowSteps: Map<string, any>) {
  flowSteps.set("initSystemUseData", initSystemUseData);
  flowSteps.set("printSystemCard", printSystemCard);
}

export class SystemFlow extends Flow<LancerFlowState.SystemUseData> {
  name = "SystemFlow";
  steps = [
    "initSystemUseData",
    "checkItemDestroyed",
    "checkItemLimited",
    "checkItemCharged",
    // TODO: check for targets and prompt for saves
    // "setSaveTargets",
    // "rollSaves",
    "applySelfHeat",
    "updateItemAfterAction",
    "printSystemCard",
  ];

  constructor(uuid: UUIDRef | LancerItem, data?: Partial<LancerFlowState.SystemUseData>) {
    const initialData: LancerFlowState.SystemUseData = {
      title: data?.title || "",
      effect: data?.effect || "",
      tags: data?.tags || undefined,
    };

    super(uuid, initialData);
  }
}

async function initSystemUseData(state: FlowState<LancerFlowState.SystemUseData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Flow state missing!`);
  if (!state.item || (!state.item.is_mech_system() && !state.item.is_npc_feature()))
    throw new TypeError(`Only mech systems and NPC features can do system flows!`);
  state.data.title = state.data.title || state.item.name!;
  state.data.effect = state.data.effect || state.item.system.effect;
  state.data.tags = state.data.tags || state.item.system.tags;
  // The system incurs self-heat, so set up the data for it
  const selfHeat = state.item.system.tags.find(t => t.is_selfheat);
  if (selfHeat) {
    state.data.self_heat = selfHeat.val || "1";
  }
  return true;
}

async function printSystemCard(
  state: FlowState<LancerFlowState.SystemUseData>,
  options?: { template: string }
): Promise<boolean> {
  if (!state.data) throw new TypeError(`Flow state missing!`);
  if (!state.item || (!state.item.is_mech_system() && !state.item.is_npc_feature()))
    throw new TypeError(`Only mech systems and NPC features can do system flows!`);
  const template = options?.template || `systems/${game.system.id}/templates/chat/system-card.hbs`;
  const flags = {
    // TODO: forced save data here
    // attackData: {
    //   origin: state.actor.id,
    //   targets: state.data.attack_rolls.targeted.map(t => {
    //     return { id: t.target.id, lockOnConsumed: !!t.usedLockOn };
    //   }),
    // },
  };
  await renderTemplateStep(state.actor, template, state.data, flags);

  return true;
}
