/**
 * TypeScript entry file for Foundry VTT.
 * Registers custom settings, sheets, and constants using the Foundry API.
 *
 * Author: Eranziel
 * Content License: LANCER is copyright 2019, Massif Press Inc.
 * Software License: GNU GPLv3
 */

// Import TypeScript modules
import marked = require("marked");
// Pull in the parts of AWS Amplify we need
import aws from "./aws-exports";
import Auth from "@aws-amplify/auth";
import Storage from "@aws-amplify/storage";

import { LANCER, STATUSES, WELCOME } from "./module/config";
import type { LancerGame } from "./module/lancer-game";
import { LancerActor, lancerActorInit } from "./module/actor/lancer-actor";
import { LancerItem, lancerItemInit } from "./module/item/lancer-item";
import { populatePilotCache } from "./module/compcon";

import { action_type_icon, action_type_selector } from "./module/helpers/npc";

import { LancerActionManager } from "./module/action/actionManager";

// Import applications
import { LancerPilotSheet, active_mech_preview, pilot_counters } from "./module/actor/pilot-sheet";
import { LancerNPCSheet } from "./module/actor/npc-sheet";
import { LancerDeployableSheet } from "./module/actor/deployable-sheet";
import { LancerMechSheet } from "./module/actor/mech-sheet";
import { LancerItemSheet } from "./module/item/item-sheet";
import { LancerFrameSheet } from "./module/item/frame-sheet";
import { LancerLicenseSheet } from "./module/item/license-sheet";
import { WeaponRangeTemplate } from "./module/pixi/weapon-range-template";

// Import helpers
import { preloadTemplates } from "./module/preloadTemplates";
import { registerSettings } from "./module/settings";
import { compact_tag_list } from "./module/helpers/tags";
import * as migrations from "./module/migration";
import { addLCPManager, updateCore, core_update } from "./module/apps/lcpManager";

// Import Machine Mind and helpers
import * as macros from "./module/macros";

// Import Tippy.js
import tippy from "tippy.js";
import "tippy.js/dist/tippy.css"; // optional for styling
tippy.setDefaultProps({ theme: "lancer", arrow: false, delay: [400, 200] });
// tippy.setDefaultProps({ theme: "lancer", arrow: false, delay: [400, 200], hideOnClick: false, trigger: "click"});

// Import node modules
import compareVersions = require("compare-versions");
import { EntryType, Bonus, funcs } from "machine-mind";
import {
  resolve_helper_dotpath,
  popout_editor_button,
  safe_html_helper,
  large_textbox_card,
  std_string_input,
  std_text_input,
  std_password_input,
  std_num_input,
  std_checkbox,
} from "./module/helpers/commons";
import {
  weapon_size_selector,
  weapon_type_selector,
  range_editor,
  npc_attack_bonus_preview,
  npc_accuracy_preview,
  mech_weapon_refview,
  system_type_selector,
  npc_feature_preview,
  damage_editor,
  bonuses_display,
  pilot_armor_slot,
  pilot_weapon_refview,
  pilot_gear_refview,
  license_ref,
  manufacturer_ref,
  uses_control,
  single_bonus_editor,
  buildCounterArrayHTML,
} from "./module/helpers/item";
import {
  action_button,
  clicker_num_input,
  clicker_stat_card,
  compact_stat_edit,
  compact_stat_view,
  deployer_slot,
  npc_clicker_stat_card,
  npc_tier_selector,
  overcharge_button,
  stat_edit_card,
  stat_edit_card_max,
  stat_rollable_card,
  stat_view_card,
} from "./module/helpers/actor";
import type { HelperOptions } from "handlebars";
import {
  editable_mm_ref_list_item,
  simple_mm_ref,
  mm_ref_portrait,
  mm_ref_list_append_slot,
  editable_mm_ref_list_item_native,
} from "./module/helpers/refs";
import { mech_loadout, pilot_slot, frame_refview } from "./module/helpers/loadout";
import {
  item_edit_arrayed_actions,
  item_edit_arrayed_damage,
  item_edit_arrayed_range,
  item_edit_arrayed_bonuses,
  item_edit_arrayed_counters,
  item_edit_arrayed_deployables,
  item_edit_arrayed_synergies,
  item_edit_arrayed_enum,
  item_edit_effect,
  item_edit_license,
  item_edit_sp,
  item_edit_uses,
  item_edit_arrayed_integrated,
  item_edit_enum,
} from "./module/helpers/item-editors";
import { applyCollapseListeners } from "./module/helpers/collapse";
import { handleCombatUpdate } from "./module/helpers/automation/combat";
import { handleActorExport, validForExport } from "./module/helpers/io";
import { runEncodedMacro } from "./module/macros";
import { LancerToken, LancerTokenDocument } from "./module/token";

