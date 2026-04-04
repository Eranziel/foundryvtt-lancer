import { AppliedDamage } from "../actor/damage-calc";
import { LancerActor } from "../actor/lancer-actor";
import { RollModifier } from "../apps/damage/plugins/plugin";
import { DamageHudData, DamageHudTarget, HitQuality } from "../apps/damage";
import { openSlidingHud } from "../apps/slidinghud";
import { DamageType } from "../enums";
import { LancerItem } from "../item/lancer-item";
import { Damage, DamageData } from "../models/bits/damage";
import { UUIDRef } from "../source-template";
import { LancerToken, LancerTokenDocument } from "../token";
import { renderTemplateStep } from "./_render";
import { Flow, FlowState, Step } from "./flow";
import { LancerFlowState } from "./interfaces";

export type DamageFlag = {
  damageResults: LancerFlowState.DamageResultSerialized[];
  critDamageResults: LancerFlowState.DamageResultSerialized[];
  targetDamageResults: LancerFlowState.DamageTargetResultSerialized[];
  ap: boolean;
  paracausal: boolean;
  half_damage: boolean;
};

export function registerDamageSteps(flowSteps: Map<string, Step<any, any> | Flow<any>>) {
  flowSteps.set("initDamageData", initDamageData);
  flowSteps.set("setDamageTags", setDamageTags);
  flowSteps.set("setDamageTargets", setDamageTargets);
  flowSteps.set("showDamageHUD", showDamageHUD);
  flowSteps.set("rollReliable", rollReliable);
  flowSteps.set("rollNormalDamage", rollNormalDamage);
  flowSteps.set("rollCritDamage", rollCritDamage);
  flowSteps.set("applyOverkillHeat", applyOverkillHeat);
  flowSteps.set("printDamageCard", printDamageCard);
}

/**
 * Flow for rolling and applying damage to a token, typically from a weapon attack
 */
export class DamageRollFlow extends Flow<LancerFlowState.DamageRollData> {
  static steps = [
    "initDamageData",
    "setDamageTags",
    "setDamageTargets",
    "showDamageHUD",
    "rollReliable",
    "rollNormalDamage",
    "rollCritDamage",
    "applyOverkillHeat",
    "printDamageCard",
  ];
  constructor(uuid: UUIDRef | LancerItem | LancerActor, data?: Partial<LancerFlowState.DamageRollData>) {
    const initialData: LancerFlowState.DamageRollData = {
      type: "damage",
      title: data?.title || "Damage Roll",
      configurable: data?.configurable !== undefined ? data.configurable : true,
      add_burn: data?.add_burn !== undefined ? data.add_burn : true,
      invade: data?.invade || false,
      tags: data?.tags || [],
      ap: data?.ap || false,
      paracausal: data?.paracausal || false,
      half_damage: data?.half_damage || false,
      overkill: data?.overkill || false,
      reliable: data?.reliable || false,
      tech: data?.tech || false,
      hit_results: data?.hit_results || [],
      has_normal_hit: data?.has_normal_hit || false,
      has_crit_hit: data?.has_crit_hit || false,
      damage: data?.damage || [],
      bonus_damage: data?.bonus_damage || [],
      damage_results: [],
      crit_damage_results: [],
      damage_total: 0,
      crit_total: 0,
      targets: [],
    };
    super(uuid, initialData);
  }
}

