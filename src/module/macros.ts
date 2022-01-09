// Import TypeScript modules
import { LANCER } from "./config";
import type { LancerItem } from "./item/lancer-item";
import type { LancerActor } from "./actor/lancer-actor";
import { is_reg_mech } from "./actor/lancer-actor";
import type {
  LancerAttackMacroData,
  LancerMacroData,
  LancerReactionMacroData,
} from "./interfaces";
// Import JSON data
import {
  DamageType,
  EntryType,
  funcs,
  MechWeapon,
  MechWeaponProfile,
  NpcFeature,
  NpcFeatureType,
  OpCtx,
  Pilot,
  PilotWeapon,
  RegRef,
  TagInstance,
} from "machine-mind";
import { FoundryFlagData, FoundryReg } from "./mm-util/foundry-reg";
import { is_ref } from "./helpers/commons";
import { checkForHit } from "./helpers/automation/targeting";
import type { AccDiffData, AccDiffDataSerialized, RollModifier } from "./helpers/acc_diff";
import { is_limited, is_overkill } from "machine-mind/dist/funcs";
import type { LancerToken } from "./token";
import { is_loading, is_self_heat } from "machine-mind/dist/classes/mech/EquipUtil";
import { getAutomationOptions } from "./settings";

import { getMacroSpeaker, encodeMacroData, encodedMacroWhitelist, ownedItemFromString } from "./macros/util"
import { renderMacroTemplate } from "./macros/render"

export { encodeMacroData, runEncodedMacro } from "./macros/util"
export { renderMacroTemplate, renderMacroHTML } from "./macros/render"
export { prepareActivationMacro } from "./macros/activation"
export { prepareCoreActiveMacro, prepareCorePassiveMacro } from "./macros/core-power"
export { prepareItemMacro } from "./macros/item"
export { prepareOverchargeMacro } from "./macros/overcharge"
export { prepareStatMacro } from "./macros/stat"
export { prepareTechMacro } from "./macros/tech"
export { prepareTextMacro } from "./macros/text"
export { stabilizeMacro } from "./macros/stabilize"
export { prepareOverheatMacro } from "./macros/stress"
export { prepareStructureMacro, prepareStructureSecondaryRollMacro } from "./macros/structure"
export { fullRepairMacro } from "./macros/full-repair"

const lp = LANCER.log_prefix;


