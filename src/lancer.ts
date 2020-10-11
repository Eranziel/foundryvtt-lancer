/**
 * TypeScript entry file for Foundry VTT.
 * Registers custom settings, sheets, and constants using the Foundry API.
 *
 * Author: Eranziel
 * Content License: LANCER is copyright 2019, Massif Press Inc.
 * Software License: GNU GPLv3
 */

// Import TypeScript modules
import { ICONS, LANCER, WELCOME } from "./module/config";
const lp = LANCER.log_prefix;
import { LancerGame } from "./module/lancer-game";
import {
  LancerActor,
  lancerActorInit,
  mount_type_selector,
  npc_tier_selector,
  mount_card,
} from "./module/actor/lancer-actor";
import {
  LancerItem,
  lancerItemInit,
  mech_weapon_preview,
  is_loading,
  weapon_size_selector,
  weapon_type_selector,
  weapon_range_preview,
  weapon_damage_preview,
  npc_attack_bonus_preview,
  npc_accuracy_preview,
  core_system_preview,
  mech_trait_preview,
  weapon_range_selector,
  pilot_weapon_damage_selector,
  npc_weapon_damage_selector,
  system_type_selector,
  LancerFrame,
  LancerMechWeapon,
  LancerItemData,
  LancerSkill,
  LancerTalent,
  LancerLicense,
  LancerCoreBonus,
  LancerPilotGear,
  LancerPilotWeapon,
  LancerPilotArmor,
  LancerMechSystem,
  effect_type_selector,
  mech_system_preview
} from "./module/item/lancer-item";

import {
  charge_type_selector,
  action_type_selector,
  action_type_icon,
  effect_preview,
  generic_effect_preview,
  basic_effect_preview,
  ai_effect_preview,
  bonus_effect_preview,
  charge_effect_preview,
  deployable_effect_preview,
  drone_effect_preview,
  offensive_effect_preview,
  profile_effect_preview,
  protocol_effect_preview,
  reaction_effect_preview,
  invade_option_preview,
  tech_effect_preview,
  EffectData,
} from "./module/item/effects";
import {
  DamageData,
  LancerPilotActorData,
  LancerPilotData,
  TagDataShort,
  LancerNPCActorData,
  LancerMechWeaponData,
  LancerPilotWeaponData,
  LancerNPCData,
  NPCDamageData, 
  LancerAttackMacroData, 
  LancerStatMacroData, 
  LancerTechMacroData, 
  LancerSkillItemData, 
  LancerGenericMacroData, 
  LancerTalentMacroData, LancerTalentItemData, LancerNPCFeatureData, LancerMechSystemData
} from "./module/interfaces";

// Import applications
import { LancerPilotSheet } from "./module/actor/pilot-sheet";
import { LancerNPCSheet } from "./module/actor/npc-sheet";
import { LancerDeployableSheet } from "./module/actor/deployable-sheet";
import { LancerItemSheet } from "./module/item/item-sheet";
import { LancerFrameSheet } from "./module/item/frame-sheet";
import { LancerNPCClassSheet } from "./module/item/npc-class-sheet";

// Import helpers
import { preloadTemplates } from "./module/preloadTemplates";
import { registerSettings } from "./module/settings";
import {
  renderCompactTag,
  renderChunkyTag,
  renderFullTag,
  compactTagList,
} from "./module/item/tags";
import * as migrations from "./module/migration";
import { addLCPManager } from './module/apps/lcpManager';

// Import JSON data
import { CCDataStore, setup_store, CompendiumItem, DamageType, NpcFeatureType } from "machine-mind";
import { FauxPersistor } from "./module/ccdata_io";
import { reload_store } from "./module/item/util";
import { LancerNPCTechData, LancerNPCWeaponData } from "./module/item/npc-feature";

