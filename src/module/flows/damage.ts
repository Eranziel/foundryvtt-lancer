import { AppliedDamage } from "../actor/damage-calc";
import { LancerActor, LancerNPC } from "../actor/lancer-actor";
import { DamageHudData, HitQuality } from "../apps/damage";
import { openSlidingHud } from "../apps/slidinghud";
import { DamageType } from "../enums";
import { LancerItem, LancerMECH_WEAPON, LancerNPC_FEATURE, LancerPILOT_WEAPON } from "../item/lancer-item";
import { Damage, DamageData } from "../models/bits/damage";
import { Tag } from "../models/bits/tag";
import { UUIDRef } from "../source-template";
import { LancerToken, LancerTokenDocument } from "../token";
import { renderTemplateStep } from "./_render";
import { AttackFlag } from "./attack";
import { Flow, FlowState, Step } from "./flow";
import { LancerFlowState } from "./interfaces";

type DamageFlag = {
  damageResults: LancerFlowState.DamageResult[];
  critDamageResults: LancerFlowState.DamageResult[];
  targetDamageResults: LancerFlowState.DamageTargetResultSerialized[];
  // TODO: AP and paracausal flags
  ap: boolean;
  paracausal: boolean;
  half_damage: boolean;
  targetsApplied: Record<string, boolean>;
};

export function registerDamageSteps(flowSteps: Map<string, Step<any, any> | Flow<any>>) {
  flowSteps.set("initDamageData", initDamageData);
  flowSteps.set("setDamageTags", setDamageTags);
  flowSteps.set("setDamageTargets", setDamageTargets);
  flowSteps.set("showDamageHUD", showDamageHUD);
  flowSteps.set("rollDamages", rollDamages);
  flowSteps.set("applyOverkillHeat", applyOverkillHeat);
  flowSteps.set("printDamageCard", printDamageCard);
}

/**
 * Flow for rolling and applying damage to a token, typically from a weapon attack
 */
export class DamageRollFlow extends Flow<LancerFlowState.DamageRollData> {
  static steps = [
    "initDamageData",
    "setDamageTags", // Move some tags from setAttackTags to here
    "setDamageTargets", // Can we reuse setAttackTargets?
    "showDamageHUD",
    "rollDamages",
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
      ap: data?.ap || false,
      paracausal: data?.paracausal || false,
      half_damage: data?.half_damage || false,
      overkill: data?.overkill || false,
      reliable: data?.reliable || false,
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

  // TODO: do we need to set targets at this point? The damage HUD is going to
  // ignore them and use the user's canvas targets anyway...
  // let targets: LancerToken[] = Array.from(game.user!.targets);
  // if (targets.length < 1) {
  //   targets = state.data.hit_results.map(hr => hr.target);
  // }

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

  if (state.item?.is_mech_weapon()) {
    const profile = state.item.system.active_profile;
    // state.data.damage = state.data.damage.length ? state.data.damage : profile.damage;
    // state.data.bonus_damage = state.data.bonus_damage?.length ? state.data.bonus_damage : profile.bonus_damage;

    state.data.damage_hud_data = DamageHudData.fromParams(
      state.item,
      profile.all_tags,
      state.data.title,
      Array.from(game.user!.targets),
      state.data.hit_results,
      state.data.ap,
      state.data.paracausal,
      state.data.half_damage,
      { damage: state.data.damage, bonusDamage: state.data.bonus_damage }
    );
  } else if (state.item?.is_npc_feature() && state.item.system.type === "Weapon") {
    // const tierIndex = (state.item.system.tier_override || (state.actor as LancerNPC).system.tier) - 1;
    // state.data.damage = state.data.damage.length ? state.data.damage : state.item.system.damage[tierIndex];
    state.data.damage_hud_data = DamageHudData.fromParams(
      state.item,
      state.item.system.tags,
      state.data.title,
      Array.from(game.user!.targets),
      state.data.hit_results,
      state.data.ap,
      state.data.paracausal,
      state.data.half_damage,
      { damage: state.data.damage, bonusDamage: state.data.bonus_damage }
    );
  } else if (state.item?.is_pilot_weapon()) {
    // state.data.damage = state.data.damage.length ? state.data.damage : state.item.system.damage;
    state.data.damage_hud_data = DamageHudData.fromParams(
      state.item,
      state.item.system.tags,
      state.data.title,
      Array.from(game.user!.targets),
      state.data.hit_results,
      state.data.ap,
      state.data.paracausal,
      state.data.half_damage,
      { damage: state.data.damage, bonusDamage: state.data.bonus_damage }
    );
  } else if (state.data.damage.length === 0) {
    ui.notifications!.warn(
      state.item ? `Item ${state.item.id} is not a weapon!` : `Damage flow is missing damage to roll!`
    );
    return false;
  }

  // Check whether we have any normal or crit hits
  state.data.has_normal_hit =
    state.data.hit_results.length === 0 || state.data.hit_results.some(hit => hit.hit && !hit.crit);
  state.data.has_crit_hit = state.data.hit_results.length > 0 && state.data.hit_results.some(hit => hit.crit);

  return true;
}

function checkForProfileTags(item: LancerItem, check: (tag: Tag) => boolean) {
  if (!item.is_mech_weapon()) return false;
  return item.system.active_profile.tags.some(check);
}

async function setDamageTags(state: FlowState<LancerFlowState.DamageRollData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Damage flow state missing!`);
  // If the damage roll has no item, it has no tags.
  if (!state.item) return true;
  if (!state.item.is_mech_weapon() && !state.item.is_npc_feature() && !state.item.is_pilot_weapon())
    throw new TypeError(`Item ${state.item.id} is not a weapon!`);
  const weapon = state.item as LancerMECH_WEAPON | LancerNPC_FEATURE | LancerPILOT_WEAPON;
  state.data.ap = weapon.isAP() || checkForProfileTags(weapon, t => t.is_ap);
  state.data.overkill = weapon.isOverkill() || checkForProfileTags(weapon, t => t.is_overkill);
  if (weapon.isReliable()) {
    let reliableTag;
    if (weapon.is_mech_weapon()) {
      reliableTag = weapon.system.active_profile.tags.find(t => t.is_reliable);
    } else {
      reliableTag = weapon.system.tags.find(t => t.is_reliable);
    }
    if (!reliableTag) return true;
    state.data.reliable = true;
    const reliableVal = parseInt(reliableTag.tierVal((state.actor.is_npc() && state.actor.system.tier) || 1) || "0");
    state.data.reliable_val = reliableVal;
  }
  return true;
}

async function setDamageTargets(state: FlowState<LancerFlowState.DamageRollData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Damage flow state missing!`);
  // TODO: DamageHudData does not facilitate setting targets after instantiation?
  return true;
}