export async function onHotbarDrop(_bar: any, data: any, slot: number) {
  // We set an associated command & title based off the type
  // Everything else gets handled elsewhere

  let command = "";
  let title = "";
  let img = `systems/${game.system.id}/assets/icons/macro-icons/d20-framed.svg`;

  // Grab new encoded data ASAP
  if (data.fn && data.args && data.title) {
    // i.e., data instanceof LancerMacroData
    if (encodedMacroWhitelist.indexOf(data.fn) < 0) {
      ui.notifications!.error("You are trying to drop an invalid macro");
      return;
    }
    command = `game.lancer.${data.fn}.apply(null, ${JSON.stringify(data.args)})`;
    img = data.iconPath ? data.iconPath : `systems/${game.system.id}/assets/icons/macro-icons/generic_item.svg`;
    title = data.title;
  } else if (data.pack) {
    // If we have a source pack, it's dropped from a compendium and there's no processing for us to do
    return;
  } else {
    let itemId = "error";

    console.log(`${lp} Data dropped on hotbar:`, data);

    // Determine if we're using old or new method
    let actorId: string;
    if ("actorId" in data) {
      title = data.title;
      itemId = data.itemId;
      actorId = data.actorId;
    } else if (is_ref(data)) {
      var item = await new FoundryReg().resolve(new OpCtx(), data);
      title = item.Name;

      if (!item) return;

      let orig_doc = (item.Flags as FoundryFlagData).orig_doc;
      // @ts-ignore This is probably changed in sohumb's branch anyway
      actorId = orig_doc.actor?.id ?? "error";
      itemId = data.id;
    } else {
      return;
    }

    switch (data.type) {
      case EntryType.SKILL:
        command = `game.lancer.prepareItemMacro("${actorId}", "${itemId}");`;
        img = `systems/${game.system.id}/assets/icons/macro-icons/skill.svg`;
        break;
      case EntryType.TALENT:
        command = `game.lancer.prepareItemMacro("${actorId}", "${itemId}", {rank: ${data.rank}});`;
        img = `systems/${game.system.id}/assets/icons/macro-icons/talent.svg`;
        break;
      case EntryType.CORE_BONUS:
        img = `systems/${game.system.id}/assets/icons/macro-icons/corebonus.svg`;
        break;
      case EntryType.PILOT_GEAR:
        command = `game.lancer.prepareItemMacro("${actorId}", "${itemId}");`;
        img = `systems/${game.system.id}/assets/icons/macro-icons/generic_item.svg`;
        break;
      case EntryType.PILOT_WEAPON:
      case EntryType.MECH_WEAPON:
        command = `game.lancer.prepareItemMacro("${actorId}", "${itemId}");`;
        img = `systems/${game.system.id}/assets/icons/macro-icons/mech_weapon.svg`;
        break;
      case EntryType.MECH_SYSTEM:
        command = `game.lancer.prepareItemMacro("${actorId}", "${itemId}");`;
        img = `systems/${game.system.id}/assets/icons/macro-icons/mech_system.svg`;
        break;
      case EntryType.NPC_FEATURE:
        switch (item.FeatureType) {
          case NpcFeatureType.Reaction:
            command = `game.lancer.prepareItemMacro("${actorId}", "${itemId}");`;
            img = `systems/${game.system.id}/assets/icons/macro-icons/reaction.svg`;
            break;
          case NpcFeatureType.System:
            command = `game.lancer.prepareItemMacro("${actorId}", "${itemId}");`;
            img = `systems/${game.system.id}/assets/icons/macro-icons/mech_system.svg`;
            break;
          case NpcFeatureType.Trait:
            command = `game.lancer.prepareItemMacro("${actorId}", "${itemId}");`;
            img = `systems/${game.system.id}/assets/icons/macro-icons/trait.svg`;
            break;
          case NpcFeatureType.Tech:
            command = `game.lancer.prepareItemMacro("${actorId}", "${itemId}");`;
            img = `systems/${game.system.id}/assets/icons/macro-icons/tech_quick.svg`;
            break;
          case NpcFeatureType.Weapon:
            command = `game.lancer.prepareItemMacro("${actorId}", "${itemId}");`;
            img = `systems/${game.system.id}/assets/icons/macro-icons/mech_weapon.svg`;
            break;
        }
        break;
    }

    // TODO: Figure out if I am really going down this route and, if so, switch to a switch
    if (data.type === "actor") {
      title = data.title;
    } else if (data.type === "pilot_weapon") {
      // Talent are the only ones (I think??) that we need to name specially
      if (data.type === EntryType.TALENT) {
        img = `systems/${game.system.id}/assets/icons/macro-icons/talent.svg`;
      }
      // Pick the image for the hotbar
    } else if (data.type === "Text") {
      command = `game.lancer.prepareTextMacro("${data.actorId}", "${data.title}", {rank: ${data.description}})`;
    } else if (data.type === "Core-Active") {
      command = `game.lancer.prepareCoreActiveMacro("${data.actorId}")`;
      img = `systems/${game.system.id}/assets/icons/macro-icons/corebonus.svg`;
    } else if (data.type === "Core-Passive") {
      command = `game.lancer.prepareCorePassiveMacro("${data.actorId}")`;
      img = `systems/${game.system.id}/assets/icons/macro-icons/corebonus.svg`;
    } else if (data.type === "overcharge") {
      command = `game.lancer.prepareOverchargeMacro("${data.actorId}")`;
      img = `systems/${game.system.id}/assets/icons/macro-icons/overcharge.svg`;
    }
  }

  let macro = game.macros!.contents.find((m: Macro) => m.name === title && m.data.command === command);
  if (!macro) {
    Macro.create({
      command,
      name: title,
      type: "script",
      img: img,
    }).then(macro => game.user!.assignHotbarMacro(macro!, slot));
  } else {
    game.user!.assignHotbarMacro(macro, slot);
  }
}