/* ------------------------------------ */
/* Initialize system                    */
/* ------------------------------------ */
Hooks.once("init", async function () {
  console.log(`Initializing LANCER RPG System ${LANCER.ASCII}`);

  // Assign custom classes and constants here
  // Create a Lancer namespace within the game global
  (game as LancerGame).lancer = {
    applications: {
      LancerPilotSheet,
      LancerNPCSheet,
      LancerDeployableSheet,
      LancerItemSheet,
    },
    entities: {
      LancerActor,
      LancerItem,
    },
    prepareStatMacro: prepareStatMacro,
    rollStatMacro: rollStatMacro,
    prepareAttackMacro: prepareAttackMacro,
    rollAttackMacro: rollAttackMacro,
    prepareTechMacro: prepareTechMacro,
    rollTechMacro: rollTechMacro,
    prepareTriggerMacro: prepareTriggerMacro,
    rollTriggerMacro: rollTriggerMacro,
    prepareGenericMacro: prepareGenericMacro,
    rollGenericMacro: rollGenericMacro,
    prepareTalentMacro: prepareTalentMacro,
    rollTalentMacro: rollTalentMacro,
    migrations: migrations,
  };

  // Record Configuration Values
  CONFIG.Actor.entityClass = LancerActor;
  CONFIG.Item.entityClass = LancerItem;

  // Register custom system settings
  registerSettings();

  // Set up system status icons
  const keepStock = game.settings.get(LANCER.sys_name, LANCER.setting_stock_icons);
  let icons: string[] = [];
  if (keepStock) icons = icons.concat(CONFIG.statusEffects);
  icons = icons.concat(ICONS);
  CONFIG.statusEffects = icons;

  // Register Web Components
  customElements.define("card-clipped", class LancerClippedCard extends HTMLDivElement { }, {
    extends: "div",
  });

  // Preload Handlebars templates
  await preloadTemplates();

  try {
    // Do some CC magic
    let store = new CCDataStore(new FauxPersistor(), {
      disable_core_data: true,
      shim_fallback_items: true,
    });
    setup_store(store);
    await store.load_all(f => f(store));
    await reload_store();
    console.log(`${lp} Comp/Con data store initialized.`);
  } catch (error) {
    console.log(`Fatal error loading COMP/CON`);
    console.log(error);
    ui.notifications.error(`Warning: COMP/CON has failed to load. You may experience severe data integrity failure`);
  }

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("lancer", LancerPilotSheet, { types: ["pilot"], makeDefault: true });
  Actors.registerSheet("lancer", LancerNPCSheet, { types: ["npc"], makeDefault: true });
  Actors.registerSheet("lancer", LancerDeployableSheet, {
    types: ["deployable"],
    makeDefault: true,
  });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("lancer", LancerItemSheet, {
    types: [
      "skill",
      "talent",
      "license",
      "core_bonus",
      "pilot_armor",
      "pilot_weapon",
      "pilot_gear",
      "mech_system",
      "mech_weapon",
      "npc_template",
      "npc_feature",
    ],
    makeDefault: true,
  });
  Items.registerSheet("lancer", LancerFrameSheet, { types: ["frame"], makeDefault: true });
  Items.registerSheet("lancer", LancerNPCClassSheet, { types: ["npc_class"], makeDefault: true });

  // *******************************************************************
  // Register handlebars helpers

  // inc, for those off-by-one errors
  Handlebars.registerHelper("inc", function (value) {
    return parseInt(value) + 1;
  });

  // dec, for those off-by-one errors
  Handlebars.registerHelper("dec", function (value) {
    return parseInt(value) - 1;
  });

  // get an index from an array
  Handlebars.registerHelper("idx", function (array, index) {
    return array[index];
  });

  // invert the input
  Handlebars.registerHelper("neg", function (value) {
    return parseInt(value) * -1;
  });

  // double the input
  Handlebars.registerHelper("double", function (value) {
    return parseInt(value) * 2;
  });

  // Equal-to evaluation
  Handlebars.registerHelper("eq", function (val1, val2) {
    return val1 === val2;
  });

  // Equal-to evaluation
  Handlebars.registerHelper("neq", function (val1, val2) {
    return val1 !== val2;
  });

  // Logical "or" evaluation
  Handlebars.registerHelper("or", function (val1, val2) {
    return val1 || val2;
  });

  // Greater-than evaluation
  Handlebars.registerHelper("gt", function (val1, val2) {
    return val1 > val2;
  });

  // Greater-than evaluation after applying parseInt to both values
  Handlebars.registerHelper("gtpi", function (val1, val2) {
    val1 = parseInt(val1);
    val2 = parseInt(val2);
    return val1 > val2;
  });

  // Less-than evaluation
  Handlebars.registerHelper("lt", function (val1, val2) {
    return val1 < val2;
  });

  // Greater-than evaluation after applying parseInt to both values
  Handlebars.registerHelper("ltpi", function (val1, val2) {
    val1 = parseInt(val1);
    val2 = parseInt(val2);
    return val1 < val2;
  });

  Handlebars.registerHelper("lower-case", function (str: string) {
    return str.toLowerCase();
  });

  Handlebars.registerHelper("upper-case", function (str: string) {
    return str.toUpperCase();
  });

  // ------------------------------------------------------------------------
  // Generic components
  Handlebars.registerHelper("l-num-input", function (target: string, value: string) {
    let html =
    `<div class="flexrow arrow-input-container">
      <button class="mod-minus-button" type="button">-</button>
      <input class="lancer-stat major" type="number" name="${target}" id="${target}" value="${value}" data-dtype="Number"\>
      <button class="mod-plus-button" type="button">+</button>
    </div>`;
    return html;
  });

  // ------------------------------------------------------------------------
  // Tags
  Handlebars.registerHelper("compact-tag", renderCompactTag);
  Handlebars.registerPartial("tag-list", compactTagList);
  Handlebars.registerHelper("chunky-tag", renderChunkyTag);
  Handlebars.registerHelper("full-tag", renderFullTag);

  // ------------------------------------------------------------------------
  // Weapons
  Handlebars.registerHelper("is-loading", is_loading);
  Handlebars.registerHelper("wpn-size-sel", weapon_size_selector);
  Handlebars.registerHelper("wpn-type-sel", weapon_type_selector);
  Handlebars.registerHelper("wpn-range-sel", weapon_range_selector);
  Handlebars.registerHelper("wpn-damage-sel", pilot_weapon_damage_selector);
  Handlebars.registerHelper("npc-wpn-damage-sel", npc_weapon_damage_selector);
  Handlebars.registerPartial("wpn-range", weapon_range_preview);
  Handlebars.registerPartial("wpn-damage", weapon_damage_preview);
  Handlebars.registerPartial("npcf-atk", npc_attack_bonus_preview);
  Handlebars.registerPartial("npcf-acc", npc_accuracy_preview);
  Handlebars.registerPartial("mech-weapon-preview", mech_weapon_preview);

  // ------------------------------------------------------------------------
  // Systems
  Handlebars.registerHelper("sys-type-sel", system_type_selector);
  Handlebars.registerHelper("eff-type-sel", effect_type_selector);
  Handlebars.registerHelper("act-icon", action_type_icon);
  Handlebars.registerHelper("act-type-sel", action_type_selector);
  Handlebars.registerHelper("chg-type-sel", charge_type_selector);
  Handlebars.registerPartial("mech-system-preview", mech_system_preview);

  // ------------------------------------------------------------------------
  // Effects
  Handlebars.registerHelper("eff-preview", effect_preview);
  Handlebars.registerPartial("generic-eff-preview", generic_effect_preview);
  Handlebars.registerHelper("basic-eff-preview", basic_effect_preview);
  Handlebars.registerHelper("ai-eff-preview", ai_effect_preview);
  Handlebars.registerHelper("bonus-eff-preview", bonus_effect_preview);
  Handlebars.registerHelper("chg-eff-preview", charge_effect_preview);
  Handlebars.registerHelper("dep-eff-preview", deployable_effect_preview);
  Handlebars.registerHelper("drn-eff-preview", drone_effect_preview);
  Handlebars.registerHelper("off-eff-preview", offensive_effect_preview);
  Handlebars.registerHelper("prf-eff-preview", profile_effect_preview);
  Handlebars.registerHelper("prot-eff-preview", protocol_effect_preview);
  Handlebars.registerHelper("rct-eff-preview", reaction_effect_preview);
  Handlebars.registerHelper("inv-eff-preview", invade_option_preview);
  Handlebars.registerHelper("tech-eff-preview", tech_effect_preview);

  // ------------------------------------------------------------------------
  // Frames
  Handlebars.registerPartial("core-system", core_system_preview);
  Handlebars.registerPartial("mech-trait", mech_trait_preview);

  // ------------------------------------------------------------------------
  // Pilot components
  Handlebars.registerHelper("mount-selector", mount_type_selector);
  Handlebars.registerPartial("mount-card", mount_card);

  // ------------------------------------------------------------------------
  // NPC components
  Handlebars.registerHelper("tier-selector", npc_tier_selector);

});

