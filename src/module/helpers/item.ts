/* ------------------------------------ */
/* Handlebars Helpers                    */
/* ------------------------------------ */

import type { HelperOptions } from "handlebars";
import type { MechWeapon, TagInstance } from "machine-mind";
import {
  Action,
  ActivationType,
  Bonus,
  Counter,
  Damage,
  DamageType,
  Deployable,
  EntryType,
  FittingSize,
  funcs,
  License,
  Manufacturer,
  Mech,
  MechSystem,
  MechWeaponProfile,
  RegEntry,
  NpcFeature,
  PilotArmor,
  PilotGear,
  PilotWeapon,
  Range,
  RangeType,
  SystemType,
  WeaponMod,
  WeaponSize,
  WeaponType,
} from "machine-mind";
import { BonusEditDialog } from "../apps/bonus-editor";
import { TypeIcon } from "../config";
import {
  npc_reaction_effect_preview,
  npc_system_effect_preview,
  npc_tech_effect_preview,
  npc_trait_effect_preview,
  npc_weapon_effect_preview,
} from "./npc";
import { compact_tag_list } from "./tags";
import {
  array_path_edit,
  effect_box,
  ext_helper_hash,
  format_dotpath,
  IconFactory,
  inc_if,
  resolve_dotpath,
  resolve_helper_dotpath,
  sp_display,
  std_checkbox,
  std_enum_select,
  std_string_input,
  std_x_of_y,
  tippy_context_menu,
} from "./commons";
import { limited_chip_HTML, ref_commons, ref_params, resolve_ref_element } from "./refs";
import { ActivationOptions, ChipIcons } from "../enums";
import type { LancerActorSheetData, LancerItemSheetData, LancerMacroData } from "../interfaces";
import { encodeMacroData } from "../macros";
import { is_limited, is_loading } from "machine-mind/dist/classes/mech/EquipUtil";
import type { CollapseRegistry } from "./loadout";
import { uuid4 } from "./collapse";
import { promptText } from "../apps/simple-prompt";
import { CounterEditForm } from "../apps/counter-editor";
import { FoundryFlagData } from "../mm-util/foundry-reg";
import { is_reg_pilot } from "../actor/lancer-actor";

/**
 * Handlebars helper for weapon size selector
 */
export function weapon_size_selector(path: string, helper: HelperOptions) {
  if (!helper.hash["default"]) {
    helper.hash["default"] = WeaponSize.Main;
  }
  return std_enum_select(path, WeaponSize, helper);
}

/**
 * Handlebars helper for weapon type selector. First parameter is the existing selection.
 */
export function weapon_type_selector(path: string, helper: HelperOptions) {
  if (!helper.hash["default"]) {
    helper.hash["default"] = WeaponType.Rifle;
  }
  return std_enum_select(path, WeaponType, helper);
}

/**
 * Handlebars helper for range type/value editing
 * Supply with path to Range, and any args that you'd like passed down to the standard input editors, as well as
 */
export function range_editor(path: string, options: HelperOptions) {
  // Lookup the range so we can draw icon.
  let range: Range = resolve_helper_dotpath(options, path);

  let icon_html = `<i class="cci ${range.Icon} i--m i--dark"></i>`;
  /* TODO: For a next iteration--would be really nifty to set it up to select images rather than text. 
    But that seems like a non-trivial task...
    <img class="med-icon" src="../systems/${game.system.id}/assets/icons/range.svg">
    <img class="med-icon" src="../systems/${game.system.id}/assets/icons/aoe_blast.svg">
    <img class="med-icon" src="../systems/${game.system.id}/assets/icons/damage_explosive.svg">
  */

  // Extend the options to not have to repeat lookup
  let type_options = ext_helper_hash(options, { value: range.RangeType }, { default: RangeType.Range });
  let range_type_selector = std_enum_select(path + ".RangeType", RangeType, type_options);

  let value_options = ext_helper_hash(options, { value: range.Value });
  let value_input = std_string_input(path + ".Value", value_options);

  return `<div class="flexrow flex-center" style="padding: 5px;">
    ${icon_html}
    ${range_type_selector}
    ${value_input}
  </div>
  `;
}

/**
 * Handlebars helper for weapon damage type/value editing.
 * Supply with path to Damage, and any args that you'd like passed down to the standard input editors
 */
export function damage_editor(path: string, options: HelperOptions) {
  // Lookup the damage so we can draw icon.
  let damage: Damage = resolve_helper_dotpath(options, path);

  let icon_html = `<i class="cci ${damage.Icon} i--m"></i>`;

  let type_options = ext_helper_hash(options, { value: damage.DamageType }, { default: DamageType.Kinetic });
  let damage_type_selector = std_enum_select(path + ".DamageType", DamageType, type_options);

  let value_options = ext_helper_hash(options, { value: damage.Value });
  let value_input = std_string_input(path + ".Value", value_options);

  return `<div class="flexrow flex-center" style="padding: 5px;">
    ${icon_html}
    ${damage_type_selector}
    ${value_input}
  </div>
  `;
}

/**
 * Handlebars helper for showing damage values.
 * Supply with the array of Damage[], as well as:
 * - classes: Any additional classes to put on the div holding them
 */
export function show_damage_array(damages: Damage[], options: HelperOptions): string {
  // Get the classes
  let classes = options.hash["classes"] || "";
  let results: string[] = [];
  for (let damage of damages) {
    let damage_item = `<span class="compact-damage">
      <i class="cci ${damage.Icon} i--m i--dark damage--${damage.DamageType.toLowerCase()}"></i>
      ${damage.Value}</span>`;
    results.push(damage_item);
  }
  return `<div class="flexrow no-grow compact-damage ${classes}">${results.join(" ")}</div>`;
}

/**
 * Handlebars helper for showing range values
 */