async function initDamageData(state: FlowState<LancerFlowState.DamageRollData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Damage flow state missing!`);

  // Convert any hit_result.target LancerTokenDocuments into LancerTokens
  state.data.hit_results = state.data.hit_results
    .map(hr => {
      let target: any = hr.target;
      if (target instanceof LancerTokenDocument) {
        const tokens = target.actor?.getActiveTokens() || [];
        if (!tokens.length) return null;
        target = tokens[0];
      } else if (!(target instanceof LancerToken)) {
        return null;
      }
      return {
        ...hr,
        target: target as LancerToken,
      };
    })
    .filter(hr => hr !== null) as LancerFlowState.HitResult[];

  // Check whether we have any normal or crit hits
  state.data.has_normal_hit =
    state.data.hit_results.length === 0 || state.data.hit_results.some(hit => hit.hit && !hit.crit);
  state.data.has_crit_hit = state.data.hit_results.length > 0 && state.data.hit_results.some(hit => hit.crit);

  return true;
}

async function setDamageTags(state: FlowState<LancerFlowState.DamageRollData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Damage flow state missing!`);
  // If the damage roll has no item, it has no tags.
  if (!state.item) return true;
  if (state.item.is_mech_weapon()) {
    const profile = state.item.system.active_profile;
    state.data.tags = profile.all_tags; // all_tags includes those added by mods
  } else if (state.item.is_mech_system()) {
    state.data.tags = state.item.system.tags;
  } else if (state.item.is_frame()) {
    state.data.tags = state.item.system.core_system.tags;
  } else if (state.item.is_talent()) {
    state.data.tags = [];
  } else if (state.item.is_npc_feature() && state.item.system.type === "Weapon") {
    state.data.tags = state.item.system.tags;
  } else if (state.item.is_pilot_weapon()) {
    state.data.tags = state.item.system.tags;
  } else {
    ui.notifications!.warn(`Item ${state.item.id} can't deal damage!`);
    return false;
  }

  state.data.ap = Boolean(state.data.tags.find(t => t.is_ap));
  state.data.overkill = Boolean(state.data.tags.find(t => t.is_overkill));
  const reliableTag = state.data.tags.find(t => t.is_reliable);
  if (reliableTag) {
    state.data.reliable = true;
    const reliableVal = parseInt(reliableTag.tierVal((state.actor.is_npc() && state.actor.system.tier) || 1) || "0");
    state.data.reliable_val = reliableVal;
  }
  return true;
}

async function setDamageTargets(state: FlowState<LancerFlowState.DamageRollData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Damage flow state missing!`);
  for (const hr of state.data.hit_results) {
    if (hr.target instanceof LancerToken) {
      hr.target.setTarget(true, { releaseOthers: false });
    }
  }
  return true;
}

async function showDamageHUD(state: FlowState<LancerFlowState.DamageRollData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Damage flow state missing!`);
  try {
    // Initialize damage HUD data from the flow state
    state.data.damage_hud_data = DamageHudData.fromParams(state.item ?? state.actor, {
      tags: state.data.tags,
      title: state.data.title,
      targets: Array.from(game.user!.targets),
      hitResults: state.data.hit_results,
      ap: state.data.ap,
      paracausal: state.data.paracausal,
      halfDamage: state.data.half_damage,
      starting: { damage: state.data.damage, bonusDamage: state.data.bonus_damage },
      tech: state.data.tech,
    });

    state.data.damage_hud_data = await openSlidingHud("damage", state.data.damage_hud_data!);

    // Filter state.data.hit_results down to those targets present in the HUD data
    state.data.hit_results = state.data.hit_results
      .filter(hr => state.data?.damage_hud_data?.targets.some(t => hr.target.id === t.target.id))
      .map(hr => {
        const hudTarget = state.data?.damage_hud_data?.targets.find(t => hr.target.id === t.target.id)!;
        return {
          ...hr,
          hit: hudTarget.quality === HitQuality.Hit,
          crit: hudTarget.quality === HitQuality.Crit,
        };
      });

    // Add hit results for any targets in HUD data which aren't in hit results already
    for (const t of state.data.damage_hud_data.targets) {
      if (state.data.hit_results.some(hr => hr.target.id === t.target.id)) continue;
      state.data.hit_results.push({
        target: t.target,
        base: "10",
        total: "10",
        hit: t.quality === HitQuality.Hit,
        crit: t.quality === HitQuality.Crit,
        usedLockOn: false,
      });
    }

    // Update has_normal_hit and has_crit_hit flags
    state.data.has_normal_hit =
      state.data.hit_results.length === 0 || state.data.hit_results.some(hr => hr.hit && !hr.crit);
    state.data.has_crit_hit = state.data.hit_results.some(hr => hr.crit);

    // Set damage flags from HUD
    state.data.ap = state.data.damage_hud_data.base.ap;
    state.data.paracausal = state.data.damage_hud_data.base.paracausal;
    state.data.half_damage = state.data.damage_hud_data.base.halfDamage;
    state.data.overkill = state.data.damage_hud_data.weapon?.overkill ?? false;
    state.data.reliable = state.data.damage_hud_data.weapon?.reliable ?? false;
    if (state.data.reliable) {
      state.data.reliable_val = state.data.damage_hud_data.weapon?.reliableValue ?? 0;
    }
  } catch (_e) {
    // User hit cancel, abort the flow.
    return false;
  }
  return true;
}