/* ------------------------------------ */
/* Setup system			            				*/
/* ------------------------------------ */
Hooks.once("setup", function () {
  // Do anything after initialization but before
  // ready
});

/* ------------------------------------ */
/* When ready                           */
/* ------------------------------------ */
Hooks.once("ready", async function () {
  // Determine whether a system migration is required and feasible
  const currentVersion = game.settings.get(LANCER.sys_name, LANCER.setting_migration);
  // TODO: implement/import version comparison for semantic version numbers
  // const NEEDS_MIGRATION_VERSION = "0.0.4";
  // const COMPATIBLE_MIGRATION_VERSION = "0.0.4";
  // let needMigration = (currentVersion < NEEDS_MIGRATION_VERSION) || (currentVersion === null);

  // Perform the migration
  // TODO: replace game.system.version with needMigration once version number checking is implemented
  if (currentVersion != game.system.data.version && game.user.isGM) {
    // Un-hide the welcome message
    await game.settings.set(LANCER.sys_name, LANCER.setting_welcome, false);
    // if ( currentVersion && (currentVersion < COMPATIBLE_MIGRATION_VERSION) ) {
    //   ui.notifications.error(`Your LANCER system data is from too old a Foundry version and cannot be reliably migrated to the latest version. The process will be attempted, but errors may occur.`, {permanent: true});
    // }
    migrations.migrateWorld();
  }

  // Show welcome message if not hidden.
  if (!game.settings.get(LANCER.sys_name, LANCER.setting_welcome)) {
    new Dialog({
      title: `Welcome to LANCER v${game.system.data.version}`,
      content: WELCOME,
      buttons: {
        dont_show: {
          label: "Do Not Show Again",
          callback: async (html) => {
            game.settings.set(LANCER.sys_name, LANCER.setting_welcome, true);
          }
        },
        close: {
          label: "Close"
        }
      },
      default: "Close"
    }).render(true);
  }
});

