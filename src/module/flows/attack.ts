// Import TypeScript modules
import { LANCER } from "../config";
import { getAutomationOptions } from "../settings";
import { LancerItem } from "../item/lancer-item";
import { LancerActor, LancerNPC } from "../actor/lancer-actor";
import { checkForHit } from "../helpers/automation/targeting";
import { AccDiffData, AccDiffDataSerialized, RollModifier } from "../helpers/acc_diff";
import { renderTemplateStep } from "./_render";
import { SystemTemplates } from "../system-template";
import { UUIDRef } from "../source-template";
import { LancerFlowState } from "./interfaces";
import { openSlidingHud } from "../helpers/slidinghud";
import { Flow, FlowState, Step } from "./flow";
import { AttackType, RangeType, WeaponType } from "../enums";
import { Range } from "../models/bits/range";

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
  return plugins.sort((p, q) => q.rollPrecedence - p.rollPrecedence).reduce((acc, p) => p.modifyRoll(acc), str);
}

/** Create the attack roll(s) for a given attack configuration */
export function attackRolls(flat_bonus: number, acc_diff: AccDiffData): LancerFlowState.AttackRolls {
  let perRoll = Object.values(acc_diff.weapon.plugins);
  let base = perRoll.concat(Object.values(acc_diff.base.plugins));
  return {
    roll: applyPluginsToRoll(rollStr(flat_bonus, acc_diff.base.total), base),
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

type AttackFlag = {
  origin: string;
  targets: {
    id: string;
    setConditions?: object; // keys are statusEffect ids, values are boolean to indicate whether to apply or remove
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
  flowSteps.set("rollDamages", rollDamages);
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
    // TODO: think about whether/how basic attacks should be able to do damage (siege ram, I'm lookin' at you)
    // "rollDamages",
    "applySelfHeat",
    "printAttackCard",
  ];

  constructor(uuid: UUIDRef | LancerItem | LancerActor, data?: Partial<LancerFlowState.AttackRollData>) {
    // Initialize data if not provided
    const initialData: LancerFlowState.AttackRollData = {
      type: "attack",
      title: data?.title || "",
      roll_str: data?.roll_str || "",
      flat_bonus: data?.flat_bonus || 0,
      attack_type: data?.attack_type || AttackType.Melee,
      action: data?.action || null,
      is_smart: data?.is_smart || false,
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
    "setAttackEffects",
    "setAttackTargets",
    "showAttackHUD",
    "rollAttacks",
    // TODO: move damage rolling to damage flow
    "rollDamages",
    "applySelfHeat",
    "updateItemAfterAction",
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
      flat_bonus: data?.flat_bonus || 0,
      attack_type: data?.attack_type || AttackType.Melee,
      action: data?.action || null,
      is_smart: data?.is_smart || false,
      attack_rolls: data?.attack_rolls || { roll: "", targeted: [] },
      attack_results: data?.attack_results || [],
      hit_results: data?.hit_results || [],
      damage_results: data?.damage_results || [],
      crit_damage_results: data?.crit_damage_results || [],
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
  options?: { title?: string; flat_bonus?: number; acc_diff?: AccDiffDataSerialized }
): Promise<boolean> {
  if (!state.data) throw new TypeError(`Attack flow state missing!`);
  // If we only have an actor, it's a basic attack
  if (!state.item) {
    const isTech = LancerFlowState.isTechRoll(state.data);
    const defaultTitle = isTech ? "TECH ATTACK" : "BASIC ATTACK";
    state.data.title = options?.title ?? defaultTitle;
    state.data.attack_type = isTech ? AttackType.Tech : AttackType.Melee; // Virtually all basic attacks are melee, so it's a good default
    state.data.flat_bonus = 0;
    if (state.actor.is_pilot() || state.actor.is_mech() || state.actor.is_deployable()) {
      state.data.flat_bonus = isTech ? state.actor.system.tech_attack : state.actor.system.grit;
    } else if (state.actor.is_npc()) {
      state.data.flat_bonus = isTech ? state.actor.system.sys : state.actor.system.tier;
    }
    // TODO: check bonuses for flat attack bonus
    state.data.acc_diff = options?.acc_diff
      ? AccDiffData.fromObject(options.acc_diff)
      : AccDiffData.fromParams(state.actor, [], state.data.title, Array.from(game.user!.targets));
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
      state.data.flat_bonus = state.actor.system.grit;
      // Add a +1 flat bonus for Death's Heads. This data isn't in lancer-data, so has to be hard-coded.
      if (state.actor.system.loadout.frame?.value?.system.lid == "mf_deaths_head") {
        // Death's Head gets +1 to all ranged attacks, which means if there's a non-threat range, it gets the bonus
        if (state.item.system.active_profile.range.some(r => r.type !== RangeType.Threat)) {
          state.data.flat_bonus += 1;
        }
      }
      state.data.acc_diff = options?.acc_diff
        ? AccDiffData.fromObject(options.acc_diff)
        : AccDiffData.fromParams(state.item, profile.all_tags, state.data.title, Array.from(game.user!.targets));
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
      state.data.flat_bonus = state.actor.system.tech_attack;
      // TODO: check bonuses for flat attack bonus
      state.data.acc_diff = options?.acc_diff
        ? AccDiffData.fromObject(options.acc_diff)
        : AccDiffData.fromParams(state.item, state.item.system.tags, state.data.title, Array.from(game.user!.targets));
      return true;
    } else if (state.item.is_npc_feature()) {
      if (!state.actor.is_npc()) {
        ui.notifications?.warn("Non-NPC cannot fire an NPC weapon!");
        return false;
      }
      let tier_index = (state.item.system.tier_override || state.actor.system.tier) - 1;

      let asWeapon = state.item.system as SystemTemplates.NPC.WeaponData;
      state.data.attack_type = asWeapon.weapon_type === WeaponType.Melee ? AttackType.Melee : AttackType.Ranged;
      state.data.flat_bonus = asWeapon.attack_bonus[tier_index] ?? 0;
      state.data.acc_diff = options?.acc_diff
        ? AccDiffData.fromObject(options.acc_diff)
        : AccDiffData.fromParams(
            state.item,
            asWeapon.tags,
            state.data.title,
            Array.from(game.user!.targets),
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
      state.data.flat_bonus = state.actor.system.grit;
      state.data.acc_diff = options?.acc_diff
        ? AccDiffData.fromObject(options.acc_diff)
        : AccDiffData.fromParams(state.item, state.item.system.tags, state.data.title, Array.from(game.user!.targets));
      return true;
    }
    ui.notifications!.error(`Error in attack flow - ${state.item.name} is an invalid type!`);
    return false;
  }
}

export async function checkWeaponLoaded(state: FlowState<LancerFlowState.WeaponRollData>): Promise<boolean> {
  // If this automation option is not enabled, skip the check.
  if (!getAutomationOptions().limited_loading && getAutomationOptions().attacks) return true;
  if (!state.item || (!state.item.is_mech_weapon() && !state.item.is_pilot_weapon() && !state.item.is_npc_feature())) {
    return false;
  }
  if (state.item.isLoading() && !state.item.system.loaded) {
    ui.notifications!.warn(`Weapon ${state.item.name} is not loaded!`);
    return false;
  }
  return true;
}

// TODO: AccDiffData does not allow changing tags after instantiation
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
    // Check for overkill
    const overkillTags = state.data.tags.filter(t => t.is_overkill);
    if (!!(overkillTags && overkillTags.length)) state.data.overkill = true;
    // Check for smart
    const smartTags = state.data.tags.filter(t => t.is_smart);
    if (!!(smartTags && smartTags.length)) state.data.is_smart = true;
  }
  return success;
}

export async function setAttackEffects(
  state: FlowState<
    LancerFlowState.AttackRollData | LancerFlowState.WeaponRollData | LancerFlowState.TechAttackRollData
  >,
  options?: {}
): Promise<boolean> {
  if (!state.data) throw new TypeError(`Attack flow state missing!`);
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

export async function setAttackTargets(
  state: FlowState<
    LancerFlowState.AttackRollData | LancerFlowState.WeaponRollData | LancerFlowState.TechAttackRollData
  >,
  options?: {}
): Promise<boolean> {
  if (!state.data) throw new TypeError(`Attack flow state missing!`);
  // TODO: AccDiffData does not facilitate setting targets after instantiation?
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

  state.data.attack_rolls = attackRolls(state.data.flat_bonus, state.data.acc_diff);

  if (getAutomationOptions().attacks && state.data.attack_rolls.targeted.length > 0) {
    let data = await Promise.all(
      state.data.attack_rolls.targeted.map(async targetingData => {
        let target = targetingData.target;
        let actor = target.actor as LancerActor;
        // This is really async despit the warning
        let attack_roll = await new Roll(targetingData.roll).evaluate();
        // @ts-expect-error DSN options aren't typed
        attack_roll.dice.forEach(d => (d.options.rollOrder = 1));
        const attack_tt = await attack_roll.getTooltip();

        if (targetingData.usedLockOn && game.user!.isGM) {
          targetingData.target.actor?.effectHelper.removeActiveEffect("lockon");
        }

        return {
          attack: { roll: attack_roll, tt: attack_tt },
          hit: {
            token: { name: target.name!, img: target.actor?.img ?? "" },
            total: String(attack_roll.total).padStart(2, "0"),
            hit: await checkForHit(state.data?.is_smart ?? false, attack_roll, actor),
            crit: (attack_roll.total || 0) >= 20,
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

export async function rollDamages(state: FlowState<LancerFlowState.WeaponRollData>, options?: {}): Promise<boolean> {
  if (!state.data) throw new TypeError(`Attack flow state missing!`);

  if (state.item?.is_mech_weapon()) {
    const profile = state.item.system.active_profile;
    state.data.damage = profile.damage;
    state.data.bonus_damage = profile.bonus_damage;
  } else if (state.item?.is_npc_feature() && state.item.system.type === "Weapon") {
    state.data.damage =
      state.item.system.damage[state.item.system.tier_override || (state.actor as LancerNPC).system.tier - 1];
  } else if (state.item?.is_pilot_weapon()) {
    state.data.damage = state.item.system.damage;
  } else {
    ui.notifications!.warn(
      state.item ? `Item ${state.item.id} is not a weapon!` : `Weapon attack flow is missing item!`
    );
    return false;
  }

  const has_normal_hit =
    (state.data.hit_results.length === 0 && state.data.attack_results.some(attack => (attack.roll.total ?? 0) < 20)) ||
    state.data.hit_results.some(hit => hit.hit && !hit.crit);
  const has_crit_hit =
    (state.data.hit_results.length === 0 && state.data.attack_results.some(attack => (attack.roll.total ?? 0) >= 20)) ||
    state.data.hit_results.some(hit => hit.crit);

  // TODO: move damage rolling into its own flow
  // If we hit evaluate normal damage, even if we only crit, we'll use this in
  // the next step for crits
  if (has_normal_hit || has_crit_hit) {
    for (const x of state.data.damage ?? []) {
      if (!x.val || x.val == "0") continue; // Skip undefined and zero damage
      let damageRoll: Roll | undefined = new Roll(x.val);
      // Add overkill if enabled.
      if (state.data.overkill) {
        damageRoll.terms.forEach(term => {
          if (term instanceof Die) term.modifiers = ["x1", `kh${term.number}`].concat(term.modifiers);
        });
      }

      // This is really async despit the warning
      await damageRoll.evaluate();
      // @ts-expect-error DSN options aren't typed
      damageRoll.dice.forEach(d => (d.options.rollOrder = 2));
      const tooltip = await damageRoll.getTooltip();

      state.data.damage_results.push({
        roll: damageRoll,
        tt: tooltip,
        d_type: x.type,
      });
    }
  }

  // If there is at least one crit hit, evaluate crit damage
  if (has_crit_hit) {
    // NPCs do not follow the normal crit rules. They only get bonus damage from Deadly etc...
    if (!state.actor.is_npc()) {
      await Promise.all(
        state.data.damage_results.map(async result => {
          const c_roll = await getCritRoll(result.roll);
          // @ts-expect-error DSN options aren't typed
          c_roll.dice.forEach(d => (d.options.rollOrder = 2));
          const tt = await c_roll.getTooltip();
          state.data!.crit_damage_results.push({
            roll: c_roll,
            tt,
            d_type: result.d_type,
          });
        })
      );
    } else {
      state.data!.crit_damage_results = state.data!.damage_results;
      // TODO: automation for Deadly
      // Find any Deadly features and add a d6 for each
    }
  }
  // If there were only crit hits and no normal hits, don't show normal damage in the results
  state.data.damage_results = has_normal_hit ? state.data.damage_results : [];

  // Calculate overkill heat
  if (state.data.overkill) {
    state.data.overkill_heat = 0;
    (has_crit_hit ? state.data.crit_damage_results : state.data.damage_results).forEach(result => {
      result.roll.terms.forEach(p => {
        if (p instanceof DiceTerm) {
          p.results.forEach(r => {
            if (r.exploded) state.data!.overkill_heat! += 1;
          });
        }
      });
    });
  }
  return true;
}

export async function printAttackCard(
  state: FlowState<LancerFlowState.AttackRollData | LancerFlowState.WeaponRollData>,
  options?: { template?: string }
): Promise<boolean> {
  if (!state.data) throw new TypeError(`Attack flow state missing!`);
  const template = options?.template || `systems/${game.system.id}/templates/chat/attack-card.hbs`;
  const flags = {
    attackData: {
      origin: state.actor.id,
      targets: state.data.attack_rolls.targeted.map(t => {
        return { id: t.target.id, setConditions: !!t.usedLockOn ? { lockon: !t.usedLockOn } : undefined };
      }),
    },
  };
  state.data.defense = state.data.is_smart ? "E-DEF" : "EVASION";
  const templateData = {
    ...state.data,
    item_uuid: state.item?.uuid,
    profile: state.item?.currentProfile(),
  };
  await renderTemplateStep(state.actor, template, templateData, flags);
  return true;
}

/**
 * Given an evaluated roll, create a new roll that doubles the dice and reuses
 * the dice from the original roll.
 * @param normal The orignal Roll
 * @returns An evaluated Roll
 */
export async function getCritRoll(normal: Roll) {
  const t_roll = new Roll(normal.formula);
  // This is really async despit the warning
  await t_roll.evaluate();

  const dice_rolls = Array<DiceTerm.Result[]>(normal.terms.length);
  const keep_dice: number[] = Array(normal.terms.length).fill(0);
  normal.terms.forEach((term, i) => {
    if (term instanceof Die) {
      dice_rolls[i] = term.results.map(r => {
        return { ...r };
      });
      const kh = parseInt(term.modifiers.find(m => m.startsWith("kh"))?.substr(2) ?? "0");
      keep_dice[i] = kh || term.number;
    }
  });
  t_roll.terms.forEach((term, i) => {
    if (term instanceof Die) {
      dice_rolls[i].push(...term.results);
    }
  });

  // Just hold the active results in a sorted array, then mutate them
  const actives: DiceTerm.Result[][] = Array(normal.terms.length).fill([]);
  dice_rolls.forEach((dice, i) => {
    actives[i] = dice.filter(d => d.active).sort((a, b) => a.result - b.result);
  });
  actives.forEach((dice, i) =>
    dice.forEach((d, j) => {
      d.active = j >= keep_dice[i];
      d.discarded = j < keep_dice[i];
    })
  );

  // We can rebuild him. We have the technology. We can make him better than he
  // was. Better, stronger, faster
  const terms = normal.terms.map((t, i) => {
    if (t instanceof Die) {
      return new Die({
        ...t,
        modifiers: (t.modifiers.filter(m => m.startsWith("kh")).length
          ? t.modifiers
          : [...t.modifiers, `kh${t.number}`]) as (keyof Die.Modifiers)[],
        results: dice_rolls[i],
        number: t.number * 2,
      });
    } else {
      return t;
    }
  });

  return Roll.fromTerms(terms);
}

// If user is GM, apply status changes to attacked tokens
Hooks.on("createChatMessage", async (cm: ChatMessage, options: any, id: string) => {
  // Consume lock-on if we are a GM
  if (!game.user?.isGM) return;
  const atkData: AttackFlag = cm.getFlag(game.system.id, "attackData") as any;
  if (!atkData || !atkData.targets) return;
  atkData.targets.forEach(target => {
    // Find the target in this scene
    const tokenActor = game.canvas.scene?.tokens.find(token => token.id === target.id)?.actor;
    if (!tokenActor) return;
    const statusToApply = [];
    const statusToRemove = [];
    for (const [stat, val] of Object.entries(target.setConditions || {})) {
      if (val) {
        // Apply status
        console.log(`(Not) Applying ${stat} to Token ${target.id}`);
        // TODO
      } else {
        // Remove status
        console.log(`Removing ${stat} from Token ${target.id}`);
        statusToRemove.push(stat);
      }
    }
    tokenActor?.effectHelper.removeActiveEffects(statusToRemove);
  });
});