/**
 * Helper function to roll a single damage type and return a DamageResult object
 * suitable for insertion into the flow state.
 * @param damage The damage type and value to roll
 * @param bonus Whether this roll is for bonus damage
 * @param overkill Whether this roll should use the overkill rules
 * @returns A DamageResult object
 */
async function _rollDamage(
  damage: DamageData,
  bonus: boolean,
  overkill: boolean,
  plugins?: { [k: string]: any },
  target?: LancerToken
): Promise<LancerFlowState.DamageResult | null> {
  if (!damage.val || damage.val == "0") return null; // Skip undefined and zero damage

  //Apply plugins if there are any
  if (plugins !== undefined) {
    damage.val = Object.values(plugins)
      .sort((p: RollModifier, q: RollModifier) => q.rollPrecedence - p.rollPrecedence)
      .reduce((roll: string, p: RollModifier) => {
        if (!p.modifyRoll) return roll;
        return p.modifyRoll(roll);
      }, damage.val);
  }

  let damageRoll: Roll | undefined = new Roll(damage.val);
  // Add overkill if enabled.
  if (overkill) {
    damageRoll.terms.forEach(term => {
      if (term instanceof foundry.dice.terms.Die) term.modifiers = ["x1", `kh${term.number}`].concat(term.modifiers);
    });
  }

  await damageRoll.evaluate();
  // @ts-expect-error DSN options aren't typed
  damageRoll.dice.forEach(d => (d.options.rollOrder = 2));
  const tooltip = await damageRoll.getTooltip();

  return {
    roll: damageRoll,
    tt: tooltip,
    d_type: damage.type,
    bonus,
    target,
  };
}

/**
 * Collect all of the bonus damage rolls configured in a damage flow state.
 * @param state Flow state to get bonus damage from
 * @returns Array of bonus damage rolls, including target-specific bonus damage
 */
function _collectBonusDamage(state: FlowState<LancerFlowState.DamageRollData>): DamageData[] {
  if (!state.data) throw new TypeError(`Damage flow state missing!`);
  if (!state.data.damage_hud_data) throw new TypeError(`Damage configuration missing!`);
  const total: DamageData[] = state.data.bonus_damage?.slice() ?? [];
  // Find all the target-specific bonus damage rolls and add them to the base rolls
  // so they can be rolled together.
  for (const hudTarget of state.data.damage_hud_data.targets) {
    const hudTargetBonusDamage = hudTarget.total.bonusDamage.map(d => ({
      ...d,
      target: hudTarget.target,
    }));
    total.push(...hudTargetBonusDamage);
  }
  return total;
}

/**
 * Determine the final damage to use, given a raw damage roll and reliable roll.
 * Reliable acts as a floor for the final damage.
 * @param damage The raw damage roll results
 * @param reliable The reliable roll results
 * @returns Array of final damage types and values
 */
function _minReliable(
  damage: LancerFlowState.RolledDamage[],
  reliable: LancerFlowState.RolledDamage[]
): LancerFlowState.RolledDamage[] {
  const rawTotal = damage.reduce((acc, d) => acc + d.amount, 0);
  const reliableTotal = reliable.reduce((acc, d) => acc + d.amount, 0);
  if (rawTotal >= reliableTotal) return damage;
  return reliable;
}

/**
 * Convenience function to halve an array of damage types and values.
 * @param damage Array of damage types and values to halve
 * @returns Array of damage types with values halved
 */
function _halveDamage(damage: LancerFlowState.RolledDamage[]): LancerFlowState.RolledDamage[] {
  return damage.map(d => ({ type: d.type, amount: Math.ceil(d.amount / 2) }));
}