// Add any additional hooks if necessary
Hooks.on("preCreateActor", lancerActorInit);
Hooks.on("preCreateItem", lancerItemInit);

// Create sidebar button to import LCP
Hooks.on("renderSidebarTab", async (app: Application, html: HTMLElement) => {
  addLCPManager(app, html);
});

// Attack function to overkill reroll button
Hooks.on("renderChatMessage", async (cm: ChatMessage, html: any, data: any) => {
  const overkill = html[0].getElementsByClassName("overkill-reroll");
  for (let i = 0; i < overkill.length; i++) {
    if (cm.isAuthor) {
      overkill[i].addEventListener("click", async function() {
        // console.log(data);
        const roll = new Roll("1d6").roll();
        const templateData = {
          roll: roll,
          roll_tooltip: await roll.getTooltip()
        }
        const html = await renderTemplate("systems/lancer/templates/chat/overkill-reroll.html", templateData);
        let chat_data = {
          user: game.user,
          type: CONST.CHAT_MESSAGE_TYPES.ROLL,
          roll: templateData.roll,
          speaker: data.message.speaker,
          content: html,
        };
        let cm = await ChatMessage.create(chat_data);
        cm.render();
        return Promise.resolve();
      });
    }
  }
});


Hooks.on('hotbarDrop', (_bar: any, data: any, slot: number) => {
  if (data.type === 'actor') {
    // Full list of data expected from a generic actor macro:
    // A title      - to name it
    // A dataPath   - to access dynamic data from the actor
    // An actorId   - to reference the actor
    createActorMacro(data.title, data.dataPath, data.actorId, slot);
  } else if (data.type === 'Item') {
    let command = '';
    let title = '';
    let img = 'systems/lancer/assets/icons/macro-icons/d20-framed.svg';
    // Handled options for items:
    switch(data.data.type) {
      // Skills
      case 'skill':
        command = `game.lancer.prepareTriggerMacro("${data.actorId}", "${data.data._id}");`;
        title= data.data.name;
        img = `systems/lancer/assets/icons/macro-icons/skill.svg`;
        break;
      // Pilot OR Mech weapon
      case 'pilot_weapon':
      case 'mech_weapon':
        command = `game.lancer.prepareAttackMacro("${data.actorId}", "${data.data._id}");`;
        title = data.data.name;
        img = `systems/lancer/assets/icons/macro-icons/mech_weapon.svg`;
        break;
      case 'mech_system':
        command = `game.lancer.prepareGenericMacro("${data.actorId}", "${data.data._id}");`;
        title = data.data.name;
        img = `systems/lancer/assets/icons/macro-icons/mech_system.svg`;
        break;
      case 'talent':
        command = `game.lancer.prepareTalentMacro("${data.actorId}", "${data.itemId}", "${data.rank}");`;
        title = data.title;
        img = `systems/lancer/assets/icons/macro-icons/talent.svg`;
        if (!command || !title) {
          return ui.notifications.warn(`Error creating talent macro. Only invidual ranks are macroable.`);
        }
        break;
      case 'npc_feature':
        console.log(data.data.data);
        if(data.data.data.feature_type === NpcFeatureType.Weapon) {
          command = `game.lancer.prepareAttackMacro("${data.actorId}", "${data.data._id}");`;
          title = data.data.name;
          img = `systems/lancer/assets/icons/macro-icons/mech_weapon.svg`;
          break;
        } else if (data.data.data.feature_type === NpcFeatureType.Tech) {
          command = `game.lancer.prepareTechMacro("${data.actorId}", "${data.data._id}");`;
          title = data.data.name;
          img = `systems/lancer/assets/icons/macro-icons/tech_quick.svg`;
          break;
        }
        return ui.notifications.warn(`Non-weapon NPC Features are not macroable.`);
      case 'core_bonus':
        return ui.notifications.warn(`Core Bonuses are not macroable.`);
    }

    if(!command || !title) {
      console.log("Error creating macro: no command or title. Are you sure what you dragged in can be macroed?");
      return ui.notifications.error(
        `Error creating macro. Are you sure what you dragged in can be macroed?`
      );
    }

    // Until we properly register commands as something macros can have...
    // @ts-ignore
    let macro = game.macros.entities.find((m: Macro) => (m.name === title) && (m.data as Object).command === command);
    if (!macro) {
      (Macro.create({
        command,
        name: title,
        type: 'script',
        img: img,
      }, { displaySheet: false })).then(macro => game.user.assignHotbarMacro((macro as Macro), slot));
    } else {
      game.user.assignHotbarMacro(macro, slot)
    }
  }
});

