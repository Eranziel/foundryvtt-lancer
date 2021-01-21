// Import TypeScript modules
import { LANCER } from "./config";
import { LancerCoreBonus, LancerItem, LancerPilotGear } from "./item/lancer-item";
import { LancerActor } from "./actor/lancer-actor";
import { LancerPilotSheet } from "./actor/pilot-sheet";
import {
  LancerAttackMacroData,
  LancerFrameItemData,
  LancerGenericMacroData,
  LancerMechSystemData,
  LancerMechWeaponData,
  LancerNPCData,
  LancerPilotActorData,
  LancerPilotData,
  LancerPilotWeaponData,
  LancerReactionMacroData,
  LancerStatMacroData,
  LancerTalentMacroData,
  LancerTechMacroData,
  LancerTextMacroData,
  LancerOverchargeMacroData,
  NPCDamageData,
  TagDataShort,
} from "./interfaces";
// Import JSON data
import { DamageType, IDamageData, NpcFeatureType } from "machine-mind";
import { LancerNPCTechData, LancerNPCWeaponData } from "./item/npc-feature";

const lp = LANCER.log_prefix;

/**
 * Generic macro preparer for any item.
 * Given an actor and item, will prepare data for the macro then roll it.
 * @param a The actor id to speak as
 * @param i The item id that is being rolled
 * @param options Ability to pass through various options to the item.
 *      Talents can use rank: value.
 *      Weapons can use accBonus or damBonus
 */
export async function prepareItemMacro(a: string, i: string, options?: any) {
  // Determine which Actor to speak as
  let actor: Actor | null = getMacroSpeaker(a);
  if (!actor) {
    ui.notifications.warn(`Failed to find Actor for macro. Do you need to select a token?`);
    return null;
  }

  // Get the item
  const item: LancerItem | null = actor.getOwnedItem(i) as LancerItem | null;
  if (!item) {
    return ui.notifications.error(
      `Error preparing macro: could not find Item ${i} owned by Actor ${a}.`
    );
  } else if (!item.isOwned) {
    return ui.notifications.error(`Error preparing macro: ${item.name} is not owned by an Actor.`);
  }

  switch (item.data.type) {
    // Skills
    case "skill":
      let skillData: LancerStatMacroData = {
        title: item.name,
        bonus: item.data.data.rank * 2,
      };
      await rollTriggerMacro(actor, skillData);
      break;
    // Pilot OR Mech weapon
    case "pilot_weapon":
    case "mech_weapon":
      await prepareAttackMacro({ actor, item, options });
      break;
    // Systems
    case "mech_system":
      // TODO--this can probably be a textMacro
      let sysData: LancerGenericMacroData = {
        title: item.name,
        effect: item.data.data.effect,
      };

      await rollSystemMacro(actor, sysData);
      break;
    // Talents
    case "talent":
      // If we aren't passed a rank, default to 0
      let rank = options.rank ? options.rank : 0;

      let talData: LancerTalentMacroData = {
        talent: item.data.data,
        rank: rank,
      };

      await rollTalentMacro(actor, talData);
      break;
    // Gear
    case "pilot_gear":
      let gearData: LancerTextMacroData = {
        title: item.name,
        description: (<LancerPilotGear>item).data.data.description,
        tags: (<LancerPilotGear>item).data.data.tags,
      };

      await rollTextMacro(actor, gearData);
      break;
    // Core bonuses can just be text, right?
    case "core_bonus":
      let CBdata: LancerTextMacroData = {
        title: item.name,
        description: (<LancerCoreBonus>item).data.data.effect,
      };

      await rollTextMacro(actor, CBdata);
      break;
    case "npc_feature":
      switch (item.data.data.feature_type) {
        case NpcFeatureType.Weapon:
          await prepareAttackMacro({ actor, item, options });
          break;
        case NpcFeatureType.Tech:
          await prepareTechMacro(actor._id, item._id);
          break;
        case NpcFeatureType.System:
        case NpcFeatureType.Trait:
          let sysData: LancerTextMacroData = {
            title: item.name,
            description: <string>item.data.data.effect,
            tags: item.data.data.tags,
          };

          await rollTextMacro(actor, sysData);
          break;
        case NpcFeatureType.Reaction:
          let reactData: LancerReactionMacroData = {
            title: item.name,
            // Screw it, I'm not messing with all our item definitions just for this.
            //@ts-ignore
            trigger: <string>item.data.data.trigger,
            effect: <string>item.data.data.effect,
            tags: item.data.data.tags,
          };

          await rollReactionMacro(actor, reactData);
          break;
      }
      break;
    default:
      console.log("No macro exists for that item type");
      return ui.notifications.error(`Error - No macro exists for that item type`);
  }
}

