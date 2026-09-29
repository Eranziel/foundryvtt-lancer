// Import TypeScript modules
import { LANCER } from "../config";
import { LancerItem } from "../item/lancer-item";
import type { UUIDRef } from "../source-template";
import { LancerFlowState } from "./interfaces";
import { Flow, type FlowState } from "./flow";
import { renderTemplateStep } from "./_render";
import { NpcFeatureType, SystemType } from "../enums";
import type { LocaleFlag } from "../util/localization/llp-cards";
import { createTranslationRef } from "../util/localization/llp-map";

const lp = LANCER.log_prefix;

export function registerSystemSteps(flowSteps: Map<string, any>) {
  flowSteps.set("initSystemUseData", initSystemUseData);
  flowSteps.set("printSystemCard", printSystemCard);
}

export class SystemFlow extends Flow<LancerFlowState.SystemUseData> {
  static steps = [
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
      type: data?.type || null,
      effect: data?.effect || "",
      tags: data?.tags || undefined,
    };

    super(uuid, initialData);
  }
}

async function initSystemUseData(state: FlowState<LancerFlowState.SystemUseData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Flow state missing!`);
  if (!state.item || (!state.item.is_mech_system() && !state.item.is_weapon_mod() && !state.item.is_npc_feature()))
    throw new TypeError(`Only mech systems, mods, and NPC features can do system flows!`);
  state.data.title = state.data.title || state.item.name!;
  if (!state.data.type) {
    if (state.item.is_mech_system()) state.data.type = SystemType.System;
    else if (state.item.is_weapon_mod()) state.data.type = SystemType.Mod;
    else state.data.type = state.item.system.type;
  }
  if (!state.data.effect && state.item.is_npc_feature()) {
    // Reactions need to combine the trigger and effect
    if (state.item.system.type === NpcFeatureType.Reaction) {
      const i18nTrigger = game.i18n.localize("lancer.common.activation.trigger.label");
      const i18nEffect = game.i18n.localize("lancer.common.descriptor.effect.label");
      state.data.effect = `
        <p>
          <b data-localize-foundry="${i18nTrigger}">
            ${i18nTrigger.toUpperCase()}
          </b>
        </p>
        <p data-localize-subpath="trigger">${state.item.system.trigger}</p>
        <p>
          <b data-localize-foundry="${i18nEffect}">
            ${i18nEffect.toUpperCase()}
          </b>
        </p>
        <p data-localize-subpath="effect">${state.item.system.effect}</p>
      `;
    } else {
      state.data.effect = state.item.system.effect;
    }
  } else {
    state.data.effect = state.data.effect || state.item.system.effect;
  }
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
  if (!state.item || (!state.item.is_mech_system() && !state.item.is_weapon_mod() && !state.item.is_npc_feature()))
    throw new TypeError(`Only mech systems, mods, and NPC features can do system flows!`);
  if (!state.data.type) throw new TypeError(`System flow state missing type!`);
  const template = options?.template || `systems/${game.system.id}/templates/chat/system-card.hbs`;
  const title = createTranslationRef(state.item, "name", "name");
  title.format = {
    key: `lancer.chatCard.title.${state.data.type.toLowerCase()}.label`,
    data: { title: null },
  };
  const flags: { localeData: LocaleFlag } = {
    // TODO: forced save data here
    // attackData: {
    //   origin: state.actor.id,
    //   targets: state.data.attack_rolls.targeted.map(t => {
    //     return { id: t.target.id, setConditions: !!t.usedLockOn ? { lockon: !t.usedLockOn } : undefined };
    //   }),
    // },
    localeData: {
      lid: state.item.system.lid,
      fields: {
        title,
        trigger: "trigger",
        effect: "effect",
      },
    },
  };
  await renderTemplateStep(state.actor, template, state.data, flags);

  return true;
}