export async function rollReliable(state: FlowState<LancerFlowState.DamageRollData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Damage flow state missing!`);
  if (!state.data.damage_hud_data) throw new TypeError(`Damage configuration missing!`);

  //Awkawrd way of applying targetted damage conversion. Should be changed.
  const sharedTotal = state.data.damage_hud_data.sharedTotal;
  const totalDamage = sharedTotal.damage;
  const totalBonusDamage = sharedTotal.bonusDamage;
  state.data.damage = totalDamage;
  state.data.bonus_damage = totalBonusDamage;
  state.data.reliable_val = state.data.damage_hud_data.weapon?.reliableValue ?? 0;
  const allBonusDamage = _collectBonusDamage(state);

  // Sanity check - is there any damage to roll?
  if (!state.data.damage.length && !allBonusDamage.length && !state.data.reliable_val) {
    ui.notifications?.warn("No damage configured, skipping the roll.");
    return false;
  }

  // Include reliable data if the damage had a reliable configuration.
  // We need it even if there aren't any misses, since it's the floor for normal and crit damage.
  if (state.data.reliable && state.data.reliable_val) {
    state.data.reliable_results = state.data.reliable_results || [];
    // Find the first non-heat non-burn damage type
    for (const x of state.data.damage ?? []) {
      if (!x.val || x.val == "0") continue; // Skip undefined and zero damage
      const damageType = x.type === DamageType.Variable ? DamageType.Kinetic : x.type;
      const result = await _rollDamage({ type: damageType, val: state.data.reliable_val.toString() }, false, false);
      if (!result) continue;

      state.data.reliable_results.push(result);
      state.data.reliable_total = result.roll.total;
      break;
    }

    // Populate all missed targets with reliable damage
    for (const hitTarget of state.data.hit_results) {
      if (!hitTarget.hit && !hitTarget.crit) {
        const hudTarget = state.data.damage_hud_data.targets.find(t => t.target.id === hitTarget.target.id);
        const halfDamage = hudTarget ? hudTarget.halfDamage : state.data.half_damage;
        const rolledDamage = state.data.reliable_results.map(dr => ({ type: dr.d_type, amount: dr.roll.total || 0 }));
        state.data.targets.push({
          target: hitTarget.target,
          damage: halfDamage ? _halveDamage(rolledDamage) : rolledDamage,
          hit: hitTarget.hit,
          crit: hitTarget.crit,
          ap: hudTarget ? hudTarget.ap : state.data.ap,
          paracausal: hudTarget ? hudTarget.paracausal : state.data.paracausal,
          half_damage: halfDamage,
        });
      }
    }
  }
  return true;
}

export async function rollNormalDamage(state: FlowState<LancerFlowState.DamageRollData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Damage flow state missing!`);
  if (!state.data.damage_hud_data) throw new TypeError(`Damage configuration missing!`);

  // Convenience flag for whether this is a multi-target attack.
  // We'll use this later alongside a check for whether a given bonus damage result
  // is single-target; if not, the bonus damage needs to be halved.
  const multiTarget: boolean = state.data.damage_hud_data.targets.length > 1;
  const allBonusDamage = _collectBonusDamage(state);

  // Evaluate normal damage. Even if every hit was a crit, we'll use this in
  // the next step for crits
  if (state.data.has_normal_hit || state.data.has_crit_hit) {
    for (const x of state.data.damage ?? []) {
      const hudTarget = state.data.damage_hud_data.targets.find(x => x.target === x.target);
      const result = await _rollDamage(x, false, state.data.overkill, hudTarget?.plugins);
      if (result) state.data.damage_results.push(result);
    }

    for (const x of allBonusDamage ?? []) {
      const hudTarget = state.data.damage_hud_data.targets.find(x => x.target === x.target);
      const result = await _rollDamage(x, true, state.data.overkill, hudTarget?.plugins, x.target);
      if (result) {
        result.bonus = true;
        if (x.target) {
          result.target = x.target;
        }
        state.data.damage_results.push(result);
      }
    }

    for (const hitTarget of state.data.hit_results) {
      if (hitTarget.hit && !hitTarget.crit) {
        const targetDamage: { type: DamageType; amount: number }[] = [];
        for (const dr of state.data.damage_results) {
          if (dr.target && dr.target.document.uuid !== hitTarget.target.document.uuid) continue;
          if (multiTarget && dr.bonus && !dr.target) {
            // If this is bonus damage applied to multiple targets, halve it
            targetDamage.push({ type: dr.d_type, amount: Math.ceil((dr.roll.total || 0) / 2) });
          } else {
            targetDamage.push({ type: dr.d_type, amount: dr.roll.total || 0 });
          }
        }
        const hudTarget = state.data.damage_hud_data.targets.find(t => t.target.id === hitTarget.target.id);
        const halfDamage = hudTarget ? hudTarget.halfDamage : state.data.half_damage;
        const actualDamage = _minReliable(
          targetDamage,
          state.data.reliable_results?.map(rr => ({ type: rr.d_type, amount: rr.roll.total || 0 })) || []
        );
        state.data.targets.push({
          target: hitTarget.target,
          damage: halfDamage ? _halveDamage(actualDamage) : actualDamage,
          hit: hitTarget.hit,
          crit: hitTarget.crit,
          ap: hudTarget ? hudTarget.ap : state.data.ap,
          paracausal: hudTarget ? hudTarget.paracausal : state.data.paracausal,
          half_damage: halfDamage,
        });
      }
    }
  }
  return true;
}