export function show_range_array(ranges: Range[], options: HelperOptions): string {
  // Get the classes
  let classes = options.hash["classes"] || "";

  // Build out results
  let results: string[] = [];
  for (let range of ranges) {
    let range_item = `<span class="compact-range"><i class="cci ${range.Icon} i--m i--dark"></i>${range.Value}</span>`;
    results.push(range_item);
  }
  return `<div class="flexrow no-grow compact-range ${classes}">${results.join(" ")}</div>`;
}

/**
 * Handlebars helper for an NPC feature preview attack bonus stat
 * @param atk {number} Attack bonus to render
 */
export function npc_attack_bonus_preview(atk: number, txt: string = "ATTACK") {
  return `<div class="compact-acc">
    <i style="margin-right: 5px;" class="cci cci-reticule i--m"></i>
    <span class="medium"> ${atk < 0 ? "-" : "+"}${atk} ${txt}</span>
  </div>`;
}

/**
 * Handlebars helper for an NPC feature preview accuracy stat
 * @param acc {number} Accuracy bonus to render
 */
export function npc_accuracy_preview(acc: number) {
  let icon: string;
  let text: string;
  if (acc > 0) {
    icon = "accuracy";
    text = `+${acc} ACCURACY`;
  } else if (acc < 0) {
    icon = "difficulty";
    text = `-${acc} DIFFICULTY`;
  } else {
    return "";
  }

  return `<div class="compact-acc">
      <i style="margin-right: 5px" class="cci cci-${icon} i--m"></i>
      <span class="medium">${text}</span>
    </div>`;
}

/**
 * Handlebars partial for weapon type selector
 */
export function system_type_selector(path: string, options: HelperOptions) {
  return std_enum_select(path, SystemType, ext_helper_hash(options, {}, { default: SystemType.System }));
}

/**
 * Handlebars partial for limited uses remaining
 * TODO: make look more like compcon
 */
export function uses_control(uses_path: string, max_uses: number, helper: HelperOptions) {
  const curr_uses = resolve_helper_dotpath(helper, uses_path, 0);
  return `
    <div class="card clipped">
      <span class="lancer-header"> USES </span>
      ${std_x_of_y(uses_path, curr_uses, max_uses)}
    </div>
    `;
}

export function npc_feature_preview(npc_feature_path: string, helper: HelperOptions) {
  let feature: NpcFeature = resolve_helper_dotpath(helper, npc_feature_path);

  switch (feature.FeatureType) {
    case "Reaction":
      return npc_reaction_effect_preview(npc_feature_path, helper);
    case "System":
      return npc_system_effect_preview(npc_feature_path, helper);
    case "Trait":
      return npc_trait_effect_preview(npc_feature_path, helper);
    case "Tech":
      return npc_tech_effect_preview(npc_feature_path, helper);
    case "Weapon":
      return npc_weapon_effect_preview(npc_feature_path, helper);
    default:
      return "bad feature";
  }
}

/** Expected arguments:
 * - bonus_path=<string path to the individual bonus item>,  ex: ="doc.mm.Bonuses.3"
 * - bonus=<bonus object to pre-populate with>
 */
export function single_bonus_editor(bonus_path: string, bonus: Bonus, options: HelperOptions) {
  // Our main two inputs
  let id_input = std_string_input(`${bonus_path}.LID`, ext_helper_hash(options, { label: "ID" }));
  let val_input = std_string_input(`${bonus_path}.Value`, ext_helper_hash(options, { label: "Value" }));

  // Icon factory
  let iconer = new IconFactory({
    size: "m",
  });

  // Our type options
  let damage_checkboxes: string[] = [];
  for (let dt of Object.values(DamageType)) {
    damage_checkboxes.push(
      std_checkbox(
        `${bonus_path}.DamageTypes.${dt}`,
        ext_helper_hash(options, { label: iconer.r(Damage.icon_for(dt)) })
      )
    );
  }

  let range_checkboxes: string[] = [];
  for (let rt of Object.values(RangeType)) {
    range_checkboxes.push(
      std_checkbox(`${bonus_path}.RangeTypes.${rt}`, ext_helper_hash(options, { label: iconer.r(Range.icon_for(rt)) }))
    );
  }

  let type_checkboxes: string[] = [];
  for (let wt of Object.values(WeaponType)) {
    type_checkboxes.push(std_checkbox(`${bonus_path}.WeaponTypes.${wt}`, ext_helper_hash(options, { label: wt })));
  }

  let size_checkboxes: string[] = [];
  for (let st of Object.values(WeaponSize)) {
    size_checkboxes.push(std_checkbox(`${bonus_path}.WeaponSizes.${st}`, ext_helper_hash(options, { label: st })));
  }

  // Consolidate them into rows
  return `
    <div class="flexcol">
      <span class="lancer-header">INFO</span>
      ${id_input}
      ${val_input}

      <div class="wraprow double">
        <div class="flexcol">
          <span class="lancer-header">DAMAGE TYPES</span>
          ${damage_checkboxes.join(" ")}
        </div>
        <div class="flexcol">
          <span class="lancer-header">RANGES TYPES</span>
          ${range_checkboxes.join(" ")}
        </div>

        <div class="flexcol">
          <span class="lancer-header">WEAPON TYPES</span>
          ${type_checkboxes.join(" ")}
        </div>
        <div class="flexcol">
          <span class="lancer-header">WEAPON SIZES</span>
          ${size_checkboxes.join(" ")}
        </div>
      </div>
    </div>
    `;
}

/** Expected arguments:
 * - bonuses_path=<string path to the bonuses array>,  ex: ="doc.mm.Bonuses"
 * - bonuses=<bonus array to pre-populate with>.
 * Displays a list of bonuses, with buttons to add/delete (if edit true)
 */