export function getMacroSpeaker(a_id?: string): LancerActor | null {
  // Determine which Actor to speak as
  const speaker = ChatMessage.getSpeaker();
  // console.log(`${lp} Macro speaker`, speaker);
  let actor: Actor | null = null;
  // console.log(game.actors.tokens);
  try {
    if (speaker.token) {
      actor = (game.actors.tokens[speaker.token] as unknown) as Actor;
    }
  } catch (TypeError) {
    // Need anything here?
  }
  if (!actor) {
    actor = game.actors.get(speaker.actor, { strict: false });
  }
  if (!actor || (a_id && actor.id !== a_id)) {
    actor = game.actors.get(a_id!);
  }
  return actor ? <LancerActor>actor : null;
}

export async function renderMacro(actor: Actor, template: string, templateData: any) {
  const html = await renderTemplate(template, templateData);
  let roll = templateData.roll || templateData.attack;
  let chat_data = {
    user: game.user,
    type: roll ? CONST.CHAT_MESSAGE_TYPES.ROLL : CONST.CHAT_MESSAGE_TYPES.IC,
    roll: roll,
    speaker: {
      actor: actor,
      token: actor.token,
      alias: actor.token ? actor.token.name : null,
    },
    content: html,
  };
  let cm = await ChatMessage.create(chat_data);
  cm.render();
  return Promise.resolve();
}

function getMacroActorItem(a: string, i: string): { actor: Actor | null; item: Item | null } {
  let result = { actor: null, item: null } as { actor: Actor | null; item: Item | null };
  // Find the Actor for a macro to speak as
  result.actor = getMacroSpeaker(a);
  if (!result.actor) {
    ui.notifications.warn(`Failed to find Actor for macro. Do you need to select a token?`);
    return result;
  }

  // Find the item
  result.item = result.actor.getOwnedItem(i) as Item | null;
  if (!result.item) {
    ui.notifications.warn(`Failed to find Item for macro.`);
    return result;
  }
  return result;
}

async function buildAttackRollString(
  title: string,
  acc: number,
  bonus: number
): Promise<string | null> {
  let abort: boolean = false;
  await promptAccDiffModifier(acc, title).then(
    resolve => (acc = resolve),
    reject => (abort = reject)
  );
  if (abort) return null;

  // Do the attack rolling
  let acc_str = acc != 0 ? ` + ${acc}d6kh1` : "";
  return `1d20+${bonus}${acc_str}`;
}

export function prepareStatMacro(a: string, statKey: string) {
  // Determine which Actor to speak as
  let actor: Actor | null = getMacroSpeaker(a);
  if (!actor) return;

  let bonus: any = actor.data;
  const statPath = statKey.split(".");
  for (let i = 0; i < statPath.length; i++) {
    const p = statPath[i];
    bonus = bonus[`${p}`];
  }

  let mData: LancerStatMacroData = {
    title: statPath[statPath.length - 1].toUpperCase(),
    bonus: bonus,
  };
  rollStatMacro(actor, mData).then();
}

// Rollers

async function rollTriggerMacro(actor: Actor, data: LancerStatMacroData) {
  return await rollStatMacro(actor, data);
}

async function rollStatMacro(actor: Actor, data: LancerStatMacroData) {
  if (!actor) return Promise.resolve();

  // Get accuracy/difficulty with a prompt
  let acc: number = 0;
  let abort: boolean = false;
  await promptAccDiffModifier(acc).then(
    resolve => (acc = resolve),
    () => (abort = true)
  );
  if (abort) return Promise.resolve();

  // Do the roll
  let acc_str = acc != 0 ? ` + ${acc}d6kh1` : "";
  let roll = new Roll(`1d20+${data.bonus}${acc_str}`).roll();

  const roll_tt = await roll.getTooltip();

  // Construct the template
  const templateData = {
    title: data.title,
    roll: roll,
    roll_tooltip: roll_tt,
    effect: data.effect ? data.effect : null,
  };
  const template = `systems/lancer/templates/chat/stat-roll-card.html`;
  return renderMacro(actor, template, templateData);
}

