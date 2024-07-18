// Import TypeScript modules
import { LANCER } from "../config";
import { LancerActor } from "../actor/lancer-actor";
import { AccDiffData, AccDiffDataSerialized } from "../helpers/acc_diff";
import { renderTemplateStep } from "./_render";
import { SystemTemplates } from "../system-template";
import { LancerFlowState } from "./interfaces";
import { LancerItem } from "../item/lancer-item";
import { resolveDotpath } from "../helpers/commons";
import { ActivationType, AttackType } from "../enums";
import { Flow, FlowState, Step } from "./flow";
import { UUIDRef } from "../source-template";

const lp = LANCER.log_prefix;

export function registerTechAttackSteps(flowSteps: Map<string, Step<any, any> | Flow<any>>) {
  flowSteps.set("initTechAttackData", initTechAttackData);
  flowSteps.set("printTechAttackCard", printTechAttackCard);
}

export class TechAttackFlow extends Flow<LancerFlowState.TechAttackRollData> {
  static steps = [
    "initTechAttackData",
    "checkItemDestroyed",
    "checkItemLimited",
    "checkItemCharged",
    "setAttackTags",
    "setAttackEffects",
    "setAttackTargets",
    "showAttackHUD",
    "rollAttacks",
    // TODO: heat, and special tech attacks which do normal damage
    // "rollDamages"
    // TODO: pick invade option for each hit
    // "pickInvades",
    "applySelfHeat",
    "updateItemAfterAction",
    "printTechAttackCard",
  ];

  constructor(uuid: UUIDRef | LancerItem | LancerActor, data?: Partial<LancerFlowState.TechAttackRollData>) {
    // Initialize data if not provided
    const initialData: LancerFlowState.TechAttackRollData = {
      type: "tech",
      title: data?.title || "",
      roll_str: data?.roll_str || "",
      flat_bonus: data?.flat_bonus || 0,
      attack_type: data?.attack_type || AttackType.Tech,
      action: data?.action || null,
      is_smart: true, // Tech attacks always target e-def
      invade: data?.invade || false,
      effect: data?.effect || "",
      attack_rolls: data?.attack_rolls || { roll: "", targeted: [] },
      attack_results: data?.attack_results || [],
      hit_results: data?.hit_results || [],
      damage_results: data?.damage_results || [],
      crit_damage_results: data?.crit_damage_results || [],
      reroll_data: data?.reroll_data || "",
      tags: data?.tags || [],
    };

    super(uuid, initialData);
  }
}

function commonMechTechAttackInit(
  state: FlowState<LancerFlowState.TechAttackRollData>,
  options?: { title?: string; flat_bonus?: number; acc_diff?: AccDiffDataSerialized; action_path?: string }
) {
  if (!state.data) throw new TypeError(`Tech attack flow state missing!`);
  if (!state.item) throw new TypeError(`Tech attack flow state missing item!`);

  // Get the action if possible
  if (options?.action_path) {
    state.data.action = resolveDotpath(state.item, options.action_path);
  }
  state.data.flat_bonus = state.actor.system.tech_attack;
  if (state.data.action) {
    // Use the action data
    state.data.title =
      state.data.action.name == ActivationType.Invade ? `INVADE // ${state.data.action.name}` : state.data.action.name;
    state.data.effect = state.data.action.detail;
  }

  // TODO: check bonuses for flat attack bonus
  state.data.acc_diff = options?.acc_diff
    ? AccDiffData.fromObject(options.acc_diff)
    : AccDiffData.fromParams(
        state.item,
        state.item.getTags() ?? [],
        state.data.title,
        Array.from(game.user!.targets),
        // TODO: is there a bonus we can check for this type of effect?
        // Add 1 accuracy for all you goblins
        state.actor.is_mech() && state.actor.system.loadout.frame?.value?.system.lid == "mf_goblin" ? 1 : 0
      );
}

