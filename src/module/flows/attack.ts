// Import TypeScript modules
import { LancerActor } from "../actor/lancer-actor";
import { AccDiffHudData, AccDiffHudDataSerialized, Cover, RollModifier } from "../apps/acc_diff";
import { openSlidingHud } from "../apps/slidinghud";
import { LANCER } from "../config";
import { AttackType, AccDiffWindowType, RangeType, WeaponType } from "../enums";
import { checkForHit } from "../helpers/automation/targeting";
import { LancerItem } from "../item/lancer-item";
import { UUIDRef } from "../source-template";
import { SystemTemplates } from "../system-template";
import { getHistory } from "../util/misc";
import { renderTemplateStep } from "./_render";
import { Flow, FlowState, Step } from "./flow";
import { LancerFlowState } from "./interfaces";

const lp = LANCER.log_prefix;

function rollStr(bonus: number, total: number): string {
  let modStr = "";
  if (total != 0) {
    let sign = total > 0 ? "+" : "-";
    let abs = Math.abs(total);
    let roll = abs == 1 ? "1d6" : `${abs}d6kh1`;
    modStr = ` ${sign} ${roll}`;
  }
  return `1d20 + ${bonus}${modStr}`;
}

function applyPluginsToRoll(str: string, plugins: RollModifier[]): string {
  plugins = plugins.filter(p => p.modifyRoll !== undefined);
  return plugins.sort((p, q) => q.rollPrecedence - p.rollPrecedence).reduce((acc, p) => p.modifyRoll!(acc), str);
}

/** Create the attack roll(s) for a given attack configuration */
export function attackRolls(flat_bonus: number, acc_diff: AccDiffHudData): LancerFlowState.AttackRolls {
  let perRoll = Object.values(acc_diff.weapon.plugins);
  let base = perRoll.concat(Object.values(acc_diff.base.plugins));
  return {
    roll: applyPluginsToRoll(rollStr(flat_bonus, acc_diff.base.total + acc_diff.weapon.total(Cover.None)), base),
    targeted: acc_diff.targets.map(tad => {
      let perTarget = perRoll.concat(Object.values(tad.plugins));
      return {
        target: tad.target,
        roll: applyPluginsToRoll(rollStr(flat_bonus, tad.total), perTarget),
        usedLockOn: tad.usingLockOn,
      };
    }),
  };
}

export type AttackFlag = {
  origin: string; // Attacker's ID. Somewhat deprecated, kept because LWFX is probably using it.
  attackerUuid: string; // Attacker's UUID
  attackerItemUuid?: string; // Item UUID used for the attack, if applicable
  tech?: boolean;
  invade?: boolean;
  targets: {
    uuid: string;
    setConditions?: object; // keys are statusEffect ids, values are boolean to indicate whether to apply or remove
    base: string;
    total: string;
    hit: boolean;
    crit: boolean;
  }[];
};

export function registerAttackSteps(flowSteps: Map<string, Step<any, any> | Flow<any>>) {
  flowSteps.set("initAttackData", initAttackData);
  flowSteps.set("checkWeaponLoaded", checkWeaponLoaded);
  flowSteps.set("setAttackTags", setAttackTags);
  flowSteps.set("setAttackEffects", setAttackEffects);
  flowSteps.set("setAttackTargets", setAttackTargets);
  flowSteps.set("showAttackHUD", showAttackHUD);
  flowSteps.set("rollAttacks", rollAttacks);
  flowSteps.set("clearTargets", clearTargets);
  flowSteps.set("printAttackCard", printAttackCard);
}

export class BasicAttackFlow extends Flow<LancerFlowState.AttackRollData> {
  name = "BasicAttackFlow";
  static steps = [
    "initAttackData",
    "setAttackTags",
    "setAttackEffects",
    "setAttackTargets",
    "showAttackHUD",
    "rollAttacks",
    "applySelfHeat",
    "printAttackCard",
  ];

  constructor(uuid: UUIDRef | LancerItem | LancerActor, data?: Partial<LancerFlowState.AttackRollData>) {
    // Initialize data if not provided
    const initialData: LancerFlowState.AttackRollData = {
      type: "attack",
      title: data?.title || "",
      roll_str: data?.roll_str || "",
      grit: data?.grit || 0,
      flat_bonus: data?.flat_bonus || 0,
      attack_type: data?.attack_type || AttackType.Melee,
      action: data?.action || null,
      is_smart: data?.is_smart || false,
      attack_rolls: data?.attack_rolls || { roll: "", targeted: [] },
      attack_results: data?.attack_results || [],
      hit_results: data?.hit_results || [],
      reroll_data: data?.reroll_data || "",
      tags: data?.tags || [],
    };

    super(uuid, initialData);
  }
}

