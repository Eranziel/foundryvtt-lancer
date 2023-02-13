// Import TypeScript modules
import { LANCER } from "../config";
import { getAutomationOptions } from "../settings";
import { LancerItem, LancerMECH_WEAPON, LancerNPC_FEATURE, LancerPILOT_WEAPON } from "../item/lancer-item";
import { LancerActor, LancerPILOT } from "../actor/lancer-actor";
import type { LancerAttackMacroData, LancerMacroData } from "../interfaces";
import { checkForHit } from "../helpers/automation/targeting";
import type { AccDiffData, AccDiffDataSerialized, RollModifier } from "../helpers/acc_diff";
import { getMacroSpeaker } from "./_util";
import { encodeMacroData } from "./_encode";
import { renderMacroTemplate } from "./_render";
import { DamageType } from "../enums";
import { SystemTemplates } from "../system-template";
import { SourceData } from "../source-template";

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

type AttackRolls = {
  roll: string;
  targeted: {
    target: Token;
    roll: string;
    usedLockOn: { delete: () => void } | null;
  }[];
};

export function attackRolls(bonus: number, accdiff: AccDiffData): AttackRolls {
  let perRoll = Object.values(accdiff.weapon.plugins);
  let base = perRoll.concat(Object.values(accdiff.base.plugins));
  return {
    roll: applyPluginsToRoll(rollStr(bonus, accdiff.base.total), base),
    targeted: accdiff.targets.map(tad => {
      let perTarget = perRoll.concat(Object.values(tad.plugins));
      return {
        target: tad.target,
        roll: applyPluginsToRoll(rollStr(bonus, tad.total), perTarget),
        usedLockOn: tad.usingLockOn,
      };
    }),
  };
}

type AttackMacroOptions = {
  accBonus: number;
  damBonus: { type: DamageType; val: number };
};

export async function prepareEncodedAttackMacro(
  actorUUID: string,
  itemUUID: string | null,
  options?: AttackMacroOptions,
  rerollData?: AccDiffDataSerialized
) {
  let actor = getMacroSpeaker(actorUUID)!;
  let item = itemUUID ? LancerItem.fromUuidSync(itemUUID) : null;
  let { AccDiffData } = await import("../helpers/acc_diff");
  let accdiff = rerollData ? AccDiffData.fromObject(rerollData, item ?? actor) : undefined;
  if (item) {
    return prepareAttackMacro({ actor, item, options }, accdiff);
  } else {
    return openBasicAttack(actor, accdiff);
  }
}

/**
 * Standalone prepare function for attacks, since they're complex.
 * @param actor   {Actor}       Actor to roll as. Assumes properly prepared item.
 * @param item    {LancerItem}  Weapon to attack with. Assumes ownership from actor.
 * @param options {Object}      Options that can be passed through. Current options:
 *            - accBonus        Flat bonus to accuracy
 *            - damBonus        Object of form {type: val} to apply flat damage bonus of given type.
 *                              The "Bonus" type is recommended but not required
 * @param rerollData {AccDiffData?} saved accdiff data for rerolls
 */
