/**
 * TypeScript entry file for Foundry VTT.
 * Registers custom settings, sheets, and constants using the Foundry API.
 *
 * Author: Eranziel
 * Content License: LANCER is copyright 2019, Massif Press Inc.
 * Software License: GNU GPLv3
 */

// Import TypeScript modules
import { LANCER, STATUSES, WELCOME } from "./module/config";
import { LancerGame } from "./module/lancer-game";
import {
  LancerActor,
  lancerActorInit,
  npc_tier_selector,
} from "./module/actor/lancer-actor";
import { LancerItem, lancerItemInit } from "./module/item/lancer-item";

import {
  action_type_icon,
  action_type_selector,
  ai_effect_preview,
  basic_effect_preview,
  bonus_effect_preview,
  charge_effect_preview,
  charge_type_selector,
  deployable_effect_preview,
  drone_effect_preview,
  effect_preview,
  generic_effect_preview,
  invade_option_preview,
  npc_reaction_effect_preview,
  npc_system_effect_preview,
  npc_tech_effect_preview,
  npc_trait_effect_preview,
  npc_weapon_effect_preview,
  offensive_effect_preview,
  profile_effect_preview,
  protocol_effect_preview,
  reaction_effect_preview,
  tech_effect_preview,
} from "./module/item/effects";

// Import applications
import { LancerPilotSheet } from "./module/actor/pilot-sheet";
import { LancerNPCSheet } from "./module/actor/npc-sheet";
import { LancerDeployableSheet } from "./module/actor/deployable-sheet";
import { LancerMechSheet } from "./module/actor/mech-sheet";
import { LancerItemSheet } from "./module/item/item-sheet";
import { LancerFrameSheet } from "./module/item/frame-sheet";
import { LancerNPCClassSheet } from "./module/item/npc-class-sheet";

// Import helpers
import { preloadTemplates } from "./module/preloadTemplates";
import { registerSettings } from "./module/settings";
import {
  compactTagList,
  compact_tag_list,
  renderChunkyTag,
  renderCompactTag,
  renderFullTag,
} from "./module/item/tags";
import * as migrations from "./module/migration";
import { addLCPManager } from "./module/apps/lcpManager";

// Import Machine Mind and helpers
import * as macros from "./module/macros";

// Import node modules
import compareVersions = require("compare-versions");
import { NpcFeatureType, EntryType, Manufacturer } from "machine-mind";
import {
  render_icon,
  resolve_dotpath,
} from "./module/helpers/commons";
import { is_loading } from "machine-mind/dist/classes/mech/EquipUtil";
import {
  item_preview,
  weapon_size_selector,
  weapon_type_selector,
  range_editor,
  npc_weapon_damage_selector,
  weapon_range_preview,
  weapon_damage_preview,
  npc_attack_bonus_preview,
  npc_accuracy_preview,
  mech_weapon_preview,
  system_type_selector,
  effect_type_selector,
  mech_system_preview,
  npc_feature_preview,
  core_system_preview,
  mech_trait_preview,
  damage_editor,
  bonus_array,
  pilot_armor_slot,
  pilot_weapon_slot,
  pilot_gear_slot,
} from "./module/helpers/item";
import { editable_mm_ref_list_item as editable_mm_ref_list_item, clicker_num_input, clicker_stat_card, compact_stat_edit, compact_stat_view, mech_loadout, overcharge_button, stat_edit_card, stat_edit_card_max, stat_view_card, pilot_slot } from "./module/helpers/actor";
import { HelperOptions } from "handlebars";
import { manufacturer_ref, simple_mm_ref } from "./module/helpers/refs";