export async function initTechAttackData(
  state: FlowState<LancerFlowState.TechAttackRollData>,
  options?: { title?: string; flat_bonus?: number; acc_diff?: AccDiffDataSerialized; action_path?: string }
): Promise<boolean> {
  if (!state.data) throw new TypeError(`Tech attack flow state missing!`);
  // If we only have an actor, it's a basic attack
  if (!state.item) {
    if (!state.actor.is_mech() && !state.actor.is_npc()) {
      ui.notifications!.error(`Error rolling tech attack macro (not a valid tech attacker).`);
      return false;
    }
    state.data.title = options?.title ?? "TECH ATTACK";
    state.data.attack_type = AttackType.Tech;
    state.data.flat_bonus = 0;
    if (state.actor.is_pilot() || state.actor.is_mech()) {
      state.data.flat_bonus = state.actor.system.tech_attack;
    } else if (state.actor.is_npc()) {
      state.data.flat_bonus = state.actor.system.sys;
    }
    state.data.acc_diff = options?.acc_diff
      ? AccDiffData.fromObject(options.acc_diff)
      : AccDiffData.fromParams(state.actor, [], state.data.title, Array.from(game.user!.targets));
    return true;
  } else {
    // This title works for everything
    state.data.title = options?.title || state.data.title || state.item.name!;
    // All of these are tech attacks by definition
    state.data.attack_type = AttackType.Tech;
    if (state.item.is_npc_feature()) {
      if (!state.actor.is_npc()) {
        ui.notifications?.warn("Non-NPC cannot use an NPC system!");
        return false;
      }
      let tier_index: number = state.item.system.tier_override || state.actor.system.tier - 1;
      let asTech = state.item.system as SystemTemplates.NPC.TechData;
      let acc = asTech.accuracy ? asTech.accuracy[tier_index] ?? 0 : 0;
      state.data.flat_bonus = asTech.attack_bonus ? asTech.attack_bonus[tier_index] ?? 0 : 0;
      state.data.acc_diff = options?.acc_diff
        ? AccDiffData.fromObject(options.acc_diff)
        : AccDiffData.fromParams(state.item, asTech.tags, state.data.title, Array.from(game.user!.targets), acc);
      return true;
    } else if (state.item.is_mech_system() || state.item.is_frame()) {
      // Tech attack system
      if (!state.actor.is_mech()) {
        ui.notifications?.warn("Non-mech cannot use a mech system!");
        return false;
      }
      if (!state.actor.system.pilot?.value) {
        ui.notifications?.warn("Cannot use a system on a non-piloted mech!");
        return false;
      }
      commonMechTechAttackInit(state, options);
      state.data.tags = state.item.getTags() ?? undefined;
      if (!state.data.action && !state.data.effect) {
        if (state.item.is_mech_system()) state.data.effect = state.item.system.effect;
        else state.data.effect = state.item.system.core_system.active_effect;
      }
      return true;
    } else if (state.item.is_talent()) {
      if (!state.actor.is_pilot()) {
        ui.notifications?.warn("Non-pilot cannot use a pilot talent!");
        return false;
      }
      if (!state.actor.system.active_mech?.value) {
        ui.notifications?.warn("Cannot use a talent without an active mech!");
        return false;
      }
      // Override the flow's actor to the active mech
      state.actor = state.actor.system.active_mech.value;
      commonMechTechAttackInit(state, options);
      return true;
    }
    ui.notifications!.error(`Error in tech attack flow - ${state.item.name} is an invalid type!`);
    return false;
  }
}

export async function printTechAttackCard(
  state: FlowState<LancerFlowState.TechAttackRollData>,
  options?: { template?: string }
): Promise<boolean> {
  if (!state.data) throw new TypeError(`Tech attack flow state missing!`);
  const template = options?.template || `systems/${game.system.id}/templates/chat/tech-attack-card.hbs`;
  const flags = {
    attackData: {
      origin: state.actor.id,
      targets: state.data.attack_rolls.targeted.map(t => {
        return { id: t.target.id, lockOnConsumed: !!t.usedLockOn };
      }),
    },
  };
  await renderTemplateStep(state.actor, template, state.data, flags);
  return true;
}