const lp = LANCER.log_prefix;

/* ------------------------------------ */
/* Initialize system                    */
/* ------------------------------------ */
Hooks.once("init", async function () {
  console.log(`Initializing LANCER RPG System ${LANCER.ASCII}`);

  // Register custom system settings
  registerSettings();

  await sanityCheck();
  if (game.settings.get(LANCER.sys_name, LANCER.setting_beta_warning)) {
    return;
  }
  console.log(`${lp} Sanity check passed, continuing with initialization.`);

  configureAmplify();

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
    canvas: {
      WeaponRangeTemplate,
    },
    prepareItemMacro: macros.prepareItemMacro,
    prepareStatMacro: macros.prepareStatMacro,
    prepareTextMacro: macros.prepareTextMacro,
    prepareCoreActiveMacro: macros.prepareCoreActiveMacro,
    prepareCorePassiveMacro: macros.prepareCorePassiveMacro,
    prepareOverchargeMacro: macros.prepareOverchargeMacro,
    prepareOverheatMacro: macros.prepareOverheatMacro,
    prepareStructureMacro: macros.prepareStructureMacro,
    prepareActivationMacro: macros.prepareActivationMacro,
    fullRepairMacro: macros.fullRepairMacro,
    stabilizeMacro: macros.stabilizeMacro,
    migrations: migrations,

    // For whitespines testing /('o')/
    tmp: {
      finishedInit: false,
    },
  };

  // Record Configuration Values
  CONFIG.Actor.documentClass = LancerActor;
  CONFIG.Item.documentClass = LancerItem;
  CONFIG.Token.documentClass = LancerTokenDocument;
  CONFIG.Token.objectClass = LancerToken;

  // Set up system status icons
  const keepStock = game.settings.get(LANCER.sys_name, LANCER.setting_stock_icons);
  let statuses: { id: string; label: string; icon: string }[] = [];
  if (keepStock) statuses = statuses.concat(CONFIG.statusEffects);
  statuses = statuses.concat(STATUSES);
  CONFIG.statusEffects = statuses;

  // Register Web Components
  customElements.define("card-clipped", class LancerClippedCard extends HTMLDivElement {}, {
    extends: "div",
  });

  // @ts-ignore We should use libwrapper if this is necessary
  const actors_old_getEntryContextOptions = ActorDirectory.prototype._getEntryContextOptions;
  // @ts-ignore We should use libwrapper if this is necessary
  ActorDirectory.prototype._getEntryContextOptions = function () {
    const ctxOptions = actors_old_getEntryContextOptions.call(this);

    const editMigratePilot = {
      name: "Migrate Pilot",
      icon: '<i class="fas fa-user-circle"></i>',
      condition: (li: any) => {
        const actor = game.actors?.get(li.data("entityId"));
        return actor?.data.type === "pilot" && validForExport(actor);
      },
      callback: (li: any) => {
        const actor = game.actors?.get(li.data("entityId"));
        // @ts-ignore Migrations?
        const dump = handleActorExport(actor, false);
        dump && actor?.importCC(dump as any, true);
      },
    };

    const editExportPilot = {
      name: "Export Pilot",
      icon: '<i class="fas fa-user-circle"></i>',
      condition: (li: any) => {
        const actor = game.actors?.get(li.data("entityId"));
        return actor?.data.type === "pilot" && validForExport(actor);
      },
      callback: (li: any) => {
        const actor = game.actors?.get(li.data("entityId"));
        // @ts-ignore Migrations?
        handleActorExport(actor, true);
      },
    };

    ctxOptions.unshift(editMigratePilot);
    ctxOptions.unshift(editExportPilot);

    return ctxOptions;
  };

  // Preload Handlebars templates
  await preloadTemplates();

  // *******************************************************************
  // Register handlebars helpers

  // inc, for those off-by-one errors
  Handlebars.registerHelper("inc", function (value: any) {
    return parseInt(value) + 1;
  });

  // dec, for those off-by-one errors
  Handlebars.registerHelper("dec", function (value: any) {
    return parseInt(value) - 1;
  });

  // cons, to concatenate strs. Can take any number of args. Last is omitted (as it is just a handlebars ref object)
  Handlebars.registerHelper("concat", function (...values: any[]) {
    return values.slice(0, values.length - 1).join("");
  });

  // rp, to resolve path values strs. Helps use effectively half as many arguments for many helpers/partials
  // Using this, {{{rp path}}} {{path}} would show the value at path, and path, respectively. No need to pass both!
  Handlebars.registerHelper("rp", function (path: string, options: HelperOptions) {
    return resolve_helper_dotpath(options, path);
  });

  // get-set, to resolve situations wherein we read and write to the same path via "value" and "name" element properties
  Handlebars.registerHelper("getset", function (path: string, options: HelperOptions) {
    let value = resolve_helper_dotpath(options, path);
    return ` name="${path}" value="${value}" `;
  });

  // get an index from an array
  Handlebars.registerHelper("idx", function (array: any, index: any) {
    return array[index];
  });

  // invert the input
  Handlebars.registerHelper("neg", function (value: any) {
    return parseInt(value) * -1;
  });

  // double the input
  Handlebars.registerHelper("double", function (value: any) {
    return parseInt(value) * 2;
  });

  // Equal-to evaluation
  Handlebars.registerHelper("eq", function (val1: any, val2: any) {
    return val1 === val2;
  });

  // Equal-to evaluation
  Handlebars.registerHelper("neq", function (val1: any, val2: any) {
    return val1 !== val2;
  });

  // Logical "or" evaluation
  Handlebars.registerHelper("or", function (val1: any, val2: any) {
    return val1 || val2;
  });

  // Greater-than evaluation
  Handlebars.registerHelper("gt", function (val1: any, val2: any) {
    return val1 > val2;
  });

  // Greater-than evaluation after applying parseInt to both values
  Handlebars.registerHelper("gtpi", function (val1: any, val2: any) {
    val1 = parseInt(val1);
    val2 = parseInt(val2);
    return val1 > val2;
  });

  // Less-than evaluation
  Handlebars.registerHelper("lt", function (val1: any, val2: any) {
    return val1 < val2;
  });

  // Greater-than evaluation after applying parseInt to both values
  Handlebars.registerHelper("ltpi", function (val1: any, val2: any) {
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

  // For loops in Handlebars
  Handlebars.registerHelper("for", function (n: any, block: any) {
    var accum = "";
    for (var i = 0; i < n; ++i) accum += block.fn(i);
    return accum;
  });

  Handlebars.registerHelper("safe-html", safe_html_helper);

  // ------------------------------------------------------------------------
  // Generic components
  Handlebars.registerHelper("l-num-input", clicker_num_input);

  // For debugging
  Handlebars.registerHelper("debug_each", function (it: any, block: any) {
    // if(typeof a == 'function')
    // a = a.call(this);
    console.debug(it);
    var s = "";
    for (let x of it) s += block(x);
    return s;
  });

  Handlebars.registerHelper("textarea-card", large_textbox_card);

  // ------------------------------------------------------------------------
  // Stat helpers
  Handlebars.registerHelper("compact-stat-edit", compact_stat_edit);
  Handlebars.registerHelper("compact-stat-view", compact_stat_view);
  Handlebars.registerHelper("stat-view-card", stat_view_card);
  Handlebars.registerHelper("stat-rollable-card", stat_rollable_card);
  Handlebars.registerHelper("stat-edit-card", stat_edit_card);
  Handlebars.registerHelper("stat-edit-max-card", stat_edit_card_max);
  Handlebars.registerHelper("clicker-stat-card", clicker_stat_card);
  Handlebars.registerHelper("npc-clicker-stat-card", npc_clicker_stat_card);
  Handlebars.registerHelper("std-string-input", std_string_input);
  Handlebars.registerHelper("std-text-input", std_text_input);
  Handlebars.registerHelper("std-password-input", std_password_input);
  Handlebars.registerHelper("std-num-input", std_num_input);
  Handlebars.registerHelper("std-checkbox", std_checkbox);
  Handlebars.registerHelper("action-button", action_button);

  // ------------------------------------------------------------------------
  // Tag helpers
  Handlebars.registerHelper("is-tagged", function (item: any) {
    return funcs.is_tagged(item);
  });

  Handlebars.registerHelper("is-limited", function (item: funcs.TaggedEquippable) {
    return funcs.is_limited(item);
  });

  Handlebars.registerHelper("is-loading", function (item: funcs.TaggedEquippable) {
    return funcs.is_loading(item);
  });

  // ------------------------------------------------------------------------
  // Refs
  Handlebars.registerHelper("simple-ref", simple_mm_ref);
  Handlebars.registerHelper("ref-mm-controllable-item", editable_mm_ref_list_item);
  Handlebars.registerHelper("ref-mm-controllable-item-native", editable_mm_ref_list_item_native);
  Handlebars.registerHelper("ref-mm-list-item-append", mm_ref_list_append_slot);
  Handlebars.registerHelper("pilot-slot", pilot_slot);
  Handlebars.registerHelper("deployer-slot", deployer_slot); // Can be pilot, npc, or mech. Preferably mech, lol
  Handlebars.registerHelper("ref-portrait-img", mm_ref_portrait);

  // ------------------------------------------------------------------------
  // Pilot stuff
  Handlebars.registerHelper("pilot-armor-slot", pilot_armor_slot);
  Handlebars.registerHelper("pilot-weapon-slot", pilot_weapon_refview);
  Handlebars.registerHelper("pilot-gear-slot", pilot_gear_refview);
  Handlebars.registerHelper("counter-array", buildCounterArrayHTML);
  Handlebars.registerHelper("pilot-counters", pilot_counters);
  Handlebars.registerHelper("active-mech-preview", active_mech_preview);

  // ------------------------------------------------------------------------
  // Tags
  // Handlebars.registerHelper("compact-tag", renderCompactTag);
  // Handlebars.registerPartial("tag-list", compactTagList);
  Handlebars.registerHelper("mm-tag-list", compact_tag_list);
  // Handlebars.registerHelper("chunky-tag", renderChunkyTag);
  // Handlebars.registerHelper("full-tag", renderFullTag);

  // ------------------------------------------------------------------------
  // License data
  Handlebars.registerHelper("ref-manufacturer", manufacturer_ref);
  Handlebars.registerHelper("ref-license", license_ref);

  // ------------------------------------------------------------------------
  // Bonuses
  Handlebars.registerHelper("edit-bonuses-view", (bonuses_path: string, bonuses_array: Bonus[]) =>
    bonuses_display(bonuses_path, bonuses_array, true)
  );
  Handlebars.registerHelper("read-bonuses-view", (bonuses_path: string, bonuses_array: Bonus[]) =>
    bonuses_display(bonuses_path, bonuses_array, false)
  );
  Handlebars.registerHelper("bonuses-view", bonuses_display); // Takes a third arg
  Handlebars.registerHelper("edit-bonus", single_bonus_editor);
  Handlebars.registerHelper("popout-editor-button", popout_editor_button);

  // ------------------------------------------------------------------------
  // Weapons
  Handlebars.registerHelper("wpn-size-sel", weapon_size_selector);
  Handlebars.registerHelper("wpn-type-sel", weapon_type_selector);
  Handlebars.registerHelper("wpn-range-sel", range_editor);
  Handlebars.registerHelper("wpn-damage-sel", damage_editor);
  Handlebars.registerHelper("npcf-atk", npc_attack_bonus_preview);
  Handlebars.registerHelper("npcf-acc", npc_accuracy_preview);
  Handlebars.registerHelper("mech-weapon-preview", mech_weapon_refview);

  // ------------------------------------------------------------------------
  // Systems
  Handlebars.registerHelper("sys-type-sel", system_type_selector);
  Handlebars.registerHelper("uses-ctrl", uses_control);
  Handlebars.registerHelper("act-icon", action_type_icon);
  Handlebars.registerHelper("act-type-sel", action_type_selector);

  // ------------------------------------------------------------------------
  // Item-level helpers for editing
  //   - Arrayed items
  Handlebars.registerHelper("item-edit-arrayed-actions", item_edit_arrayed_actions);
  Handlebars.registerHelper("item-edit-arrayed-damage", item_edit_arrayed_damage);
  Handlebars.registerHelper("item-edit-arrayed-range", item_edit_arrayed_range);
  Handlebars.registerHelper("item-edit-arrayed-enum", item_edit_arrayed_enum);
  Handlebars.registerHelper("item-edit-arrayed-bonuses", item_edit_arrayed_bonuses);
  Handlebars.registerHelper("item-edit-arrayed-counters", item_edit_arrayed_counters);
  Handlebars.registerHelper("item-edit-arrayed-deployables", item_edit_arrayed_deployables);
  Handlebars.registerHelper("item-edit-arrayed-synergies", item_edit_arrayed_synergies);
  Handlebars.registerHelper("item-edit-arrayed-integrated", item_edit_arrayed_integrated);
  // Generic handler for an array that can take a selectable enum
  Handlebars.registerHelper("item-edit-arrayed-enum", item_edit_arrayed_enum);
  // And a single enum-based selector.
  // Which is just a wrapper for std_enum_select but we can pass in a string and resolve it
  Handlebars.registerHelper("item-edit-enum", item_edit_enum);
  //   - Standalone items
  Handlebars.registerHelper("item-edit-effect", item_edit_effect);
  Handlebars.registerHelper("item-edit-license", item_edit_license);
  Handlebars.registerHelper("item-edit-sp", item_edit_sp);
  Handlebars.registerHelper("item-edit-uses", item_edit_uses);

  // ------------------------------------------------------------------------
  // Frames
  // Handlebars.registerPartial("core-system", core_system_preview);

  // ------------------------------------------------------------------------
  // Pilot components
  Handlebars.registerHelper("overcharge-button", overcharge_button);

  // ------------------------------------------------------------------------
  // Mech components
  Handlebars.registerHelper("mech-loadout", mech_loadout);
  Handlebars.registerHelper("mech-frame", frame_refview);

  // ------------------------------------------------------------------------
  // NPC components
  Handlebars.registerHelper("tier-selector", npc_tier_selector);
  Handlebars.registerHelper("npc-feat-preview", npc_feature_preview);

  // TODO: remove when sanity check is no longer needed.
  (<LancerGame>game).lancer.finishedInit = true;
});

// TODO: either remove when sanity check is no longer needed, or find a better home.
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Override model to have our derived trackable values, without putting them in template.json and thus compromising
 * our data model with derived junk
 */
Hooks.once("setup", function () {
  let orig_gta = TokenDocument.getTrackedAttributes;
  TokenDocument.getTrackedAttributes = function (data: any, _path: any = []) {
    // We pre-empt the
    if (!data) {
      data = {};
      for (let model of Object.values(game.system.model.Actor)) {
        mergeObject(data, model);
      }

      // Here's the custom behavior: add our derived data
      let bar_like = { value: 0, max: 0 };
      let derived_addition = {
        edef: 8,
        evasion: 5,
        save_target: 0,
        current_heat: bar_like,
        current_hp: bar_like,
        overshield: bar_like,
        current_structure: bar_like,
        current_stress: bar_like,
        current_repairs: bar_like,
      };
      mergeObject(data, derived_addition);
    }
    return orig_gta.call(this, data, _path);
  };
});

/* ------------------------------------ */
/* When ready                           */
/* ------------------------------------ */
// Make an awaitable for when this shit is done
export const system_ready: Promise<void> = new Promise(success => {
  Hooks.once("ready", async function () {
    // Register sheet application classes
    setupSheets();

    Hooks.on("preUpdateCombat", handleCombatUpdate);

    // Wait for sanity check to complete.
    let ready: boolean = false;
    while (!ready) {
      await sleep(100);
      ready = !!(<LancerGame>game).lancer?.finishedInit;
    }
    console.log(`${lp} Foundry ready, doing final checks.`);

    await versionCheck();
    await showChangelog();

    applyCollapseListeners();

    (<LancerGame>game).action_manager = new LancerActionManager();
    await (<LancerGame>game).action_manager!.init();

    success();
  });
});

// Action Manager hooks.
Hooks.on("controlToken", () => {
  (<LancerGame>game).action_manager?.update();
});
Hooks.on("updateToken", (_scene: Scene, _token: Token, diff: any, _options: any, _idUser: any) => {
  // If it's an X or Y change assume the token is just moving.
  if (diff.hasOwnProperty("y") || diff.hasOwnProperty("x")) return;
  (<LancerGame>game).action_manager?.update();
});
Hooks.on("updateActor", (_actor: Actor) => {
  (<LancerGame>game).action_manager?.update();
});
Hooks.on("closeSettingsConfig", () => {
  (<LancerGame>game).action_manager?.updateConfig();
});
Hooks.on("getSceneNavigationContext", async () => {
  (<LancerGame>game).action_manager && (await (<LancerGame>game).action_manager!.reset());
});
Hooks.on("createCombat", (_actor: Actor) => {
  (<LancerGame>game).action_manager?.update();
});
Hooks.on("deleteCombat", (_actor: Actor) => {
  (<LancerGame>game).action_manager?.update();
});
//

// Add any additional hooks if necessary
Hooks.on("preCreateActor", lancerActorInit);
Hooks.on("preCreateItem", lancerItemInit);

// Create sidebar button to import LCP
Hooks.on("renderSidebarTab", async (app: Application, html: HTMLElement) => {
  addLCPManager(app, html);
});

// For the settings tab
Hooks.on("renderSettings", async (app: Application, html: HTMLElement) => {
  addSettingsButtons(app, html);
});

Hooks.on("renderChatMessage", async (cm: ChatMessage, html: any, data: any) => {
  // Reapply listeners.
  applyCollapseListeners();

  // Attack function to overkill reroll button
  const overkill = html[0].getElementsByClassName("overkill-reroll");
  for (let i = 0; i < overkill.length; i++) {
    if (cm.isAuthor) {
      overkill[i].addEventListener("click", async function () {
        // console.log(data);
        const roll = await new Roll("1d6").evaluate({ async: true });
        const templateData = {
          roll: roll,
          roll_tooltip: await roll.getTooltip(),
        };
        const html = await renderTemplate("systems/lancer/templates/chat/overkill-reroll.hbs", templateData);
        const rollMode = game.settings.get("core", "rollMode");
        let chat_data: Record<string, unknown> = {
          user: game.user,
          type: CONST.CHAT_MESSAGE_TYPES.ROLL,
          roll: templateData.roll,
          speaker: data.message.speaker,
          content: html,
          whisper: rollMode !== "roll" ? ChatMessage.getWhisperRecipients("GM").filter(u => u.active) : undefined,
        };
        let cm = await ChatMessage.create(chat_data);
        cm?.render();
        return Promise.resolve();
      });
    }
  }

  html.find(".chat-button").on("click", (ev: MouseEvent) => {
    ev.stopPropagation();
    let element = ev.target as HTMLElement;
    runEncodedMacro($(element));
  });
});

Hooks.on("hotbarDrop", (_bar: any, data: any, slot: number) => {
  macros.onHotbarDrop(_bar, data, slot);
});

/**
 * Prompts users to install core data
 * Designed for use the first time you launch a new world
 */
async function promptInstallCoreData() {
  let version = core_update;
  let text = `
  <h2 style="text-align: center">WELCOME GAME MASTER</h2>
  <p style="text-align: center;margin-bottom: 1em">THIS IS YOUR <span class="horus--very--subtle">FIRST</span> TIME LAUNCHING</p>
  <p style="text-align: center;margin-bottom: 1em">WOULD YOU LIKE TO INSTALL <span class="horus--very--subtle">CORE</span> LANCER DATA <span class="horus--very--subtle">v${version}?</span></p>`;
  new Dialog(
    {
      title: `Install Core Data`,
      content: text,
      buttons: {
        yes: {
          label: "Yes",
          callback: async () => {
            await updateCore(version);
          },
        },
        close: {
          label: "No",
        },
      },
      default: "No",
    },
    {
      width: 700,
    }
  ).render(true);
}

function setupSheets() {
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
      EntryType.QUIRK,
      EntryType.ENVIRONMENT,
      EntryType.FACTION,
      EntryType.ORGANIZATION,
      EntryType.SITREP,
    ],
    makeDefault: true,
  });
  Items.registerSheet("lancer", LancerFrameSheet, { types: [EntryType.FRAME], makeDefault: true });
  Items.registerSheet("lancer", LancerLicenseSheet, { types: [EntryType.LICENSE], makeDefault: true });
  // Items.registerSheet("lancer", LancerNPCClassSheet, {
  Items.registerSheet("lancer", LancerItemSheet, {
    types: [EntryType.NPC_CLASS, EntryType.NPC_TEMPLATE],
    makeDefault: true,
  });
}

