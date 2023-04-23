// Import TypeScript modules
import { LANCER } from "../config";
import { getAutomationOptions } from "../settings";
import type { LancerItem } from "../item/lancer-item";
import type { LancerActor } from "../actor/lancer-actor";
import { is_reg_mech, is_reg_npc } from "../actor/lancer-actor";
import type { LancerAttackMacroData, LancerMacroData } from "../interfaces";
import {
  DamageType,
  funcs,
  MechWeapon,
  MechWeaponProfile,
  NpcFeature,
  OpCtx,
  Pilot,
  PilotWeapon,
  RegRef,
} from "machine-mind";
import { is_limited, is_overkill } from "machine-mind/dist/funcs";
import { is_loading, is_self_heat } from "machine-mind/dist/classes/mech/EquipUtil";
import { FoundryReg } from "../mm-util/foundry-reg";
import { checkForHit } from "../helpers/automation/targeting";
import type { AccDiffData, AccDiffDataSerialized, RollModifier } from "../helpers/acc_diff";
import { getMacroSpeaker, ownedItemFromString } from "./_util";
import { encodeMacroData } from "./_encode";
import { renderMacroTemplate } from "./_render";

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

type AttackFlag = {
  origin: string;
  targets: {
    id: string;
    setConditions?: object; // keys are statusEffect ids, values are boolean to indicate whether to apply or remove
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
  actor_ref: RegRef<any>,
  item_id: string | null,
  options: AttackMacroOptions,
  rerollData: AccDiffDataSerialized
) {
  if (actor_ref == null) {
    return openBasicAttack();
  }
  let reg = new FoundryReg();
  let opCtx = new OpCtx();
  let mm = await reg.resolve(opCtx, actor_ref);
  let actor = mm.Flags.orig_doc;
  let item = item_id ? ownedItemFromString(item_id, actor) : null;
  let { AccDiffData } = await import("../helpers/acc_diff");
  let accdiff = AccDiffData.fromObject(rerollData, item ?? actor);
  if (item) {
    return prepareAttackMacro({ actor, item, options }, accdiff);
  } else {
    return openBasicAttack(accdiff);
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
  if (!item.is_npc_feature() && !item.is_mech_weapon() && !item.is_pilot_weapon()) return;
  let mData: LancerAttackMacroData = {
    title: item.name ?? "",
    grit: 0,
    acc: 0,
    damage: [],
    // @ts-ignore this should be on everything, right? TODO: Make sure the mech
    // weapon type is correctly defined
    tags: item.system.derived.mm?.Tags,
    overkill: false,
    effect: "",
    loaded: true,
    destroyed: false,
  };

  let weaponData: NpcFeature | PilotWeapon | MechWeaponProfile;
  let pilotEnt: Pilot;
  let itemEnt: MechWeapon | PilotWeapon | NpcFeature;

  // We can safely split off pilot/mech weapons by actor type
  if (actor.is_mech() && item.is_mech_weapon()) {
    // @ts-expect-error Should be fixed with v10 types
    pilotEnt = (await actor.system.derived.mm_promise).Pilot!;
    // @ts-expect-error Should be fixed with v10 types
    itemEnt = await item.system.derived.mm_promise;

    // @ts-expect-error Should be fixed with v10 types
    weaponData = itemEnt.SelectedProfile;

    mData.loaded = itemEnt.Loaded;
    // @ts-expect-error Should be fixed with v10 types
    mData.destroyed = itemEnt.Destroyed;
    // @ts-expect-error Should be fixed with v10 types
    mData.damage = weaponData.BaseDamage;
    mData.grit = pilotEnt.Grit;
    mData.acc = 0;
    mData.tags = weaponData.Tags;
    mData.overkill = is_overkill(itemEnt);
    mData.self_heat = is_self_heat(itemEnt);
    mData.effect = weaponData.Effect;
    // @ts-expect-error Should be fixed with v10 types
    mData.on_attack = weaponData.OnAttack;
    // @ts-expect-error Should be fixed with v10 types
    mData.on_hit = weaponData.OnHit;
    // @ts-expect-error Should be fixed with v10 types
    mData.on_crit = weaponData.OnCrit;
  } else if (actor.is_pilot() && item.is_pilot_weapon()) {
    // @ts-expect-error Should be fixed with v10 types
    pilotEnt = await actor.system.derived.mm_promise;
    // @ts-expect-error Should be fixed with v10 types
    itemEnt = await item.system.derived.mm_promise;
    // @ts-expect-error Should be fixed with v10 types
    weaponData = itemEnt;

    mData.loaded = itemEnt.Loaded;
    // @ts-expect-error Should be fixed with v10 types
    mData.damage = weaponData.Damage;
    mData.grit = pilotEnt.Grit;
    mData.acc = 0;
    mData.tags = weaponData.Tags;
    mData.overkill = is_overkill(itemEnt);
    mData.self_heat = is_self_heat(itemEnt);
    mData.effect = weaponData.Effect;
  } else if (actor.is_npc() && item.is_npc_feature()) {
    // @ts-expect-error Should be fixed with v10 types
    itemEnt = await item.system.derived.mm_promise;
    // @ts-expect-error Should be fixed with v10 types
    let tier_index: number = itemEnt.TierOverride;
    // @ts-expect-error Should be fixed with v10 types
    if (!itemEnt.TierOverride) {
      if (item.actor === null) {
        // Use selected actor
        // @ts-expect-error Should be fixed with v10 types
        tier_index = actor.system.tier - 1;
      } else if (item.actor.is_npc()) {
        // Use provided actor
        // @ts-expect-error Should be fixed with v10 types
        tier_index = item.actor.system.tier - 1;
      }
    } else {
      // Fix to be index
      tier_index--;
    }

    mData.loaded = itemEnt.Loaded;
    // @ts-expect-error Should be fixed with v10 types
    mData.destroyed = item.system.destroyed;
    // This can be a string... but can also be a number...
    // @ts-expect-error Should be fixed with v10 types
    mData.grit = Number(itemEnt.AttackBonus[tier_index]) || 0;
    // @ts-expect-error Should be fixed with v10 types
    mData.acc = itemEnt.Accuracy[tier_index];

    // Reduce damage values to only this tier
    // @ts-expect-error Should be fixed with v10 types
    mData.damage = itemEnt.Damage[tier_index] ?? [];
    // @ts-expect-error Should be fixed with v10 types
    mData.tags = itemEnt.Tags;
    mData.overkill = funcs.is_overkill(itemEnt);
    mData.self_heat = is_self_heat(itemEnt);
    // @ts-expect-error Should be fixed with v10 types
    mData.on_hit = itemEnt.OnHit;
    // @ts-expect-error Should be fixed with v10 types
    mData.effect = itemEnt.Effect;
  } else {
    ui.notifications!.error(`Error preparing attack macro - ${actor.name} is an unknown type!`);
    return Promise.resolve();
  }

  // Check for damages that are missing type
  let typeMissing = false;
  mData.damage.forEach((d: any) => {
    if (d.type === "" && d.val != "" && d.val != 0) typeMissing = true;
  });
  // Warn about missing damage type if the value is non-zero
  if (typeMissing) {
    ui.notifications!.warn(`Warning: ${item.name} has a damage value without type!`);
  }

  // Options processing
  if (options) {
    if (options.accBonus) {
      mData.grit += options.accBonus;
    }
    if (options.damBonus) {
      let i = mData.damage.findIndex(dam => {
        return dam.DamageType === options.damBonus.type;
      });
      if (i >= 0) {
        // We need to clone so it doesn't go all the way back up to the weapon
        let damClone = { ...mData.damage[i] };
        if (parseInt(damClone.Value) > 0) {
          damClone.Value = `${damClone.Value}+${options.damBonus.val}`;
        } else {
          damClone.Value = options.damBonus.val.toString();
        }
        // @ts-expect-error Not the full class, but it should work for our purposes.
        mData.damage[i] = damClone;
      } else {
        // @ts-expect-error Not the full class, but it should work for our purposes.
        mData.damage.push({ Value: options.damBonus.val.toString(), DamageType: options.damBonus.type });
      }
    }
  }
  // Check if weapon if loaded.
  if (getAutomationOptions().limited_loading && getAutomationOptions().attacks) {
    if (is_loading(itemEnt) && !itemEnt.Loaded) {
      // @ts-expect-error Should be fixed with v10 types
      ui.notifications!.warn(`Weapon ${item.system.name} is not loaded!`);
      return;
    }
    if (is_limited(itemEnt) && itemEnt.Uses <= 0) {
      // @ts-expect-error Should be fixed with v10 types
      ui.notifications!.warn(`Weapon ${item.system.name} has no remaining uses!`);
      return;
    }
    if (mData.destroyed) {
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
    AccDiffData.fromParams(item, mData.tags, mData.title, targets, mData.acc > 0 ? [mData.acc, 0] : [0, -mData.acc]);

  let promptedData;
  try {
    let { open } = await import("../helpers/slidinghud");
    promptedData = await open("attack", initialData);
  } catch (_e) {
    return;
  }

  const atkRolls = attackRolls(mData.grit, promptedData);

  // Deduct charge if LOADING weapon.
  if (getAutomationOptions().limited_loading && getAutomationOptions().attacks) {
    if (is_loading(itemEnt)) {
      itemEnt.Loaded = false;
      await itemEnt.writeback();
    }
    if (is_limited(itemEnt)) {
      itemEnt.Uses = itemEnt.Uses - 1;
      await itemEnt.writeback();
    }
  }

  let rerollMacro = {
    title: "Reroll attack",
    fn: "prepareEncodedAttackMacro",
    // @ts-expect-error Should be fixed with v10 types
    args: [actor.system.derived.mm!.as_ref(), item.id, options, promptedData.toObject()],
  };

  await rollAttackMacro(actor, atkRolls, mData, rerollMacro);
}

export async function openBasicAttack(rerollData?: AccDiffData) {
  let { isOpen, open } = await import("../helpers/slidinghud");

  // if the hud is already open, and we're not overriding with new reroll data, just bail out
  let wasOpen = await isOpen("attack");
  if (wasOpen && !rerollData) {
    return;
  }

  let { AccDiffData } = await import("../helpers/acc_diff");

  let actor = getMacroSpeaker();

  let data =
    rerollData ?? AccDiffData.fromParams(actor, undefined, "Basic Attack", Array.from(game!.user!.targets), undefined);

  let promptedData;
  try {
    promptedData = await open("attack", data);
  } catch (_e) {
    return;
  }

  actor = actor ?? getMacroSpeaker();
  if (!actor) {
    ui.notifications!.error("Can't find unit to attack as. Please select a token.");
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
  let pilotEnt: Pilot;

  if (actor.is_deployable()) {
    // @ts-expect-error Should be fixed with v10 types
    const deployer = (await actor.system.derived.mm_promise).Deployer;
    if (deployer) statActor = deployer.Flags.orig_doc;
  }

  console.log(statActor);

  if (statActor.is_mech()) {
    // @ts-expect-error Should be fixed with v10 types
    pilotEnt = (await statActor.system.derived.mm_promise).Pilot!;
    mData.grit = pilotEnt.Grit;
  } else if (statActor.is_pilot()) {
    // @ts-expect-error Should be fixed with v10 types
    pilotEnt = await statActor.system.derived.mm_promise;
    mData.grit = pilotEnt.Grit;
  } else if (statActor.is_npc()) {
    // @ts-expect-error Should be fixed with v10 types
    const mm = await statActor.system.derived.mm_promise;
    let tier_bonus: number = mm.Tier;
    mData.grit = tier_bonus || 0;
  } else if (statActor.is_deployable()) {
    mData.grit = 0;
  } else {
    ui.notifications!.error(`Error preparing targeting macro - ${actor.name} is an unknown type!`);
    return;
  }

  const atkRolls = attackRolls(mData.grit, promptedData);

  let rerollMacro = {
    title: "Reroll attack",
    fn: "prepareEncodedAttackMacro",
    // @ts-expect-error Should be fixed with v10 types
    args: [actor.system.derived.mm!.as_ref(), null, {}, promptedData.toObject()],
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
  if (game.settings.get(game.system.id, LANCER.setting_automation_attack) && atkRolls.targeted.length > 0) {
    let data = await Promise.all(
      atkRolls.targeted.map(async targetingData => {
        let target = targetingData.target;
        let actor = target.actor as LancerActor;
        let attack_roll = await new Roll(targetingData.roll).evaluate({ async: true });
        // @ts-expect-error DSN options aren't typed
        attack_roll.dice.forEach(d => (d.options.rollOrder = 1));
        const attack_tt = await attack_roll.getTooltip();

        if (targetingData.usedLockOn && game.user!.isGM) {
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
  const isSmart = data.tags.findIndex(tag => tag.Tag.LID === "tg_smart") > -1;
  const { attacks, hits } = await checkTargets(atkRolls, isSmart);
  const atkFlag: AttackFlag = {
    origin: actor.id!,
    targets: atkRolls.targeted.map(t => {
      return { id: t.target.id, setConditions: !!t.usedLockOn ? { lockon: !t.usedLockOn } : undefined };
    }),
  };

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
    (hits.length === 0 && !!attacks.find(attack => (attack.roll.total ?? 0) < 20)) ||
    !!hits.find(hit => hit.hit && !hit.crit);
  const has_crit_hit =
    (hits.length === 0 && !!attacks.find(attack => (attack.roll.total ?? 0) >= 20)) || !!hits.find(hit => hit.crit);

  // If we hit evaluate normal damage, even if we only crit, we'll use this in
  // the next step for crits
  if (has_normal_hit || has_crit_hit) {
    for (const x of data.damage) {
      if (x.Value === "" || x.Value == "0") continue; // Skip undefined and zero damage
      let d_formula = x.Value.toString();
      let droll: Roll | undefined = new Roll(d_formula);
      // Add overkill if enabled.
      if (data.overkill) {
        droll.terms.forEach(term => {
          if (term instanceof Die) term.modifiers = ["x1", `kh${term.number}`].concat(term.modifiers);
        });
      }

      await droll.evaluate({ async: true });
      // @ts-expect-error DSN options aren't typed
      droll.dice.forEach(d => (d.options.rollOrder = 2));
      const tt = await droll.getTooltip();

      damage_results.push({
        roll: droll,
        tt: tt,
        d_type: x.DamageType,
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
    self_heat = parseInt(`${data.tags.find(tag => tag.Tag.LID === "tg_heat_self")?.Value ?? 0}`);
  }

  if (getAutomationOptions().attack_self_heat) {
    // @ts-expect-error Should be fixed with v10 types
    let mmEnt = await actor.system.derived.mm_promise;
    if (is_reg_mech(mmEnt) || is_reg_npc(mmEnt)) {
      // Separate if for typing check.
      if (overkill_heat > 0 || self_heat > 0) {
        mmEnt.CurrentHeat += overkill_heat + self_heat;
        await mmEnt.writeback();
      }
    }
  }

  // Output
  const templateData = {
    title: data.title,
    item_id: rerollMacro.args[1],
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

  console.debug(templateData);
  const template = `systems/${game.system.id}/templates/chat/attack-card.hbs`;
  return await renderMacroTemplate(actor, template, templateData, { attackData: atkFlag });
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
    tokenActor?.remove_active_effects(statusToRemove);
  });
});

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
