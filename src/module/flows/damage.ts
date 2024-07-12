import { AppliedDamage } from "../actor/damage-calc";
import { LancerActor } from "../actor/lancer-actor";
import { LancerItem } from "../item/lancer-item";
import { Damage } from "../models/bits/damage";
import { UUIDRef } from "../source-template";
import { LancerToken } from "../token";
import { renderTemplateStep } from "./_render";
import { Flow, FlowState, Step } from "./flow";
import { LancerFlowState } from "./interfaces";

type DamageFlag = {
  damageResults: LancerFlowState.DamageResult[];
  critDamageResults: LancerFlowState.DamageResult[];
  // TODO: AP and paracausal flags
  ap: boolean;
  paracausal: boolean;
  targetsApplied: Record<string, boolean>;
};

export function registerDamageSteps(flowSteps: Map<string, Step<any, any> | Flow<any>>) {
  flowSteps.set("rollDamage", rollDamage);
  flowSteps.set("printDamageCard", printDamageCard);
}

/**
 * Flow for rolling and applying damage to a token, typically from a weapon attack
 */
export class DamageRollFlow extends Flow<LancerFlowState.DamageRollData> {
  static steps = [
    "emptyStep",
    // this.constructor.steps.set("getDamages", dummyDamageStep);
    // this.constructor.steps.set("checkTargetImmunity", dummyDamageStep);
    // this.constructor.steps.set("checkTargetResist", dummyDamageStep);
    // this.constructor.steps.set("promptDamageConfig", dummyDamageStep); // Includes bonus damage config?
    // this.constructor.steps.set("rollDamages", dummyDamageStep);
    // this.constructor.steps.set("applyOverkill", dummyDamageStep);
    // this.constructor.steps.set("applyDamages", dummyDamageStep);
  ];
  constructor(uuid: UUIDRef | LancerItem | LancerActor, data?: LancerFlowState.DamageRollData) {
    super(uuid, data);
  }
}

async function rollDamage(state: FlowState<LancerFlowState.DamageRollData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Damage flow state missing!`);
  // Roll each damage type
  for (const damage of state.data.damage_by_type) {
    const roll = await new Roll(damage.val).evaluate({ async: true });
    const tt = await roll.getTooltip();
    state.data.damage_results.push({ roll, tt, d_type: damage.type });
    state.data.damage_total += roll.total || 0;
  }
  // TODO: crit damage
  return true;
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

      await damageRoll.evaluate({ async: true });
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

async function printDamageCard(
  state: FlowState<LancerFlowState.DamageRollData>,
  options?: { template?: string }
): Promise<boolean> {
  if (!state.data) throw new TypeError(`Damage flow state missing!`);
  const template = options?.template || `systems/${game.system.id}/templates/chat/damage-card.hbs`;
  const damageData: DamageFlag = {
    damageResults: state.data.damage_results,
    critDamageResults: state.data.crit_damage_results,
    // TODO: AP and paracausal flags
    ap: false,
    paracausal: false,
    targetsApplied: state.data.targets.reduce((acc: Record<string, boolean>, t) => {
      const uuid = t.actor?.uuid || t.token?.actor?.uuid || null;
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

// ======== Chat button handler ==========
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
  const data = event.currentTarget.dataset;
  if (!data.target) {
    ui.notifications?.error("No target for damage application");
    return;
  }
  let multiple: number;
  try {
    multiple = parseFloat(data.multiple || 1);
  } catch (err) {
    ui.notifications?.error("Data multiplaction factor is not a number!");
    return;
  }
  // Replace underscores with dots to turn it back into a valid UUID
  const targetFlagKey = data.target.replaceAll(".", "_");
  if (damageData.targetsApplied[targetFlagKey]) {
    ui.notifications?.warn("Damage has already been applied to this target");
    return;
  }
  const target = await fromUuid(data.target);
  let actor: LancerActor | null = null;
  if (target instanceof LancerActor) actor = target;
  else if (target instanceof LancerToken) actor = target.actor;
  if (!actor) {
    ui.notifications?.error("Invalid target for damage application");
    return;
  }

  // Apply the damage
  await actor.damageCalc(
    new AppliedDamage(
      damageData.damageResults.map(dr => new Damage({ type: dr.d_type, val: (dr.roll.total || 0).toString() }))
    ),
    { multiple, addBurn: false }
  );

  // Update the flags on the chat message to indicate the damage has been applied
  damageData.targetsApplied[targetFlagKey] = true;
  await chatMessage.setFlag("lancer", "damageData", damageData);
}