/**
 * Performs our version validation
 * Uses window.FEATURES to check theoretical Foundry compatibility with our features
 * Also performs system version checks
 */
async function versionCheck() {
  // Determine whether a system migration is required and feasible
  const currentVersion = game.settings.get(LANCER.sys_name, LANCER.setting_migration);

  // If it's 0 then it's a fresh install
  if (currentVersion === "0" || currentVersion === "") {
    await game.settings.set(LANCER.sys_name, LANCER.setting_migration, game.system.data.version);
    await promptInstallCoreData();
    return;
  }

  // Modify these constants to set which Lancer version numbers need and permit migration.
  const NEEDS_MIGRATION_VERSION = "0.9.0";
  const COMPATIBLE_MIGRATION_VERSION = "0.1.0";
  let needMigration = currentVersion ? compareVersions(currentVersion, NEEDS_MIGRATION_VERSION) : 1;

  // Check whether system has been updated since last run.
  if (compareVersions(currentVersion, game.system.data.version) != 0 && game.user!.isGM) {
    // Un-hide the welcome message
    await game.settings.set(LANCER.sys_name, LANCER.setting_welcome, false);

    if (needMigration <= 0) {
      if (currentVersion && compareVersions(currentVersion, COMPATIBLE_MIGRATION_VERSION) < 0) {
        // System version is too old for migration
        ui.notifications!.error(
          `Your LANCER system data is from too old a version and cannot be reliably migrated to the latest version. The process will be attempted, but errors may occur.`,
          { permanent: true }
        );
      }
      // Perform the migration
      await migrations.migrateWorld(true, false);
    }
    // Set the version for future migration and welcome message checking
    await game.settings.set(LANCER.sys_name, LANCER.setting_migration, game.system.data.version);
  }
}