async function createActorMacro(title: string, dataPath: string, actorId: string, slot: number) {
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
  let macro = game.macros.entities.find((m: Macro) => (m.name === title) && (m.data as Object).command === command);
  if (!macro) {
    macro = await Macro.create({
      command,
      name: title,
      type: 'script',
      img: 'systems/lancer/assets/icons/macro-icons/d20-framed.svg',
    }, { displaySheet: false }) as Macro;
  }

  game.user.assignHotbarMacro(macro, slot);
}


function getMacroSpeaker(): Actor | null {
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

async function renderMacro(actor: Actor, template: string, templateData: any) {
  const html = await renderTemplate(template, templateData);
  let roll = templateData.roll || templateData.attack;
  let chat_data = {
    user: game.user,
    roll: roll,
    type: roll ? CONST.CHAT_MESSAGE_TYPES.ROLL : CONST.CHAT_MESSAGE_TYPES.IC,
    speaker: {
      actor: actor,
    },
    content: html,
  };
  let cm = await ChatMessage.create(chat_data);
  cm.render();
  return Promise.resolve();
}


function prepareTriggerMacro(a: string, i: string) {
  // Determine which Actor to speak as
  let actor: Actor | null = game.actors.get(a) || getMacroSpeaker();
  if (!actor) {
    ui.notifications.warn(`Failed to find Actor for macro. Do you need to select a token?`);
    return null;
  }
  
  // Get the item
  const item: Item | null = (actor.getOwnedItem(i) as Item | null);
  if (!item) {
    ui.notifications.warn(`Failed to find Item for macro.`);
    return null;
  }

  let mData: LancerStatMacroData = {
    title: item.name,
    bonus: (item.data.data.rank * 2)
  };
  rollTriggerMacro(actor, mData);
}

async function rollTriggerMacro(actor: Actor, data: LancerStatMacroData) {
  if (!actor) return Promise.resolve();

  // Get accuracy/difficulty with a prompt
  let acc: number = 0;
  let abort: boolean = false;
  await promptAccDiffModifier(acc, data.title).then(
    resolve => (acc = resolve),
    reject => (abort = true)
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
    effect: null,
  };

  const template = `systems/lancer/templates/chat/stat-roll-card.html`;
  return renderMacro(actor, template, templateData);
}

function prepareStatMacro(a: string, statKey: string) {
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
    bonus: bonus
  };
  rollStatMacro(actor, mData);
}