export async function rollCritDamage(state: FlowState<LancerFlowState.DamageRollData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Damage flow state missing!`);
  if (!state.data.damage_hud_data) throw new TypeError(`Damage configuration missing!`);

  // Convenience flag for whether this is a multi-target attack.
  // We'll use this later alongside a check for whether a given bonus damage result
  // is single-target; if not, the bonus damage needs to be halved.
  const multiTarget: boolean = state.data.damage_hud_data.targets.length > 1;

  // If there is at least one crit hit, evaluate crit damage
  if (state.data.has_crit_hit) {
    // NPCs do not follow the normal crit rules. They only get bonus damage from Deadly etc...
    if (!state.actor.is_npc()) {
      const hitResults = state.data?.hit_results;
      const critDamage = await Promise.all(
        state.data.damage_results.map(async result => {
          // Skip this result if it was for a single target and that target was not critted
          if (
            result.target &&
            hitResults &&
            !hitResults.find(hr => (result.target?.document?.uuid ?? null) === hr.target?.document?.uuid)?.crit
          ) {
            return null;
          }

          const c_roll = await getCritRoll(result.roll);
          // @ts-expect-error DSN options aren't typed
          c_roll.dice.forEach(d => (d.options.rollOrder = 2));
          const tt = await c_roll.getTooltip();
          return {
            roll: c_roll,
            tt,
            d_type: result.d_type,
            bonus: result.bonus,
            target: result.target,
          };
        })
      );
      // Vite/TS isn't satisfied that filtering out null values will result in a DamageResult[]
      state.data.crit_damage_results = critDamage.filter(r => r !== null) as LancerFlowState.DamageResult[];
    } else {
      state.data.crit_damage_results = state.data.damage_results;
      // TODO: automation for Deadly
      // Find any Deadly features and add a d6 for each
    }

    for (const hitTarget of state.data.hit_results) {
      if (!hitTarget.crit) continue;
      const targetDamage: { type: DamageType; amount: number }[] = [];
      for (const dr of state.data.crit_damage_results) {
        if (dr.target && dr.target.document.uuid !== hitTarget.target.document.uuid) continue;
        if (multiTarget && dr.bonus && !dr.target) {
          // If this is bonus damage applied to multiple targets, halve it
          targetDamage.push({ type: dr.d_type, amount: Math.ceil((dr.roll.total || 0) / 2) });
        } else {
          targetDamage.push({ type: dr.d_type, amount: dr.roll.total || 0 });
        }
      }
      const hudTarget = state.data.damage_hud_data.targets.find(t => t.target.id === hitTarget.target.id);
      const halfDamage = hudTarget ? hudTarget.halfDamage : state.data.half_damage;
      const actualDamage = _minReliable(
        targetDamage,
        state.data.reliable_results?.map(rr => ({ type: rr.d_type, amount: rr.roll.total || 0 })) || []
      );
      state.data.targets.push({
        target: hitTarget.target,
        damage: halfDamage ? _halveDamage(actualDamage) : actualDamage,
        hit: hitTarget.hit,
        crit: hitTarget.crit,
        ap: hudTarget ? hudTarget.ap : state.data.ap,
        paracausal: hudTarget ? hudTarget.paracausal : state.data.paracausal,
        half_damage: hudTarget ? hudTarget.halfDamage : state.data.half_damage,
      });
    }
  }

  // If there were only crit hits and no normal hits, don't show normal damage in the results
  state.data.damage_results = state.data.has_normal_hit ? state.data.damage_results : [];

  return true;
}

async function applyOverkillHeat(state: FlowState<LancerFlowState.DamageRollData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Damage flow state missing!`);

  // Skip this step if the damage roll doesn't have overkill
  if (!state.data.overkill) return true;
  // Calculate overkill heat
  state.data.overkill_heat = 0;
  (state.data.has_crit_hit ? state.data.crit_damage_results : state.data.damage_results).forEach(result => {
    result.roll.terms.forEach(p => {
      if (p instanceof foundry.dice.terms.DiceTerm) {
        p.results.forEach(r => {
          if (r.exploded) state.data!.overkill_heat! += 1;
        });
      }
    });
  });
  if (
    (state.actor.is_mech() || state.actor.is_npc() || state.actor.is_deployable()) &&
    state.actor.system.heat.max > 0
  ) {
    await state.actor.update({ "system.heat.value": state.actor.system.heat.value + state.data.overkill_heat });
  }
  return true;
}