export function bonuses_display(bonuses_path: string, bonuses_array: Bonus[], edit: boolean) {
  let items: string[] = [];

  // Render each bonus
  for (let i = 0; i < bonuses_array.length; i++) {
    let bonus = bonuses_array[i];
    let delete_button = `<a class="gen-control" data-action="splice" data-path="${bonuses_path}.${i}"><i class="fas fa-trash"></i></a>`;
    let title = `<span class="grow">${bonus.Title}</span> ${inc_if(delete_button, edit)}`;
    let boxed = `
      <div class="bonus ${inc_if("editable", edit)}" data-path="${bonuses_path}.${i}">
        ${effect_box(title, "" + bonus.Detail)}
      </div>
    `;
    items.push(boxed);
  }

  return `
    <div class="card bonus-list">
      <div class="lancer-header">
        <span class="left">// Bonuses</span>
        ${inc_if(
          `<a class="gen-control fas fa-plus" data-action="append" data-path="${bonuses_path}" data-action-value="(struct)bonus"></a>`,
          edit
        )}
      </div>
      ${items.join("\n")}
    </div>
    `;
}

// Allows right clicking bonuses to edit them
export function HANDLER_activate_edit_bonus<T>(
  html: JQuery,
  data_getter: () => Promise<T> | T,
  commit_func: (data: T) => void | Promise<void>
) {
  let bonuses = html.find(".editable.bonus");
  bonuses.on("click", async event => {
    // Find the bonus
    let bonus_path = event.currentTarget.dataset.path;
    if (!bonus_path) return;
    let data = await data_getter();
    return BonusEditDialog.edit_bonus(data, bonus_path, commit_func).catch(e => console.error("Dialog failed", e));
  });
}

// Allows counter editing
export function HANDLER_activate_edit_counter<T>(html: JQuery, data_getter: () => Promise<T> | T) {
  html.find(".counter-edit-button").on("click", async evt => {
    // Find the counter
    let path = evt.currentTarget.dataset.path;
    let writeback_path = evt.currentTarget.dataset.writeback_path;
    if (!path || !writeback_path) throw "Counters weren't set up right";

    let data = await data_getter();

    let writeback_obj: RegEntry<any> | null = resolve_dotpath(data, writeback_path);

    if (!writeback_obj) throw "Writeback is broken";

    return CounterEditForm.edit_counter(data, path, writeback_obj).catch(e => console.error("Dialog failed", e));
  });
}

/** Expected arguments:
 * - bonus_path=<string path to the individual bonus item>,  ex: ="doc.mm.Bonuses.3"
 * - bonus=<bonus object to pre-populate with>
 */
export function single_action_editor(path: string, options: HelperOptions) {
  // Make inputs for each important field
  let id_input = std_string_input(`${path}.LID`, ext_helper_hash(options, { label: "ID" }));
  let name_input = std_string_input(`${path}.Name`, ext_helper_hash(options, { label: "Name" }));

  // Consolidate them into rows
  return `<div class="card" style="align-content: flex-start">
      ${id_input}
      ${name_input}
     
    </div>`;
}

// Helper for showing a piece of armor, or a slot to hold it (if path is provided)
export function pilot_armor_slot(armor_path: string, helper: HelperOptions): string {
  // Fetch the item
  let armor_: PilotArmor | null = resolve_helper_dotpath(helper, armor_path);

  // Generate commons
  let cd = ref_commons(armor_);

  if (!cd) {
    // Make an empty ref. Note that it still has path stuff if we are going to be dropping things here
    return `<div class="${EntryType.PILOT_ARMOR} ref drop-settable card" 
                        data-path="${armor_path}" 
                        data-type="${EntryType.PILOT_ARMOR}">
          <img class="ref-icon" src="${TypeIcon(EntryType.PILOT_ARMOR)}"></img>
          <span class="major">Equip armor</span>
      </div>`;
  }

  let armor = armor_!;

  // Need to look in bonuses to find what we need
  let armor_val = armor.Bonuses.find(b => b.LID == "pilot_armor")?.Value ?? "0";
  let speed_val = armor.Bonuses.find(b => b.LID == "pilot_speed")?.Value ?? "0";
  let edef_val = armor.Bonuses.find(b => b.LID == "pilot_edef")?.Value ?? "0";
  let eva_val = armor.Bonuses.find(b => b.LID == "pilot_evasion")?.Value ?? "0";
  let hp_val = armor.Bonuses.find(b => b.LID == "pilot_hp")?.Value ?? "0";

  return `<div class="valid ${cd.ref.type} ref drop-settable card clipped pilot-armor-compact item" 
                ${ref_params(cd.ref, armor_path)} >
            <div class="lancer-header">
              <i class="mdi mdi-shield-outline i--m i--light"> </i>
              <span class="minor">${armor!.Name}</span>
              <a class="lancer-context-menu" data-context-menu="${armor.Type}" data-path="${armor_path}"">
                <i class="fas fa-ellipsis-v"></i>
              </a>
            </div>
            <div class="flexrow" style="align-items: center; padding: 5px">
              <div class="compact-stat">
                <i class="mdi mdi-shield-outline i--s i--dark"></i>
                <span class="minor">${armor_val}</span>
              </div>
              <div class="compact-stat">
                <i class="mdi mdi-heart i--s i--dark"></i>
                <span class="minor">+${hp_val}</span>
              </div>
              <div class="compact-stat">
                <i class="cci cci-edef i--s i--dark"></i>
                <span class="minor">${edef_val}</span>
              </div>
              <div class="compact-stat">
                <i class="cci cci-evasion i--s i--dark"></i>
                <span class="minor">${eva_val}</span>
              </div>
              <div class="compact-stat">
                <i class="mdi mdi-arrow-right-bold-hexagon-outline i--s i--dark"></i>
                <span class="minor">${speed_val}</span>
              </div>
            </div>
            <div class="effect-text" style=" padding: 5px">
              ${armor.Description}
            </div>
            ${compact_tag_list(armor_path + ".Tags", armor.Tags, false)}
          </div>`;
}