// TODO: make a type for weapon attack flow state which narrows the type on item??

/**
 * Flow for rolling weapon attacks against one or more targets
 */
export class WeaponAttackFlow extends Flow<LancerFlowState.WeaponRollData> {
  static steps = [
    "initAttackData",
    "checkItemDestroyed",
    "checkWeaponLoaded",
    "checkItemLimited",
    "checkItemCharged",
    "setAttackTags",
    "setAttackTargets",
    "showAttackHUD",
    "rollAttacks",
    "applySelfHeat",
    "updateItemAfterAction",
    "setAttackEffects",
    "printAttackCard",
    // TODO: Start damage flow after attack
    // "applyDamage"
  ];

  constructor(uuid: UUIDRef | LancerItem | LancerActor, data?: Partial<LancerFlowState.WeaponRollData>) {
    // Initialize data if not provided
    const initialData: LancerFlowState.WeaponRollData = {
      type: "weapon",
      title: data?.title || "",
      roll_str: data?.roll_str || "",
      grit: data?.grit || 0,
      flat_bonus: data?.flat_bonus || 0,
      attack_type: data?.attack_type || AttackType.Melee,
      action: data?.action || null,
      is_smart: data?.is_smart || false,
      attack_rolls: data?.attack_rolls || { roll: "", targeted: [] },
      attack_results: data?.attack_results || [],
      hit_results: data?.hit_results || [],
      reroll_data: data?.reroll_data || "",
      tags: data?.tags || [],
    };

    super(uuid, initialData);
    if (!this.state.item) {
      throw new TypeError(`WeaponAttackFlow requires an Item, but none was provided`);
    }
  }

  async begin(data?: LancerFlowState.WeaponRollData): Promise<boolean> {
    if (!this.state.item || !this.state.item.is_weapon()) {
      console.log(`${lp} WeaponAttackFlow aborted - no weapon provided!`);
      return false;
    }
    return await super.begin(data);
  }
}

