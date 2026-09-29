// Import TypeScript modules
import { LANCER } from "../config";
import { LancerItem } from "../item/lancer-item";
import type { LancerActor } from "../actor/lancer-actor";
import { buildChipHTML } from "../helpers/item";
import { ActivationType, AttackType } from "../enums";
import { renderTemplateStep } from "./_render";
import { resolveDotpath } from "../helpers/commons";
import type { ActionData } from "../models/bits/action";
import { LancerFlowState } from "./interfaces";
import { Flow, type FlowState, type Step } from "./flow";
import type { UUIDRef } from "../source-template";
import type { LocaleFlag } from "../util/localization/llp-cards";
import { createTranslationRef } from "../util/localization/llp-map";
import { TechAttackFlow } from "./tech";

const lp = LANCER.log_prefix;

export function registerActivationSteps(flowSteps: Map<string, Step<any, any> | Flow<any>>) {
  flowSteps.set("initActivationData", initActivationData);
  flowSteps.set("printActionUseCard", printActionUseCard);
}

export class ActivationFlow extends Flow<LancerFlowState.ActionUseData> {
  static steps = [
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

    super(uuid, initialData);
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
      state.data.action = resolveDotpath<ActionData>(state.item, state.data.action_path);
      if (!state.data.action) throw new Error(`Failed to resolve action ${state.data.action_path}`);
      state.data.title = state.data.action?.name;
    }
    state.data.title =
      options?.title ||
      state.data.title ||
      state.data.action?.name ||
      state.item.name ||
      game.i18n.localize("lancer.common.activation.unknown.label").toUpperCase();
    let detail_text = state.data.detail || "";
    if (!detail_text && state.data.action) {
      const i18nInit = game.i18n.localize("lancer.common.activation.init.label");
      const i18nTrigger = game.i18n.localize("lancer.common.activation.trigger.label");
      const i18nEffect = game.i18n.localize("lancer.common.descriptor.effect.label");
      if (state.data.action.init) {
        detail_text += `
          <p>
            <b data-localize-foundry="${i18nInit}">
              ${i18nInit.toUpperCase()}
            </b>
          </p>
          <p>${state.data.action.init}</p>
        `;
      }
      if (state.data.action.trigger) {
        detail_text += `
          <p>
            <b data-localize-foundry="${i18nTrigger}">
              ${i18nTrigger.toUpperCase()}
            </b>
          </p>
          <p data-localize="trigger">${state.data.action.trigger}</p>
        `;
      }
      const effect = `<div data-localize="effect">${state.data.action.detail}</div>`;
      if (detail_text) {
        // If the action had an init or trigger, add a header for the effect text
        detail_text += `
          <p>
            <b data-localize-foundry="${i18nEffect}">
              ${i18nEffect.toUpperCase()}
            </b>
          </p>
          <p data-localize-subpath="effect">${effect}</p>
        `;
      } else {
        detail_text += `<span data-localize-subpath="effect">${effect}</span>`;
      }
    }
    state.data.detail = detail_text;

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
  const localePath = state.data.action_path;
  const isCoreSystem = localePath === "system.core_system";
  const titlePath = `${localePath}.${isCoreSystem ? "active_name" : "name"}`;
  const triggerPath = `${localePath}.trigger`;
  const effectPath = `${localePath}.${isCoreSystem ? "active_effect" : "detail"}`;
  const title = createTranslationRef(state.data.action, "name", titlePath);
  if (isCoreSystem) {
    title.format = {
      key: "lancer.chatCard.title.coreActivation.label",
      data: { title: null },
    };
  }
  const flags = {
    actionData: {
      actor: state.actor.id,
      system: state.item?.id || undefined,
      action: state.data.action,
    },
    localeData: {
      lid: state.item?.system.lid || "",
      fields: {
        title,
        trigger: createTranslationRef(state.data.action, "trigger", triggerPath),
        effect: createTranslationRef(state.data.action, "detail", effectPath),
      },
    },
  };

  let data = {
    title: state.data.title,
    action_chip: state.data.action ? buildChipHTML(state.data.action.activation, {}) : "",
    description: state.data.detail,
    roll: state.data.self_heat_result?.roll,
    roll_tt: state.data.self_heat_result?.tt,
    roll_icon: "cci cci-heat i--4 damage--heat",
    tags: state.data.tags,
  };
  await renderTemplateStep(state.actor, template, data, flags);
  return true;
}