async function sanityCheck() {
  const message = `<h1>DO NOT USE THIS VERSION ON AN EXISTING WORLD</h1>
<p>This version contains <i>vast</i> changes from the current stable release of LANCER, and does not contain <i>any</i>
safety or migration for existing world data. If this is an existing world that contains <i><b>ANY</b></i> data you
care about, <i class="horus--subtle"><b>DO NOT CONTINUE</b></i>.</p>

<p>This version should only be used on a fresh, empty world created just for
testing this beta. You must re-install the stable release of LANCER before running your regularly scheduled games.</p>

<p>With that said, welcome to LANCER v0.9.0, the closed beta test before v1.0.0 releases! Please kick the tires, explore
the new system, and send us your feedback! Bug reports can be submitted at 
<a href="https://github.com/Eranziel/foundryvtt-lancer/issues">our GitHub issues list</a>. We haven't kept a changelog,
because nearly everything has changed (sorry).</p>`;
  if (!game.settings.get(LANCER.sys_name, LANCER.setting_beta_warning)) {
    console.log(`${lp} Sanity check already done, continuing as normal.`);
    return;
  }
  console.log(`${lp} Performing sanity check.`);
  new Dialog(
    {
      title: `LANCER BETA v${game.system.data.version}`,
      content: message,
      buttons: {
        accept: {
          label: "This is a fresh world, I am safe to beta test here",
          callback: async () => {
            await game.settings.set(LANCER.sys_name, LANCER.setting_beta_warning, false);
            ui.notifications!.info("Beta test beginning momentarily! Page reloading in 3...");
            await sleep(1000);
            ui.notifications!.info("2...");
            await sleep(1000);
            ui.notifications!.info("1...");
            await sleep(1000);
            window.location.reload();
          },
        },
        cancel: {
          label: "TAKE ME BACK, I CARE ABOUT MY DATA",
          callback: async () => {
            await game.settings.set(LANCER.sys_name, LANCER.setting_beta_warning, true);
            game.logOut();
          },
        },
      },
      default: "cancel",
    },
    {
      width: 1000,
    }
  ).render(true);
}