export async function initAttackData(
  state: FlowState<
    LancerFlowState.AttackRollData | LancerFlowState.WeaponRollData | LancerFlowState.TechAttackRollData
  >,
  options?: { title?: string; flat_bonus?: number; acc_diff?: AccDiffHudDataSerialized }
): Promise<boolean> {
  if (!state.data) throw new TypeError(`Attack flow state missing!`);
  // If we only have an actor, it's a basic attack
  if (!state.item) {
    const isTech = LancerFlowState.isTechRoll(state.data);
    const windowType = isTech ? AccDiffWindowType.Tech : AccDiffWindowType.Basic;
    const defaultTitle = isTech ? "TECH ATTACK" : "BASIC ATTACK";
    state.data.title = options?.title ?? defaultTitle;
    state.data.attack_type = isTech ? AttackType.Tech : AttackType.Melee; // Virtually all basic attacks are melee, so it's a good default
    state.data.flat_bonus = 0;
    if (state.actor.is_pilot() || state.actor.is_mech() || state.actor.is_deployable()) {
      if (isTech) state.data.grit = state.actor.system.tech_attack;
      else state.data.grit = state.actor.system.grit;
    } else if (state.actor.is_npc()) {
      state.data.grit = isTech ? state.actor.system.sys : state.actor.system.tier;
    }
    // TODO: check bonuses for flat attack bonus

    state.data.acc_diff = options?.acc_diff
      ? AccDiffHudData.fromObject(options.acc_diff)
      : AccDiffHudData.fromParams(
          state.actor,
          windowType,
          [],
          state.data.title,
          Array.from(game.user!.targets),
          state.data.grit,
          state.data.flat_bonus
        );
    return true;
  } else {
    // This title works for everything
    state.data.title = options?.title || state.data.title || state.item.name!;
    if (state.item.is_mech_weapon()) {
      if (!state.actor.is_mech()) {
        ui.notifications?.warn("Non-mech cannot fire a mech weapon!");
        return false;
      }
      if (!state.actor.system.pilot?.value) {
        ui.notifications?.warn("Cannot fire a weapon on a non-piloted mech!");
        return false;
      }
      let profile = state.item.system.active_profile;
      state.data.attack_type = profile.type === WeaponType.Melee ? AttackType.Melee : AttackType.Ranged;
      if (state.data.attack_type === AttackType.Ranged) {
        state.data.flat_bonus = state.actor.system.bonuses.flat.ranged_attack || 0;
      }
      state.data.grit = state.actor.system.grit;
      // Add a +1 flat bonus for Death's Heads. This data isn't in lancer-data, so has to be hard-coded.
      if (state.actor.system.loadout.frame?.value?.system.lid == "mf_deaths_head") {
        // Death's Head gets +1 to all ranged attacks, which means if there's a non-threat range, it gets the bonus
        if (state.item.system.active_profile.range.some(r => r.type !== RangeType.Threat)) {
          state.data.flat_bonus += 1;
        }
      }

      state.data.acc_diff = options?.acc_diff
        ? AccDiffHudData.fromObject(options.acc_diff)
        : AccDiffHudData.fromParams(
            state.item,
            AccDiffWindowType.Weapon,
            profile.all_tags,
            state.data.title,
            Array.from(game.user!.targets),
            state.data.grit,
            state.data.flat_bonus
          );
      return true;
    } else if (state.item.is_mech_system()) {
      // Tech attack system
      if (!state.actor.is_mech()) {
        ui.notifications?.warn("Non-mech cannot use a mech system!");
        return false;
      }
      if (!state.actor.system.pilot?.value) {
        ui.notifications?.warn("Cannot use a system on a non-piloted mech!");
        return false;
      }
      state.data.grit = state.actor.system.tech_attack;
      // TODO: check bonuses for flat attack bonus
      state.data.acc_diff = options?.acc_diff
        ? AccDiffHudData.fromObject(options.acc_diff)
        : AccDiffHudData.fromParams(
            state.item,
            undefined,
            state.item.system.tags,
            state.data.title,
            Array.from(game.user!.targets),
            state.data.grit,
            state.data.flat_bonus
          );
      return true;
    } else if (state.item.is_npc_feature()) {
      if (!state.actor.is_npc()) {
        ui.notifications?.warn("Non-NPC cannot fire an NPC weapon!");
        return false;
      }
      let tier_index = (state.item.system.tier_override || state.actor.system.tier) - 1;

      let asWeapon = state.item.system as SystemTemplates.NPC.WeaponData;
      state.data.attack_type = asWeapon.weapon_type === WeaponType.Melee ? AttackType.Melee : AttackType.Ranged;
      state.data.grit = asWeapon.attack_bonus[tier_index] ?? 0;
      state.data.acc_diff = options?.acc_diff
        ? AccDiffHudData.fromObject(options.acc_diff)
        : AccDiffHudData.fromParams(
            state.item,
            AccDiffWindowType.Weapon,
            asWeapon.tags,
            state.data.title,
            Array.from(game.user!.targets),
            state.data.grit,
            state.data.flat_bonus,
            asWeapon.accuracy[tier_index] ?? 0
          );
      return true;
    } else if (state.item.is_pilot_weapon()) {
      if (!state.actor.is_pilot()) {
        ui.notifications?.warn("Non-pilot cannot fire a pilot weapon!");
        return false;
      }
      // Pilot weapons don't have types like Mech/NPC weapons, so we need to check the ranges instead
      state.data.attack_type = state.item.system.range.some(r => ![RangeType.Threat, RangeType.Thrown].includes(r.type))
        ? AttackType.Ranged
        : AttackType.Melee;
      state.item.system;
      state.data.grit = state.actor.system.grit;
      state.data.acc_diff = options?.acc_diff
        ? AccDiffHudData.fromObject(options.acc_diff)
        : AccDiffHudData.fromParams(
            state.item,
            AccDiffWindowType.Weapon,
            state.item.system.tags,
            state.data.title,
            Array.from(game.user!.targets),
            state.data.grit,
            state.data.flat_bonus
          );
      return true;
    }
    ui.notifications!.error(`Error in attack flow - ${state.item.name} is an invalid type!`);
    return false;
  }
}

export async function checkWeaponLoaded(state: FlowState<LancerFlowState.WeaponRollData>): Promise<boolean> {
  // If this automation option is not enabled, skip the check.
  const { limited_loading, attacks } = game.settings.get(game.system.id, LANCER.setting_automation);
  if (!limited_loading && attacks) return true;
  if (!state.item || (!state.item.is_mech_weapon() && !state.item.is_pilot_weapon() && !state.item.is_npc_feature())) {
    return false;
  }
  if (state.item.isLoading() && !state.item.system.loaded) {
    ui.notifications!.warn(`Weapon ${state.item.name} is not loaded!`);
    return false;
  }
  return true;
}