const lp = LANCER.log_prefix;

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
    prepareItemMacro: macros.prepareItemMacro,
    prepareStatMacro: macros.prepareStatMacro,
    prepareTextMacro: macros.prepareTextMacro,
    prepareCoreActiveMacro: macros.prepareCoreActiveMacro,
    prepareCorePassiveMacro: macros.prepareCorePassiveMacro,
    migrations: migrations,

    // For whitespines testing /('o')/
    tmp: {},
  };

  // Record Configuration Values
  CONFIG.Actor.entityClass = LancerActor;
  CONFIG.Item.entityClass = LancerItem;

  // Register custom system settings
  registerSettings();

  // Set up system status icons
  const keepStock = game.settings.get(LANCER.sys_name, LANCER.setting_stock_icons);
  let statuses: { id: string; label: string; icon: string }[] = [];
  // @ts-ignore The type for statusEffects is wrong. Currently string[], should be the above type
  if (keepStock) statuses = statuses.concat(CONFIG.statusEffects);
  statuses = statuses.concat(STATUSES);
  //@ts-ignore See previous ignore
  CONFIG.statusEffects = statuses;

  // Register Web Components
  customElements.define("card-clipped", class LancerClippedCard extends HTMLDivElement {}, {
    extends: "div",
  });

  // Preload Handlebars templates
  await preloadTemplates();

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("lancer", LancerPilotSheet, { types: [EntryType.PILOT], makeDefault: true });
  Actors.registerSheet("lancer", LancerMechSheet, { types: [EntryType.MECH], makeDefault: true });
  Actors.registerSheet("lancer", LancerNPCSheet, { types: [EntryType.NPC], makeDefault: true });
  Actors.registerSheet("lancer", LancerDeployableSheet, {
    types: [EntryType.DEPLOYABLE],
    makeDefault: true,
  });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("lancer", LancerItemSheet, {
    types: [
      EntryType.SKILL,
      EntryType.TALENT,
      EntryType.LICENSE,
      EntryType.CORE_BONUS,
      EntryType.RESERVE,
      EntryType.STATUS,
      EntryType.TAG,
      EntryType.PILOT_ARMOR,
      EntryType.PILOT_WEAPON,
      EntryType.PILOT_GEAR,
      EntryType.MECH_SYSTEM,
      EntryType.MECH_WEAPON,
      EntryType.WEAPON_MOD,
      EntryType.NPC_FEATURE,
      EntryType.MANUFACTURER,
      EntryType.QUIRK
    ],
    makeDefault: true,
  });
  Items.registerSheet("lancer", LancerFrameSheet, { types: [EntryType.FRAME], makeDefault: true });
  Items.registerSheet("lancer", LancerNPCClassSheet, {
    types: [EntryType.NPC_CLASS, EntryType.NPC_TEMPLATE],
    makeDefault: true,
  });

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

  // cons, to concatenate strs. Can take any number of args. Last is omitted (as it is just a handlebars ref object)
  Handlebars.registerHelper("concat", function (...values) {
    return values.slice(0, values.length - 1).join("");
  });

  // rp, to resolve path values strs. Helps use effectively half as many arguments for many helpers/partials
  Handlebars.registerHelper("rp", function(path: string, options: HelperOptions) {
    return resolve_dotpath(options.data?.root, path);
  });

  // get-set, to resolve situations wherein we read and write to the same path via "value" and "name" element properties
  Handlebars.registerHelper("getset", function(path: string, options: HelperOptions) {
    let value = resolve_dotpath(options.data?.root, path);
    return ` name="${path}" value="${value}" `;
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
  Handlebars.registerHelper("light-icon", render_icon);

  Handlebars.registerHelper("l-num-input", clicker_num_input);

  // For debugging
  Handlebars.registerHelper("debug_each", function (it, block) {
    // if(typeof a == 'function')
    // a = a.call(this);
    console.log(it);
    var s = "";
    for (let x of it) s += block(x);
    return s;
  });


  // ------------------------------------------------------------------------
  // Stat helpers
  Handlebars.registerHelper("compact-stat-edit", compact_stat_edit);
  Handlebars.registerHelper("compact-stat-view", compact_stat_view);
  Handlebars.registerHelper("stat-view-card", stat_view_card);
  Handlebars.registerHelper("stat-edit-card", stat_edit_card);
  Handlebars.registerHelper("stat-edit-max-card", stat_edit_card_max);
  Handlebars.registerHelper("clicker-stat-card", clicker_stat_card);
  

  // ------------------------------------------------------------------------
  // Refs
  Handlebars.registerHelper("simple-ref", simple_mm_ref);
  Handlebars.registerHelper("ref-mm-list-item", editable_mm_ref_list_item);
  Handlebars.registerHelper("pilot-slot", pilot_slot);

  // ------------------------------------------------------------------------
  // Pilot stuff
  Handlebars.registerHelper("pilot-armor-slot", pilot_armor_slot);
  Handlebars.registerHelper("pilot-weapon-slot", pilot_weapon_slot);
  Handlebars.registerHelper("pilot-gear-slot", pilot_gear_slot);

  // ------------------------------------------------------------------------
  // Tags
  Handlebars.registerHelper("compact-tag", renderCompactTag);
  Handlebars.registerPartial("tag-list", compactTagList);
  Handlebars.registerPartial("mm-tag-list", compact_tag_list);
  Handlebars.registerHelper("chunky-tag", renderChunkyTag);
  Handlebars.registerHelper("full-tag", renderFullTag);

  // ------------------------------------------------------------------------
  // License data
  Handlebars.registerHelper("ref-manufacturer", manufacturer_ref);

  // ------------------------------------------------------------------------
  // Bonuses
  Handlebars.registerHelper("bonuses-editor", bonus_array);

  // ------------------------------------------------------------------------
  // Weapons
  Handlebars.registerHelper("is-loading", is_loading);
  Handlebars.registerHelper("wpn-size-sel", weapon_size_selector);
  Handlebars.registerHelper("wpn-type-sel", weapon_type_selector);
  Handlebars.registerHelper("wpn-range-sel", range_editor);
  Handlebars.registerHelper("wpn-damage-sel", damage_editor);
  Handlebars.registerHelper("npc-wpn-damage-sel", npc_weapon_damage_selector);
  Handlebars.registerHelper("wpn-range", weapon_range_preview);
  Handlebars.registerHelper("wpn-damage", weapon_damage_preview);
  Handlebars.registerHelper("npcf-atk", npc_attack_bonus_preview);
  Handlebars.registerHelper("npcf-acc", npc_accuracy_preview);
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
  // NPC Effects
  Handlebars.registerHelper("npc-feat-preview", npc_feature_preview);
  Handlebars.registerHelper("npc-rct-preview", npc_reaction_effect_preview);
  Handlebars.registerHelper("npc-sys-preview", npc_system_effect_preview);
  Handlebars.registerHelper("npc-trait-preview", npc_trait_effect_preview);
  Handlebars.registerHelper("npc-tech-preview", npc_tech_effect_preview);
  Handlebars.registerHelper("npc-wpn-preview", npc_weapon_effect_preview);

  // ------------------------------------------------------------------------
  // Frames
  Handlebars.registerPartial("core-system", core_system_preview);
  Handlebars.registerPartial("mech-trait", mech_trait_preview);

  // ------------------------------------------------------------------------
  // Pilot components
  Handlebars.registerHelper("overcharge-button", overcharge_button);

  // ------------------------------------------------------------------------
  // Mech components
  Handlebars.registerHelper("mech-loadout", mech_loadout);

  // ------------------------------------------------------------------------
  // NPC components
  Handlebars.registerHelper("tier-selector", npc_tier_selector);
});

