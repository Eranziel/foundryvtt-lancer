/**
 * TypeScript entry file for Lancer on Foundry VTT.
 * Registers custom settings, sheets, and constants using the Foundry API.
 *
 * Author: Eranziel
 * Content License: LANCER is copyright 2019, Massif Press Inc.
 * Software License: GNU GPLv3
 */

// Import SCSS into our build
import "./lancer.scss";

// Import TypeScript modules
import { LANCER, STATUSES, WELCOME } from "./module/config";
import { LancerActor } from "./module/actor/lancer-actor";
import { LancerItem } from "./module/item/lancer-item";
import { populatePilotCache } from "./module/util/compcon";

import { action_type_selector } from "./module/helpers/npc";

import { LancerActionManager } from "./module/action/action-manager";

// Import applications
import { LancerPilotSheet, pilot_counters, all_mech_preview } from "./module/actor/pilot-sheet";
import { LancerNPCSheet } from "./module/actor/npc-sheet";
import { LancerDeployableSheet } from "./module/actor/deployable-sheet";
import { LancerMechSheet } from "./module/actor/mech-sheet";
import { LancerItemSheet } from "./module/item/item-sheet";
import { LancerFrameSheet } from "./module/item/frame-sheet";
import { LancerLicenseSheet } from "./module/item/license-sheet";
import { WeaponRangeTemplate } from "./module/pixi/weapon-range-template";

// Import helpers
import { preloadTemplates } from "./module/preload-templates";
import { getAutomationOptions, registerSettings } from "./module/settings";
import { compact_tag_list } from "./module/helpers/tags";
import * as migrations from "./module/world_migration";
import { addLCPManager, updateCore, core_update } from "./module/apps/lcp-manager";

// Import sliding HUD (used for accuracy/difficulty windows)
import * as slidingHUD from "./module/helpers/slidinghud";

// Import Machine Mind and helpers
import * as macros from "./module/macros";

// Import Tippy.js
import tippy from "tippy.js";
import "tippy.js/dist/tippy.css"; // optional for styling
tippy.setDefaultProps({ theme: "lancer-small", arrow: false, delay: [400, 200] });
// tippy.setDefaultProps({ theme: "lancer", arrow: false, delay: [400, 200], hideOnClick: false, trigger: "click"});

// Import node modules
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
  std_enum_select,
  saveCancelButtons,
} from "./module/helpers/commons";
import {
  weapon_size_selector,
  weapon_type_selector,
  range_editor,
  npc_attack_bonus_preview,
  npc_accuracy_preview,
  mech_loadout_weapon_slot,
  system_type_selector,
  npc_feature_preview,
  damage_editor,
  bonuses_display,
  pilot_armor_slot,
  pilot_weapon_refview,
  pilot_gear_refview,
  reserve_refview,
  license_ref,
  uses_control,
  buildCounterArrayHTML,
  loading_indicator,
  action_type_icon,
  npc_class_ref,
  npc_template_ref,
  generic_counter,
} from "./module/helpers/item";
import {
  action_button,
  clicker_num_input,
  clicker_stat_card,
  compact_stat_edit,
  compact_stat_view,
  deployer_slot,
  is_combatant,
  actor_flow_button,
  npc_stat_block_clicker_card,
  npc_tier_selector,
  overcharge_button,
  stat_edit_card,
  stat_edit_card_max,
  stat_rollable_card,
  stat_view_card,
  tech_flow_card,
  bond_answer_selector,
} from "./module/helpers/actor";
import type { HelperOptions } from "handlebars";
import {
  item_preview,
  simple_ref_slot,
  ref_portrait,
  item_preview_list,
  limited_uses_indicator,
  reserve_used_indicator,
} from "./module/helpers/refs";
import { mech_loadout, pilot_slot, frameView } from "./module/helpers/loadout";
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
import { applyCollapseListeners, initializeCollapses } from "./module/helpers/collapse";
import { handleCombatUpdate } from "./module/helpers/automation/combat";
import { handleActorExport, validForExport } from "./module/helpers/io";
import { runEncodedMacro } from "./module/macros";
import { LancerToken, LancerTokenDocument } from "./module/token";
import { applyGlobalDragListeners } from "./module/helpers/dragdrop";
import { gridDist } from "./module/helpers/automation/targeting";
import CompconLoginForm from "./module/helpers/compcon-login-form";
import { LancerCombat, LancerCombatant, LancerCombatTracker } from "lancer-initiative";
import { LancerCombatTrackerConfig } from "./module/helpers/lancer-initiative-config-form";
import { MechModel } from "./module/models/actors/mech";
import { MechSystemModel } from "./module/models/items/mech_system";
import { handleRenderCombatCarousel } from "./module/helpers/combat-carousel";
import { measureDistances } from "./module/grid";
import { EntryType } from "./module/enums";
import { FrameModel } from "./module/models/items/frame";
import { PilotModel } from "./module/models/actors/pilot";
import { effect_categories_view, effect_view } from "./module/helpers/effects";
import { LancerActiveEffect } from "./module/effects/lancer-active-effect";
import { MechWeaponModel } from "./module/models/items/mech_weapon";
import { CoreBonusModel } from "./module/models/items/core_bonus";
import { NpcModel } from "./module/models/actors/npc";
import { DeployableModel } from "./module/models/actors/deployable";
import { TalentModel } from "./module/models/items/talent";
import { fulfillImportActor } from "./module/util/requests";
import { lookupOwnedDeployables } from "./module/util/lid";
import { PilotArmorModel } from "./module/models/items/pilot_armor";
import { PilotGearModel } from "./module/models/items/pilot_gear";
import { PilotWeaponModel } from "./module/models/items/pilot_weapon";
import { importCC } from "./module/actor/import";