// Helper for showing a pilot weapon, or a slot to hold it (if path is provided)
export function pilot_weapon_refview(weapon_path: string, helper: HelperOptions): string {
  // Fetch the item
  let weapon_: PilotWeapon | null = resolve_helper_dotpath(helper, weapon_path);

  // Generate commons
  let cd = ref_commons(weapon_);

  if (!cd) {
    // Make an empty ref. Note that it still has path stuff if we are going to be dropping things here
    return `<div class="${EntryType.PILOT_WEAPON} ref drop-settable card flexrow" 
                        data-path="${weapon_path}" 
                        data-type="${EntryType.PILOT_WEAPON}">
          <img class="ref-icon" src="${TypeIcon(EntryType.PILOT_WEAPON)}"></img>
          <span class="major">Equip weapon</span>
      </div>`;
  }

  let weapon = weapon_!;

  let loading = "";
  // Generate loading segment as needed
  if (is_loading(weapon)) loading = loading_indicator(weapon.Loaded, weapon_path);

  return `<div class="valid ${
    EntryType.PILOT_WEAPON
  } ref drop-settable card clipped pilot-weapon-compact item macroable"
                ${ref_params(cd.ref, weapon_path)} >
    <div class="lancer-header">
      <i class="cci cci-weapon i--m i--light"> </i>
      <span class="minor">${weapon.Name}</span>
              <a class="lancer-context-menu" data-context-menu="${weapon.Type}" data-path="${weapon_path}"">
                <i class="fas fa-ellipsis-v"></i>
              </a>
    </div>
    <div class="flexcol">
      <div class="flexrow">
        <a class="flexrow roll-attack" style="max-width: min-content;">
          <i class="fas fa-dice-d20 i--sm i--dark"></i>
          
        </a>
        ${show_range_array(weapon.Range, helper)}
        <hr class="vsep">
        ${show_damage_array(weapon.Damage, helper)}
        <!-- Loading toggle, if we are loading-->
        ${inc_if(`<hr class="vsep"> ${loading}`, loading)}
      </div>

      ${compact_tag_list(weapon_path + ".Tags", weapon.Tags, false)}
    </div>
  </div>`;
}

// Helper for showing a pilot gear, or a slot to hold it (if path is provided)
export function pilot_gear_refview(gear_path: string, helper: HelperOptions): string {
  // Fetch the item
  let gear_: PilotGear | null = resolve_dotpath(helper.data?.root, gear_path);

  // Generate commons
  let cd = ref_commons(gear_);

  if (!cd) {
    // Make an empty ref. Note that it still has path stuff if we are going to be dropping things here
    return `<div class="${EntryType.PILOT_GEAR} ref drop-settable card flexrow" 
                        data-path="${gear_path}" 
                        data-type="${EntryType.PILOT_GEAR}">
          <img class="ref-icon" src="${TypeIcon(EntryType.PILOT_GEAR)}"></img>
          <span class="major">Equip gear</span>
      </div>`;
  }

  let gear = gear_!;

  // Conditionally show uses
  let uses = "";
  let limited = funcs.limited_max(gear);
  if (limited) {
    uses = limited_chip_HTML(gear, gear_path);
  }

  return `<div class="valid ${EntryType.PILOT_GEAR} ref drop-settable card clipped macroable item"
                ${ref_params(cd.ref, gear_path)} >
    <div class="lancer-header">
      <i class="cci cci-generic-item i--m"> </i>
      <a class="gear-macro macroable"><i class="mdi mdi-message"></i></a>
      <span class="minor">${gear.Name}</span>
      <a class="lancer-context-menu" data-context-menu="${gear.Type}" data-path="${gear_path}"">
        <i class="fas fa-ellipsis-v"></i>
      </a>
    </div>
    <div class="flexcol">
      ${uses}

      <div class="effect-text" style=" padding: 5px">
        ${gear.Description}
      </div>

      ${compact_tag_list(gear_path + ".Tags", gear.Tags, false)}
    </div>
  </div>`;
}

/**
 * Handlebars helper for a mech weapon preview card. Doubles as a slot. Mech path needed for bonuses
 */
