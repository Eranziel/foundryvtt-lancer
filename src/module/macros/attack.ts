// Import TypeScript modules
import { LANCER } from "../config";
import { getAutomationOptions } from "../settings";
import { LancerItem } from "../item/lancer-item";
import { LancerActor } from "../actor/lancer-actor";
import { checkForHit } from "../helpers/automation/targeting";
import { AccDiffData, AccDiffDataSerialized, RollModifier } from "../helpers/acc_diff";
import { resolveItemOrActor } from "./util";
import { encodeMacroData } from "./encode";
import { renderMacroTemplate } from "./_render";
import { DamageType } from "../enums";
import { SystemTemplates } from "../system-template";
import { SourceData } from "../source-template";
import { LancerMacro } from "./interfaces";
import { openSlidingHud } from "../helpers/slidinghud";
import { Tag } from "../models/bits/tag";

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

/** Create the attack roll(s) for a given attack configuration */
export function attackRolls(flat_bonus: number, acc_diff: AccDiffData): AttackRolls {
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

/**
 * Standalone prepare function for attacks, since they're complex.
 * @param doc                   Weapon/Actor to attack with. Can be passed as a uuid or a document
 * @param options {Object}      Options that can be passed through. Current options:
 *            - accBonus        Flat bonus to accuracy
 *            - damBonus        Object of form {type: val} to apply flat damage bonus of given type.
 *                              The "Bonus" type is recommended but not required
 */
export async function prepareAttackMacro(
  doc: string | LancerActor | LancerItem,
  options?: {
    flat_bonus?: number;
    title?: string;
  }
) {
  // Determine provided doc
  let { item, actor } = await resolveItemOrActor(doc);
  if (!actor) return;

  let mData: Partial<LancerMacro.WeaponRoll> = {
    docUUID: item?.uuid ?? actor?.uuid,
  };
  let acc_diff: AccDiffData;
  let item_changes: DeepPartial<SourceData.MechWeapon | SourceData.NpcFeature | SourceData.PilotWeapon> = {};

  // We can safely split off pilot/mech weapons by actor type
  if (!item && actor) {
    mData.title = options?.title ?? "BASIC ATTACK";
    mData.flat_bonus = 0;
    if (actor.is_deployable() && actor.system.owner?.value) actor = actor.system.owner?.value;
    if (actor.is_pilot() || actor.is_mech()) mData.flat_bonus = actor.system.grit;
    else if (actor.is_npc()) mData.flat_bonus = actor.system.tier;
    acc_diff = AccDiffData.fromParams(actor, [], mData.title, Array.from(game.user!.targets));
  } else if (doc instanceof LancerItem) {
    // Weapon attack
    item = doc;
    let actor = doc.actor;

    // This works for everything
    mData.title = item.name!;

    if (item.is_mech_weapon()) {
      if (!actor?.is_mech()) return;
      if (!actor.system.pilot?.value) {
        ui.notifications?.warn("Cannot fire a weapon on a non-piloted mech!");
        return;
      }
      let pilot = actor.system.pilot?.value;
      let profile = item.system.active_profile;
      mData.loaded = item.system.loaded;
      mData.destroyed = item.system.destroyed;
      mData.damage = profile.damage;
      mData.flat_bonus = pilot.system.grit;
      mData.tags = profile.tags;
      mData.overkill = profile.tags.some(t => t.is_overkill);
      mData.self_heat = profile.tags.find(t => t.is_selfheat)?.val;
      mData.effect = profile.effect;
      mData.on_attack = profile.on_attack;
      mData.on_hit = profile.on_hit;
      mData.on_crit = profile.on_crit;
      acc_diff = AccDiffData.fromParams(item, profile.tags, mData.title, Array.from(game.user!.targets));
    } else if (item.is_npc_feature()) {
      if (!actor?.is_npc()) return;

      let tier_index = (item.system.tier_override ?? actor.system.tier) - 1;

      let asWeapon = item.system as SystemTemplates.NPC.WeaponData;
      mData.loaded = item.system.loaded;
      mData.destroyed = item.system.destroyed;
      mData.flat_bonus = asWeapon.attack_bonus[tier_index]; // Sometimes the data's a string

      // Reduce damage values to only this tier
      mData.damage = asWeapon.damage[tier_index] ?? [];
      mData.tags = asWeapon.tags;
      mData.overkill = asWeapon.tags.some(t => t.is_overkill);
      mData.self_heat = asWeapon.tags.find(t => t.is_selfheat)?.val;
      mData.on_hit = asWeapon.on_hit;
      mData.effect = asWeapon.effect;
      acc_diff = AccDiffData.fromParams(
        item,
        asWeapon.tags,
        mData.title,
        Array.from(game.user!.targets),
        asWeapon.accuracy[tier_index]
      );
    } else if (item.is_pilot_weapon()) {
      if (!actor?.is_pilot()) return;
      mData.loaded = item.system.loaded;
      mData.damage = item.system.damage;
      mData.flat_bonus = actor.system.grit;
      mData.tags = item.system.tags;
      mData.overkill = item.system.tags.some(t => t.is_overkill);
      mData.self_heat = item.system.tags.find(t => t.is_selfheat)?.val;
      mData.effect = item.system.effect;
      acc_diff = AccDiffData.fromParams(item, item.system.tags, mData.title, Array.from(game.user!.targets));
    } else {
      ui.notifications!.error(`Error preparing attack macro - ${item.name} is an unknown type!`);
      return;
    }

    // Check if weapon if loaded / mark it as not
    if (getAutomationOptions().limited_loading && getAutomationOptions().attacks) {
      // Check loading, and mark unloaded
      if (item.isLoading()) {
        if (!item.system.loaded) {
          ui.notifications!.warn(`Weapon ${item.name} is not loaded!`);
          return;
        } else {
          item_changes.loaded = false;
        }
      }

      // Check limited, and mark one less
      if (item.isLimited()) {
        if (item.system.uses.value <= 0) {
          ui.notifications!.warn(`Weapon ${item.name} has no remaining uses!`);
          return;
        } else {
          item_changes.uses = Math.max(item.system.uses.value - 1, 0);
        }
      }

      // Don't allow firing destroyed weapons, I guess?
      if (mData.destroyed) {
        ui.notifications!.warn(`Weapon ${item.name!} is destroyed!`);
        return;
      }
    }
  } else {
    return; // Can't really attack as anything else...
  }

  // Everything from here on out is generic between basic and weapon attacks
  acc_diff = await openSlidingHud("attack", acc_diff);
  mData.acc_diff = acc_diff.toObject();

  // Commit item updates
  if (item) await item.update({ system: item_changes });

  await rollAttackMacro(mData as LancerMacro.WeaponRoll);
}

type AttackResult = {
  roll: Roll;
  tt: string | HTMLElement | JQuery<HTMLElement>; // Tooltip
};

type DamageResult = {
  roll: Roll;
  tt: string | HTMLElement | JQuery<HTMLElement>; // Tooltip
  d_type: DamageType;
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

export async function rollAttackMacro(data: LancerMacro.WeaponRoll, reroll: boolean = false) {
  // Get actor / item->actor (can be either)
  let { item, actor } = await resolveItemOrActor(data.docUUID);
  if (!actor) {
    return;
  }

  // Populate and possibly regenerate ADD if reroll
  let add = AccDiffData.fromObject(data.acc_diff);
  if (reroll) {
    // Re-prompt
    add.replaceTargets(Array.from(game!.user!.targets));
    add = await openSlidingHud("attack", add);
    data.acc_diff = add.toObject();
  }

  let rerollInvocation: LancerMacro.Invocation = {
    title: "RollMacro",
    fn: "rollAttackMacro",
    args: [data, true],
  };

  const atkRolls = attackRolls(data.flat_bonus, add);
  const hydratedTags = data.tags?.map(t => new Tag(t)) ?? [];
  const isSmart = hydratedTags.some(tag => tag.is_smart);
  const { attacks, hits } = await checkTargets(atkRolls, isSmart);

  // Iterate through damage types, rolling each
  let damage_results: Array<DamageResult> = [];
  let crit_damage_results: Array<DamageResult> = [];
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
    for (const x of data.damage ?? []) {
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
    self_heat = (await new Roll(data.self_heat).roll({ async: true })).total!;
  }

  if (getAutomationOptions().attack_self_heat) {
    if (actor.is_mech() || actor.is_npc()) {
      await actor.update({ "system.heat.value": actor.system.heat.value + overkill_heat + self_heat });
    }
  }

  // Output
  const templateData = {
    title: data.title,
    item_uuid: data.docUUID,
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
    tags: hydratedTags,
    rerollMacroData: encodeMacroData(rerollInvocation),
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
