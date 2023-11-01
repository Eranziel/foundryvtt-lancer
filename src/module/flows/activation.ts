// Import TypeScript modules
import { LANCER } from "../config";
import { LancerItem } from "../item/lancer-item";
import type { LancerActor } from "../actor/lancer-actor";
import { buildChipHTML } from "../helpers/item";
import { ActivationType, AttackType } from "../enums";
import { renderTemplateStep } from "./_render";
import { resolve_dotpath } from "../helpers/commons";
import { ActionData } from "../models/bits/action";
import { LancerFlowState } from "./interfaces";
import { Flow, FlowState, Step } from "./flow";
import { UUIDRef } from "../source-template";
import {
  applySelfHeat,
  checkItemCharged,
  checkItemDestroyed,
  checkItemLimited,
  updateItemAfterAction,
} from "./item-utils";
import { TechAttackFlow } from "./tech";

const lp = LANCER.log_prefix;

export function registerActivationSteps(flowSteps: Map<string, Step<any, any> | Flow<any>>) {
  flowSteps.set("initActivationData", initActivationData);
  flowSteps.set("printActionUseCard", printActionUseCard);
}

export class ActivationFlow extends Flow<LancerFlowState.ActionUseData> {
  steps = [
    // TODO: if a system or action is not provided, prompt the user to select one?
    // Or would it be better to have a separate UI for that before the flow starts?
    "initActivationData",
    "checkItemDestroyed",
    "checkItemLimited",
    "checkItemCharged",
    // Does anything need to be done here?
    // TODO: template placer for grenades?
    // TODO: damage roller for grenades and mines?
    // TODO: parse detail for save prompts?
    "applySelfHeat",
    "updateItemAfterAction",
    // TODO: deduct action from actor's action tracker
    "printActionUseCard",
  ];

  constructor(uuid: UUIDRef | LancerItem | LancerActor, data?: Partial<LancerFlowState.ActionUseData>) {
    // Initialize data if not provided
    const initialData: LancerFlowState.ActionUseData = {
      type: "action",
      title: data?.title || "",
      roll_str: data?.roll_str || "",
      acc: data?.acc || 0,
      action_path: data?.action_path || "",
      action: data?.action || null,
      self_heat: data?.self_heat || undefined,
      detail: data?.detail || "",
      tags: data?.tags || [],
    };

    super("ActivationFlow", uuid, initialData);
  }
}

export async function initActivationData(
  state: FlowState<LancerFlowState.ActionUseData>,
  options?: { title?: string; action_path?: string }
): Promise<boolean> {
  if (!state.data) throw new TypeError(`Activation flow state missing!`);
  // If we only have an actor, it's a basic action
  if (!state.item) {
    // TODO - logic for basic actions
    return false;
  } else {
    // If no action path provided and the action isn't set, default to the first action
    state.data.action_path = options?.action_path || state.data.action_path || "system.actions.0";
    if (!state.data.action) {
      // First, find the action
      state.data.action = resolve_dotpath<ActionData>(state.item, state.data.action_path);
      if (!state.data.action) throw new Error(`Failed to resolve action ${state.data.action_path}`);
      state.data.title = state.data.action?.name;
    }
    state.data.title =
      options?.title || state.data.title || state.data.action?.name || state.item.name || "UNKNOWN ACTION";
    state.data.detail = state.data.detail || state.data.action?.detail || "";

    // Deal with tags
    state.data.tags = state.item.getTags() ?? [];
    // Check for self-heat
    const selfHeatTags = state.data.tags.filter(t => t.is_selfheat);
    if (!!(selfHeatTags && selfHeatTags.length)) state.data.self_heat = selfHeatTags[0].val;

    // If it's a tech attack or invade, switch to a tech attack flow
    if (state.data.action.tech_attack || state.data.action.activation == ActivationType.Invade) {
      let tech_flow = new TechAttackFlow(state.item, {
        title: state.data.title,
        invade: state.data.action.activation == ActivationType.Invade,
        attack_type: AttackType.Tech,
        action: state.data.action,
        effect: state.data.action.detail,
        tags:
          state.item.is_mech_system() || state.item.is_mech_system() || state.item.is_npc_feature()
            ? state.item.system.tags
            : [],
      });
      tech_flow.begin(); // Do not await
      return false; // End this flow
    }

    // TODO: are there any other types of actions that should delegate to other flows?

    return true;
  }
}

export async function printActionUseCard(
  state: FlowState<LancerFlowState.ActionUseData>,
  options?: { template?: string }
): Promise<boolean> {
  if (!state.data) throw new TypeError(`Activation flow state missing!`);
  const template = options?.template || `systems/${game.system.id}/templates/chat/activation-card.hbs`;
  const flags = {
    actionData: {
      actor: state.actor.id,
      system: state.item?.id || undefined,
      action: state.data.action,
    },
  };

  let data = {
    title: state.data.title,
    action_chip: state.data.action ? buildChipHTML(state.data.action.activation, {}) : "",
    description: state.data.detail,
    roll: state.data.self_heat_result?.roll,
    roll_tt: state.data.self_heat_result?.tt,
    roll_icon: "cci cci-heat i--m damage--heat",
    tags: state.data.tags,
  };
  await renderTemplateStep(state.actor, template, data, flags);
  return true;
}