export function mech_weapon_refview(
  weapon_path: string,
  mech_path: string | "",
  options: HelperOptions,
  registry?: CollapseRegistry,
  size?: FittingSize
): string {
  // Fetch the item(s)
  let weapon_: MechWeapon | null = resolve_helper_dotpath(options, weapon_path);
  let mech_: Mech | null = resolve_helper_dotpath(options, mech_path);
  let mod_path = weapon_path.substr(0, weapon_path.lastIndexOf(".")) + ".Mod";
  let mod: WeaponMod | null = resolve_helper_dotpath(options, mod_path);

  // Generate commons
  let cd = ref_commons(weapon_);

  if (!cd) {
    // Make an empty ref. Note that it still has path stuff if we are going to be dropping things here
    return `
      <div class="${EntryType.MECH_WEAPON} ref drop-settable card flexrow" 
           data-path="${weapon_path}" 
           data-type="${EntryType.MECH_WEAPON}">
        <img class="ref-icon" src="${TypeIcon(EntryType.MECH_WEAPON)}"></img>
        <span class="major">Insert ${size ? size : "any"} weapon</span>
      </div>`;
  }

  let mod_text: string = "";
  let cd_mod = ref_commons(mod);
  if (cd_mod && mod) {
    mod_text = `
    <div class="valid item weapon-mod-addon flexrow clipped-bot ref ${EntryType.WEAPON_MOD}"
        ${ref_params(cd_mod.ref, weapon_path)}>
      <i class="cci cci-weaponmod i--m i--light"> </i>
      <span>${mod.Name}</span>
      <a style="flex-grow: unset;margin-right: 1em" class="gen-control i--light" data-action="null" data-path="${mod_path}"><i class="fas fa-trash"></i></a>
    </div>`;
  } else {
    // Make a refbox, hidden
    mod_text = `
    <div class="${EntryType.WEAPON_MOD} ref drop-settable context-drop highlight-can-drop card flexrow"
        data-path="${mod_path}"
        data-type="${EntryType.WEAPON_MOD}">
      <i class="cci cci-weaponmod i--m i--light"> </i>
      <span>Insert Mod</span>
    </div>`;
  }

  // Assert not null
  let weapon = weapon_!;

  let collapseID;
  if (registry != null) {
    // On sheet, enable collapse.
    registry[weapon.LID] == null && (registry[weapon.LID] = 0);

    let collapseNumCheck = ++registry[weapon.LID];
    collapseID = `${weapon.LID}_${collapseNumCheck}`;
  }

  // Do we need a profile selector?
  let profiles = "";
  if (weapon.Profiles.length > 1) {
    profiles = `<div class="flexrow weapon-profile-wrapper">`;
    for (let i = 0; i < weapon.Profiles.length; i++) {
      let p = weapon.Profiles[i];
      profiles += `<a class="gen-control weapon-profile ${i === weapon.SelectedProfileIndex ? "selected-profile" : ""}"
data-action="set" data-action-value="(int)${i}" data-path="${weapon_path}.SelectedProfileIndex" data-commit-item="${weapon_path}">
<span class="minor">${p.Name}</span>
</a>`;
    }
    profiles += `</div>`;
  }

  let sp = sp_display(weapon.SP ? weapon.SP : 0);

  // What profile are we using?
  let profile = weapon.SelectedProfile;
  let profile_path = `${weapon_path}.Profiles.${weapon.SelectedProfileIndex}`;

  // Augment ranges
  let ranges = profile.BaseRange;
  if (mech_) {
    ranges = Range.calc_range_with_bonuses(weapon, profile, mech_, mod ?? undefined);
  }

  // Augment tags
  let tags = profile.Tags;
  if (mod) {
    tags = funcs.merge_tags(tags, mod.AddedTags);
  }

  // Generate loading segment as needed
  let loading = "";
  if (funcs.is_loading(weapon)) loading = loading_indicator(weapon.Loaded, weapon_path);

  // Generate effects
  let effect = profile.Effect ? effect_box("Effect", profile.Effect) : "";
  let on_attack = profile.OnAttack ? effect_box("On Attack", profile.OnAttack) : "";
  let on_hit = profile.OnHit ? effect_box("On Hit", profile.OnHit) : "";
  let on_crit = profile.OnCrit ? effect_box("On Crit", profile.OnCrit) : "";

  let limited = is_limited(weapon) ? limited_chip_HTML(weapon, weapon_path) : "";

  return `
  <div class="mech-weapon-wrapper${mod_text ? "-modded" : ""}">
    <div class="valid ${EntryType.MECH_WEAPON} 
    ref drop-settable flexcol lancer-weapon-container macroable item"
                  ${ref_params(cd.ref, weapon_path)}
                  style="max-height: fit-content;">
      <div class="lancer-header ${weapon.Destroyed ? "destroyed" : ""}">
        <i class="${weapon.Destroyed ? "mdi mdi-cog" : "cci cci-weapon i--m i--light"}"> </i>
        <span class="minor" ${mech_ ? `data-collapse-store="${mech_.RegistryID}"` : ""}" >
          ${weapon.Name} // ${weapon.Size.toUpperCase()} ${weapon.SelectedProfile.WepType.toUpperCase()}
        </span>
        <i class="mdi mdi-unfold-less-horizontal collapse-trigger collapse-icon" data-collapse-id="${collapseID}"> </i>
        <a class="lancer-context-menu" data-context-menu="${EntryType.MECH_WEAPON}" data-path="${weapon_path}">
          <i class="fas fa-ellipsis-v"></i>
        </a>
      </div> 
      <div class="lancer-body collapse" data-collapse-id="${collapseID}">
        ${weapon.SP ? sp : ""}
        ${profiles}
        <div class="flexrow" style="text-align: left; white-space: nowrap;">
          <a class="roll-attack"><i class="fas fa-dice-d20 i--m i--dark"></i></a>
          <hr class="vsep">
          ${show_range_array(ranges, options)}
          <hr class="vsep">
          ${show_damage_array(weapon.SelectedProfile.BaseDamage, options)}

          <!-- Loading toggle, if we are loading-->
          ${inc_if(`<hr class="vsep"> ${loading}`, loading)}

          <!-- Limited toggle if we are limited-->
          ${limited}
        </div>
        
        <div class="flexcol">
          ${effect}
          ${on_attack}
          ${on_hit}
          ${on_crit}
          ${compact_tag_list(profile_path + ".Tags", tags, false)}
        </div>
      </div>
    </div>
    ${mod_text}
  </div>`;
}

export function loading_indicator(loaded: boolean, weapon_path: string): string {
  let loading_icon = `mdi ${loaded ? "mdi-hexagon-slice-6" : "mdi-hexagon-outline"}`;
  return `<span class="flexcol loading-wrapper"> 
                LOADED: 
                <a class="gen-control" data-action="set" data-action-value="(bool)${!loaded}" data-path="${weapon_path}.Loaded" data-commit-item="${weapon_path}"><i class="${loading_icon}"></i></a>
                </span>`;
}

// A specific MM ref helper focused on displaying manufacturer info.
export function manufacturer_ref(source_path: string, helper: HelperOptions): string {
  let source_: Manufacturer | null = resolve_helper_dotpath(helper, source_path);
  let cd = ref_commons(source_);
  // TODO? maybe do a little bit more here, aesthetically speaking
  if (cd) {
    let source = source_!;
    return `<div class="valid ${EntryType.MANUFACTURER} ref ref-card drop-settable" ${ref_params(cd.ref, source_path)}> 
              <h3 class="mfr-name" style="color: ${source!.GetColor(false)};">
                <i class="i--m cci ${source.Logo}"></i>
                ${source!.LID}
              </h3>
                
            </div>
        `;
  } else {
    return `<div class="ref ref-card drop-settable ${EntryType.MANUFACTURER}">
              <h3 class="mfr-name">No source specified</h3>
            </div>
        `;
  }
}

