// Import TypeScript modules
import { LANCER } from "../config";
import { LancerItem } from "../item/lancer-item";
import { UUIDRef } from "../source-template";
import { LancerFlowState } from "./interfaces";
import { Flow, FlowState } from "./flow";
import { renderTemplateStep } from "./_render";
import { NpcFeatureType, SystemType } from "../enums";

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
      state.data.effect = `<p><b>TRIGGER</b></p><p>${state.item.system.trigger}</p><p><b>EFFECT</b></p><p>${state.item.system.effect}</p>`;
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
  const template = options?.template || `systems/${game.system.id}/templates/chat/system-card.hbs`;
  const flags = {
    // TODO: forced save data here
    // attackData: {
    //   origin: state.actor.id,
    //   targets: state.data.attack_rolls.targeted.map(t => {
    //     return { id: t.target.id, setConditions: !!t.usedLockOn ? { lockon: !t.usedLockOn } : undefined };
    //   }),
    // },
  };
  await renderTemplateStep(state.actor, template, state.data, flags);

  return true;
}
