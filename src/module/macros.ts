// Import TypeScript modules
import { LANCER } from "./config";
const lp = LANCER.log_prefix;

import { LancerItem, LancerTalent } from "./item/lancer-item";

import {
  LancerPilotActorData,
  LancerMechWeaponData,
  LancerPilotWeaponData,
  LancerNPCData,
  NPCDamageData,
  LancerAttackMacroData,
  LancerStatMacroData,
  LancerGenericMacroData,
  LancerTalentMacroData,
  LancerTechMacroData,
  LancerMechSystemData,
} from "./interfaces";

// Import JSON data
import { DamageType } from "machine-mind";
import { LancerNPCTechData, LancerNPCWeaponData } from "./item/npc-feature";

export async function createActorMacro(
  title: string,
  dataPath: string,
  actorId: string,
  slot: number
) {
  const command = `
  const a = game.actors.get('${actorId}');
  if (a) {
    let mData = {
      title: "${title}",
      bonus: a.data.${dataPath}
    } 
    game.lancer.rollTriggerMacro(a, mData);
  } else {
    ui.notifications.error("Error rolling macro");
  }`;
  // Until we properly register commands as something macros can have...
  // @ts-ignore
  let macro = game.macros.entities.find(
    (m: Macro) => m.name === title && (m.data as any).command === command
  );
  if (!macro) {
    macro = (await Macro.create(
      {
        command,
        name: title,
        type: "script",
        img: "systems/lancer/assets/icons/macro-icons/d20-framed.svg",
      },
      { displaySheet: false }
    )) as Macro;
  }

  await game.user.assignHotbarMacro(macro, slot);
}