// A specific MM ref helper focused on displaying license info.
// This if for display purposes and does not provide editable fields
export function license_ref(license: License | null, level: number): string {
  let cd = ref_commons(license);
  // TODO? maybe do a little bit more here, aesthetically speaking
  if (cd) {
    return `<div class="valid ${EntryType.LICENSE} ref ref-card" ${ref_params(cd.ref)}> 
              <h3 class="license-name">${license!.Name} ${level}</h3>
            </div>
        `;
  } else {
    return `<div class="ref ref-card">
              <h3 class="license-name">No license specified</h3>
            </div>
        `;
  }
}

/**
 * Builds the HTML for a given action
 * @param action  Standard action to generate in HTML form
 * @param options Options such as:
 *        full    Determines if we should generate full HTML info or just mini version (title & action)
 *        number  If we're building full, we can pass through a number to denote which index of action
 *                this is for macro purposes. Only used for macro-able actions
 *        tags    Array of TagInstances which can optionally be passed
 * @returns Activation HTML in string form
 */
// TODO: The options are out of control
export function buildActionHTML(
  action: Action,
  options?: { editable?: boolean; path?: string; full?: boolean; num?: number; tags?: TagInstance[] }
): string {
  let detailText: string | undefined;
  let chip: string | undefined;
  let tags: string | undefined;
  let editor: string | undefined;

  let collID = uuid4();
  // TODO--can probably do better than this
  if (options) {
    // Not using type yet but let's plan forward a bit
    let type: ActivationOptions;
    let icon: ChipIcons | undefined;

    // If we don't have a trigger do a simple detail
    if (!action.Trigger)
      detailText = `<div class="action-detail collapse ${
        options.full ? "" : "collapsed"
      }" data-collapse-id="${collID}">${action.Detail}</div>`;
    // Otherwise, look to be explicit about which is which
    else {
      detailText = `<div class="action-detail collapse ${options.full ? "" : "collapsed"}" data-collapse-id="${collID}">
        <div class="overline">${game.i18n.localize("lancer.chat-card.label.trigger")}</div> 
        <div>${action.Trigger}</div>
        <div class="overline">${game.i18n.localize("lancer.chat-card.label.effect")}</div> 
        <div>${action.Detail}</div> 
      </div>`;
    }

    if (options.num !== undefined) {
      switch (action.Activation) {
        case ActivationType.QuickTech:
        case ActivationType.FullTech:
        case ActivationType.Invade:
          type = ActivationOptions.TECH;
          icon = ChipIcons.Roll;
          break;
        default:
          type = ActivationOptions.ACTION;
          icon = ChipIcons.Chat;
          break;
      }

      chip = buildChipHTML(action.Activation, { icon: icon, num: options.num });

      if (options.editable) {
        if (!options.path) throw Error("You're trying to edit an action without a path");
        // If it's editable, it's deletable
        editor = `
        <div class="action-editor-wrapper">
          <a class="gen-control" data-action="splice" data-path="${options.path}"><i class="fas fa-trash"></i></a>
          <a class="action-editor fas fa-edit" data-path="${options.path}"></a>
        </div>`;
      }
    }

    if (options.tags !== undefined) {
      tags = compact_tag_list("", options.tags, false);
    }
  }

  if (!chip) {
    chip = buildChipHTML(action.Activation);
  }

  return `
  <div class="action-wrapper">
    <div class="title-wrapper">
      <span class="action-title collapse-trigger" data-collapse-id="${collID}">
        ${action.Name ? action.Name : ""}
      </span>
      ${editor ? editor : ""}
    </div>
    ${detailText ? detailText : ""}
    ${chip}
    ${tags ? tags : ""}
  </div>
  `;
}

/**
 * Builds the HTML for a given in-system deployable
 * @param deployable  Deployable to generate in HTML form
 * @param full    Determines if we should generate full HTML info or just mini version (title & action)
 * @param number  If we're building full, we can pass through a number to denote which index of action
 *                this is for macro purposes. Only used for macro-able actions
 * @returns Activation HTML in string form
 */
export function buildDeployableHTML(dep: Deployable, full?: boolean, num?: number): string {
  let detailText: string | undefined;
  let chip: string;
  let activation: ActivationType | undefined;

  let collID = uuid4();
  detailText = `<div class="deployable-detail collapse ${full ? "" : "collapsed"}" data-collapse-id="${collID}">${
    dep.Detail
  }</div>`;
  // TODO--can probably do better than this
  /*
    Until further notice, Actions in Deployables are just... not
    if(dep.Actions.length) {
      detailText += dep.Actions.map((a) => {return buildActionHTML(a)})
    } */

  // All places we could get our activation, in preferred order
  let activationSources = [
    dep.Activation,
    dep.Redeploy,
    dep.Recall,
    dep.Actions.length ? dep.Actions[0].Activation : ActivationType.None,
  ];
  for (var i = 0; i < activationSources.length; i++) {
    if (activationSources[i] !== ActivationType.None) {
      activation = activationSources[i];
    }
  }

  if (!activation) activation = ActivationType.Quick;

  if (num !== undefined) {
    chip = buildChipHTML(activation, { icon: ChipIcons.Deployable, num: num, isDep: true });
  } else {
    chip = buildChipHTML(activation);
  }

  return `
  <div class="deployable-wrapper">
    <span class="deployable-title collapse-trigger" data-collapse-id="${collID}">
      ${dep.Name ? dep.Name : ""}
    </span>
    ${detailText ? detailText : ""}
    ${chip}
  </div>
  `;
}

export function buildChipHTML(
  activation: ActivationType,
  macroData?: { icon?: ChipIcons; num?: number; isDep?: boolean; fullData?: LancerMacroData }
): string {
  if (macroData && (macroData?.fullData || macroData?.num !== undefined)) {
    if (!macroData.icon) macroData.icon = ChipIcons.Chat;
    let data: string | undefined;
    if (macroData?.fullData) data = `data-macro=${encodeMacroData(macroData.fullData)}`;
    else data = `data-${macroData.isDep ? "deployable" : "activation"}=${macroData.num}`;
    return `<a class="${
      macroData?.fullData ? "lancer-macro" : `macroable`
    } activation-chip activation-${activation.toLowerCase().replace(/\s+/g, "")}" ${data}>
            ${macroData.icon ? macroData.icon : ""}
            ${activation.toUpperCase()}
          </a>`;
  } else return `<div class="activation-chip activation-${activation.toLowerCase()}">${activation.toUpperCase()}</div>`;
}

