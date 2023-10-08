// Import TypeScript modules
import { LANCER } from "../config";
import { LancerItem } from "../item/lancer-item";
import type { LancerActor } from "../actor/lancer-actor";
import { buildActionHTML } from "../helpers/item";
import { ActivationType, AttackType } from "../enums";
import { renderTemplateStep } from "./_render";
import { resolve_dotpath } from "../helpers/commons";
import { ActionData } from "../models/bits/action";
import { LancerFlowState } from "./interfaces";
import { Flow, FlowState } from "./flow";
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

export class ActivationFlow extends Flow<LancerFlowState.ActionUseData> {
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

    // TODO: if a system or action is not provided, prompt the user to select one?
    // Or would it be better to have a separate UI for that before the flow starts?
    this.steps.set("initActivationData", initActivationData);
    this.steps.set("checkItemDestroyed", checkItemDestroyed);
    this.steps.set("checkItemLimited", checkItemLimited);
    this.steps.set("checkItemCharged", checkItemCharged);
    // Does anything need to be done here?
    // TODO: template placer for grenades?
    // TODO: damage roller for grenades and mines?
    // TODO: parse detail for save prompts?
    this.steps.set("applySelfHeat", applySelfHeat);
    this.steps.set("updateItemAfterAction", updateItemAfterAction);
    this.steps.set("printActionUseCard", printActionUseCard);
  }
}

export async function dummyStep(state: FlowState<LancerFlowState.ActionUseData>, options?: {}): Promise<boolean> {
  return true;
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

    // If it's a tech attack or invade, switch to a tech attack flow
    if (state.data.action.tech_attack || state.data.action.activation == ActivationType.Invade) {
      let tech_flow = new TechAttackFlow(state.item, {
        title: state.data.title,
        invade: state.data.action.activation == ActivationType.Invade,
        attack_type: AttackType.Tech,
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
  const template = options?.template || `systems/${game.system.id}/templates/chat/generic-card.hbs`;
  const flags = {
    actionData: {
      actor: state.actor.id,
      system: state.item?.id || undefined,
      action: state.data.action,
    },
  };
  let data: string = "";
  if (state.item && state.data.action_path) {
    data = buildActionHTML(state.item, state.data.action_path, { editable: false, full: false });
    // } else if (false) {
    // TODO: how to detect/trigger deployables?
    // data = buildDeployableHTML(state.data.action, { editable: false, full: false });
  } else {
    data = state.data.detail;
  }
  await renderTemplateStep(state.actor, template, data, flags);
  return true;
}