async function rollSystemMacro(actor: Actor, data: LancerGenericMacroData) {
  if (!actor) return Promise.resolve();

  // Construct the template
  const templateData = {
    title: data.title,
    effect: data.effect ? data.effect : null,
  };
  const template = `systems/lancer/templates/chat/system-card.html`;
  return renderMacro(actor, template, templateData);
}

async function rollTalentMacro(actor: Actor, data: LancerTalentMacroData) {
  if (!actor) return Promise.resolve();

  // Construct the template
  const templateData = {
    title: data.talent.name,
    rank: data.talent.ranks[data.rank],
    lvl: data.rank,
  };
  const template = `systems/lancer/templates/chat/talent-card.html`;
  return renderMacro(actor, template, templateData);
}

/**
 * Standalone prepare function for attacks, since they're complex.
 * @param actor   {Actor}       Actor to roll as. Assumes properly prepared item.
 * @param item    {LancerItem}  Weapon to attack with. Assumes ownership from actor.
 * @param options {Object}      Options that can be passed through. Current options:
 *            - accBonus        Flat bonus to accuracy
 *            - damBonus        Object of form {type: val} to apply flat damage bonus of given type.
 *                              The "Bonus" type is recommended but not required
 */
async function prepareAttackMacro({
  actor,
  item,
  options,
}: {
  actor: Actor;
  item: LancerItem;
  options?: {
    accBonus: number;
    damBonus: { type: DamageType; val: number };
  };
}) {
  let mData: LancerAttackMacroData = {
    item_id: item.data._id,
    title: item.name,
    grit: 0,
    acc: 0,
    damage: [],
    tags: [],
    overkill: item.isOverkill,
    effect: "",
  };
  let typeMissing: boolean = false;
  if (item.type === "mech_weapon" || item.type === "pilot_weapon") {
    const wData = item.data.data as LancerMechWeaponData | LancerPilotWeaponData;
    mData.grit = (item.actor!.data as LancerPilotActorData).data.pilot.grit;
    mData.acc = item.accuracy;
    mData.damage = [...wData.damage];
    mData.tags = wData.tags;
    mData.effect = wData.effect;
  } else if (item.type === "npc_feature") {
    const wData = item.data.data as LancerNPCWeaponData;
    let tier: number;
    if (item.actor === null) {
      tier = actor.data.data.tier_num;
    } else {
      tier = (item.actor.data.data as LancerNPCData).tier_num - 1;
    }

    // This can be a string... but can also be a number...
    mData.grit = Number(wData.attack_bonus[tier]);
    mData.acc = wData.accuracy[tier];
    // Reduce damage values to only this tier
    mData.damage = wData.damage.map((d: NPCDamageData) => {
      return { type: d.type, override: d.override, val: d.val[tier] };
    });
    mData.tags = wData.tags;
    mData.on_hit = wData.on_hit ? wData.on_hit : undefined;
    mData.effect = wData.effect ? wData.effect : "";
  } else {
    ui.notifications.error(`Error preparing attack macro - ${item.name} is not a weapon!`);
    return Promise.resolve();
  }

  // Check for damages that are missing type
  mData.damage.forEach((d: any) => {
    if (d.type === "" && d.val != "" && d.val != 0) typeMissing = true;
  });
  // Warn about missing damage type if the value is non-zero
  if (typeMissing) {
    ui.notifications.warn(`Warning: ${item.name} has a damage value without type!`);
  }

  // Options processing
  if (options) {
    if (options.accBonus) {
      mData.grit += options.accBonus;
    }
    if (options.damBonus) {
      let i = mData.damage.findIndex((dam: IDamageData) => {
        return dam.type === options.damBonus.type;
      });
      if (i >= 0) {
        // We need to clone so it doesn't go all the way back up to the weapon
        let damClone = { ...mData.damage[i] };
        if (damClone.val > 0) {
          damClone.val = `${damClone.val}+${options.damBonus.val}`;
        } else {
          damClone.val = options.damBonus.val;
        }
        mData.damage[i] = damClone;
      } else {
        mData.damage.push(options.damBonus);
      }
    }
  }

  await rollAttackMacro(actor, mData).then();
}