export function buildSystemHTML(data: MechSystem): string {
  let eff: string | undefined;
  let actions: string | undefined;
  let deployables: string | undefined;
  let useFirstActivation = false;

  if (data.Effect) eff = data.Effect;
  else {
    // If our first action doesn't have a name & we don't have an effect then first action is our "effect"
    // Always first action? Or a better way?
    useFirstActivation = data.Actions.length ? !data.Actions[0].Name : false;
  }

  if (data.Actions) {
    actions = data.Actions.map((a: Action, i: number) => {
      // return buildActionHTML(a, { full: !i && useFirstActivation });
      return buildActionHTML(a, { full: false });
    }).join("");
  }

  if (data.Deployables) {
    deployables = data.Deployables.map((d: Deployable, i: number) => {
      return buildDeployableHTML(d, false);
    }).join("");
  }

  let html = `<div class="card clipped-bot system-wrapper" style="margin: 0px;">
  <div class="lancer-header ">// SYSTEM :: ${data.Name} //</div>
  ${eff ? eff : ""}
  ${actions ? actions : ""}
  ${deployables ? deployables : ""}
  ${compact_tag_list("data.Tags", data.Tags, false)}
</div>`;
  return html;
}

// This has gotten very messy to account for the pilots, should refactor - TODO
export function buildCounterHTML(data: Counter, path: string, writeback_path: string, can_delete?: boolean): string {
  let hexes = [...Array(data.Max)].map((_ele, index) => {
    const available = index + 1 <= data.Value;
    return `<i class="counter-hex mdi ${
      available ? "mdi-hexagon-slice-6" : "mdi-hexagon-outline"
    } theme--light" data-available="${available}" data-path="${path}" data-writeback="${writeback_path}"></i>`;
  });

  return `
  <div class="card clipped-bot counter-wrapper" data-path="${path}" data-writeback_path="${writeback_path}">
    <div class="lancer-header">
      <span>// ${data.Name} //</span>
      <a class="lancer-context-menu" data-context-menu="counter" data-path="${path}" data-can-delete="${
    can_delete ? can_delete : false
  }">
        <i class="fas fa-ellipsis-v"></i>
      </a>
    </div>
    <div class="flexrow flex-center no-wrap">
      ${hexes.join("")}
    </div>
  </div>`;
}

export function buildCounterArrayHTML(
  counters: Counter[] | { counter: Counter; source: any }[],
  path: string,
  custom_path?: string,
  fully_editable?: boolean
): string {
  let counter_detail = "";
  let counter_arr: Counter[] | undefined;

  function isCounters(array: Counter[] | { counter: Counter; source: any }[]): array is Counter[] {
    return !("counter" in array[0]);
  }

  // Is our path sourced or direct?
  if (counters.length > 0) {
    if (isCounters(counters)) {
      for (let i = 0; i < counters.length; i++) {
        counter_detail = counter_detail.concat(buildCounterHTML(counters[i], path.concat(`.${i}`), "mm"));
      }
    } else {
      counter_arr = counters.map(x => {
        return x.counter;
      });
      for (let i = 0; i < counters.length; i++) {
        counter_detail = counter_detail.concat(
          buildCounterHTML(counter_arr[i], path.concat(`.${i}.counter`), path.concat(`.${i}.source`))
        );
      }
    }
  }

  return `
  <div class="card clipped double">
    <span class="lancer-header submajor ">
      COUNTERS
      <a class="gen-control fas fa-plus" data-action="append" data-path="${
        custom_path ? custom_path : path
      }" data-action-value="(struct)counter"></a>
    </span>
    ${counter_detail}
  </div>`;
}

