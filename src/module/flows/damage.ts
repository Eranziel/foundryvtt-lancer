import { AppliedDamage } from "../actor/damage-calc";
import { LancerActor, LancerNPC } from "../actor/lancer-actor";
import { LancerItem } from "../item/lancer-item";
import { Damage } from "../models/bits/damage";
import { UUIDRef } from "../source-template";
import { LancerToken } from "../token";
import { renderTemplateStep } from "./_render";
import { AttackFlag } from "./attack";
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
      ap: data?.ap || false,
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

  if (state.item?.is_mech_weapon()) {
    const profile = state.item.system.active_profile;
    state.data.damage = state.data.damage.length ? state.data.damage : profile.damage;
    state.data.bonus_damage = state.data.bonus_damage?.length ? state.data.bonus_damage : profile.bonus_damage;
  } else if (state.item?.is_npc_feature() && state.item.system.type === "Weapon") {
    state.data.damage = state.data.damage.length
      ? state.data.damage
      : state.item.system.damage[state.item.system.tier_override || (state.actor as LancerNPC).system.tier - 1];
  } else if (state.item?.is_pilot_weapon()) {
    state.data.damage = state.data.damage.length ? state.data.damage : state.item.system.damage;
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

async function setDamageTags(state: FlowState<LancerFlowState.DamageRollData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Damage flow state missing!`);
  // If the damage roll has no item, it has no tags.
  if (!state.item) return true;
  if (!state.item.is_mech_weapon() || !state.item.is_npc_feature() || !state.item.is_pilot_weapon())
    throw new TypeError(`Item ${state.item.id} is not a weapon!`);
  state.data.ap = state.item.isAP();
  state.data.overkill = state.item.isOverkill();
  state.data.reliable = state.item.isReliable();
  const reliableTag = state.item.system.tags.find(t => t.is_reliable);
  const reliableVal = parseInt(reliableTag?.val || "0");
  if (reliableTag && !Number.isNaN(reliableVal)) {
    state.data.reliable_val = reliableVal;
  }
  // TODO: build state.data.damage_hud_data
  return true;
}

async function setDamageTargets(state: FlowState<LancerFlowState.DamageRollData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Damage flow state missing!`);
  // TODO: DamageHudData does not facilitate setting targets after instantiation?
  return true;
}

async function showDamageHUD(state: FlowState<LancerFlowState.DamageRollData>): Promise<boolean> {
  // TODO: Placeholder for now
  return true;
}

export async function rollDamages(state: FlowState<LancerFlowState.DamageRollData>): Promise<boolean> {
  if (!state.data) throw new TypeError(`Attack flow state missing!`);

  // Evaluate normal damage. Even if every hit was a crit, we'll use this in
  // the next step for crits
  if (state.data.has_normal_hit || state.data.has_crit_hit) {
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

    for (const hitTarget of state.data.hit_results) {
      if (hitTarget.hit && !hitTarget.crit) {
        state.data.targets.push({
          ...hitTarget.token,
          damage: state.data.damage_results.map(dr => ({ type: dr.d_type, amount: dr.roll.total || 0 })),
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

    for (const hitTarget of state.data.hit_results) {
      if (hitTarget.crit) {
        state.data.targets.push({
          ...hitTarget.token,
          damage: state.data.damage_results.map(dr => ({ type: dr.d_type, amount: dr.roll.total || 0 })),
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
    const target = await fromUuid(t.id);
    if (!target || !(target instanceof LancerActor || target instanceof LancerToken)) {
      ui.notifications?.error("Invalid target for damage roll");
      continue;
    }

    // Find the target's image
    let img = "";
    if (target instanceof LancerActor) img = target.img!;
    // @ts-expect-error v10 types
    else if (target instanceof LancerToken) img = target.texture.src;

    // Determine whether lock on was used
    let usedLockOn = false;
    if (t.setConditions) {
      // @ts-expect-error v10 types
      usedLockOn = t.setConditions.lockOn === false ? true : false;
    }

    hit_results.push({
      token: {
        name: target.name!,
        img,
        actor: target instanceof LancerActor ? target : target.actor || undefined,
        token: target instanceof LancerToken ? target : undefined,
      },
      total: t.total,
      usedLockOn,
      hit: t.hit,
      crit: t.crit,
    });
  }

  // Collect damage from the item
  const damage = [];
  const bonus_damage = [];
  if (item) {
    if (item.is_mech_weapon()) {
      const profile = item.system.active_profile;
      damage.push(...profile.damage);
      bonus_damage.push(...profile.bonus_damage);
    } else if (item.is_npc_feature() && item.system.type === "Weapon") {
      const npcDamage: Damage[] = item.system.damage[item.system.tier_override || (actor as LancerNPC).system.tier - 1];
      damage.push(...npcDamage);
    } else if (item.is_pilot_weapon()) {
      damage.push(...item.system.damage);
    }
  }

  // Start a damage flow, prepopulated with the attack data
  const flow = new DamageRollFlow(attackData.attackerUuid, {
    title: `${item?.name || actor.name} DAMAGE`,
    configurable: true,
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