async function rollAttackMacro(actor: Actor, data: LancerAttackMacroData) {
  let atk_str = await buildAttackRollString(data.title, data.acc, data.grit);
  if (!atk_str) return;
  let attack_roll = new Roll(atk_str).roll();
  const attack_tt = await attack_roll.getTooltip();

  // Iterate through damage types, rolling each
  let damage_results: Array<{
    roll: Roll;
    tt: HTMLElement | JQuery;
    d_type: DamageType;
  }> = [];
  let overkill_heat: number = 0;
  for (const x of data.damage) {
    if (x.val === "" || x.val == 0) continue; // Skip undefined and zero damage

    let droll: Roll | null;
    let tt: HTMLElement | JQuery | null;
    try {
      droll = new Roll(x.val.toString());

      for (let die of droll.dice) {
        // @ts-ignore TS is having trouble finding DiceTerm for some reason...
        if (!die instanceof DiceTerm) continue;
        // set an original die count
        var die_count = die.number;
        // double the number of dice rolled on critical
        if (attack_roll.total >= 20) die.number *= 2;
        // add die explosion on 1 and keep the highest of the original number of die
        if (data.overkill) die.modifiers.push("x1");
        // for both sections above, we want to keep the highest of the die count
        if (attack_roll.total >= 20 || data.overkill) die.modifiers.push(`kh${die_count}`);
      }

      droll = droll.roll();
      tt = await droll.getTooltip();
    } catch {
      droll = null;
      tt = null;
    }
    if (data.overkill && droll) {
      // Count overkill heat
      // @ts-ignore
      droll.terms.forEach(p => {
        if (p.results && Array.isArray(p.results)) {
          p.results.forEach((r: any) => {
            if (r.exploded) {
              overkill_heat += 1;
            }
          });
        }
      });
    }
    if (droll && tt) {
      damage_results.push({
        roll: droll,
        tt: tt,
        d_type: x.type,
      });
    }
  }

  if (
    game.settings.get(LANCER.sys_name, LANCER.setting_automation) &&
    game.settings.get(LANCER.sys_name, LANCER.setting_overkill_heat)
  ) {
    const a_data: LancerPilotActorData = duplicate(actor.data);
    if (a_data.type === "pilot") {
      a_data.data.mech.heat.value += overkill_heat;
    }
    await actor.update(a_data);
  }

  // Output
  const templateData = {
    actor_id: actor._id,
    item_id: data.item_id,
    title: data.title,
    attack: attack_roll,
    attack_tooltip: attack_tt,
    damages: damage_results,
    overkill_heat: overkill_heat,
    effect: data.effect ? data.effect : null,
    on_hit: data.on_hit ? data.on_hit : null,
    tags: data.tags,
  };
  const template = `systems/lancer/templates/chat/attack-card.html`;
  return await renderMacro(actor, template, templateData);
}

/**
 * Rolls an NPC reaction macro when given the proper data
 * @param actor {Actor} Actor to roll as. Assumes properly prepared item.
 * @param data {LancerReactionMacroData} Reaction macro data to render.
 */
export function rollReactionMacro(actor: Actor, data: LancerReactionMacroData) {
  if (!actor) return Promise.resolve();

  const template = `systems/lancer/templates/chat/reaction-card.html`;
  return renderMacro(actor, template, data);
}

/**
 * Prepares a macro to present core active information for
 * @param a     String of the actor ID to roll the macro as, and who we're getting core info for
 */
export function prepareCoreActiveMacro(a: string) {
  // Determine which Actor to speak as
  let actor: LancerActor | null = getMacroSpeaker(a);
  if (!actor) return;

  let frame: LancerFrameItemData | null = actor.getCurrentFrame();

  if (!frame) {
    // Could probably handle this better eventually
    return;
  }

  let mData: LancerTextMacroData = {
    title: frame.data.core_system.active_name,
    description: frame.data.core_system.active_effect,
    tags: frame.data.core_system.tags,
  };

  rollTextMacro(actor, mData).then();
}

/**
 * Prepares a macro to present core passive information for
 * Checks whether they have a passive since that could get removed on swap
 * @param a     String of the actor ID to roll the macro as, and who we're getting core info for
 */