async function printDamageCard(
  state: FlowState<LancerFlowState.DamageRollData>,
  options?: { template?: string }
): Promise<boolean> {
  if (!state.data) throw new TypeError(`Damage flow state missing!`);
  const template = options?.template || `systems/${game.system.id}/templates/chat/damage-card.hbs`;
  const damageData: DamageFlag = {
    // Targets need to be replaced with their UUIDs to avoid circular references
    damageResults: state.data.damage_results.map(dr => ({
      ...dr,
      target: dr.target?.document.uuid,
    })),
    critDamageResults: state.data.crit_damage_results.map(dr => ({
      ...dr,
      target: dr.target?.document.uuid,
    })),
    targetDamageResults: state.data.targets.map(t => ({
      ...t,
      target: t.target.document.uuid,
    })),
    ap: state.data.ap,
    paracausal: state.data.paracausal,
    half_damage: state.data.half_damage,
  };
  const flags = {
    damageData,
  };
  await renderTemplateStep(state.actor, template, state.data, flags);
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
  // This is really async despite the warning
  await t_roll.evaluate();

  const dice_rolls = Array<foundry.dice.terms.DiceTerm.Result[]>(normal.terms.length);
  const keep_dice: number[] = Array(normal.terms.length).fill(0);
  normal.terms.forEach((term, i) => {
    if (term instanceof foundry.dice.terms.Die) {
      const termDie = term as foundry.dice.terms.Die;
      dice_rolls[i] = termDie.results.map(r => {
        return { ...r };
      });
      const kh = parseInt(termDie.modifiers.find(m => m.startsWith("kh"))?.substr(2) ?? "0");
      keep_dice[i] = kh || termDie.number || 0;
    }
  });
  t_roll.terms.forEach((term, i) => {
    if (term instanceof foundry.dice.terms.Die) {
      dice_rolls[i].push(...(term as foundry.dice.terms.Die).results);
    }
  });

  // Just hold the active results in a sorted array, then mutate them
  const actives: foundry.dice.terms.DiceTerm.Result[][] = Array(normal.terms.length).fill([]);
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
    if (t instanceof foundry.dice.terms.Die) {
      const tDie = t as foundry.dice.terms.Die;
      return new foundry.dice.terms.Die({
        ...t,
        modifiers: (tDie.modifiers.filter(m => m.startsWith("kh")).length
          ? tDie.modifiers
          : [...tDie.modifiers, `kh${tDie.number}`]) as (keyof foundry.dice.terms.Die.Modifiers)[],
        results: dice_rolls[i],
        number: (tDie.number || 0) * 2,
      });
    } else if (t instanceof foundry.dice.terms.OperatorTerm) {
      // As of v12, Roll.fromTerms throws an error if some terms are not evaluated already.
      // It's safe to mark OperatorTerms as evaluated, as they don't have any results.
      // @ts-expect-error we must override this or Roll.fromTerms throws an error.
      t._evaluated = true;
      return t;
    } else {
      return t;
    }
  });
  return Roll.fromTerms(terms);
}