export function getMacroSpeaker(): Actor | null {
  // Determine which Actor to speak as
  const speaker = ChatMessage.getSpeaker();
  // console.log(`${lp} Macro speaker`, speaker);
  let actor: Actor | null = null;
  // console.log(game.actors.tokens);
  try {
    if (speaker.token) {
      actor = game.actors.tokens[speaker.token].actor;
    }
  } catch (TypeError) {
    // Need anything here?
  }
  if (!actor) {
    actor = game.actors.get(speaker.actor, { strict: false });
  }
  if (!actor) {
    ui.notifications.warn(`Failed to find Actor for macro. Do you need to select a token?`);
    return null;
  }
  return actor;
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
  result.actor = game.actors.get(a) || getMacroSpeaker();
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

export function prepareTriggerMacro(a: string, i: string) {
  const a_i = getMacroActorItem(a, i);
  const actor = a_i.actor;
  const item = a_i.item;
  if (!actor || !item) return null;

  let mData: LancerStatMacroData = {
    title: item.name,
    bonus: item.data.data.rank * 2,
  };
  rollStatMacro(actor, mData).then();
}

export function prepareStatMacro(a: string, statKey: string) {
  // Determine which Actor to speak as
  let actor: Actor | null = game.actors.get(a) || getMacroSpeaker();
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

export async function rollStatMacro(actor: Actor, data: LancerStatMacroData) {
  if (!actor) return Promise.resolve();

  // Get accuracy/difficulty with a prompt
  let acc: number = 0;
  let abort: boolean = false;
  await promptAccDiffModifier(acc, data.title).then(
    resolve => (acc = resolve),
    reject => (abort = reject)
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

export function prepareGenericMacro(a: string, i: string) {
  const a_i = getMacroActorItem(a, i);
  const actor = a_i.actor;
  const item = a_i.item;
  if (!actor || !item) return null;

  let mData: LancerGenericMacroData = {
    title: item.name,
    effect: item.data.data.effect,
  };

  rollGenericMacro(actor, mData).then();
}

export async function rollGenericMacro(actor: Actor, data: LancerGenericMacroData) {
  if (!actor) return Promise.resolve();

  // Construct the template
  const templateData = {
    title: data.title,
    effect: data.effect ? data.effect : null,
  };
  const template = `systems/lancer/templates/chat/system-card.html`;
  return renderMacro(actor, template, templateData);
}

export function prepareTalentMacro(a: string, i: string, rank: number) {
  // Determine which Actor to speak as
  let actor: Actor | null = game.actors.get(a) || getMacroSpeaker();
  if (!actor) {
    ui.notifications.warn(`Failed to find Actor for macro. Do you need to select a token?`);
    return null;
  }

  // Get the item
  const item: LancerTalent | null = actor.getOwnedItem(i) as LancerTalent | null;
  if (!item) {
    ui.notifications.warn(`Failed to find Item for macro.`);
    return null;
  }

  let mData: LancerTalentMacroData = {
    talent: item.data.data,
    rank: rank,
  };

  rollTalentMacro(actor, mData).then();
}

export async function rollTalentMacro(actor: Actor, data: LancerTalentMacroData) {
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

export function prepareAttackMacro(a: string, w: string) {
  // Determine which Actor to speak as
  let actor: Actor | null = game.actors.get(a) || getMacroSpeaker();
  if (!actor) return;

  // Get the item
  const item: LancerItem | null = actor.getOwnedItem(w) as LancerItem | null;
  if (!item) {
    return ui.notifications.error(
      `Error preparing attack macro: could not find Item ${w} owned by Actor ${a}!`
    );
  } else if (!item.isOwned) {
    return ui.notifications.error(
      `Error preparing attack macro: ${item.name} is not owned by an Actor!`
    );
  }

  let mData: LancerAttackMacroData = {
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
    mData.damage = wData.damage;
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

    mData.grit = wData.attack_bonus[tier];
    mData.acc = wData.accuracy[tier];
    // Reduce damage values to only this tier
    mData.damage = wData.damage.map((d: NPCDamageData) => {
      return { type: d.type, override: d.override, val: d.val[tier] };
    });
    mData.tags = wData.tags;
    mData.effect = wData.effect ? wData.effect : "";
  } else {
    ui.notifications.error(`Error preparing attack macro - ${item.name} is not a weapon!`);
    return null;
  }

  // Check for damages that are missing type
  mData.damage.forEach((d: any) => {
    if (d.type === "" && d.val != "" && d.val != 0) typeMissing = true;
  });
  // Warn about missing damage type if the value is non-zero
  if (typeMissing) {
    ui.notifications.warn(`Warning: ${item.name} has a damage value without type!`);
  }

  rollAttackMacro(actor, mData).then();
}

export async function rollAttackMacro(actor: Actor, data: LancerAttackMacroData) {
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
    let d_formula: string = x.val.toString();
    // If the damage formula involves dice and is overkill, add "r1" to reroll all 1's.
    if (d_formula.includes("d") && data.overkill) {
      let d_ind = d_formula.indexOf("d");
      let p_ind = d_formula.indexOf("+");
      if (d_ind >= 0) {
        if (p_ind > d_ind)
          d_formula = d_formula.substring(0, p_ind) + "r1" + d_formula.substring(p_ind);
        else d_formula += "r1";
      }
    }
    const droll = new Roll(d_formula).roll();
    const tt = await droll.getTooltip();
    if (data.overkill) {
      // Count overkill heat
      droll.parts.forEach(p => {
        if (p.rolls && Array.isArray(p.rolls)) {
          p.rolls.forEach((r: any) => {
            if (r.roll && r.roll === 1 && r.rerolled) {
              overkill_heat += 1;
            }
          });
        }
      });
    }
    damage_results.push({
      roll: droll,
      tt: tt,
      d_type: x.type,
    });
  }

  // Output
  const templateData = {
    title: data.title,
    attack: attack_roll,
    attack_tooltip: attack_tt,
    damages: damage_results,
    overkill_heat: overkill_heat,
    effect: data.effect ? data.effect : null,
    tags: data.tags,
  };
  const template = `systems/lancer/templates/chat/attack-card.html`;
  return await renderMacro(actor, template, templateData);
}

export async function prepareTechMacro(a: string, t: string) {
  // Determine which Actor to speak as
  let actor: Actor | null = game.actors.get(a) || getMacroSpeaker();
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

export async function rollTechMacro(actor: Actor, data: LancerTechMacroData) {
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

async function promptAccDiffModifier(acc?: number, title?: string) {
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