export function HANDLER_activate_item_context_menus<T extends LancerActorSheetData<any>>(
  html: JQuery,
  // Retrieves the data that we will operate on
  data_getter: () => Promise<T> | T,
  commit_func: (data: T) => void | Promise<void>
) {
  let edit: ContextMenuEntry = {
    name: "Edit",
    icon: `<i class="fas fa-edit"></i>`,
    callback: async (html: JQuery) => {
      let element = html.closest(".ref.valid")[0];
      if (element) {
        const found_doc = await resolve_ref_element(element);
        if (!found_doc) return;

        let sheet = (found_doc.Flags as FoundryFlagData).orig_doc.sheet;
        // If the sheet is already rendered:
        if (sheet?.rendered) {
          await sheet.maximize();
          sheet.bringToTop();
        }
        // Otherwise render the sheet
        else sheet?.render(true);
      }
    },
  };
  let destroy: ContextMenuEntry = {
    name: "Toggle Destroyed",
    icon: `<i class="fas fa-fw fa-wrench"></i>`,
    callback: async (html: JQuery) => {
      let sheet_data = await data_getter();
      let path = html[0].dataset.path ?? "";
      if (path) {
        let item: MechWeapon | MechSystem | NpcFeature | null = resolve_dotpath(sheet_data, path, null);
        if (item) {
          item.Destroyed = !item.Destroyed;
          await item.writeback();
        }
      }
    },
  };
  let remove: ContextMenuEntry = {
    name: "Remove",
    icon: '<i class="fas fa-fw fa-trash"></i>',
    callback: async (html: JQuery) => {
      let sheet_data = await data_getter();
      let path = html[0].dataset.path ?? "";
      console.log(sheet_data, html, path);
      // Delete the weapon
      if (path) {
        let item: MechWeapon | MechSystem | NpcFeature | null = resolve_dotpath(sheet_data, path, null);
        if (item) await item.destroy_entry();
        // Then commit
        await commit_func(sheet_data);
      }
    },
  };

  // Counters are special so they unfortunately need dedicated controls
  let counter_edit: ContextMenuEntry = {
    name: "Edit",
    icon: `<i class="fas fa-edit"></i>`,
    callback: async (html: JQuery) => {
      // Find the counter
      let counter_el = html.closest(".counter-wrapper")[0];
      let path = counter_el.dataset.path;
      let writeback_path = counter_el.dataset.writeback_path;
      if (!path || !writeback_path) throw "Counters weren't set up right";

      let data = await data_getter();

      let writeback_obj: RegEntry<any> | null = resolve_dotpath(data, writeback_path);

      if (!writeback_obj) throw "Writeback is broken";

      return CounterEditForm.edit_counter(data, path, writeback_obj).catch(e => console.error("Dialog failed", e));
    },
  };
  let counter_remove: ContextMenuEntry = {
    name: "Remove",
    icon: '<i class="fas fa-fw fa-trash"></i>',
    callback: async (html: JQuery) => {
      let sheet_data = await data_getter();

      // Find the counter
      let counter_el = html.closest(".counter-wrapper")[0];
      let path = counter_el.dataset.path;
      let writeback_path = counter_el.dataset.writeback_path;
      if (!path || !writeback_path) throw "Counters weren't set up right";

      let data = await data_getter();

      // Should always be the owning entity if we're able to delete
      let entry: RegEntry<any> = resolve_dotpath(sheet_data, "mm", null);
      let counter: Counter = resolve_dotpath(sheet_data, path, null);

      // Only allow this on Pilots for now, could plausibly generalize at some point
      if (!is_reg_pilot(entry)) return;

      let index = entry.CustomCounters.indexOf(counter);
      entry.CustomCounters.splice(index, 1);
      entry.writeback();
    },
  };

  // Finally, setup the context menu
  tippy_context_menu(html.find(`.lancer-context-menu[data-context-menu=\"mech_weapon\"]`), "click", [
    edit,
    destroy,
    remove,
  ]);
  tippy_context_menu(html.find(`.lancer-context-menu[data-context-menu=\"mech_system\"]`), "click", [
    edit,
    destroy,
    remove,
  ]);
  tippy_context_menu(html.find(`.lancer-context-menu[data-context-menu=\"npc_feature\"]`), "click", [
    edit,
    destroy,
    remove,
  ]);
  tippy_context_menu(html.find(`.lancer-context-menu[data-context-menu=\"pilot_weapon\"]`), "click", [edit, remove]);
  tippy_context_menu(html.find(`.lancer-context-menu[data-context-menu=\"pilot_armor\"]`), "click", [edit, remove]);
  tippy_context_menu(html.find(`.lancer-context-menu[data-context-menu=\"pilot_gear\"]`), "click", [edit, remove]);
  tippy_context_menu(html.find(`.lancer-context-menu[data-context-menu=\"talent\"]`), "click", [edit, remove]);
  tippy_context_menu(html.find(`.lancer-context-menu[data-context-menu=\"skill\"]`), "click", [edit, remove]);
  tippy_context_menu(html.find(`.lancer-context-menu[data-context-menu=\"core_bonus\"]`), "click", [edit, remove]);
  tippy_context_menu(html.find(`.lancer-context-menu[data-context-menu=\"license\"]`), "click", [edit, remove]);

  // Only some counters can be deleted
  tippy_context_menu(
    html.find(`.lancer-context-menu[data-context-menu=\"counter\"][data-can-delete=\"false\"]`),
    "click",
    [counter_edit]
  );
  tippy_context_menu(
    html.find(`.lancer-context-menu[data-context-menu=\"counter\"][data-can-delete=\"true\"]`),
    "click",
    [counter_edit, counter_remove]
  );
}

// Allows user to remove or rename profiles value via right click
export function HANDLER_activate_profile_context_menus<T extends LancerItemSheetData<any>>(
  html: JQuery,
  // Retrieves the data that we will operate on
  data_getter: () => Promise<T> | T,
  commit_func: (data: T) => void | Promise<void>
) {
  // This option allows the user to remove the right-profile tag
  let remove = {
    name: "Delete Profile",
    icon: '<i class="fas fa-fw fa-times"></i>',
    callback: async (html: JQuery) => {
      let cd = await data_getter();
      let profile_path = html[0].dataset.path ?? "";

      // Remove the tag from its array
      if (profile_path) {
        // Make sure we aren't deleting the last item
        let profile_path_parts = format_dotpath(profile_path).split(".");
        let weapon_path = profile_path_parts.slice(0, profile_path_parts.length - 2).join(".");
        let weapon: MechWeapon | null = resolve_dotpath(cd, weapon_path, null);

        if ((weapon?.Profiles.length ?? 0) <= 1) {
          ui.notifications!.error("Cannot delete last profile on a weapon");
          return;
        }

        // Otherwise its fine
        array_path_edit(cd, profile_path, null, "delete");

        // Then commit
        return commit_func(cd);
      }
    },
  };

  // This option pops up a small dialogue that lets the user set the tag instance's value
  let set_value = {
    name: "Rename Profile",
    icon: '<i class="fas fa-fw fa-edit"></i>',
    // condition: game.user.isGM,
    callback: async (html: JQuery) => {
      let cd = await data_getter();
      let profile_path = html[0].dataset.path ?? "";

      // Get the profile
      let profile: MechWeaponProfile = resolve_dotpath(cd, profile_path);

      // Check existence
      if (!(profile instanceof MechWeaponProfile)) return; // Stinky

      // Spawn the dialogue to edit
      let new_val = await promptText("Rename profile", (profile.Name ?? "").toString());

      if (new_val !== null) {
        // Set the name
        profile.Name = new_val;

        // At last, commit
        return commit_func(cd);
      }
    },
  };

  // Finally, setup the context menu
  tippy_context_menu(html.find(".weapon-profile-tab"), "contextmenu", [remove, set_value]);
}