/** TODO: Remove if not needed
function getMacroActorItem(a: string, i: string): { actor: LancerActor | undefined; item: LancerItem | undefined } {
  let result: { actor: LancerActor | undefined; item: LancerItem | undefined } = { actor: undefined, item: undefined };
  // Find the Actor for a macro to speak as
  result.actor = getMacroSpeaker(a);
  if (!result.actor) return result;

  // Find the item
  result.item = result.actor.items.get(i);
  if (!result.item) {
    ui.notifications!.warn(`Failed to find Item for macro.`);
    return result;
  }
  return result;
}
 */

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
  actor_ref: RegRef<any>,
  item_id: string | null,
  options: AttackMacroOptions,
  rerollData: AccDiffDataSerialized
) {
  let reg = new FoundryReg();
  let opCtx = new OpCtx();
  let mm = await reg.resolve(opCtx, actor_ref);
  let actor = mm.Flags.orig_doc;
  let item = item_id ? ownedItemFromString(item_id, actor) : null;
  let { AccDiffData } = await import("./helpers/acc_diff");
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
    tags: item.data.data.derived.mm?.Tags,
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
    pilotEnt = (await actor.data.data.derived.mm_promise).Pilot!;
    itemEnt = await item.data.data.derived.mm_promise;

    weaponData = itemEnt.SelectedProfile;

    mData.loaded = itemEnt.Loaded;
    mData.destroyed = itemEnt.Destroyed;
    mData.damage = weaponData.BaseDamage;
    mData.grit = pilotEnt.Grit;
    mData.acc = 0;
    mData.tags = weaponData.Tags;
    mData.overkill = is_overkill(itemEnt);
    mData.self_heat = is_self_heat(itemEnt);
    mData.effect = weaponData.Effect;
  } else if (actor.is_pilot() && item.is_pilot_weapon()) {
    pilotEnt = await actor.data.data.derived.mm_promise;
    itemEnt = await item.data.data.derived.mm_promise;
    weaponData = itemEnt;

    mData.loaded = itemEnt.Loaded;
    mData.damage = weaponData.Damage;
    mData.grit = pilotEnt.Grit;
    mData.acc = 0;
    mData.tags = weaponData.Tags;
    mData.overkill = is_overkill(itemEnt);
    mData.self_heat = is_self_heat(itemEnt);
    mData.effect = weaponData.Effect;
  } else if (actor.is_npc() && item.is_npc_feature()) {
    itemEnt = await item.data.data.derived.mm_promise;
    let tier_index: number = itemEnt.TierOverride;
    if (!itemEnt.TierOverride) {
      if (item.actor === null) {
        // Use selected actor
        tier_index = actor.data.data.tier - 1;
      } else if (item.actor.is_npc()) {
        // Use provided actor
        tier_index = item.actor.data.data.tier - 1;
      }
    } else {
      // Fix to be index
      tier_index--;
    }

    mData.loaded = itemEnt.Loaded;
    // mData.destroyed = item.data.data.destroyed; TODO: NPC weapons don't seem to have a destroyed field
    // This can be a string... but can also be a number...
    mData.grit = Number(itemEnt.AttackBonus[tier_index]) || 0;
    mData.acc = itemEnt.Accuracy[tier_index];

    // Reduce damage values to only this tier
    mData.damage = itemEnt.Damage[tier_index] ?? [];
    mData.tags = itemEnt.Tags;
    mData.overkill = funcs.is_overkill(itemEnt);
    mData.self_heat = is_self_heat(itemEnt);
    mData.on_hit = itemEnt.OnHit;
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
      ui.notifications!.warn(`Weapon ${item.data.data.name} is not loaded!`);
      return;
    }
    if (is_limited(itemEnt) && itemEnt.Uses <= 0) {
      ui.notifications!.warn(`Weapon ${item.data.data.name} has no remaining uses!`);
      return;
    }
    if (mData.destroyed) {
      ui.notifications!.warn(`Weapon ${item.data.data.name} is destroyed!`);
      return;
    }
  }

  // Prompt the user before deducting charges.
  const targets = Array.from(game!.user!.targets);
  let { AccDiffData } = await import("./helpers/acc_diff");
  const initialData =
    rerollData ??
    AccDiffData.fromParams(item, mData.tags, mData.title, targets, mData.acc > 0 ? [mData.acc, 0] : [0, -mData.acc]);

  let promptedData;
  try {
    let { open } = await import("./helpers/slidinghud");
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
    } else if (is_limited(itemEnt)) {
      itemEnt.Uses = itemEnt.Uses - 1;
      await itemEnt.writeback();
    }
  }

  let rerollMacro = {
    title: "Reroll attack",
    fn: "prepareEncodedAttackMacro",
    args: [actor.data.data.derived.mm!.as_ref(), item.id, options, promptedData.toObject()],
  };

  await rollAttackMacro(actor, atkRolls, mData, rerollMacro);
}