/*********************************************
    ======== Chat button handlers ==========
*********************************************/

/**
 * This function is attached to damage roll buttons in chat. It constructs the initial
 * data for a DamageFlow, then begins the flow.
 * @param event Click event on a button in a chat message
 */
export async function rollDamageCallback(event: JQuery.ClickEvent) {
  const chatMessageElement = event.currentTarget.closest(".chat-message.message");
  if (!chatMessageElement) {
    ui.notifications?.error("Damage roll button not in chat message");
    return;
  }
  const chatMessage = game.messages?.get(chatMessageElement.dataset.messageId);
  // Get attack data from the chat message
  const attackData = chatMessage?.flags.lancer?.attackData;
  if (!chatMessage || !attackData) {
    ui.notifications?.error("Damage roll button has no attack data available");
    return;
  }

  // Get the attacker and weapon/system from the attack data
  const actor = (await fromUuid(attackData.attackerUuid)) as LancerActor | null;
  if (!actor) {
    ui.notifications?.error("Invalid attacker for damage roll");
    return;
  }
  if (!actor.isOwner) {
    ui.notifications?.error(`You do not own ${actor.name}, so you cannot roll damage for them`);
    return;
  }
  const item = (await fromUuid(attackData.attackerItemUuid || "")) as LancerItem | null;
  if (item && item.parent !== actor) {
    ui.notifications?.error(`Item ${item.uuid} is not owned by actor ${actor.uuid}!`);
    return;
  }
  const hit_results: LancerFlowState.HitResult[] = [];
  for (const t of attackData.targets) {
    const target = (await fromUuid(t.uuid)) as LancerToken | null;
    // @ts-expect-error v11 types
    if (!target || target.documentName !== "Token") {
      ui.notifications?.error("Invalid target for damage roll");
      continue;
    }

    // Determine whether lock on was used
    let usedLockOn = false;
    if (t.setConditions) {
      // @ts-expect-error v10 types
      usedLockOn = t.setConditions.lockOn === false ? true : false;
    }

    hit_results.push({
      target: target,
      base: t.base,
      total: t.total,
      usedLockOn,
      hit: t.hit,
      crit: t.crit,
    });
  }

  // Collect damage from the item
  const damage: DamageData[] = [];
  const bonus_damage: DamageData[] = [];
  if (attackData.invade) {
    damage.push({ type: DamageType.Heat, val: "2" });
  }

  // Start a damage flow, prepopulated with the attack data
  const flow = new DamageRollFlow(item ? item.uuid : attackData.attackerUuid, {
    title: `${item?.name || actor.name} DAMAGE`,
    configurable: true,
    tech: attackData.tech,
    invade: attackData.invade,
    hit_results,
    has_normal_hit: hit_results.some(hr => hr.hit && !hr.crit),
    has_crit_hit: hit_results.some(hr => hr.crit),
    damage,
    bonus_damage,
  });
  flow.begin();
}

/**
 * This function is attached to damage application buttons in chat. It performs calls
 * LancerActor.damageCalc to calculate and apply the final damage, and sets a flag
 * on the chat message to indicate the damage for this target has been applied.
 * @param event Click event on a button in a chat message
 */
