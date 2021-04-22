/* ------------------------------------ */
/* Handlebars Helpers                    */
/* ------------------------------------ */

import { HelperOptions } from "handlebars";
import {
  WeaponSize,
  WeaponType,
  RangeType,
  DamageType,
  Damage,
  LiveEntryTypes,
  SystemType,
  Range,
  RegEntry,
  EntryType,
  RegRef,
  OpCtx,
  Bonus,
  PilotArmor,
  PilotWeapon,
  PilotGear,
  Mech,
  Manufacturer,
  License,
  NpcFeature,
  FittingSize,
  Action,
  Deployable,
  MechSystem,
  ActivationType,
  WeaponMod,
} from "machine-mind";
import { MechWeapon, TagInstance } from "machine-mind";
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
  effect_box,
  ext_helper_hash,
  IconFactory,
  inc_if,
  resolve_dotpath,
  resolve_helper_dotpath,
  selected,
  std_checkbox,
  std_enum_select,
  std_num_input,
  std_string_input,
  std_x_of_y,
} from "./commons";
import { ref_commons, ref_params } from "./refs";
import { ActivationOptions, ChipIcons } from "../enums";
import { LancerMacroData } from "../interfaces";
import { encodeMacroData } from "../macros";
import { is_loading } from "machine-mind/dist/classes/mech/EquipUtil";
import { CollapseRegistry } from "./loadout";

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
    <img class="med-icon" src="../systems/lancer/assets/icons/range.svg">
    <img class="med-icon" src="../systems/lancer/assets/icons/aoe_blast.svg">
    <img class="med-icon" src="../systems/lancer/assets/icons/damage_explosive.svg">
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
    let damage_item = `<span class="compact-damage"><i class="cci ${damage.Icon} i--m i--dark"></i>${damage.Value}</span>`;
    results.push(damage_item);
  }
  return `<div class="flexrow no-grow ${classes}">${results.join(" ")}</div>`;
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
 * - bonus_path=<string path to the individual bonus item>,  ex: ="ent.mm.Bonuses.3"
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
 * - bonuses_path=<string path to the bonuses array>,  ex: ="ent.mm.Bonuses"
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