export async function openBasicAttack(rerollData?: AccDiffData) {
  let { isOpen, open } = await import("./helpers/slidinghud");

  // if the hud is already open, and we're not overriding with new reroll data, just bail out
  let wasOpen = await isOpen("attack");
  if (wasOpen && !rerollData) {
    return;
  }

  let { AccDiffData } = await import("./helpers/acc_diff");

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

  let pilotEnt: Pilot;
  if (actor.is_mech()) {
    pilotEnt = (await actor.data.data.derived.mm_promise).Pilot!;
    mData.grit = pilotEnt.Grit;
  } else if (actor.is_pilot()) {
    pilotEnt = await actor.data.data.derived.mm_promise;
    mData.grit = pilotEnt.Grit;
  } else if (actor.is_npc()) {
    const mm = await actor.data.data.derived.mm_promise;
    let tier_bonus: number = mm.Tier - 1;
    mData.grit = tier_bonus || 0;
  } else {
    ui.notifications!.error(`Error preparing targeting macro - ${actor.name} is an unknown type!`);
    return;
  }

  const atkRolls = attackRolls(mData.grit, promptedData);

  let rerollMacro = {
    title: "Reroll attack",
    fn: "prepareEncodedAttackMacro",
    args: [actor.data.data.derived.mm!.as_ref(), null, {}, promptedData.toObject()],
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
        const attack_tt = await attack_roll.getTooltip();

        if (targetingData.usedLockOn) {
          targetingData.usedLockOn.delete();
        }

        return {
          attack: { roll: attack_roll, tt: attack_tt },
          hit: {
            token: { name: target.data.name!, img: target.data.img! },
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

  // TODO: Heat (self) application
  if (getAutomationOptions().attack_self_heat) {
    let mment = await actor.data.data.derived.mm_promise;
    if (is_reg_mech(mment)) {
      mment.CurrentHeat += overkill_heat + self_heat;
      await mment.writeback();
    }
  }

  // Output
  const templateData = {
    title: data.title,
    attacks: attacks,
    hits: hits,
    defense: isSmart ? "E-DEF" : "EVASION",
    damages: has_normal_hit ? damage_results : [],
    crit_damages: crit_damage_results,
    overkill_heat: overkill_heat,
    effect: data.effect ? data.effect : null,
    on_hit: data.on_hit ? data.on_hit : null,
    tags: data.tags,
    rerollMacroData: encodeMacroData(rerollMacro),
  };

  console.debug(templateData);
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

/**
 * Rolls an NPC reaction macro when given the proper data
 * @param actor {Actor} Actor to roll as. Assumes properly prepared item.
 * @param data {LancerReactionMacroData} Reaction macro data to render.
 */
export function rollReactionMacro(actor: LancerActor, data: LancerReactionMacroData) {
  if (!actor) return Promise.resolve();

  const template = `systems/${game.system.id}/templates/chat/reaction-card.hbs`;
  return renderMacroTemplate(actor, template, data);
}

export async function prepareChargeMacro(a: string | LancerActor) {
  // Determine which Actor to speak as
  let actor = getMacroSpeaker(a);
  if (!actor || !actor.is_npc()) return;
  const ent = actor.data.data.derived.mm;
  const feats = ent?.Features;
  if (!feats) return;

  // Make recharge roll.
  const roll = await new Roll("1d6").evaluate({ async: true });
  const roll_tt = await roll.getTooltip();
  // Iterate over each system with recharge, if val of tag is lower or equal to roll, set to charged.

  let changed: { name: string; target: string | null | number | undefined; charged: boolean }[] = [];
  feats.forEach(feat => {
    if (!feat.Charged) {
      const recharge = feat.Tags.find((tag: TagInstance) => tag.Tag.LID === "tg_recharge");
      if (recharge && recharge.Value && recharge.Value <= (roll.total ?? 0)) {
        feat.Charged = true;
        feat.writeback();
      }
      changed.push({ name: feat.Name, target: recharge?.Value, charged: feat.Charged });
    }
  });

  // Skip chat if no changes found.
  if (changed.length === 0) return;

  // Render template.
  const templateData = {
    actorName: actor.name,
    roll: roll,
    roll_tooltip: roll_tt,
    changed: changed,
  };
  const template = `systems/${game.system.id}/templates/chat/charge-card.hbs`;
  return renderMacroTemplate(actor, template, templateData);
}

/**
 * Sets user targets to tokens that are within the highlighted spaces of the
 * MeasuredTemplate
 * @param templateId - The id of the template to use
 */
export function targetsFromTemplate(templateId: string): void {
  const highlight = canvas?.grid?.getHighlightLayer(`Template.${templateId}`);
  const grid = canvas?.grid;
  if (highlight === undefined || canvas === undefined || grid === undefined || canvas.ready !== true) return;
  const test_token = (token: LancerToken) => {
    return Array.from(token.getOccupiedSpaces()).reduce((a, p) => a || highlight.geometry.containsPoint(p), false);
  };

  // Get list of tokens and dispositions to ignore.
  let ignore = canvas.templates!.get(templateId)!.document.getFlag(game.system.id, "ignore");

  // Test if each token occupies a targeted space and target it if true
  const targets = canvas
    .tokens!.placeables.filter(t => {
      let skip = ignore.tokens.includes(t.id) || ignore.dispositions.includes(t.data.disposition);
      return !skip && test_token(t);
    })
    .map(t => t.id);
  game.user!.updateTokenTargets(targets);
  game.user!.broadcastActivity({ targets });
}