export async function prepareAttackMacro(
  {
    actor,
    item,
    options,
  }: {
    actor: LancerActor;
    item: LancerItem;
    options?: {
      accBonus: number;
      damBonus: { type: DamageType; val: number };
    };
  },
  rerollData?: AccDiffData
) {
  console.log("ATTAKKK");
  if (!item.is_npc_feature() && !item.is_mech_weapon() && !item.is_pilot_weapon()) return;
  let macroData: LancerAttackMacroData = {
    title: item.name ?? "",
    grit: 0,
    acc: 0,
    damage: [],
    tags: [],
    overkill: false,
    effect: "",
    loaded: true,
    destroyed: false,
  };

  let pilot: LancerPILOT;

  // We can safely split off pilot/mech weapons by actor type
  if (actor.is_mech() && item.is_mech_weapon()) {
    if (actor.system.pilot?.status != "resolved") {
      ui.notifications?.warn("Cannot fire a weapon on a non-piloted mech!");
      return;
    }

    pilot = actor.system.pilot?.value;
    let profile = item.system.active_profile;
    macroData.loaded = item.system.loaded;
    macroData.destroyed = item.system.destroyed;
    macroData.damage = profile.damage;
    macroData.grit = pilot?.system.grit;
    macroData.acc = 0;
    macroData.tags = profile.tags;
    macroData.overkill = profile.tags.some(t => t.is_overkill);
    macroData.self_heat = profile.tags.some(t => t.is_selfheat);
    macroData.effect = profile.effect;
    macroData.on_attack = profile.on_attack;
    macroData.on_hit = profile.on_hit;
    macroData.on_crit = profile.on_crit;
  } else if (actor.is_pilot() && item.is_pilot_weapon()) {
    macroData.loaded = item.system.loaded;
    macroData.damage = item.system.damage;
    macroData.grit = actor.system.grit;
    macroData.acc = 0;
    macroData.tags = item.system.tags;
    macroData.overkill = item.system.tags.some(t => t.is_overkill);
    macroData.self_heat = item.system.tags.some(t => t.is_selfheat);
    macroData.effect = item.system.effect;
  } else if (actor.is_npc() && item.is_npc_feature()) {
    let tier_index: number = item.system.tier_override;
    if (!item.system.tier_override) {
      if (item.actor === null) {
        // Use selected actor
        tier_index = actor.system.tier - 1;
      } else if (item.actor.is_npc()) {
        // Use provided actor
        tier_index = item.actor.system.tier - 1;
      }
    } else {
      // Fix to be index
      tier_index--;
    }

    let asWeapon = item.system as SystemTemplates.NPC.WeaponData;
    macroData.loaded = item.system.loaded;
    macroData.destroyed = item.system.destroyed;
    macroData.grit = Number(asWeapon.attack_bonus[tier_index]) || 0; // Sometimes the data's a string
    macroData.acc = asWeapon.accuracy[tier_index];

    // Reduce damage values to only this tier
    macroData.damage = asWeapon.damage[tier_index] ?? [];
    macroData.tags = asWeapon.tags;
    macroData.overkill = asWeapon.tags.some(t => t.is_overkill);
    macroData.self_heat = asWeapon.tags.some(t => t.is_selfheat);
    macroData.on_hit = asWeapon.on_hit;
    macroData.effect = asWeapon.effect;
  } else {
    ui.notifications!.error(`Error preparing attack macro - ${actor.name} is an unknown type!`);
    return Promise.resolve();
  }

  // Check for damages that are missing type
  let typeMissing = false;
  macroData.damage.forEach((d: any) => {
    if (d.type === "" && d.val != "" && d.val != 0) typeMissing = true;
  });
  // Warn about missing damage type if the value is non-zero
  if (typeMissing) {
    ui.notifications!.warn(`Warning: ${item.name} has a damage value without type!`);
  }

  // Options processing
  if (options) {
    if (options.accBonus) {
      macroData.grit += options.accBonus;
    }
    if (options.damBonus) {
      let i = macroData.damage.findIndex(dam => dam.type === options.damBonus.type);
      if (i >= 0) {
        // We need to clone so it doesn't go all the way back up to the weapon
        let damClone = { ...macroData.damage[i] };
        if (parseInt(damClone.val) > 0) {
          damClone.val = `${damClone.val}+${options.damBonus.val}`;
        } else {
          damClone.val = options.damBonus.val.toString();
        }
        macroData.damage[i] = damClone;
      } else {
        macroData.damage.push({ val: options.damBonus.val.toString(), type: options.damBonus.type });
      }
    }
  }
  // Check if weapon if loaded.
  if (getAutomationOptions().limited_loading && getAutomationOptions().attacks) {
    if (item.is_loading() && !item.system.loaded) {
      ui.notifications!.warn(`Weapon ${item.name} is not loaded!`);
      return;
    }
    if (item.is_limited() && item.system.uses.value <= 0) {
      ui.notifications!.warn(`Weapon ${item.name} has no remaining uses!`);
      return;
    }
    if (macroData.destroyed) {
      // @ts-expect-error Should be fixed with v10 types
      ui.notifications!.warn(`Weapon ${item.system.name} is destroyed!`);
      return;
    }
  }

  // Prompt the user before deducting charges.
  const targets = Array.from(game!.user!.targets);
  let { AccDiffData } = await import("../helpers/acc_diff");
  const initialData =
    rerollData ??
    AccDiffData.fromParams(
      item,
      macroData.tags,
      macroData.title,
      targets,
      macroData.acc > 0 ? [macroData.acc, 0] : [0, -macroData.acc]
    );

  let promptedData;
  try {
    let { open } = await import("../helpers/slidinghud");
    promptedData = await open("attack", initialData);
  } catch (_e) {
    return;
  }

  const atkRolls = attackRolls(macroData.grit, promptedData);

  // Deduct charge if LOADING weapon.
  if (getAutomationOptions().limited_loading && getAutomationOptions().attacks) {
    let changes: DeepPartial<SourceData.MechWeapon> = {};
    let needChange = false;
    if (item.is_loading()) {
      changes.loaded = false;
      needChange = true;
    }
    if (item.is_limited()) {
      changes.uses = Math.max(item.system.uses.value - 1, 0);
      needChange = true;
    }
    if (needChange) await item.update({ system: changes });
  }

  let rerollMacro = {
    title: "Reroll attack",
    fn: "prepareEncodedAttackMacro",
    args: [actor.id, item.uuid, options, promptedData.toObject()],
  };

  await rollAttackMacro(actor, atkRolls, macroData, rerollMacro);
}