/** Expected arguments:
 * - bonus_path=<string path to the individual bonus item>,  ex: ="ent.mm.Bonuses.3"
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
              <a class="gen-control" data-action="null" data-path="${armor_path}"><i class="fas fa-trash"></i></a>
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
      <a class="gen-control i--light" data-action="null" data-path="${weapon_path}"><i class="fas fa-trash"></i></a>
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
  let limited = gear.Tags.find(t => t.Tag.IsLimited);
  if (limited) {
    uses = `
      <div class="compact-stat">
        <span class="minor" style="max-width: min-content;">USES: </span>
        <span class="minor" style="max-width: min-content;">todo</span>
        <span class="minor" style="max-width: min-content;" > / </span>
        <span class="minor" style="max-width: min-content;">${limited.Value}</span>
      </div>
    `;
  }

  return `<div class="valid ${EntryType.PILOT_GEAR} ref drop-settable card clipped macroable item"
                ${ref_params(cd.ref, gear_path)} >
    <div class="lancer-header">
      <i class="cci cci-generic-item i--m"> </i>
      <a class="gear-macro macroable"><i class="mdi mdi-message"></i></a>
      <span class="minor">${gear.Name}</span>
      <a class="gen-control i--light" data-action="null" data-path="${gear_path}"><i class="fas fa-trash"></i></a>
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
  let mod_text: string | undefined;

  // Generate commons
  let cd = ref_commons(weapon_);

  if (!cd) {
    // Make an empty ref. Note that it still has path stuff if we are going to be dropping things here
    return `
      <div class=" ${EntryType.MECH_WEAPON} ref drop-settable card flexrow" 
                        data-path="${weapon_path}" 
                        data-type="${EntryType.MECH_WEAPON}">
        <img class="ref-icon" src="${TypeIcon(EntryType.MECH_WEAPON)}"></img>
        <span class="major">Insert ${size ? size : "any"} weapon</span>
      </div>`;
  }

  let cd_mod = ref_commons(mod);

  if (cd_mod && mod) {
    mod_text = `
    <div class="valid item weapon-mod-addon flexrow clipped-bot ref ${EntryType.WEAPON_MOD}"
        ${ref_params(cd_mod.ref, weapon_path)}>
      <i class="cci cci-weaponmod i--m i--light"> </i>
      <span>${mod.Name}</span>
      <a style="flex-grow: unset;margin-right: 1em" class="gen-control i--light" data-action="null" data-path="${mod_path}"><i class="fas fa-trash"></i></a>
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

  // What profile are we using?
  let profile = weapon.SelectedProfile;
  let profile_path = `${weapon_path}.Profiles.${weapon.SelectedProfileIndex}`;

  // Augment ranges
  let ranges = profile.BaseRange;
  if (mech_) {
    ranges = Range.calc_range_with_bonuses(weapon, profile, mech_);
  }

  // Generate loading segment as needed
  let loading = "";
  if (weapon.IsLoading) loading = loading_indicator(weapon.Loaded, weapon_path);

  // Generate effects
  let effect = profile.Effect ? effect_box("Effect", profile.Effect) : "";
  let on_attack = profile.OnAttack ? effect_box("On Attack", profile.OnAttack) : "";
  let on_hit = profile.OnHit ? effect_box("On Hit", profile.OnHit) : "";
  let on_crit = profile.OnCrit ? effect_box("On Crit", profile.OnCrit) : "";

  return `
  <div class="mech-weapon-wrapper${mod_text ? "-modded" : ""}">
    <div class="valid ${EntryType.MECH_WEAPON} 
    ref drop-settable flexcol lancer-weapon-container macroable item"
                  ${ref_params(cd.ref, weapon_path)}
                  style="max-height: fit-content;">
      <div class="lancer-header">
        <i class="cci cci-weapon i--m i--light i--click"> </i>
        <span class="minor collapse-trigger" data-collapse-id="${collapseID}">${
    weapon.Name
  } // ${weapon.Size.toUpperCase()} ${weapon.SelectedProfile.WepType.toUpperCase()}</span>
        <a class="gen-control i--light" data-action="null" data-path="${weapon_path}"><i class="fas fa-trash"></i></a>
      </div> 
      <div class="lancer-body">
        <div class="flexrow" style="text-align: left; white-space: nowrap;">
          <a class="roll-attack"><i class="fas fa-dice-d20 i--m i--dark"></i></a>
          <hr class="vsep">
          ${show_range_array(ranges, options)}
          <hr class="vsep">
          ${show_damage_array(weapon.SelectedProfile.BaseDamage, options)}

          <!-- Loading toggle, if we are loading-->
          ${inc_if(`<hr class="vsep"> ${loading}`, loading)}
        </div>
        
        <div class="flexcol">
          <span class="collapse" data-collapse-id="${collapseID}">${weapon.SelectedProfile.Description}</span>
          ${effect}
          ${on_attack}
          ${on_hit}
          ${on_crit}
          ${compact_tag_list(profile_path + ".Tags", profile.Tags, false)}
        </div>
      </div>
    </div>
    ${mod_text ? mod_text : ""}
  </div>`;
}

function loading_indicator(loaded: boolean, weapon_path: string): string {
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
export function buildActionHTML(
  action: Action,
  options?: { full?: boolean; num?: number; tags?: TagInstance[] }
): string {
  let detailText: string | undefined;
  let chip: string | undefined;
  let tags: string | undefined;

  // TODO--can probably do better than this
  if (options) {
    if (options.full) {
      detailText = `
        <div class="action-detail">
          ${action.Detail}
        </div>
      `;
    }

    // Not using type yet but let's plan forward a bit
    let type: ActivationOptions;
    let icon: ChipIcons | undefined;

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
    <span class="action-title">
      ${action.Name ? action.Name : ""}
    </span>
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

  // TODO--can probably do better than this
  if (full) {
    detailText = `
      <div class="deployable-detail">
        ${dep.Detail}
      </div>
    `;
    /*
    Until further notice, Actions in Deployables are just... not
    if(dep.Actions.length) {
      detailText += dep.Actions.map((a) => {return buildActionHTML(a)})
    } */
  }

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
    <span class="deployable-title">
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

export async function buildSystemHTML(data: MechSystem): Promise<string> {
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
      return buildActionHTML(a, { full: !i && useFirstActivation });
    }).join("");
  }

  if (data.Deployables) {
    deployables = data.Deployables.map((d: Deployable, i: number) => {
      return buildDeployableHTML(d);
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