async function rollStatMacro(actor: Actor, data: LancerStatMacroData) {
  if (!actor) return Promise.resolve();

  // Get accuracy/difficulty with a prompt
  let acc: number = 0;
  let abort: boolean = false;
  await promptAccDiffModifier(acc, data.title).then(
    resolve => (acc = resolve),
    reject => (abort = true)
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

function prepareGenericMacro(a: string, i: string) {
  // Determine which Actor to speak as
  let actor: Actor | null = game.actors.get(a) || getMacroSpeaker();
  if (!actor) {
    ui.notifications.warn(`Failed to find Actor for macro. Do you need to select a token?`);
    return null;
  }
  
  // Get the item
  const item: Item | null = (actor.getOwnedItem(i) as Item | null);
  if (!item) {
    ui.notifications.warn(`Failed to find Item for macro.`);
    return null;
  }

  let mData: LancerGenericMacroData = {
    title: item.name,
    effect: item.data.data.effect
  };

  rollGenericMacro(actor, mData);
}

async function rollGenericMacro(actor: Actor, data: LancerGenericMacroData) {
  if (!actor) return Promise.resolve();

  // Construct the template
  const templateData = {
    title: data.title,
    effect: data.effect ? data.effect : null,
  };
  const template = `systems/lancer/templates/chat/system-card.html`;
  return renderMacro(actor, template, templateData);
}

function prepareTalentMacro(a: string, i: string, rank: number) {
  // Determine which Actor to speak as
  let actor: Actor | null = game.actors.get(a) || getMacroSpeaker();
  if (!actor) {
    ui.notifications.warn(`Failed to find Actor for macro. Do you need to select a token?`);
    return null;
  }
  
  // Get the item
  const item: LancerTalent | null = (actor.getOwnedItem(i) as LancerTalent | null);
  if (!item) {
    ui.notifications.warn(`Failed to find Item for macro.`);
    return null;
  }


  let mData: LancerTalentMacroData = {
    talent: item.data.data,
    rank: rank
  };

  rollTalentMacro(actor, mData);
}

async function rollTalentMacro(actor: Actor, data: LancerTalentMacroData) {
  if (!actor) return Promise.resolve();

  // Construct the template
  const templateData = {
    title: data.talent.name,
    rank: data.talent.ranks[data.rank],
    lvl: data.rank
  };
  const template = `systems/lancer/templates/chat/talent-card.html`;
  return renderMacro(actor, template, templateData);
}

function prepareAttackMacro(a: string, w: string) {
  // Determine which Actor to speak as
  let actor: Actor | null = game.actors.get(a) || getMacroSpeaker();
  if (!actor) return;
  
  // Get the item
  const item: LancerItem | null = (actor.getOwnedItem(w) as LancerItem | null);
  if (!item) {
    return ui.notifications.error(
      `Error preparing attack macro: could not find Item ${w} owned by Actor ${a}!`
      );
    } else if (!item.isOwned) {
      return ui.notifications.error(`Error preparing attack macro: ${item.name} is not owned by an Actor!`);
    }
    
    let mData: LancerAttackMacroData = {
      title: item.name,
      grit: 0,
      acc: 0,
      damage: [],
      tags: [],
      overkill: item.isOverkill,
      effect: ""
    };
    let typeMissing: boolean = false;
    if (item.type === "mech_weapon") {
      const wData = item.data.data as LancerMechWeaponData;
      mData.grit = (item.actor!.data as LancerPilotActorData).data.pilot.grit;
      mData.acc = item.accuracy;
      mData.damage = wData.damage;
      mData.tags = wData.tags;
      mData.effect = wData.effect;
    } else if (item.type === "pilot_weapon") {
      const wData = item.data.data as LancerPilotWeaponData;
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
        return { type: d.type, override: d.override, val: d.val[tier] }
      });
      mData.tags = wData.tags;
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
    
    rollAttackMacro(actor, mData);
}

async function rollAttackMacro(actor: Actor, data: LancerAttackMacroData) {

  // Get accuracy/difficulty with a prompt
  let abort: boolean = false;
  await promptAccDiffModifier(data.acc, data.title).then(
    resolve => (data.acc = resolve),
    reject => (abort = true)
  );
  if (abort) return;

  // Do the attack rolling
  let acc_str = data.acc != 0 ? ` + ${data.acc}d6kh1` : "";
  let atk_str = `1d20+${data.grit}${acc_str}`;
  // console.log(`${lp} Attack roll string: ${atk_str}`);
  let attack_roll = new Roll(atk_str).roll();

  // Iterate through damage types, rolling each
  let damage_results: Array<{
    roll: Roll;
    tt: HTMLElement | JQuery<HTMLElement>;
    dtype: DamageType;
  }> = [];
  let overkill_heat: number = 0;
  data.damage.forEach(async (x: any) => {
    if (x.type === "" || x.val === "" || x.val == 0) return Promise.resolve(); // Skip undefined and zero damage
    let dFormula: string = x.val.toString();
    // If the damage formula involves dice and is overkill, add "rr1" to reroll all 1's.
    if (dFormula.includes("d") && data.overkill) {
      let dind = dFormula.indexOf("d");
      let pind = dFormula.indexOf("+");
      if (dind >= 0) {
        if (pind > dind) dFormula = dFormula.substring(0, pind) + "rr1" + dFormula.substring(pind);
        else dFormula += "rr1";
      }
    }
    const droll = new Roll(dFormula).roll();
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
      dtype: x.type
    });
    return Promise.resolve();
  });

  // Output
  const attack_tt = await attack_roll.getTooltip();
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
  return renderMacro(actor, template, templateData);
}