// TODO: AccDiffHudData does not allow changing tags after instantiation
export async function setAttackTags(
  state: FlowState<
    LancerFlowState.AttackRollData | LancerFlowState.WeaponRollData | LancerFlowState.TechAttackRollData
  >,
  options?: {}
): Promise<boolean> {
  if (!state.data) throw new TypeError(`Attack flow state missing!`);
  // Basic attacks have no tags, just continue on.
  if (!state.item) return true;
  let success = false;
  if (state.item.is_mech_weapon()) {
    let profile = state.item.system.active_profile;
    state.data.tags = profile.all_tags;
    success = true;
  } else {
    state.data.tags = state.item.getTags() ?? [];
    success = true;
  }
  if (success && state.data.tags) {
    // Check for self-heat
    const selfHeatTags = state.data.tags.filter(t => t.is_selfheat);
    if (!!(selfHeatTags && selfHeatTags.length)) state.data.self_heat = selfHeatTags[0].val;
    // Check for smart
    const smartTags = state.data.tags.filter(t => t.is_smart);
    if (!!(smartTags && smartTags.length)) state.data.is_smart = true;
  }
  return success;
}

export async function setAttackTargets(
  state: FlowState<
    LancerFlowState.AttackRollData | LancerFlowState.WeaponRollData | LancerFlowState.TechAttackRollData
  >,
  options?: {}
): Promise<boolean> {
  if (!state.data) throw new TypeError(`Attack flow state missing!`);
  // TODO: AccDiffHudData does not facilitate setting targets after instantiation?
  // TODO: set metadata for origin and target spaces
  // state.data.target_spaces;
  return true;
}

export async function showAttackHUD(
  state: FlowState<
    LancerFlowState.AttackRollData | LancerFlowState.WeaponRollData | LancerFlowState.TechAttackRollData
  >,
  options?: {}
): Promise<boolean> {
  if (!state.data) throw new TypeError(`Attack flow state missing!`);
  try {
    state.data.acc_diff = await openSlidingHud("attack", state.data.acc_diff!);
    state.data.grit = state.data.acc_diff.base.grit;
    state.data.flat_bonus = state.data.acc_diff.base.flatBonus;
  } catch (_e) {
    // User hit cancel, abort the flow.
    return false;
  }
  return true;
}

export async function rollAttacks(
  state: FlowState<
    LancerFlowState.AttackRollData | LancerFlowState.WeaponRollData | LancerFlowState.TechAttackRollData
  >,
  options?: {}
): Promise<boolean> {
  if (!state.data) throw new TypeError(`Attack flow state missing!`);
  if (!state.data.acc_diff) throw new TypeError(`Accuracy/difficulty data missing!`);

  state.data.attack_rolls = attackRolls(state.data.grit + state.data.flat_bonus, state.data.acc_diff);

  if (
    game.settings.get(game.system.id, LANCER.setting_automation).attacks &&
    state.data.attack_rolls.targeted.length > 0
  ) {
    let data = await Promise.all(
      state.data.attack_rolls.targeted.map(async targetingData => {
        let target = targetingData.target;
        let actor = target.actor as LancerActor;
        // This is really async despit the warning
        let attack_roll = await new Roll(targetingData.roll).evaluate();
        // @ts-expect-error DSN options aren't typed
        attack_roll.dice.forEach(d => (d.options.rollOrder = 1));
        const attack_tt = await attack_roll.getTooltip();

        //Pure d20 roll for Brutal_1
        const raw_attack_result = attack_roll.dice[0].results[0].result;

        if (targetingData.usedLockOn && game.user!.isGM) {
          targetingData.target.actor?.effectHelper.removeActiveEffect("lockon");
        }

        return {
          attack: { roll: attack_roll, tt: attack_tt },
          hit: {
            target,
            base: String(raw_attack_result).padStart(2, "0"),
            total: String(attack_roll.total).padStart(2, "0"),
            usedLockOn: !!targetingData.usedLockOn,
            hit: await checkForHit(state.data?.is_smart ?? false, attack_roll, actor),
            crit: state.data?.attack_type !== AttackType.Tech && (attack_roll.total || 0) >= 20,
          },
        };
      })
    );

    state.data.attack_results = data.map(d => d.attack);
    state.data.hit_results = data.map(d => d.hit);
    return true;
  } else {
    // This is really async despit the warning
    let attack_roll = await new Roll(state.data.attack_rolls.roll).evaluate();
    const attack_tt = await attack_roll.getTooltip();
    state.data.attack_results = [{ roll: attack_roll, tt: attack_tt }];
    state.data.hit_results = [];
    return true;
  }
}

