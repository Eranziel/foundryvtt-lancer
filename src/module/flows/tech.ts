// Import TypeScript modules
import { LANCER } from "../config";
import { LancerActor } from "../actor/lancer-actor";
import { AccDiffHudData, AccDiffHudDataSerialized } from "../apps/acc_diff";
import { renderTemplateStep } from "./_render";
import { SystemTemplates } from "../system-template";
import { LancerFlowState } from "./interfaces";
import { LancerItem } from "../item/lancer-item";
import { resolveDotpath } from "../helpers/commons";
import { ActivationType, AttackType, AccDiffWindowType } from "../enums";
import { Flow, FlowState, Step } from "./flow";
import { UUIDRef } from "../source-template";
import { AttackFlag } from "./attack";
import { getHistory } from "../util/misc";

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
    "setAttackTargets",
    "showAttackHUD",
    "rollAttacks",
    "applySelfHeat",
    "updateItemAfterAction",
    "setAttackEffects",
    "printTechAttackCard",
  ];

  constructor(uuid: UUIDRef | LancerItem | LancerActor, data?: Partial<LancerFlowState.TechAttackRollData>) {
    // Initialize data if not provided
    const initialData: LancerFlowState.TechAttackRollData = {
      type: "tech",
      title: data?.title || "",
      roll_str: data?.roll_str || "",
      grit: data?.grit || 0,
      flat_bonus: data?.flat_bonus || 0,
      attack_type: data?.attack_type || AttackType.Tech,
      action: data?.action || null,
      is_smart: true, // Tech attacks always target e-def
      invade: data?.invade || false,
      effect: data?.effect || "",
      attack_rolls: data?.attack_rolls || { roll: "", targeted: [] },
      attack_results: data?.attack_results || [],
      hit_results: data?.hit_results || [],
      reroll_data: data?.reroll_data || "",
      tags: data?.tags || [],
    };

    super(uuid, initialData);
  }
}

function commonMechTechAttackInit(
  state: FlowState<LancerFlowState.TechAttackRollData>,
  options?: { title?: string; flat_bonus?: number; acc_diff?: AccDiffHudDataSerialized; action_path?: string }
) {
  if (!state.data) throw new TypeError(`Tech attack flow state missing!`);
  if (!state.item) throw new TypeError(`Tech attack flow state missing item!`);

  // Get the action if possible
  if (options?.action_path) {
    state.data.action = resolveDotpath(state.item, options.action_path);
  }
  state.data.grit = state.actor.system.tech_attack;
  if (state.data.action) {
    // Use the action data
    state.data.title =
      state.data.action.name == ActivationType.Invade ? `INVADE // ${state.data.action.name}` : state.data.action.name;
    state.data.effect = state.data.action.detail;
  }

  // TODO: check bonuses for flat attack bonus
  state.data.acc_diff = options?.acc_diff
    ? AccDiffHudData.fromObject(options.acc_diff)
    : AccDiffHudData.fromParams(
        state.item,
        AccDiffWindowType.Tech,
        state.item.getTags() ?? [],
        state.data.title,
        Array.from(game.user!.targets),
        state.data.grit,
        state.data.flat_bonus,
        // TODO: is there a bonus we can check for this type of effect?
        // Add 1 accuracy for all you goblins
        state.actor.is_mech() && state.actor.system.loadout.frame?.value?.system.lid == "mf_goblin" ? 1 : 0
      );
}

export async function initTechAttackData(
  state: FlowState<LancerFlowState.TechAttackRollData>,
  options?: { title?: string; flat_bonus?: number; acc_diff?: AccDiffHudDataSerialized; action_path?: string }
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
    state.data.flat_bonus = state.actor.system.bonuses.flat.tech_attack || 0;
    if (state.actor.is_pilot() || state.actor.is_mech()) {
      state.data.grit = state.actor.system.tech_attack;
    } else if (state.actor.is_npc()) {
      state.data.grit = state.actor.system.sys;
    }
    state.data.acc_diff = options?.acc_diff
      ? AccDiffHudData.fromObject(options.acc_diff)
      : AccDiffHudData.fromParams(
          state.actor,
          AccDiffWindowType.Tech,
          [],
          state.data.title,
          Array.from(game.user!.targets),
          state.data.grit,
          state.data.flat_bonus,
          undefined
        );
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
      state.data.grit = asTech.attack_bonus ? asTech.attack_bonus[tier_index] ?? 0 : 0;
      state.data.acc_diff = options?.acc_diff
        ? AccDiffHudData.fromObject(options.acc_diff)
        : AccDiffHudData.fromParams(
            state.item,
            AccDiffWindowType.Tech,
            asTech.tags,
            state.data.title,
            Array.from(game.user!.targets),
            state.data.grit,
            state.data.flat_bonus,
            acc
          );
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
  const flags: { attackData: AttackFlag } = {
    attackData: {
      origin: state.actor.id!,
      attackerUuid: state.actor.uuid!,
      attackerItemUuid: state.item?.uuid,
      tech: true,
      invade: state.data.invade,
      targets: state.data.hit_results.map(hr => {
        return {
          id: hr.target.document.id,
          uuid: hr.target.document.uuid,
          setConditions: !!hr.usedLockOn ? { lockon: !hr.usedLockOn } : undefined,
          base: hr.base,
          total: hr.total,
          hit: hr.hit,
          crit: hr.crit,
        };
      }),
    },
  };
  const hitResultsWithRolls: LancerFlowState.HitResultWithRoll[] = [];
  for (const [index, hitResult] of state.data.hit_results.entries()) {
    hitResultsWithRolls.push({
      ...hitResult,
      ...state.data.attack_results[index],
    });
  }
  const templateData = {
    ...state.data,
    hit_results: hitResultsWithRolls,
    item_uuid: state.item?.uuid,
    profile: state.item?.currentProfile(),
  };

  //Update history with attack
  if (state.data.acc_diff !== undefined) {
    game.combat?.receiveHistoryAction(state.data);
  }
  console.log(getHistory());

  await renderTemplateStep(state.actor, template, templateData, flags);
  return true;
}