export async function openBasicAttack(actor: string | LancerActor, rerollData?: AccDiffData) {
  let { isOpen, open } = await import("../helpers/slidinghud");

  // if the hud is already open, and we're not overriding with new reroll data, just bail out
  let wasOpen = await isOpen("attack");
  if (wasOpen && !rerollData) {
    return;
  }

  let { AccDiffData } = await import("../helpers/acc_diff");

  actor = getMacroSpeaker(actor)!;

  let data =
    rerollData ?? AccDiffData.fromParams(actor, undefined, "Basic Attack", Array.from(game!.user!.targets), undefined);

  let promptedData;
  try {
    promptedData = await open("attack", data);
  } catch (_e) {
    return;
  }

  let mData = {
    title: "BASIC ATTACK",
    grit: 0,
    acc: 0,
    tags: [],
    damage: [],
  };

  let statActor = actor; // Source for the attack bonus stat

  if (actor.is_deployable()) {
    if (actor.system.deployer?.status == "resolved") {
      statActor = actor.system.deployer.value;
    }
  }

  console.log(statActor);

  if (statActor.is_mech()) {
    if (statActor.system.pilot?.status == "resolved") {
      mData.grit = statActor.system.pilot.value.system.grit;
    }
  } else if (statActor.is_pilot()) {
    mData.grit = statActor.system.grit;
  } else if (statActor.is_npc()) {
    let tierBonus: number = statActor.system.tier;
    mData.grit = tierBonus || 0;
  } else if (statActor.is_deployable()) {
    mData.grit = 0; // We couldn't
  } else {
    ui.notifications!.error(`Error preparing targeting macro - ${actor.name} is an unknown type!`);
    return;
  }

  const atkRolls = attackRolls(mData.grit, promptedData);

  let rerollMacro = {
    title: "Reroll attack",
    fn: "prepareEncodedAttackMacro",
    args: [actor.id, null, {}, promptedData.toObject()],
  };

  await rollAttackMacro(actor, atkRolls, mData, rerollMacro);
}

type AttackResult = {
  roll: Roll;
  tt: string | HTMLElement | JQuery<HTMLElement>;
};

type HitResult = {
  token: { name: string; img: string };
  total: string;
  hit: boolean;
  crit: boolean;
};

export async function checkTargets(
  atkRolls: AttackRolls,
  isSmart: boolean
): Promise<{
  attacks: AttackResult[];
  hits: HitResult[];
}> {
  if (getAutomationOptions().attacks && atkRolls.targeted.length > 0) {
    let data = await Promise.all(
      atkRolls.targeted.map(async targetingData => {
        let target = targetingData.target;
        let actor = target.actor as LancerActor;
        let attack_roll = await new Roll(targetingData.roll).evaluate({ async: true });
        // @ts-expect-error DSN options aren't typed
        attack_roll.dice.forEach(d => (d.options.rollOrder = 1));
        const attack_tt = await attack_roll.getTooltip();

        if (targetingData.usedLockOn) {
          targetingData.usedLockOn.delete();
        }

        return {
          attack: { roll: attack_roll, tt: attack_tt },
          hit: {
            // @ts-expect-error Token structure has changed
            token: { name: target.name!, img: target.document.texture?.src },
            total: String(attack_roll.total).padStart(2, "0"),
            hit: await checkForHit(isSmart, attack_roll, actor),
            crit: (attack_roll.total || 0) >= 20,
          },
        };
      })
    );

    return {
      attacks: data.map(d => d.attack),
      hits: data.map(d => d.hit),
    };
  } else {
    let attack_roll = await new Roll(atkRolls.roll).evaluate({ async: true });
    const attack_tt = await attack_roll.getTooltip();
    return {
      attacks: [{ roll: attack_roll, tt: attack_tt }],
      hits: [],
    };
  }
}