export async function clearTargets(
  state: FlowState<LancerFlowState.AttackRollData | LancerFlowState.WeaponRollData | LancerFlowState.DamageRollData>
): Promise<boolean> {
  if (!state.data) throw new TypeError(`Flow state missing!`);
  for (const t of game.user?.targets || []) {
    t.setTarget(false, { releaseOthers: false });
  }
  return true;
}

//This has been moved in order to take into account effects from talents
export async function setAttackEffects(
  state: FlowState<
    LancerFlowState.AttackRollData | LancerFlowState.WeaponRollData | LancerFlowState.TechAttackRollData
  >,
  options?: {}
): Promise<boolean> {
  if (!state.data) throw new TypeError(`Attack flow state missing!`);
  if (!state.data.acc_diff) throw new TypeError(`Accuracy/difficulty data missing!`);

  state.data.talent_effects = state.data.talent_effects ?? [];
  const acc_diff = state.data.acc_diff;
  const basePlugins = Object.values(acc_diff.base.plugins);
  const weaponPlugins = Object.values(acc_diff.weapon.plugins);
  const targetPlugins = acc_diff.targets[0] !== undefined ? Object.values(acc_diff.targets[0].plugins) : [];
  const plugins = basePlugins.concat(weaponPlugins, targetPlugins);
  plugins.forEach(plugin => {
    if (!plugin.talentEffect) return;
    state.data!.talent_effects!.push(plugin.talentEffect);
  });

  // Basic attacks have no tags, just continue on.
  if (!state.item) return true;
  if (state.item.is_mech_weapon()) {
    let profile = state.item.system.active_profile;
    state.data.effect = profile.effect;
    state.data.on_attack = profile.on_attack;
    state.data.on_hit = profile.on_hit;
    state.data.on_crit = profile.on_crit;
    return true;
  } else if (state.item.is_mech_system()) {
    state.data.effect = state.data.action?.detail ?? state.item.system.effect;
    return true;
  } else if (state.item.is_talent()) {
    state.data.effect = state.data.action?.detail ?? "";
    return true;
  } else if (state.item.is_frame()) {
    // Frame attacks should only be tech attacks from core systems
    state.data.effect = state.data.action?.detail ?? state.item.system.core_system.active_effect;
    return true;
  } else if (state.item.is_npc_feature()) {
    let asWeapon = state.item.system as SystemTemplates.NPC.WeaponData;
    state.data.effect = asWeapon.effect;
    state.data.on_hit = asWeapon.on_hit;
    return true;
  } else if (state.item.is_pilot_weapon()) {
    state.data.effect = state.item.system.effect;
    return true;
  }
  ui.notifications!.error(`Error in attack flow - ${state.item.name} is an invalid type!`);
  return false;
}

export async function printAttackCard(
  state: FlowState<LancerFlowState.AttackRollData | LancerFlowState.WeaponRollData>,
  options?: { template?: string }
): Promise<boolean> {
  if (!state.data) throw new TypeError(`Attack flow state missing!`);
  const template = options?.template || `systems/${game.system.id}/templates/chat/attack-card.hbs`;
  const flags: { attackData: AttackFlag } = {
    attackData: {
      origin: state.actor.id!,
      attackerUuid: state.actor.uuid!,
      attackerItemUuid: state.item?.uuid,
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
  state.data.defense = state.data.is_smart ? "E-DEF" : "EVASION";
  // Add roll data to the hit results for the HBS template
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
  await renderTemplateStep(state.actor, template, templateData, flags);

  //Update history
  if (state.data.acc_diff !== undefined) {
    game.combat?.receiveHistoryAction(state.data);
  }
  console.log(getHistory());
  return true;
}

// If user is GM, apply status changes to attacked tokens
Hooks.on("createChatMessage", async (cm: ChatMessage, options: any, id: string) => {
  // Consume lock-on if we are the primary GM
  if (!game.users?.activeGM?.isSelf) return;
  const atkData = cm.getFlag(game.system.id, "attackData");
  if (!atkData || !atkData.targets) return;
  atkData.targets.forEach(target => {
    // Find the target in this scene
    const tokenActor = game.canvas.scene?.tokens.find(token => token.uuid === target.uuid)?.actor;
    if (!tokenActor) return;
    const statusToApply = [];
    const statusToRemove = [];
    for (const [stat, val] of Object.entries(target.setConditions || {})) {
      if (val) {
        // Apply status
        console.log(`(Not) Applying ${stat} to Token ${target.uuid}`);
        // TODO
      } else {
        // Remove status
        console.log(`Removing ${stat} from Token ${target.uuid}`);
        statusToRemove.push(stat);
      }
    }
    tokenActor?.effectHelper.removeActiveEffects(statusToRemove);
  });
});