async function prepareTechMacro(a: string, t: string) {
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
    return ui.notifications.error(`Error rolling tech attack macro - ${item.name} is not owned by an Actor!`);
  }

  let mData: LancerTechMacroData = {
    title: item.name,
    t_atk: 0,
    acc: 0,
    effect: "",
    tags: []
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
    mData.t_atk = tData.attack_bonus && tData.attack_bonus.length > tier ? tData.attack_bonus[tier] : 0;
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

  rollTechMacro(actor, mData);
}

async function rollTechMacro(actor: Actor, data: LancerTechMacroData) {
  // Get accuracy/difficulty with a prompt
  let abort: boolean = false;
  await promptAccDiffModifier(data.acc, data.title).then(
    resolve => (data.acc = resolve),
    reject => (abort = true)
  );
  if (abort) return;

  // Do the attack rolling
  let acc_str = data.acc != 0 ? ` + ${data.acc}d6kh1` : "";
  let atk_str = `1d20+${data.t_atk}${acc_str}`;
  console.log(`${lp} Tech Attack roll string: ${atk_str}`);
  let attack_roll = new Roll(atk_str).roll();

  // Output
  const attack_tt = await attack_roll.getTooltip();
  const templateData = {
    title: data.title,
    attack: attack_roll,
    attack_tooltip: attack_tt,
    effect: data.effect ? data.effect : null,
    tags: data.tags,
  };

  const template = `systems/lancer/templates/chat/tech-attack-card.html`;
  return renderMacro(actor, template, templateData);
}

async function promptAccDiffModifier(acc?: number, title?: string) {
  if (!acc) acc = 0;
  let diff = 0;
  if (acc < 0) {
    diff = -acc;
    acc = 0;
  }

  let template = await renderTemplate(`systems/lancer/templates/window/promptAccDiffModifier.html`, { acc: acc, diff: diff })
  return new Promise<number>((resolve, reject) => {
    let d = new Dialog({
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
            reject();
          },
        },
      },
      default: "submit",
      close: () => reject(),
    }).render(true);
  });
}
