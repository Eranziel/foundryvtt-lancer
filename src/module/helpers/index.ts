import type { HelperOptions } from "handlebars";
import { LancerItem } from "../item/lancer-item";
// TODO: these two should move into some file in the helpers folder
import { allMechPreview, pilotCounters } from "../actor/pilot-sheet";
// Import all the helpers from this folder
import {
  resolveHelperDotpath,
  popout_editor_button,
  safe_html_helper,
  large_textbox_card,
  std_text_input,
  std_password_input,
  std_num_input,
  std_checkbox,
  std_enum_select,
  saveCancelButtons,
  lancerDiceRoll,
} from "./commons";
import {
  weaponSizeSelector,
  weaponTypeSelector,
  rangeEditor,
  npcAttackBonusView,
  npcAccuracyView,
  mechLoadoutWeaponSlot,
  systemTypeSelector,
  npcFeatureView,
  damageEditor,
  bonusesDisplay,
  pilotArmorSlot,
  pilotWeaponRefview,
  pilotGearRefview,
  reserveRefView,
  licenseRefView,
  usesControl,
  buildCounterArrayHTML,
  actionTypeIcon,
  npcClassRefView,
  npcTemplateRefView,
  genericCounter,
  bondPower,
  buildCounterHTML,
} from "./item";
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
  overchargeButton,
  stat_edit_card,
  stat_edit_card_max,
  stat_rollable_card,
  stat_view_card,
  tech_flow_card,
  bond_answer_selector,
  bond_minor_ideal_selector,
  npc_stat_array_clicker_card,
} from "./actor";
import {
  itemPreview,
  simple_ref_slot,
  refPortrait,
  lidItemList,
  limitedUsesIndicator,
  reserveUsesIndicator,
  loadingIndicator,
} from "./refs";
import { mechLoadout, pilotSlot, frameView } from "./loadout";
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
  item_edit_checkboxes_object,
} from "./item-editors";
import { effect_categories_view, effect_view } from "./effects";
import { compactTagListHBS, itemEditTags } from "./tags";
import { actionTypeSelector } from "./npc";
import { miniProfile } from "./chat";