export async function applyDamage(event: JQuery.ClickEvent) {
  const chatMessageElement = event.currentTarget.closest(".chat-message.message");
  if (!chatMessageElement) {
    ui.notifications?.error("Damage application button not in chat message");
    return;
  }
  const chatMessage = game.messages?.get(chatMessageElement.dataset.messageId);
  const damageData = chatMessage?.flags.lancer?.damageData;
  if (!chatMessage || !damageData) {
    ui.notifications?.error("Damage application button has no damage data available");
    return;
  }
  const hydratedDamageTargets = damageData.targetDamageResults
    .map(tdr => {
      const target = fromUuidSync(tdr.target);
      if (!target || !(target instanceof LancerTokenDocument)) return null;
      return {
        ...tdr,
        target,
      };
    })
    .filter(t => t !== null);
  const buttonGroup = event.currentTarget.closest(".lancer-damage-button-group");
  if (!buttonGroup) {
    ui.notifications?.error("No target for damage application");
    return;
  }
  const data = buttonGroup.dataset;
  if (!data.target) {
    ui.notifications?.error("No target for damage application");
    return;
  }
  let multiple: number = 1;
  const multipleSelect = buttonGroup.querySelector("select");
  if (multipleSelect) {
    multiple = parseFloat(multipleSelect.value);
    multiple = Number.isNaN(multiple) ? 1 : multiple;
  }
  const addBurn = data.addBurn === "true";
  const isCrit = data.crit === "true";
  const isHit = data.hit === "true";
  const target = await fromUuid(data.target);
  if (!target || !(target instanceof LancerTokenDocument)) {
    ui.notifications?.error("Invalid target UUID for damage application");
    return;
  }
  const actor = target.actor;
  if (!actor || !(actor instanceof LancerActor)) {
    ui.notifications?.error("Invalid target for damage application, no actor found");
    return;
  }
  if (!actor.isOwner) {
    ui.notifications?.error("You cannot apply damage to an actor you do not own");
    return;
  }

  // Find target-specific damage data
  const targetDamage = hydratedDamageTargets.find(tdr => tdr?.target?.uuid === data.target);
  if (!targetDamage) return;

  // Apply the damage to the target
  await actor.damageCalc(
    new AppliedDamage(targetDamage.damage.map(d => new Damage({ type: d.type, val: d.amount.toString() }))),
    { multiple, addBurn, ap: targetDamage.ap, paracausal: targetDamage.paracausal }
  );
}

export async function undoDamage(event: JQuery.ClickEvent) {
  const chatMessageElement = event.currentTarget.closest(".chat-message.message");
  if (!chatMessageElement) {
    ui.notifications?.error("Damage undo button not in chat message");
    return;
  }
  const chatMessage = game.messages?.get(chatMessageElement.dataset.messageId);
  if (!chatMessage) {
    ui.notifications?.error("Damage undo button has no chat message");
    return;
  }
  const target = await fromUuid(event.currentTarget.dataset?.uuid);
  if (!target || !(target instanceof LancerActor)) {
    ui.notifications?.error("Damage undo button has no target");
    return;
  }
  if (!target.isOwner) {
    ui.notifications?.error("You cannot undo damage to an actor you do not own");
    return;
  }
  const overshieldDelta = parseInt(event.currentTarget.dataset.overshieldDelta);
  const hpDelta = parseInt(event.currentTarget.dataset.hpDelta);
  const burnDelta =
    event.currentTarget.dataset.addBurn === "true" ? parseInt(event.currentTarget.dataset.burnDelta) : 0;
  const heatDelta = parseInt(event.currentTarget.dataset.heatDelta);
  if (!overshieldDelta && !hpDelta && !burnDelta && !heatDelta) {
    ui.notifications?.error("Damage undo button has no damage to undo!");
    return;
  }

  const updateData: any = {
    system: {
      "overshield.value": target.system.overshield.value + overshieldDelta,
      "hp.value": target.system.hp.value + hpDelta,
      burn: target.system.burn - burnDelta,
    },
  };
  if (target.is_mech() || target.is_npc() || target.is_deployable()) {
    updateData.system["heat.value"] = target.system.heat.value - heatDelta;
  }
  const cmDoc = new DOMParser().parseFromString(chatMessage.content, "text/html");
  cmDoc.querySelectorAll(".lancer-damage-undo").forEach((el: Element) => el.remove());
  cmDoc.querySelectorAll("span").forEach((el: Element) => el.classList.add("strikethrough"));
  const newChatMessageContent = cmDoc.body.innerHTML;
  // .replace(/<a.*?lancer-damage-undo.*?<\/a>/, "")
  // .replace(/<span>/, `<span style="text-decoration: line-through; opacity: 0.8;>`);

  await target.update(updateData);
  await chatMessage.update({ content: newChatMessageContent });
}