import "./module/helpers/text-enrichers";
import { fromLid, fromLidSync } from "./module/helpers/from-lid";
import { SkillModel } from "./module/models/items/skill";
import { LicenseModel } from "./module/models/items/license";
import { NpcTemplateModel } from "./module/models/items/npc_template";
import { NpcClassModel } from "./module/models/items/npc_class";
import { NpcFeatureModel } from "./module/models/items/npc_feature";
import { LancerNPCClassSheet } from "./module/item/npc-class-sheet";
import { WeaponModModel } from "./module/models/items/weapon_mod";
import { ReserveModel } from "./module/models/items/reserve";
import { StatusModel } from "./module/models/items/status";
import { BondModel } from "./module/models/items/bond";

const lp = LANCER.log_prefix;

window.addEventListener("unhandledrejection", function (event) {
  ui.notifications?.error(event.reason); // TODO Remove
  console.error("Unhandled rejection (promise: ", event.promise, ", reason: ", event.reason, ").");
});

/* ------------------------------------ */
/* Initialize system                    */
/* ------------------------------------ */
Hooks.once("init", async function () {
  console.log(`Initializing LANCER RPG System ${LANCER.ASCII}`);

  // @ts-expect-error Use the v11+ active effect logic - effects never transfer from an item. Critical to how we handle effects
  CONFIG.ActiveEffect.legacyTransferral = false;

  // Add this schema for each document type.
  // game.documentTypes.Item.forEach(type => CONFIG.Item.dataModels[type] = MyItemModel);
  // @ts-expect-error
  CONFIG.Item.dataModels[EntryType.PILOT_ARMOR] = PilotArmorModel;
  // @ts-expect-error
  CONFIG.Item.dataModels[EntryType.PILOT_GEAR] = PilotGearModel;
  // @ts-expect-error
  CONFIG.Item.dataModels[EntryType.PILOT_WEAPON] = PilotWeaponModel;
  // @ts-expect-error
  CONFIG.Item.dataModels[EntryType.CORE_BONUS] = CoreBonusModel;
  // @ts-expect-error
  CONFIG.Item.dataModels[EntryType.FRAME] = FrameModel;
  // @ts-expect-error
  CONFIG.Item.dataModels[EntryType.LICENSE] = LicenseModel;
  // @ts-expect-error
  CONFIG.Item.dataModels[EntryType.MECH_WEAPON] = MechWeaponModel;
  // @ts-expect-error
  CONFIG.Item.dataModels[EntryType.MECH_SYSTEM] = MechSystemModel;
  // @ts-expect-error
  CONFIG.Item.dataModels[EntryType.WEAPON_MOD] = WeaponModModel;
  // @ts-expect-error
  CONFIG.Item.dataModels[EntryType.RESERVE] = ReserveModel;
  // @ts-expect-error
  CONFIG.Item.dataModels[EntryType.SKILL] = SkillModel;
  // @ts-expect-error
  CONFIG.Item.dataModels[EntryType.STATUS] = StatusModel;
  // @ts-expect-error
  CONFIG.Item.dataModels[EntryType.TALENT] = TalentModel;
  // @ts-expect-error
  CONFIG.Item.dataModels[EntryType.BOND] = BondModel;
  // @ts-expect-error
  CONFIG.Item.dataModels[EntryType.NPC_CLASS] = NpcClassModel;
  // @ts-expect-error
  CONFIG.Item.dataModels[EntryType.NPC_TEMPLATE] = NpcTemplateModel;
  // @ts-expect-error
  CONFIG.Item.dataModels[EntryType.NPC_FEATURE] = NpcFeatureModel;

  // @ts-expect-error
  CONFIG.Actor.dataModels[EntryType.MECH] = MechModel;
  // @ts-expect-error
  CONFIG.Actor.dataModels[EntryType.PILOT] = PilotModel;
  // @ts-expect-error
  CONFIG.Actor.dataModels[EntryType.NPC] = NpcModel;
  // @ts-expect-error
  CONFIG.Actor.dataModels[EntryType.DEPLOYABLE] = DeployableModel;

  // Configure indexes
  // @ts-expect-error
  CONFIG.Item.compendiumIndexFields = ["system.lid"];
  // @ts-expect-error
  CONFIG.Actor.compendiumIndexFields = ["system.lid"];

  // Register custom system settings
  registerSettings();

  // no need to block on amplify - logging into comp/con and populating the cache
  // it can happen in the background
  configureAmplify();

  // Assign custom classes and constants here
  // Create a Lancer namespace within the game global
  game.lancer = {
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
    helpers: {
      gridDist,
      lookupOwnedDeployables,
    },
    prepareItemMacro: macros.prepareItemMacro,
    prepareStatMacro: macros.prepareStatMacro,
    prepareTalentMacro: macros.prepareTalentMacro,
    prepareTextMacro: macros.prepareTextMacro,
    // prepareTechMacro: macros.prepareTechMacro,
    prepareCoreActiveMacro: macros.prepareCoreActiveMacro,
    prepareCorePassiveMacro: macros.prepareCorePassiveMacro,
    prepareFrameTraitMacro: macros.prepareFrameTraitMacro,
    prepareOverchargeMacro: macros.prepareOverchargeMacro,
    prepareOverheatMacro: macros.prepareOverheatMacro,
    beginStructureFlow: macros.beginStructureFlow,
    prepareActivationMacro: macros.prepareActivationMacro,
    // prepareAttackMacro: macros.prepareAttackMacro,
    beginSecondaryStructureFlow: macros.beginSecondaryStructureFlow,
    // rollTechMacro: macros.rollTechMacro,
    // rollAttackMacro: macros.rollAttackMacro,
    fullRepairMacro: macros.fullRepairMacro,
    stabilizeMacro: macros.stabilizeMacro,
    importActor: fulfillImportActor,
    targetsFromTemplate: macros.targetsFromTemplate,
    migrations: migrations,
    getAutomationOptions: getAutomationOptions,
    fromLid: fromLid,
    fromLidSync: fromLidSync,
  };

  // Record Configuration Values
  CONFIG.Actor.documentClass = LancerActor;
  CONFIG.Item.documentClass = LancerItem;
  CONFIG.ActiveEffect.documentClass = LancerActiveEffect;
  CONFIG.Token.documentClass = LancerTokenDocument;
  CONFIG.Token.objectClass = LancerToken;
  CONFIG.Combat.documentClass = LancerCombat;
  CONFIG.Combatant.documentClass = LancerCombatant;
  // @ts-expect-error TODO: fix up Options vs ApplicationOptions once we have more modern types
  CONFIG.ui.combat = LancerCombatTracker;

  // Set up default system status icons
  LancerActiveEffect.populateConfig(false);

  // Register Web Components
  customElements.define("card-clipped", class LancerClippedCard extends HTMLDivElement {}, {
    extends: "div",
  });

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

  Handlebars.registerHelper("arr", function (...args) {
    return args;
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

  Handlebars.registerPartial("dialog-save-buttons", saveCancelButtons());

  // For debugging
  Handlebars.registerHelper("debug_each", function (it: any, block: any) {
    // if(typeof a == 'function')
    // a = a.call(this);
    console.debug(it);
    var s = "";
    for (let x of it) s += block(x);
    return s;
  });
  Handlebars.registerHelper("stringify", (x: any) => JSON.stringify(x));

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
  Handlebars.registerHelper("npc-clicker-statblock-card", npc_stat_block_clicker_card);
  Handlebars.registerHelper("npc-clicker-statarr-card", npc_stat_block_clicker_card);
  Handlebars.registerHelper("std-string-input", std_string_input);
  Handlebars.registerHelper("std-text-input", std_text_input);
  Handlebars.registerHelper("std-password-input", std_password_input);
  Handlebars.registerHelper("std-num-input", std_num_input);
  Handlebars.registerHelper("std-checkbox", std_checkbox);
  Handlebars.registerHelper("std-select", std_enum_select);
  Handlebars.registerHelper("action-button", action_button);
  Handlebars.registerHelper("flow-button", actor_flow_button);
  Handlebars.registerHelper("tech-flow-card", tech_flow_card);

  // ------------------------------------------------------------------------
  // Tag helpers
  Handlebars.registerHelper("is-tagged", function (item: LancerItem) {
    return item.getTags() != null;
  });

  Handlebars.registerHelper("is-limited", function (item: LancerItem) {
    return item.isLimited();
  });

  Handlebars.registerHelper("is-loading", function (item: LancerItem) {
    return item.isLoading();
  });

  // ------------------------------------------------------------------------
  // Refs
  Handlebars.registerHelper("simple-ref", simple_ref_slot);
  Handlebars.registerHelper("item-preview", item_preview);
  Handlebars.registerHelper("item-preview-list", item_preview_list);
  Handlebars.registerHelper("pilot-slot", pilot_slot);
  Handlebars.registerHelper("deployer-slot", deployer_slot); // Can be pilot, npc, or mech. Preferably mech, lol
  Handlebars.registerHelper("ref-portrait-img", ref_portrait);

  // ------------------------------------------------------------------------
  // Pilot stuff
  Handlebars.registerHelper("pilot-armor-slot", pilot_armor_slot);
  Handlebars.registerHelper("pilot-weapon-slot", pilot_weapon_refview);
  Handlebars.registerHelper("pilot-gear-slot", pilot_gear_refview);
  Handlebars.registerHelper("reserve-slot", reserve_refview);
  Handlebars.registerHelper("generic-counter", generic_counter);
  Handlebars.registerHelper("bond-answer-selector", bond_answer_selector);
  Handlebars.registerHelper("counter-array", buildCounterArrayHTML);
  Handlebars.registerHelper("pilot-counters", pilot_counters);
  Handlebars.registerHelper("all-mech-preview", all_mech_preview);

  // ------------------------------------------------------------------------
  // Effects
  Handlebars.registerHelper("effect-categories-view", effect_categories_view);
  Handlebars.registerHelper("effect-view", effect_view);

  // ------------------------------------------------------------------------
  // Tags
  // Handlebars.registerHelper("compact-tag", renderCompactTag);
  // Handlebars.registerPartial("tag-list", compactTagList);
  Handlebars.registerHelper("tag-list", compact_tag_list);
  // Handlebars.registerHelper("chunky-tag", renderChunkyTag);
  // Handlebars.registerHelper("full-tag", renderFullTag);

  // ------------------------------------------------------------------------
  // License data
  // Handlebars.registerHelper("ref-manufacturer", manufacturer_ref);
  Handlebars.registerHelper("ref-license", license_ref);

  // ------------------------------------------------------------------------
  // Frame/Class/Template data

  // ------------------------------------------------------------------------
  // Bonuses
  Handlebars.registerHelper("bonuses-view", bonuses_display);
  Handlebars.registerHelper("popout-editor-button", popout_editor_button);

  // ------------------------------------------------------------------------
  // Weapons
  Handlebars.registerHelper("wpn-size-sel", weapon_size_selector);
  Handlebars.registerHelper("wpn-type-sel", weapon_type_selector);
  Handlebars.registerHelper("wpn-range-sel", range_editor);
  Handlebars.registerHelper("wpn-damage-sel", damage_editor);
  Handlebars.registerHelper("npcf-atk", npc_attack_bonus_preview);
  Handlebars.registerHelper("npcf-acc", npc_accuracy_preview);
  Handlebars.registerHelper("mech-weapon-preview", mech_loadout_weapon_slot);

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
  Handlebars.registerHelper("limited-uses-indicator", limited_uses_indicator);
  Handlebars.registerHelper("reserve-used-indicator", reserve_used_indicator);
  Handlebars.registerHelper("loading-indicator", loading_indicator);

  // ------------------------------------------------------------------------
  // Frames
  // Handlebars.registerPartial("core-system", core_system_preview);

  // ------------------------------------------------------------------------
  // Pilot components
  Handlebars.registerHelper("overcharge-button", overcharge_button);

  // ------------------------------------------------------------------------
  // Mech components
  Handlebars.registerHelper("mech-loadout", mech_loadout);
  Handlebars.registerHelper("mech-frame", frameView);

  // ------------------------------------------------------------------------
  // NPC components
  Handlebars.registerHelper("tier-selector", npc_tier_selector);
  Handlebars.registerHelper("npc-feat-preview", npc_feature_preview);
  Handlebars.registerHelper("ref-npc-class", npc_class_ref);
  Handlebars.registerHelper("ref-npc-template", npc_template_ref);

  // Stat rollers

  // ------------------------------------------------------------------------
  // Actor helpers
  Handlebars.registerHelper("is-combatant", is_combatant);

  // ------------------------------------------------------------------------
  // Sliding HUD Zone, including accuracy/difficulty window
  Hooks.on("renderHeadsUpDisplay", slidingHUD.attach);
  // let openingBasicAttackLock = false;
  // Hooks.on("targetToken", (user: User, _token: Token, isNewTarget: boolean) => {
  //   if (user.isSelf && isNewTarget && !openingBasicAttackLock) {
  //     // this only works because openBasicAttack is a promise and runs on a future tick
  //     openingBasicAttackLock = true;
  //     macros.openBasicAttack().finally(() => {
  //       openingBasicAttackLock = false;
  //     });
  //   }
  // });

  Hooks.on("renderCombatCarousel", handleRenderCombatCarousel);
});

/* ------------------------------------ */
/* When ready                           */
/* ------------------------------------ */
// Make an awaitable for when this shit is done
Hooks.once("ready", async function () {
  // Register sheet application classes
  setupSheets();

  Hooks.on("updateCombat", handleCombatUpdate);

  console.log(`${lp} Foundry ready, doing final checks.`);

  await doMigration();

  await showChangelog();

  applyGlobalDragListeners();

  game.action_manager = new LancerActionManager();
  game.action_manager!.init();

  // Set up compendium-based statuses icons
  LancerActiveEffect.populateConfig(true);
  Hooks.on("updateCompendium", collection => {
    if (collection?.metadata?.id == `world.${EntryType.STATUS}`) LancerActiveEffect.populateConfig(true);
  });
});

// Set up Dice So Nice to icrementally show attacks then damge rolls
Hooks.once("ready", () => {
  if (game.modules.get("dice-so-nice")?.active && !game.settings.get(game.system.id, LANCER.setting_dsn_setup)) {
    console.log(`${lp} First login setup for Dice So Nice`);
    game.settings.set("dice-so-nice", "enabledSimultaneousRollForMessage", false);
    game.settings.set(game.system.id, LANCER.setting_dsn_setup, true);
  }
});

Hooks.once("canvasInit", () => {
  SquareGrid.prototype.measureDistances = measureDistances;
});

// Action Manager hooks.
Hooks.on("controlToken", () => {
  game.action_manager?.update();
});
Hooks.on("updateToken", (_scene: Scene, _token: Token, diff: any, _options: any, _idUser: any) => {
  // If it's an X or Y change assume the token is just moving.
  if (diff.hasOwnProperty("y") || diff.hasOwnProperty("x")) return;
  game.action_manager?.update();
});
Hooks.on("updateActor", (_actor: Actor) => {
  game.action_manager?.update();
});
Hooks.on("closeSettingsConfig", () => {
  game.action_manager?.updateConfig();
});
Hooks.on("getSceneNavigationContext", async () => {
  game.action_manager && (await game.action_manager!.reset());
});
Hooks.on("createCombat", (_actor: Actor) => {
  game.action_manager?.update();
});
Hooks.on("deleteCombat", (_actor: Actor) => {
  game.action_manager?.update();
});
Hooks.on("updateCombat", (_combat: Combat, changes: DeepPartial<Combat["data"]>) => {
  if (getAutomationOptions().remove_templates && "turn" in changes && game.user?.isGM) {
    canvas.templates?.placeables.forEach(t => {
      if (t.document.getFlag("lancer", "isAttack")) t.document.delete();
    });
  }
  // This can be removed in v10
  if (foundry.utils.hasProperty(changes, "turn")) {
    // @ts-expect-error Just blindy try
    ui.combatCarousel?.render();
  }
});
//

// Create sidebar button to import LCP
Hooks.on("renderSidebarTab", async (app: Application, html: HTMLElement) => {
  addLCPManager(app, html);
});

// TODO: keep or remove?
Hooks.on("getActorDirectoryEntryContext", (_html: JQuery<HTMLElement>, ctxOptions: ContextMenuEntry[]) => {
  const editMigratePilot: ContextMenuEntry = {
    name: "Migrate Pilot",
    icon: '<i class="fas fa-user-circle"></i>',
    condition: (li: any) => {
      const actor = game.actors?.get(li.data("documentId"));
      return actor?.type === "pilot" && validForExport(actor);
    },
    callback: (li: any) => {
      const actor = game.actors?.get(li.data("documentId"));
      // @ts-ignore Migrations?
      const dump = handleActorExport(actor, false);
      if (dump && actor?.is_pilot()) importCC(actor, dump as any, true);
    },
  };

  const editExportPilot: ContextMenuEntry = {
    name: "Export Pilot",
    icon: '<i class="fas fa-user-circle"></i>',
    condition: (li: any) => {
      const actor = game.actors?.get(li.data("documentId"));
      return actor?.type === "pilot" && validForExport(actor);
    },
    callback: (li: any) => {
      const actor = game.actors?.get(li.data("documentId"));
      // @ts-ignore Migrations?
      handleActorExport(actor, true);
    },
  };

  ctxOptions.unshift(editMigratePilot);
  ctxOptions.unshift(editExportPilot);
});

// For the settings tab
Hooks.on("renderSettings", async (app: Application, html: HTMLElement) => {
  addSettingsButtons(app, html);
});
Hooks.on("renderCombatTracker", (...[_app, html]: Parameters<Hooks.RenderApplication<CombatTracker>>) => {
  html
    .find(".combat-settings")
    .off("click")
    .on("click", ev => {
      ev.preventDefault();
      new LancerCombatTrackerConfig(undefined, {}).render(true);
    });
});

Hooks.on("renderChatMessage", async (cm: ChatMessage, html: JQuery, data: any) => {
  // Reapply listeners.
  initializeCollapses(html);
  applyCollapseListeners(html);

  html.find(".chat-button").on("click", ev => {
    let elt = $(ev.target).closest("[data-macro]")[0];
    if (elt?.dataset.macro) {
      ev.stopPropagation();
      runEncodedMacro(elt).then(_ => {
        if (elt.classList.contains("self-destruct")) {
          cm.delete();
        }
      });
      return true;
    }
    return false;
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
      EntryType.BOND,
      EntryType.CORE_BONUS,
      EntryType.RESERVE,
      EntryType.STATUS,
      EntryType.PILOT_ARMOR,
      EntryType.PILOT_WEAPON,
      EntryType.PILOT_GEAR,
      EntryType.MECH_SYSTEM,
      EntryType.MECH_WEAPON,
      EntryType.WEAPON_MOD,
      EntryType.NPC_FEATURE,
      EntryType.ORGANIZATION,
    ],
    makeDefault: true,
  });
  Items.registerSheet("lancer", LancerFrameSheet, { types: [EntryType.FRAME], makeDefault: true });
  Items.registerSheet("lancer", LancerLicenseSheet, { types: [EntryType.LICENSE], makeDefault: true });
  Items.registerSheet("lancer", LancerNPCClassSheet, {
    types: [EntryType.NPC_CLASS, EntryType.NPC_TEMPLATE],
    makeDefault: true,
  });
}

/**
 * Check whether the world needs any migration.
 * @return True if migration is required
 */
async function versionCheck(): Promise<"yes" | "no" | "too_old"> {
  // Determine whether a system migration is required and feasible
  const currentVersion = game.settings.get(game.system.id, LANCER.setting_migration_version);

  // If it's 0 then it's a fresh install
  if (currentVersion === "0" || !currentVersion) {
    // @ts-expect-error Should be fixed with v10 types
    game.settings.set(game.system.id, LANCER.setting_migration_version, game.system.version);
    await promptInstallCoreData();
    return "no";
  }

  // Check if its before new rolling migration system was integrated
  if (foundry.utils.isNewerVersion("1.5.0", currentVersion)) {
    return "too_old";
  }

  // Otherwise return if version is even slightly out of date
  // @ts-expect-error version property is missing
  return foundry.utils.isNewerVersion(game.system.version, currentVersion) ? "yes" : "no";
}

/**
 * Performs our version validation and migration
 * Uses window.FEATURES to check theoretical Foundry compatibility with our features
 * Also performs system version checks
 */
async function doMigration() {
  // Determine whether a system migration  is needed
  let needs_migrate = await versionCheck();

  if (needs_migrate == "too_old") {
    // System version is too old for migration
    ui.notifications!.error(
      `Your LANCER system data is from too old a version (${game.settings.get(
        game.system.id,
        LANCER.setting_migration_version
      )}) and cannot be reliably migrated to the latest version. Please install and migrate to version 1.5.0 before attempting this migration`,
      { permanent: true }
    );
    return;
  } else if (needs_migrate == "yes" && game.user!.isGM) {
    // Un-hide the welcome message
    await game.settings.set(game.system.id, LANCER.setting_welcome, false);
    await migrations.migrateWorld();
  } else if (needs_migrate == "yes") {
    ui.notifications!.warn(
      "Your GM needs to migrate this world. Please do not attempt to play the game while migrations are pending.",
      { permanent: true }
    );
  }
}

async function configureAmplify() {
  // Pull in the parts of AWS Amplify we need
  const aws = (await import("./aws-exports")).default as {
    aws_cognito_identity_pool_id: string;
  };
  const { Auth } = await import("@aws-amplify/auth");
  const { Storage } = await import("@aws-amplify/storage");

  Auth.configure(aws);
  Storage.configure(aws);

  // if we have a login already, this is where we populate the pilot cache
  try {
    return populatePilotCache();
  } catch {
    // the error is just that we don't have a login
    // noop
  }
}

async function showChangelog() {
  // Show welcome message if not hidden.
  if (!game.settings.get(game.system.id, LANCER.setting_welcome)) {
    let renderChangelog = (changelog: string) => {
      new Dialog(
        {
          // @ts-expect-error Should be fixed with v10 types
          title: `Welcome to LANCER v${game.system.version}`,
          content: WELCOME(changelog),
          buttons: {
            dont_show: {
              label: "Do Not Show Again",
              callback: async () => {
                await game.settings.set(game.system.id, LANCER.setting_welcome, true);
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
      // @ts-expect-error Should be fixed with v10 types
      `https://raw.githubusercontent.com/Eranziel/foundryvtt-lancer/v${game.system.version}/CHANGELOG.md`
    );
    req.done(async (data, _status) => {
      // Regex magic to only grab the first 25 lines
      let r = /(?:[^\n]*\n){25}/;
      let trimmedChangelog = data.match(r)[0];

      // Grab the position of the last H1 and trim to that to ensure we split along version lines
      // But also set a min so we're keeping at least one version
      let lastH1Pos = trimmedChangelog.lastIndexOf("\n# ");
      if (lastH1Pos < 20) lastH1Pos = trimmedChangelog.length;

      trimmedChangelog = trimmedChangelog.substring(0, lastH1Pos);

      let marked = await import("marked");
      let changelog = marked.parse(trimmedChangelog);

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

  const loginButton = $(`<button id="triggler-form" data-action="triggler">
            <i class="mdi mdi-cloud-sync-outline "></i>COMP/CON Login
          </button>`);

  $(html).find("#settings-documentation").append(faqButton);
  $(html).find("#settings-game").prepend(loginButton);

  loginButton.on("click", async () => {
    const app = new CompconLoginForm({});
    return app.render(true);
  });

  faqButton.on("click", async () => {
    let helpContent = await renderTemplate(`systems/${game.system.id}/templates/window/lancerHelp.hbs`, {});

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