export function registerHandlebarsHelpers() {
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

  // concat, to concatenate strs. Can take any number of args. Last is omitted (as it is just a handlebars ref object)
  Handlebars.registerHelper("concat", function (...values: any[]) {
    return values.slice(0, values.length - 1).join("");
  });

  // rp, to resolve path values strs. Helps use effectively half as many arguments for many helpers/partials
  // Using this, {{{rp path}}} {{path}} would show the value at path, and path, respectively. No need to pass both!
  Handlebars.registerHelper("rp", function (path: string, options: HelperOptions) {
    return resolveHelperDotpath(options, path);
  });

  // get-set, to resolve situations wherein we read and write to the same path via "value" and "name" element properties
  Handlebars.registerHelper("getset", function (path: string, options: HelperOptions) {
    let value = resolveHelperDotpath(options, path);
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
  Handlebars.registerHelper("lancer-dice-roll", lancerDiceRoll);
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
  Handlebars.registerHelper("npc-clicker-statarr-card", npc_stat_array_clicker_card);
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
  Handlebars.registerHelper("item-preview", itemPreview);
  Handlebars.registerHelper("lid-item-list", lidItemList);
  Handlebars.registerHelper("pilot-slot", pilotSlot);
  Handlebars.registerHelper("deployer-slot", deployer_slot); // Can be pilot, npc, or mech. Preferably mech, lol
  Handlebars.registerHelper("ref-portrait-img", refPortrait);

  // ------------------------------------------------------------------------
  // Pilot stuff
  Handlebars.registerHelper("pilot-armor-slot", pilotArmorSlot);
  Handlebars.registerHelper("pilot-weapon-slot", pilotWeaponRefview);
  Handlebars.registerHelper("pilot-gear-slot", pilotGearRefview);
  Handlebars.registerHelper("reserve-slot", reserveRefView);
  Handlebars.registerHelper("generic-counter", genericCounter);
  Handlebars.registerHelper("bond-answer-selector", bond_answer_selector);
  Handlebars.registerHelper("bond-ideal-selector", bond_minor_ideal_selector);
  Handlebars.registerHelper("bond-power", bondPower);
  Handlebars.registerHelper("counter", buildCounterHTML);
  Handlebars.registerHelper("counter-array", buildCounterArrayHTML);
  Handlebars.registerHelper("pilot-counters", pilotCounters);
  Handlebars.registerHelper("all-mech-preview", allMechPreview);

  // ------------------------------------------------------------------------
  // Effects
  Handlebars.registerHelper("effect-categories-view", effect_categories_view);
  Handlebars.registerHelper("effect-view", effect_view);

  // ------------------------------------------------------------------------
  // Tags
  Handlebars.registerHelper("tag-list", compactTagListHBS);
  Handlebars.registerHelper("item-edit-arrayed-tags", itemEditTags);

  // ------------------------------------------------------------------------
  // License data
  // Handlebars.registerHelper("ref-manufacturer", manufacturer_ref);
  Handlebars.registerHelper("ref-license", licenseRefView);

  // ------------------------------------------------------------------------
  // Frame/Class/Template data

  // ------------------------------------------------------------------------
  // Bonuses
  Handlebars.registerHelper("bonuses-view", bonusesDisplay);
  Handlebars.registerHelper("popout-editor-button", popout_editor_button);

  // ------------------------------------------------------------------------
  // Weapons
  Handlebars.registerHelper("wpn-size-sel", weaponSizeSelector);
  Handlebars.registerHelper("wpn-type-sel", weaponTypeSelector);
  Handlebars.registerHelper("wpn-range-sel", rangeEditor);
  Handlebars.registerHelper("wpn-damage-sel", damageEditor);
  Handlebars.registerHelper("npcf-atk", npcAttackBonusView);
  Handlebars.registerHelper("npcf-acc", npcAccuracyView);
  Handlebars.registerHelper("mech-weapon-preview", mechLoadoutWeaponSlot);

  // ------------------------------------------------------------------------
  // Systems
  Handlebars.registerHelper("sys-type-sel", systemTypeSelector);
  Handlebars.registerHelper("uses-ctrl", usesControl);
  Handlebars.registerHelper("act-icon", actionTypeIcon);
  Handlebars.registerHelper("act-type-sel", actionTypeSelector);

  // ------------------------------------------------------------------------
  // Item-level helpers for editing
  //   - Arrayed items
  Handlebars.registerHelper("item-edit-arrayed-actions", item_edit_arrayed_actions);
  Handlebars.registerHelper("item-edit-arrayed-damage", item_edit_arrayed_damage);
  Handlebars.registerHelper("item-edit-arrayed-range", item_edit_arrayed_range);
  Handlebars.registerHelper("item-edit-arrayed-enum", item_edit_arrayed_enum);
  Handlebars.registerHelper("item-edit-checkboxes-object", item_edit_checkboxes_object);
  Handlebars.registerHelper("item-edit-arrayed-bonuses", item_edit_arrayed_bonuses);
  Handlebars.registerHelper("item-edit-arrayed-counters", item_edit_arrayed_counters);
  Handlebars.registerHelper("item-edit-arrayed-deployables", item_edit_arrayed_deployables);
  Handlebars.registerHelper("item-edit-arrayed-synergies", item_edit_arrayed_synergies);
  Handlebars.registerHelper("item-edit-arrayed-integrated", item_edit_arrayed_integrated);
  // A single enum-based selector.
  // Which is just a wrapper for std_enum_select but we can pass in a string and resolve it
  Handlebars.registerHelper("item-edit-enum", item_edit_enum);
  //   - Standalone items
  Handlebars.registerHelper("item-edit-effect", item_edit_effect);
  Handlebars.registerHelper("item-edit-license", item_edit_license);
  Handlebars.registerHelper("item-edit-sp", item_edit_sp);
  Handlebars.registerHelper("item-edit-uses", item_edit_uses);
  Handlebars.registerHelper("limited-uses-indicator", limitedUsesIndicator);
  Handlebars.registerHelper("reserve-used-indicator", reserveUsesIndicator);
  Handlebars.registerHelper("loading-indicator", loadingIndicator);

  // ------------------------------------------------------------------------
  // Frames
  // Handlebars.registerPartial("core-system", core_system_preview);

  // ------------------------------------------------------------------------
  // Pilot components
  Handlebars.registerHelper("overcharge-button", overchargeButton);

  // ------------------------------------------------------------------------
  // Mech components
  Handlebars.registerHelper("mech-loadout", mechLoadout);
  Handlebars.registerHelper("mech-frame", frameView);

  // ------------------------------------------------------------------------
  // NPC components
  Handlebars.registerHelper("tier-selector", npc_tier_selector);
  Handlebars.registerHelper("npc-feat-preview", npcFeatureView);
  Handlebars.registerHelper("ref-npc-class", npcClassRefView);
  Handlebars.registerHelper("ref-npc-template", npcTemplateRefView);

  // Stat rollers

  // ------------------------------------------------------------------------
  // Actor helpers
  Handlebars.registerHelper("is-combatant", is_combatant);

  // ------------------------------------------------------------------------
  // Chat helpers
  Handlebars.registerHelper("mini-profile", miniProfile);
}