async function rollAttackMacro(
  actor: LancerActor,
  atkRolls: AttackRolls,
  data: LancerAttackMacroData,
  rerollMacro: LancerMacroData
) {
  const isSmart = data.tags.some(tag => tag.is_smart);
  const { attacks, hits } = await checkTargets(atkRolls, isSmart);

  // Iterate through damage types, rolling each
  let damage_results: Array<{
    roll: Roll;
    tt: string;
    d_type: DamageType;
  }> = [];
  let crit_damage_results: Array<{
    roll: Roll;
    tt: string;
    d_type: DamageType;
  }> = [];
  let overkill_heat = 0;
  let self_heat = 0;

  const has_normal_hit =
    (hits.length === 0 && attacks.some(attack => (attack.roll.total ?? 0) < 20)) ||
    hits.some(hit => hit.hit && !hit.crit);
  const has_crit_hit =
    (hits.length === 0 && attacks.some(attack => (attack.roll.total ?? 0) >= 20)) || hits.some(hit => hit.crit);

  // If we hit evaluate normal damage, even if we only crit, we'll use this in
  // the next step for crits
  if (has_normal_hit || has_crit_hit) {
    for (const x of data.damage) {
      if (!x.val || x.val == "0") continue; // Skip undefined and zero damage
      let damageRoll: Roll | undefined = new Roll(x.val);
      // Add overkill if enabled.
      if (data.overkill) {
        damageRoll.terms.forEach(term => {
          if (term instanceof Die) term.modifiers = ["x1", `kh${term.number}`].concat(term.modifiers);
        });
      }

      await damageRoll.evaluate({ async: true });
      // @ts-expect-error DSN options aren't typed
      damageRoll.dice.forEach(d => (d.options.rollOrder = 2));
      const tooltip = await damageRoll.getTooltip();

      damage_results.push({
        roll: damageRoll,
        tt: tooltip,
        d_type: x.type,
      });
    }
  }

  // If there is at least one crit hit, evaluate crit damage
  if (has_crit_hit) {
    await Promise.all(
      damage_results.map(async result => {
        const c_roll = await getCritRoll(result.roll);
        // @ts-expect-error DSN options aren't typed
        c_roll.dice.forEach(d => (d.options.rollOrder = 2));
        const tt = await c_roll.getTooltip();
        crit_damage_results.push({
          roll: c_roll,
          tt,
          d_type: result.d_type,
        });
      })
    );
  }

  // Calculate overkill heat
  if (data.overkill) {
    (has_crit_hit ? crit_damage_results : damage_results).forEach(result => {
      result.roll.terms.forEach(p => {
        if (p instanceof DiceTerm) {
          p.results.forEach(r => {
            if (r.exploded) overkill_heat += 1;
          });
        }
      });
    });
  }

  if (data.self_heat) {
    // Once the double tag thing is fixed, this should iterate over all tags
    // instead just using the first one.
    self_heat = parseInt(`${data.tags.find(tag => tag.is_selfheat)?.num_val ?? 0}`);
  }

  if (getAutomationOptions().attack_self_heat) {
    if (actor.is_mech() || actor.is_npc()) {
      await actor.update({ "system.heat": overkill_heat + self_heat });
    }
  }

  // Output
  const templateData = {
    title: data.title,
    item_uuid: rerollMacro.args[1],
    attacks: attacks,
    hits: hits,
    defense: isSmart ? "E-DEF" : "EVASION",
    damages: has_normal_hit ? damage_results : [],
    crit_damages: crit_damage_results,
    overkill_heat: overkill_heat,
    effect: data.effect ? data.effect : null,
    on_attack: data.on_attack ? data.on_attack : null,
    on_hit: data.on_hit ? data.on_hit : null,
    on_crit: data.on_crit ? data.on_crit : null,
    tags: data.tags,
    rerollMacroData: encodeMacroData(rerollMacro),
  };

  const template = `systems/${game.system.id}/templates/chat/attack-card.hbs`;
  return await renderMacroTemplate(actor, template, templateData);
}

/**
 * Given an evaluated roll, create a new roll that doubles the dice and reuses
 * the dice from the original roll.
 * @returns An evaluated Roll
 */
async function getCritRoll(normal: Roll) {
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