export function prepareCorePassiveMacro(a: string) {
  // Determine which Actor to speak as
  let actor: LancerActor | null = getMacroSpeaker(a);
  if (!actor) return;

  let frame: LancerFrameItemData | null = actor.getCurrentFrame();

  if (!frame || !frame.data.core_system.passive_name || !frame.data.core_system.passive_effect) {
    // Could probably handle this better eventually
    return;
  }

  let mData: LancerTextMacroData = {
    title: frame.data.core_system.passive_name,
    description: frame.data.core_system.passive_effect,
    tags: frame.data.core_system.tags,
  };

  rollTextMacro(actor, mData).then();
}

/**
 * Given basic information, prepares a generic text-only macro to display descriptions etc
 * @param a     String of the actor ID to roll the macro as
 * @param title Data path to title of the macro
 * @param text  Data path to text to be displayed by the macro
 * @param tags  Can optionally pass through an array of tags to be rendered
 */
export function prepareTextMacro(a: string, title: string, text: string, tags?: TagDataShort[]) {
  // Determine which Actor to speak as
  let actor: Actor | null = getMacroSpeaker(a);
  if (!actor) return;

  // Note to self--use this in the future if I need string -> var lookup: var.split('.').reduce((o,i)=>o[i], game.data)
  let mData: LancerTextMacroData = {
    title: title,
    description: text,
    tags: tags,
  };

  rollTextMacro(actor, mData).then();
}

/**
 * Given prepared data, handles rolling of a generic text-only macro to display descriptions etc.
 * @param actor {Actor} Actor rolling the macro.
 * @param data {LancerTextMacroData} Prepared macro data.
 */
async function rollTextMacro(actor: Actor, data: LancerTextMacroData) {
  if (!actor) return Promise.resolve();

  const template = `systems/lancer/templates/chat/generic-card.html`;
  return renderMacro(actor, template, data);
}

export async function prepareTechMacro(a: string, t: string) {
  // Determine which Actor to speak as
  let actor: Actor | null = getMacroSpeaker(a);
  if (!actor) return;

  // Get the item
  const item: LancerItem | null = actor.getOwnedItem(t) as LancerItem | null;
  if (!item) {
    return ui.notifications.error(
      `Error preparing tech attack macro - could not find Item ${t} owned by Actor ${a}! Did you add the Item to the token, instead of the source Actor?`
    );
  } else if (!item.isOwned) {
    return ui.notifications.error(
      `Error rolling tech attack macro - ${item.name} is not owned by an Actor!`
    );
  }

  let mData: LancerTechMacroData = {
    title: item.name,
    t_atk: 0,
    acc: 0,
    effect: "",
    tags: [],
  };
  if (item.type === "mech_system") {
    const tData = item.data.data as LancerMechSystemData;
    mData.t_atk = (item.actor!.data as LancerPilotActorData).data.mech.tech_attack;
    mData.tags = tData.tags;
    mData.effect = ""; // TODO
  } else if (item.type === "npc_feature") {
    const tData = item.data.data as LancerNPCTechData;
    let tier: number;
    if (item.actor === null) {
      tier = actor.data.data.tier_num;
    } else {
      tier = (item.actor.data.data as LancerNPCData).tier_num - 1;
    }
    mData.t_atk =
      tData.attack_bonus && tData.attack_bonus.length > tier ? tData.attack_bonus[tier] : 0;
    mData.acc = tData.accuracy && tData.accuracy.length > tier ? tData.accuracy[tier] : 0;
    mData.tags = tData.tags;
    mData.effect = tData.effect ? tData.effect : "";
  } else {
    ui.notifications.error(
      `Error rolling tech attack macro - ${item.name} does not a tech attack!`
    );
    return Promise.resolve();
  }
  console.log(`${lp} Tech Attack Macro Item:`, item, mData);

  await rollTechMacro(actor, mData);
}

async function rollTechMacro(actor: Actor, data: LancerTechMacroData) {
  let atk_str = await buildAttackRollString(data.title, data.acc, data.t_atk);
  if (!atk_str) return;
  let attack_roll = new Roll(atk_str).roll();
  const attack_tt = await attack_roll.getTooltip();

  // Output
  const templateData = {
    title: data.title,
    attack: attack_roll,
    attack_tooltip: attack_tt,
    effect: data.effect ? data.effect : null,
    tags: data.tags,
  };

  const template = `systems/lancer/templates/chat/tech-attack-card.html`;
  return await renderMacro(actor, template, templateData);
}