async function showDamageHUD(state: FlowState<LancerFlowState.DamageRollData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Damage flow state missing!`);
  try {
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
    state.data.has_normal_hit = state.data.hit_results.some(hr => hr.hit && !hr.crit);
    state.data.has_crit_hit = state.data.hit_results.some(hr => hr.crit);

    // Add hit results for any targets in HUD data which aren't in hit results already
    for (const t of state.data.damage_hud_data.targets) {
      if (state.data.hit_results.some(hr => hr.target.id === t.target.id)) continue;
      state.data.hit_results.push({
        target: t.target,
        total: "10",
        // TODO: use target crit/hit/miss from HUD
        hit: true,
        crit: false,
        usedLockOn: false,
      });
    }

    // Set damage flags from HUD
    state.data.ap = state.data.damage_hud_data.base.ap;
    state.data.paracausal = state.data.damage_hud_data.base.paracausal;
    state.data.half_damage = state.data.damage_hud_data.base.halfDamage;
    state.data.overkill = state.data.damage_hud_data.weapon.overkill;
    state.data.reliable = state.data.damage_hud_data.weapon.reliable;
    if (state.data.reliable) {
      state.data.reliable_val = state.data.damage_hud_data.weapon.reliableValue;
    }

    // TODO: need to set target flags too?
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
  target?: LancerToken
): Promise<LancerFlowState.DamageResult | null> {
  if (!damage.val || damage.val == "0") return null; // Skip undefined and zero damage
  let damageRoll: Roll | undefined = new Roll(damage.val);
  // Add overkill if enabled.
  if (overkill) {
    damageRoll.terms.forEach(term => {
      if (term instanceof Die) term.modifiers = ["x1", `kh${term.number}`].concat(term.modifiers);
    });
  }

  await damageRoll.evaluate({ async: true });
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

export async function rollDamages(state: FlowState<LancerFlowState.DamageRollData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Damage flow state missing!`);
  if (!state.data.damage_hud_data) throw new TypeError(`Damage configuration missing!`);

  // Convenience flag for whether this is a multi-target attack.
  // We'll use this later alongside a check for whether a given bonus damage result
  // is single-target; if not, the bonus damage needs to be halved.
  // TODO: this check doesn't work yet; damage HUD targets isn't properly reactive.
  const multiTarget: boolean = state.data.damage_hud_data.targets.length > 1;

  // TODO: need to also collect target-specific damage and bonus damage to roll,
  // combine them into the other rolls, and then extract those dice
  // from the global results.
  const totalDamage = state.data.damage_hud_data.base.total;
  state.data.damage = totalDamage.damage;
  state.data.bonus_damage = totalDamage.bonusDamage ?? [];
  state.data.reliable_val = state.data.damage_hud_data.weapon.reliableValue;
  const allBonusDamage: {
    type: DamageType;
    val: string;
    target?: LancerToken;
  }[] = duplicate(state.data.bonus_damage);
  // Find all the target-specific bonus damage rolls and add them to the base rolls
  // so they can be rolled together.
  for (const hudTarget of state.data.damage_hud_data.targets) {
    const hudTargetBonusDamage = hudTarget.bonusDamage.map(d => ({
      ...d,
      target: hudTarget.target,
    }));
    allBonusDamage.push(...hudTargetBonusDamage);
  }

  // TODO: should reliable damage "rolling" be a separate step?
  // Include reliable data if the attack was made with no targets or at least one target was missed
  if (
    state.data.reliable &&
    state.data.reliable_val &&
    (!state.data.hit_results.length || state.data.hit_results.some(h => !h.hit && !h.crit))
  ) {
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

    // TODO: should we allow users to roll normal damage vs missed targets?
    for (const hitTarget of state.data.hit_results) {
      if (!hitTarget.hit && !hitTarget.crit) {
        state.data.targets.push({
          target: hitTarget.target,
          damage: state.data.reliable_results.map(dr => ({ type: dr.d_type, amount: dr.roll.total || 0 })),
          hit: hitTarget.hit,
          crit: hitTarget.crit,
          // TODO: target-specific AP and Paracausal from damage HUD
          ap: state.data.ap,
          paracausal: state.data.paracausal,
          half_damage: state.data.half_damage,
        });
      }
    }
  }

  // Evaluate normal damage. Even if every hit was a crit, we'll use this in
  // the next step for crits
  if (state.data.has_normal_hit || state.data.has_crit_hit) {
    for (const x of state.data.damage ?? []) {
      const result = await _rollDamage(x, false, state.data.overkill);
      if (result) state.data.damage_results.push(result);
    }

    for (const x of allBonusDamage ?? []) {
      const result = await _rollDamage(x, true, state.data.overkill, x.target);
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
            targetDamage.push({ type: dr.d_type, amount: (dr.roll.total || 0) / 2 });
          } else {
            targetDamage.push({ type: dr.d_type, amount: dr.roll.total || 0 });
          }
        }
        state.data.targets.push({
          target: hitTarget.target,
          // TODO: ensure total damage is at least equal to reliable_val
          damage: targetDamage,
          hit: hitTarget.hit,
          crit: hitTarget.crit,
          // TODO: target-specific AP and Paracausal from damage HUD
          ap: state.data.ap,
          paracausal: state.data.paracausal,
          half_damage: state.data.half_damage,
        });
      }
    }
  }

  // TODO: should crit damage rolling be a separate step?
  // If there is at least one crit hit, evaluate crit damage
  if (state.data.has_crit_hit) {
    // NPCs do not follow the normal crit rules. They only get bonus damage from Deadly etc...
    if (!state.actor.is_npc()) {
      await Promise.all(
        state.data.damage_results.map(async result => {
          // Skip this result if it was for a single target and that target was not critted
          const hitResults = state.data?.hit_results;
          if (
            result.target &&
            hitResults &&
            !hitResults.find(hr => result.target?.document.uuid ?? null === hr.target.document.uuid)?.crit
          ) {
            return;
          }

          const c_roll = await getCritRoll(result.roll);
          // @ts-expect-error DSN options aren't typed
          c_roll.dice.forEach(d => (d.options.rollOrder = 2));
          const tt = await c_roll.getTooltip();
          state.data!.crit_damage_results.push({
            roll: c_roll,
            tt,
            d_type: result.d_type,
            bonus: result.bonus,
            target: result.target,
          });
        })
      );
    } else {
      state.data!.crit_damage_results = state.data!.damage_results;
      // TODO: automation for Deadly
      // Find any Deadly features and add a d6 for each
    }

    for (const hitTarget of state.data.hit_results) {
      if (hitTarget.crit) {
        const targetDamage: { type: DamageType; amount: number }[] = [];
        for (const dr of state.data.damage_results) {
          if (dr.target && dr.target.document.uuid !== hitTarget.target.document.uuid) continue;
          if (multiTarget && dr.bonus && !dr.target) {
            // If this is bonus damage applied to multiple targets, halve it
            targetDamage.push({ type: dr.d_type, amount: (dr.roll.total || 0) / 2 });
          } else {
            targetDamage.push({ type: dr.d_type, amount: dr.roll.total || 0 });
          }
        }
        state.data.targets.push({
          target: hitTarget.target,
          // TODO: ensure total damage is at least equal to reliable_val
          damage: targetDamage,
          hit: hitTarget.hit,
          crit: hitTarget.crit,
          // TODO: target-specific AP and Paracausal from damage HUD
          ap: state.data.ap,
          paracausal: state.data.paracausal,
          half_damage: state.data.half_damage,
        });
      }
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
      if (p instanceof DiceTerm) {
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
  } else {
    // TODO: add a damage application row to apply energy damage to the attacker?
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
    damageResults: state.data.damage_results,
    critDamageResults: state.data.crit_damage_results,
    targetDamageResults: state.data.targets.map(t => ({
      ...t,
      target: t.target.document.uuid,
    })),
    // TODO: AP and paracausal flags
    ap: state.data.ap,
    paracausal: state.data.paracausal,
    half_damage: state.data.half_damage,
    targetsApplied: state.data.targets.reduce((acc: Record<string, boolean>, t) => {
      const uuid = t.target?.document?.uuid;
      if (!uuid) return acc;
      // We need to replace the dots in the UUID, otherwise Foundry will expand it into a nested object
      acc[uuid.replaceAll(".", "_")] = false;
      return acc;
    }, {}),
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
  await t_roll.evaluate({ async: true });

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

/*********************************************
    ======== Chat button handlers ==========
*********************************************/

/**
 * This function is attached to damage roll buttons in chat. It constructs the initial
 * data for a DamageFlow, then begins the flow.
 * @param event Click event on a button in a chat message
 */
export async function rollDamage(event: JQuery.ClickEvent) {
  const chatMessageElement = event.currentTarget.closest(".chat-message.message");
  if (!chatMessageElement) {
    ui.notifications?.error("Damage roll button not in chat message");
    return;
  }
  const chatMessage = game.messages?.get(chatMessageElement.dataset.messageId);
  // Get attack data from the chat message
  // @ts-expect-error v10 types
  const attackData = chatMessage?.flags.lancer?.attackData as AttackFlag;
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
  const item = (await fromUuid(attackData.attackerItemUuid || "")) as LancerItem | null;
  if (item && item.parent !== actor) {
    ui.notifications?.error(`Item ${item.uuid} is not owned by actor ${actor.uuid}!`);
    return;
  }
  const hit_results: LancerFlowState.HitResult[] = [];
  for (const t of attackData.targets) {
    const target = (await fromUuid(t.id)) as LancerToken | null;
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
  // @ts-expect-error v10 types
  const damageData = chatMessage?.flags.lancer?.damageData as DamageFlag;
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
  // Replace underscores with dots to turn it back into a valid UUID
  const targetFlagKey = data.target.replaceAll(".", "_");
  if (damageData.targetsApplied[targetFlagKey]) {
    ui.notifications?.warn("Damage has already been applied to this target");
    return;
  }
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

  // Get the targeted damage result, or construct one
  // let damage: LancerFlowState.DamageTargetResult;

  // Try to find target-specific damage data first
  // TODO: can't use UUID here, nor token.actor.id - that points to the original actual actor, not the synthetic actor.
  // Need to check token IDs, not actor IDs.
  const targetDamage = hydratedDamageTargets.find(tdr => tdr?.target?.uuid === data.target);
  if (!targetDamage) return;

  // TODO: allow applying damage to the user's targeted token even if it wasn't a target
  // during the damage roll flow?

  // else if (actor.token) {
  //   if (isCrit) {
  //     // If we can't find this specific target, check whether it's a crit or regular hit
  //     damage = {
  //       target: actor.getActiveTokens()[0],
  //       damage: damageData.critDamageResults.map(dr => ({ type: dr.d_type, amount: dr.roll.total || 0 })),
  //       hit: true,
  //       crit: true,
  //       ap: damageData.ap,
  //       paracausal: damageData.paracausal,
  //       half_damage: damageData.half_damage,
  //     };
  //   } else {
  //     damage = {
  //       name: actor.name!,
  //       img: actor.img!,
  //       damage: damageData.damageResults.map(dr => ({ type: dr.d_type, amount: dr.roll.total || 0 })),
  //       hit: true,
  //       crit: false,
  //       ap: damageData.ap,
  //       paracausal: damageData.paracausal,
  //       half_damage: damageData.half_damage,
  //     };
  //   }
  // }
  // TODO: if not crit and not hit, use reliable damage

  // Apply the damage to the target
  await actor.damageCalc(
    new AppliedDamage(targetDamage.damage.map(d => new Damage({ type: d.type, val: d.amount.toString() }))),
    { multiple, addBurn, ap: targetDamage.ap, paracausal: targetDamage.paracausal }
  );

  // Update the flags on the chat message to indicate the damage has been applied
  damageData.targetsApplied[targetFlagKey] = true;
  await chatMessage.setFlag("lancer", "damageData", damageData);
}