/* ------------------------------------ */
/* When ready                           */
/* ------------------------------------ */
Hooks.once("ready", async function () {
  // Determine whether a system migration is required and feasible
  const currentVersion = game.settings.get(LANCER.sys_name, LANCER.setting_migration);
  // Modify these constants to set which Lancer version numbers need and permit migration.
  const NEEDS_MIGRATION_VERSION = "0.1.7";
  const COMPATIBLE_MIGRATION_VERSION = "0.1.6";
  let needMigration = currentVersion ? compareVersions(currentVersion, NEEDS_MIGRATION_VERSION) : 1;

  // Check whether system has been updated since last run.
  if (compareVersions(currentVersion, game.system.data.version) != 0 && game.user.isGM) {
    // Un-hide the welcome message
    await game.settings.set(LANCER.sys_name, LANCER.setting_welcome, false);

    if (needMigration <= 0) {
      if (currentVersion && compareVersions(currentVersion, COMPATIBLE_MIGRATION_VERSION) < 0) {
        // System version is too old for migration
        ui.notifications.error(
          `Your LANCER system data is from too old a version and cannot be reliably migrated to the latest version. The process will be attempted, but errors may occur.`,
          { permanent: true }
        );
      }
      // Perform the migration
      await migrations.migrateWorld();
    }
    // Set the version for future migration and welcome message checking
    await game.settings.set(LANCER.sys_name, LANCER.setting_migration, game.system.data.version);
  }

  // Show welcome message if not hidden.
  if (!game.settings.get(LANCER.sys_name, LANCER.setting_welcome)) {
    new Dialog({
      title: `Welcome to LANCER v${game.system.data.version}`,
      content: WELCOME,
      buttons: {
        dont_show: {
          label: "Do Not Show Again",
          callback: async () => {
            await game.settings.set(LANCER.sys_name, LANCER.setting_welcome, true);
          },
        },
        close: {
          label: "Close",
        },
      },
      default: "Close",
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
          roll_tooltip: await roll.getTooltip(),
        };
        const html = await renderTemplate(
          "systems/lancer/templates/chat/overkill-reroll.html",
          templateData
        );
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

Hooks.on("hotbarDrop", (_bar: any, data: any, slot: number) => {
  // We set an associated command & title based off the type
  // Everything else gets handled elsewhere

  let command = "";
  let title = "";
  let img = "systems/lancer/assets/icons/macro-icons/d20-framed.svg";

  console.log(`${lp} Data dropped on hotbar:`, data);

  // TODO: Figure out if I am really going down this route and, if so, switch to a switch
  if (data.type === "actor") {
    command = `
      const a = game.actors.get('${data.actorId}');
      if (a) {
        game.lancer.prepareStatMacro(a, "${data.dataPath}");
      } else {
        ui.notifications.error("Error rolling macro");
      }`;
    title = data.title;
  } else if (data.type === "Item") {
    command = `game.lancer.prepareItemMacro("${data.actorId}", "${data.data._id}");`;
    // Talent are the only ones (I think??) that we need to name specially
    if (data.data.type === EntryType.TALENT) {
      command = `game.lancer.prepareItemMacro("${data.actorId}", "${data.itemId}", {rank: ${data.rank}});`;
      title = data.title;
      img = `systems/lancer/assets/icons/macro-icons/talent.svg`;
    } else {
      title = data.data.name;
    }
    // Pick the image for the hotbar
    switch (data.data.type) {
      case EntryType.SKILL:
        img = `systems/lancer/assets/icons/macro-icons/skill.svg`;
        break;
      case EntryType.TALENT:
        img = `systems/lancer/assets/icons/macro-icons/talent.svg`;
        break;
      case EntryType.CORE_BONUS:
        img = `systems/lancer/assets/icons/macro-icons/corebonus.svg`;
        break;
      case EntryType.PILOT_GEAR:
        img = `systems/lancer/assets/icons/macro-icons/generic_item.svg`;
        break;
      case EntryType.PILOT_WEAPON:
      case EntryType.MECH_WEAPON:
        img = `systems/lancer/assets/icons/macro-icons/mech_weapon.svg`;
        break;
      case EntryType.MECH_SYSTEM:
        img = `systems/lancer/assets/icons/macro-icons/mech_system.svg`;
        break;
      case EntryType.NPC_FEATURE:
        switch (data.data.data.feature_type) {
          case NpcFeatureType.Reaction:
            img = `systems/lancer/assets/icons/macro-icons/reaction.svg`;
            break;
          case NpcFeatureType.System:
            img = `systems/lancer/assets/icons/macro-icons/mech_system.svg`;
            break;
          case NpcFeatureType.Trait:
            img = `systems/lancer/assets/icons/macro-icons/trait.svg`;
            break;
          case NpcFeatureType.Tech:
            img = `systems/lancer/assets/icons/macro-icons/tech_quick.svg`;
            break;
          case NpcFeatureType.Weapon:
            img = `systems/lancer/assets/icons/macro-icons/mech_weapon.svg`;
            break;
        }
        break;
    }
  } else if (data.type === "Text") {
    title = data.title;
    command = `game.lancer.prepareTextMacro("${data.actorId}", "${data.title}", {rank: ${data.description}})`;
  } else if (data.type === "Core-Active") {
    title = data.title;
    command = `game.lancer.prepareCoreActiveMacro("${data.actorId}")`;
    img = `systems/lancer/assets/icons/macro-icons/corebonus.svg`;
  } else if (data.type === "Core-Passive") {
    title = data.title;
    command = `game.lancer.prepareCorePassiveMacro("${data.actorId}")`;
    img = `systems/lancer/assets/icons/macro-icons/corebonus.svg`;
  } else {
    // Let's not error or anything, since it's possible to accidentally drop stuff pretty easily
    return;
  }

  // Until we properly register commands as something macros can have...
  // @ts-ignore
  let macro = game.macros.entities.find(
    (m: Macro) => m.name === title && (m.data as any).command === command
  );
  if (!macro) {
    Macro.create(
      {
        command,
        name: title,
        type: "script",
        img: img,
      },
      { displaySheet: false }
    ).then(macro => game.user.assignHotbarMacro(macro as Macro, slot));
  } else {
    game.user.assignHotbarMacro(macro, slot).then();
  }
});