export async function promptAccDiffModifier(acc?: number, title?: string) {
  if (!acc) acc = 0;
  let diff = 0;
  if (acc < 0) {
    diff = -acc;
    acc = 0;
  }

  let template = await renderTemplate(
    `systems/lancer/templates/window/promptAccDiffModifier.html`,
    { acc: acc, diff: diff }
  );
  return new Promise<number>((resolve, reject) => {
    new Dialog({
      title: title ? `${title} - Accuracy and Difficulty` : "Accuracy and Difficulty",
      content: template,
      buttons: {
        submit: {
          icon: '<i class="fas fa-check"></i>',
          label: "Submit",
          callback: async dlg => {
            let accuracy = <string>$(dlg).find(".accuracy").first().val();
            let difficulty = <string>$(dlg).find(".difficulty").first().val();
            let total = parseInt(accuracy) - parseInt(difficulty);
            console.log(
              `${lp} Dialog returned ${accuracy} accuracy and ${difficulty} difficulty resulting in a modifier of ${total}d6`
            );
            resolve(total);
          },
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
          callback: async () => {
            reject(true);
          },
        },
      },
      default: "submit",
      close: () => reject(true),
    }).render(true);
  });
}

export async function prepareOverchargeMacro(a: string) {
  // Determine which Actor to speak as
  let actor: LancerActor | null = getMacroSpeaker(a);
  if (!actor) {
    ui.notifications.warn(`Failed to find Actor for macro. Do you need to select a token?`);
    return null;
  }

  // Validate that we're overcharging a pilot
  if (actor.data.type !== "pilot") {
    ui.notifications.warn(`Only pilots can overcharge!`);
    return null;
  }

  // We're now certain it will be a pilot
  //@ts-ignore
  let data: LancerPilotActorData = actor.data;

  // And here too... we should probably revisit our type definitions...
  let rollText = actor.getOverchargeRoll();
  if (!rollText) {
    ui.notifications.warn(`Error in getting overcharge roll...`);
    return null;
  }

  // Prep data
  let roll = new Roll(rollText).roll();

  let mData: LancerOverchargeMacroData = {
    level: data.data.mech.overcharge_level,
    roll: roll,
  };

  // Assume we can always increment overcharge here...
  data.data.mech.overcharge_level = Math.min(data.data.mech.overcharge_level + 1, 3);

  // Only increase heat if we haven't disabled it
  if (
    game.settings.get(LANCER.sys_name, LANCER.setting_automation) &&
    game.settings.get(LANCER.sys_name, LANCER.setting_pilot_oc_heat)
  ) {
    data.data.mech.heat.value = data.data.mech.heat.value + roll.total;
  }

  console.log(roll, data);
  await actor.update(data);

  return rollOverchargeMacro(actor, mData);
}

async function rollOverchargeMacro(actor: Actor, data: LancerOverchargeMacroData) {
  if (!actor) return Promise.resolve();

  const roll_tt = await data.roll.getTooltip();

  // Construct the template
  const templateData = {
    actorName: actor.name,
    roll: data.roll,
    level: data.level,
    roll_tooltip: roll_tt,
  };
  const template = `systems/lancer/templates/chat/overcharge-card.html`;
  return renderMacro(actor, template, templateData);
}

/**
 * Performs a roll on the overheat table for the given actor
 * @param a ID of actor to overheat
 */
export async function prepareOverheatMacro(a: string) {
  // Determine which Actor to speak as
  let actor: LancerActor | null = getMacroSpeaker(a);
  if (!actor) {
    ui.notifications.warn(`Failed to find Actor for macro. Do you need to select a token?`);
    return null;
  }

  if (!("mech" in actor.data.data)) {
    ui.notifications.error("Selected token is not a mech");
    return;
  }

  // Hand it off to the actor to overheat
  await actor.overheatMech();
}

/**
 * Performs a roll on the structure table for the given actor
 * @param a ID of actor to structure
 */
export async function prepareStructureMacro(a: string) {
  // Determine which Actor to speak as
  let actor: LancerActor | null = getMacroSpeaker(a);
  if (!actor) {
    ui.notifications.warn(`Failed to find Actor for macro. Do you need to select a token?`);
    return null;
  }

  if (!("mech" in actor.data.data)) {
    ui.notifications.error("Selected token is not a mech");
    return;
  }

  // Hand it off to the actor to overheat
  await actor.structureMech();
}