function configureAmplify() {
  Auth.configure(aws);
  Storage.configure(aws);

  // if we have a login already, this is where we populate the pilot cache
  // no need to block on it; it can happen in the background
  // errors when we don't have a login already, which is normal behaviour
  populatePilotCache().catch(e => e);
}

async function showChangelog() {
  // Show welcome message if not hidden.
  if (!game.settings.get(LANCER.sys_name, LANCER.setting_welcome)) {
    let renderChangelog = (changelog: string) => {
      new Dialog(
        {
          title: `Welcome to LANCER v${game.system.data.version}`,
          content: WELCOME(changelog),
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
        },
        {
          width: 700,
        }
      ).render(true);
    };

    // Get an automatic changelog for our version
    let req = $.get(
      `https://raw.githubusercontent.com/Eranziel/foundryvtt-lancer/v${game.system.data.version}/CHANGELOG.md`
    );
    req.done((data, _status) => {
      // Regex magic to only grab the first 25 lines
      let r = /(?:[^\n]*\n){25}/;
      let trimmedChangelog = data.match(r)[0];

      // Grab the position of the last H1 and trim to that to ensure we split along version lines
      // But also set a min so we're keeping at least one version
      let lastH1Pos = trimmedChangelog.lastIndexOf("\n# ");
      if (lastH1Pos < 20) lastH1Pos = trimmedChangelog.length;

      trimmedChangelog = trimmedChangelog.substring(0, lastH1Pos);

      let changelog = marked(trimmedChangelog);

      renderChangelog(changelog);
    });

    req.fail((_data, _status) => {
      let errorText = `<h2>Error retrieving changelog</h2>`;

      renderChangelog(errorText);
    });
  }
}

function addSettingsButtons(_app: Application, html: HTMLElement) {
  const faqButton = $(`<button id="triggler-form" data-action="triggler">
            <i class="fas fa-robot"></i>LANCER Help
        </button>`);

  $(html).find("#settings-documentation").append(faqButton);

  faqButton.on("click", async () => {
    let helpContent = await renderTemplate("systems/lancer/templates/window/lancerHelp.hbs", {});

    new Dialog(
      {
        title: `LANCER Help`,
        content: helpContent,
        buttons: {
          close: {
            label: "Close",
          },
        },
        default: "Close",
      },
      {
        width: 600,
      }
    ).render(true);
  });
}
