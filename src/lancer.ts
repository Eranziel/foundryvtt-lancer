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
} from "./module/item/effects";

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

import * as macros from "./module/macros";

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
    prepareStatMacro: macros.prepareStatMacro,
    rollStatMacro: macros.rollStatMacro,
    prepareAttackMacro: macros.prepareAttackMacro,
    rollAttackMacro: macros.rollAttackMacro,
    prepareTechMacro: macros.prepareTechMacro,
    rollTechMacro: macros.rollTechMacro,
    prepareTriggerMacro: macros.prepareTriggerMacro,
    rollTriggerMacro: macros.rollTriggerMacro,
    prepareGenericMacro: macros.prepareGenericMacro,
    rollGenericMacro: macros.rollGenericMacro,
    prepareTalentMacro: macros.prepareTalentMacro,
    rollTalentMacro: macros.rollTalentMacro,
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
      overkill[i].addEventListener("click", async function () {
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
    macros.createActorMacro(data.title, data.dataPath, data.actorId, slot);
  } else if (data.type === 'Item') {
    let command = '';
    let title = '';
    let img = 'systems/lancer/assets/icons/macro-icons/d20-framed.svg';
    // Handled options for items:
    switch (data.data.type) {
      // Skills
      case 'skill':
        command = `game.lancer.prepareTriggerMacro("${data.actorId}", "${data.data._id}");`;
        title = data.data.name;
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
        if (data.data.data.feature_type === NpcFeatureType.Weapon) {
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

    if (!command || !title) {
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
