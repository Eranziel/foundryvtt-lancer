/* ------------------------------------ */
/* Handlebars Helpers                    */
/* ------------------------------------ */

import type { HelperOptions } from "handlebars";
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
  drilldownDocument,
  effect_box,
  extendHelper,
  hex_array,
  inc_if,
  resolve_dotpath,
  resolve_helper_dotpath,
  sp_display,
  std_enum_select,
  std_string_input,
  std_x_of_y,
  tippyContextMenu,
} from "./commons";
import { limited_uses_indicator, ref_params, reserve_used_indicator } from "./refs";
import {
  ActivationType,
  ChipIcons,
  DamageType,
  EntryType,
  FittingSize,
  RangeType,
  ReserveType,
  SystemType,
  WeaponSize,
  WeaponType,
} from "../enums";
import { encodeMacroData } from "../macros";
import { collapseButton, collapseParam, CollapseRegistry } from "./collapse";
import { promptText } from "../apps/simple-prompt";
import { CounterEditForm } from "../apps/counter-editor";
import { frameToPath } from "../actor/retrograde-map";
import { Damage } from "../models/bits/damage";
import { Range } from "../models/bits/range";
import { BonusData } from "../models/bits/bonus";
import {
  LancerBOND,
  LancerFRAME,
  LancerItem,
  LancerLICENSE,
  LancerMECH_SYSTEM,
  LancerMECH_WEAPON,
  LancerNPC_CLASS,
  LancerNPC_FEATURE,
  LancerNPC_TEMPLATE,
  LancerPILOT_ARMOR,
  LancerPILOT_GEAR,
  LancerPILOT_WEAPON,
  LancerRESERVE,
  LancerWEAPON_MOD,
} from "../item/lancer-item";
import { ActionData } from "../models/bits/action";
import { LancerActor, LancerDEPLOYABLE } from "../actor/lancer-actor";
import { CounterData } from "../models/bits/counter";
import { slugify } from "../util/lid";
import { LancerFlowState } from "../flows/interfaces";
import { TagEditForm } from "../apps/tag-editor";
import { FullBoundedNum } from "../source-template";

/**
 * Handlebars helper for weapon size selector
 */
export function weapon_size_selector(path: string, options: HelperOptions) {
  if (!options.hash["default"]) {
    options.hash["default"] = WeaponSize.Main;
  }
  return std_enum_select(path, WeaponSize, options);
}

/**
 * Handlebars helper for weapon type selector. First parameter is the existing selection.
 */
export function weapon_type_selector(path: string, options: HelperOptions) {
  if (!options.hash["default"]) {
    options.hash["default"] = WeaponType.Rifle;
  }
  return std_enum_select(path, WeaponType, options);
}

/**
 * Handlebars helper for range type/value editing
 * Supply with path to Range, and any args that you'd like passed down to the standard input editors, as well as
 */
export function range_editor(path: string, options: HelperOptions): string {
  // Lookup the range so we can draw icon.
  let range = resolve_helper_dotpath<Range>(options, path);
  if (!range) return "";

  let icon_html = `<i class="cci ${range.icon} i--m i--dark"></i>`;
  /* TODO: For a next iteration--would be really nifty to set it up to select images rather than text. 
    But that seems like a non-trivial task...
    <img class="med-icon" src="../systems/${game.system.id}/assets/icons/range.svg">
    <img class="med-icon" src="../systems/${game.system.id}/assets/icons/aoe_blast.svg">
    <img class="med-icon" src="../systems/${game.system.id}/assets/icons/damage_explosive.svg">
  */

  // Extend the options to not have to repeat lookup
  let type_options = extendHelper(options, { value: range.type }, { default: RangeType.Range });
  let range_type_selector = std_enum_select(path + ".type", RangeType, type_options);

  let value_options = extendHelper(options, { value: range.val });
  let value_input = std_string_input(path + ".val", value_options);

  let delete_button = `<a class="gen-control" data-action="splice" data-path="${path}" style="margin: 4px;"><i class="fas fa-trash"></i></a>`;

  return `<div class="flexrow flex-center" style="padding: 5px;">
    ${icon_html}
    ${range_type_selector}
    ${value_input}
    ${delete_button}
  </div>
  `;
}

/**
 * Handlebars helper for weapon damage type/value editing.
 * Supply with path to Damage, and any args that you'd like passed down to the standard input editors
 */
export function damage_editor(path: string, options: HelperOptions): string {
  // Lookup the damage so we can draw icon.
  let damage = resolve_helper_dotpath<Damage>(options, path);
  if (!damage) return "";

  let icon_html = `<i class="cci ${damage.icon} i--m"></i>`;

  let type_options = extendHelper(options, { value: damage.type }, { default: DamageType.Kinetic });
  let damage_type_selector = std_enum_select(path + ".type", DamageType, type_options);

  let value_options = extendHelper(options, { value: damage.val });
  let value_input = std_string_input(path + ".val", value_options);

  let delete_button = `<a class="gen-control" data-action="splice" data-path="${path}" style="margin: 4px;"><i class="fas fa-trash"></i></a>`;

  return `<div class="flexrow flex-center" style="padding: 5px;">
    ${icon_html}
    ${damage_type_selector}
    ${value_input}
    ${delete_button}
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
      <i class="cci ${damage.icon} i--m i--dark damage--${damage.type.toLowerCase()}"></i>
      ${damage.val}</span>`;
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
    let range_item = `<span class="compact-range"><i class="cci ${range.icon} i--m i--dark"></i>${range.val}</span>`;
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
    text = `${acc} DIFFICULTY`;
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
  return std_enum_select(path, SystemType, extendHelper(options, {}, { default: SystemType.System }));
}

/**
 * Handlebars partial for limited uses remaining
 * TODO: make look more like compcon
 */
export function uses_control(uses_path: string, max_uses: number, options: HelperOptions): string {
  const curr_uses = resolve_helper_dotpath(options, uses_path, 0);
  return `
    <div class="card clipped">
      <span class="lancer-header"> USES </span>
      ${std_x_of_y(uses_path, curr_uses, max_uses)}
    </div>
    `;
}

export function npc_feature_preview(npc_feature_path: string, options: HelperOptions): string {
  let feature = resolve_helper_dotpath<LancerNPC_FEATURE>(options, npc_feature_path);
  if (!feature) return "";

  switch (feature.system.type) {
    case "Reaction":
      return npc_reaction_effect_preview(npc_feature_path, options);
    case "System":
      return npc_system_effect_preview(npc_feature_path, options);
    case "Trait":
      return npc_trait_effect_preview(npc_feature_path, options);
    case "Tech":
      return npc_tech_effect_preview(npc_feature_path, options);
    case "Weapon":
      return npc_weapon_effect_preview(npc_feature_path, options);
    default:
      return "bad feature";
  }
}

/** Expected arguments:
 * - bonuses_path=<string path to the bonuses array>,  ex: ="doc.system.bonuses"
 * - bonuses=<bonus array to pre-populate with>.
 * Displays a list of bonuses, with buttons to add/delete (if edit true)
 */
export function bonuses_display(bonuses_path: string, edit: boolean, options: HelperOptions) {
  let bonuses_array = resolve_helper_dotpath<BonusData[]>(options, bonuses_path, []);
  let items: string[] = [];

  // Render each bonus
  for (let i = 0; i < bonuses_array.length; i++) {
    let bonus = bonuses_array[i];
    let delete_button = `<a class="gen-control" data-action="splice" data-path="${bonuses_path}.${i}"><i class="fas fa-trash"></i></a>`;
    let title = `<span class="grow">${bonus.lid}</span> ${inc_if(delete_button, edit)}`; // Todo: maybe return to
    let boxed = `
      <div class="bonus ${inc_if("editable", edit)}" data-path="${bonuses_path}.${i}">
        ${effect_box(title, bonus.val)}
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
/** Expected arguments:
 * - bonus_path=<string path to the individual bonus item>,  ex: ="doc.system.actions.3"
 * - bonus=<bonus object to pre-populate with>
 */
export function single_action_editor(path: string, options: HelperOptions) {
  // Make inputs for each important field
  let id_input = std_string_input(`${path}.LID`, extendHelper(options, { label: "ID" }));
  let name_input = std_string_input(`${path}.Name`, extendHelper(options, { label: "Name" }));

  // Consolidate them into rows
  return `<div class="card" style="align-content: flex-start">
      ${id_input}
      ${name_input}
     
    </div>`;
}

export function bond_power(bond_path: string, power_index: number, options: HelperOptions): string {
  let bond = resolve_helper_dotpath<LancerBOND>(options, bond_path);
  let power = bond?.system.powers[power_index];
  if (!bond || !power) return "";
  let body = `<span class="desc-text">${power.description}</span>`;
  return `
    <div class="card clipped bond-power" data-uuid="${bond.uuid}" data-power-index="${power_index}">
      <div class="lancer-bond-power-header medium clipped-top">
        <a class="bond-power-flow"><i class="cci cci-trait i--m"></i></a>
        ${power.name}
        ${power.veteran ? `<i class="mdi mdi-alpha-v-circle i--s"></i>` : ``}
        ${power.master ? `<i class="mdi mdi-alpha-m-circle i--s"></i>` : ``}
      </div>
      ${
        power.uses
          ? `<div class="flexrow">
            ${body}
            ${
              power.uses && power.uses.max
                ? bond_power_uses_indicator(bond, power_index, `${bond_path}.system.powers.${power_index}`)
                : ""
            }
          </div>`
          : `${body}`
      }
    </div>
  `;
}

// Helper for showing a piece of armor, or a slot to hold it (if path is provided)
export function pilot_armor_slot(armor_path: string, options: HelperOptions): string {
  // Fetch the item
  let armor: LancerPILOT_ARMOR | null = resolve_helper_dotpath(options, armor_path);

  // Generate commons
  if (!armor) {
    // Make an empty ref. Note that it still has path stuff if we are going to be dropping things here
    return `<div class="${EntryType.PILOT_ARMOR} ref drop-settable card" 
                        data-path="${armor_path}" 
                        data-accept-types="${EntryType.PILOT_ARMOR}">
          <img class="ref-icon" src="${TypeIcon(EntryType.PILOT_ARMOR)}"></img>
          <span class="major">Equip armor</span>
      </div>`;
  }

  // Need to look in bonuses to find what we need
  let bonuses = armor.system.bonuses;
  let armor_val = bonuses.find(b => b.lid == "pilot_armor")?.val ?? "0";
  let speed_val = bonuses.find(b => b.lid == "pilot_speed")?.val ?? "0";
  let edef_val = bonuses.find(b => b.lid == "pilot_edef")?.val ?? "0";
  let eva_val = bonuses.find(b => b.lid == "pilot_evasion")?.val ?? "0";
  let hp_val = bonuses.find(b => b.lid == "pilot_hp")?.val ?? "0";

  return `<div class="set ref drop-settable card clipped pilot-armor-compact item" 
                ${ref_params(armor, armor_path)} 
                data-accept-types="${EntryType.PILOT_ARMOR}"
                >
            <div class="lancer-header">
              <i class="mdi mdi-shield-outline i--m i--light"> </i>
              <span class="minor">${armor.name}</span>
              <a class="lancer-context-menu" data-path="${armor_path}"">
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
              ${armor.system.description}
            </div>
            ${compact_tag_list(armor_path + ".system.tags", armor.system.tags, false)}
          </div>`;
}

// Helper for showing a pilot weapon, or a slot to hold it (if path is provided)
export function pilot_weapon_refview(weapon_path: string, options: HelperOptions): string {
  // Fetch the item
  let weapon: LancerPILOT_WEAPON | null = resolve_helper_dotpath(options, weapon_path);

  // Generate commons
  if (!weapon) {
    // Make an empty ref. Note that it still has path stuff if we are going to be dropping things here
    return `<div class="${EntryType.PILOT_WEAPON} ref drop-settable card flexrow" 
                        data-path="${weapon_path}" 
                        data-accept-types="${EntryType.PILOT_WEAPON}">
          <img class="ref-icon" src="${TypeIcon(EntryType.PILOT_WEAPON)}"></img>
          <span class="major">Equip weapon</span>
      </div>`;
  }

  let loading = "";
  // Generate loading segment as needed
  if (weapon.system.tags.some(t => t.is_loading)) {
    loading = loading_indicator(weapon.system.loaded, weapon_path);
  }
  // Generate limited segment as needed
  let limited = "";
  if (weapon.system.tags.some(t => t.is_limited)) {
    limited_uses_indicator(weapon, weapon_path);
  }

  return `<div class="set ${EntryType.PILOT_WEAPON} ref drop-settable card clipped pilot-weapon-compact item"
                ${ref_params(weapon, weapon_path)} 
                data-accept-types="${EntryType.PILOT_WEAPON}">
    <div class="lancer-header">
      <i class="cci cci-weapon i--m i--light"> </i>
      <span class="minor">${weapon.name}</span>
              <a class="lancer-context-menu" data-path="${weapon_path}"">
                <i class="fas fa-ellipsis-v"></i>
              </a>
    </div>
    <div class="flexcol">
      <div class="flexrow">
        <a class="flexrow roll-attack" style="max-width: min-content;">
          <i class="fas fa-dice-d20 i--sm i--dark"></i>
          
        </a>
        ${show_range_array(weapon.system.range, options)}
        <hr class="vsep">
        ${show_damage_array(weapon.system.damage, options)}
        
        ${inc_if(`<hr class="vsep"><div class="uses-wrapper">`, loading || limited)}
        <!-- Loading toggle, if we are loading-->
        ${loading}
        <!-- Limited toggle if we are limited-->
        ${limited}
        ${inc_if(`</div>`, loading || limited)}
      </div>

      ${compact_tag_list(weapon_path + ".system.tags", weapon.system.tags, false)}
    </div>
  </div>`;
}

// Helper for showing a pilot gear, or a slot to hold it (if path is provided)
export function pilot_gear_refview(gear_path: string, options: HelperOptions): string {
  // Fetch the item
  let gear = resolve_dotpath(options.data?.root, gear_path) as LancerPILOT_GEAR | null;

  if (!gear) {
    // Make an empty ref. Note that it still has path stuff if we are going to be dropping things here
    return `<div class="${EntryType.PILOT_GEAR} ref drop-settable card flexrow" 
                        data-path="${gear_path}" 
                        data-accept-types="${EntryType.PILOT_GEAR}">
          <img class="ref-icon" src="${TypeIcon(EntryType.PILOT_GEAR)}"></img>
          <span class="major">Equip gear</span>
      </div>`;
  }

  // Conditionally show uses
  let uses = "";
  if (gear.getLimitedBase()) {
    uses = limited_uses_indicator(gear, gear_path);
  }

  return `<div class="set ${EntryType.PILOT_GEAR} ref drop-settable card clipped item"
                ${ref_params(gear, gear_path)} 
                data-accept-types="${EntryType.PILOT_GEAR}">
    <div class="lancer-header">
      <i class="cci cci-generic-item i--m"> </i>
      <a class="gear-macro"><i class="mdi mdi-message"></i></a>
      <span class="minor">${gear.name!}</span>
      <a class="lancer-context-menu" data-path="${gear_path}"">
        <i class="fas fa-ellipsis-v"></i>
      </a>
    </div>
    <div class="flexcol">
      <div class="uses-wrapper">
        ${uses}
      </div>

      <div class="effect-text" style=" padding: 5px">
        ${gear.system.description}
      </div>

      ${compact_tag_list(gear_path + ".system.tags", gear.system.tags, false)}
    </div>
  </div>`;
}

export function bond_power_uses_indicator(item: LancerBOND, power_index: number, path: string): string {
  const power = item.system.powers[power_index];
  if (!power.uses) return "";
  const hexes = hex_array(power.uses.value, power.uses.max, path, "power-uses-hex");
  return `<div class="clipped card limited-card">
    <div class="flexcol"><span>USES</span><div>${hexes.join("")}</div></div>
  </div>`;
}

// Helper for showing a reserve, or a slot to hold it (if path is provided)
export function reserve_refview(reserve_path: string, options: HelperOptions): string {
  // Fetch the item
  let reserve = resolve_helper_dotpath(options, reserve_path) as LancerRESERVE | null;

  // Generate commons
  if (!reserve) {
    // Make an empty ref. Note that it still has path stuff if we are going to be dropping things here
    return `<div class="${EntryType.RESERVE} ref drop-settable card flexrow"
                        data-path="${reserve_path}"
                        data-accept-types="${EntryType.RESERVE}">
          <img class="ref-icon" src="${TypeIcon(EntryType.RESERVE)}"></img>
          <span class="major">Equip reserve</span>
      </div>`;
  }

  let icon = "";
  const resTypes = [
    ReserveType.Mech,
    ReserveType.Organization,
    ReserveType.Project,
    ReserveType.Resources,
    ReserveType.Tactical,
    "Resource", // machine-mind bug? Reserves from Comp/Con are Resource instead of Resources
    "Bonus",
  ];
  let resType = resTypes.includes(reserve.system.type)
    ? reserve.system.type
    : resTypes.includes(reserve.system.label)
    ? reserve.system.label
    : reserve.system.type;
  switch (resType) {
    case "Bonus": // missing?
      icon = "cci cci-accuracy";
      break;
    case ReserveType.Mech:
      icon = "cci cci-reserve-mech";
      break;
    case ReserveType.Organization:
      icon = "mdi mdi-account-multiple";
      break;
    case ReserveType.Project:
      icon = "cci cci-orbital";
      break;
    case ReserveType.Resources:
    case "Resource": // machine-mind bug?
      icon = "cci cci-reserve-resource";
      break;
    case ReserveType.Tactical:
      icon = "cci cci-reserve-tac";
      break;
    default:
      icon = "cci cci-reserve-tac";
      break;
  }
  let uses = "";
  if (reserve.system.consumable) {
    uses = reserve_used_indicator(reserve_path, options);
  }

  return `<div class="set ${EntryType.RESERVE} ref drop-settable card clipped item"
                ${ref_params(reserve, reserve_path)} >
    <div class="lancer-header">
      <i class="${icon} i--m"> </i>
      <a class="reserve-macro"><i class="mdi mdi-message"></i></a>
      <span class="minor">${reserve.name}</span>
      <a class="lancer-context-menu" data-path="${reserve_path}"">
        <i class="fas fa-ellipsis-v"></i>
      </a>
    </div>
    <div class="flexcol">
      <div class="flexrow">
        <div class="effect-text" style=" padding: 5px">
          ${reserve.system.description}
        </div>
        ${uses}
      </div>
    </div>
  </div>`;
}

/**
 * Handlebars helper for a mech weapon preview card. Doubles as a slot. Mech path needed for bonuses
 * SPECIFICALLY for loadout - expects things to be slot based
 */
export function mech_loadout_weapon_slot(
  weapon_path: string,
  mod_path: string,
  size: FittingSize, // Needed if slot is empty
  options: HelperOptions
): string {
  // Fetch the item(s)
  let weapon: LancerMECH_WEAPON | null = resolve_helper_dotpath(options, weapon_path);
  if (!weapon) {
    // Make an empty ref. Note that it still has path stuff if we are going to be dropping things here
    return `
      <div class="${EntryType.MECH_WEAPON} ref slot drop-settable card flexrow" 
           data-path="${weapon_path}" 
           data-accept-types="${EntryType.MECH_WEAPON}">
        <img class="ref-icon" src="${TypeIcon(EntryType.MECH_WEAPON)}"></img>
        <span class="major">Insert ${size ? size : "any"} weapon</span>
      </div>`;
  } else {
    return mech_weapon_display(weapon_path, mod_path, options);
  }
}

export function mech_weapon_display(weapon_path: string, mod_path: string | null, options: HelperOptions): string {
  let actor: LancerActor | null = resolve_helper_dotpath(options, "actor");
  let weapon = resolve_helper_dotpath<LancerMECH_WEAPON>(options, weapon_path);
  let mod_text = mod_path ? weapon_mod_ref(mod_path, weapon_path, options) : "";
  let collapse = resolve_helper_dotpath<CollapseRegistry>(options, "collapse");

  if (!weapon) return "";

  // Do we need a profile selector?
  let profiles = "";
  if (weapon.system.profiles.length > 1) {
    profiles = `<div class="flexrow weapon-profile-wrapper">`;
    for (let i = 0; i < weapon.system.profiles.length; i++) {
      let p = weapon.system.profiles[i];
      profiles += `<a class="gen-control weapon-profile ${
        i === weapon.system.selected_profile_index ? "selected-profile" : ""
      }"
data-action="set" data-action-value="(int)${i}" data-path="${weapon_path}.system.selected_profile_index">
<span class="minor">${p.name}</span>
</a>`;
    }
    profiles += `</div>`;
  }

  let sp = sp_display(weapon.system.sp ?? 0);

  // What profile are we using?
  let profile = weapon.system.active_profile;
  let profile_path = `${weapon_path}.profiles.${weapon.system.selected_profile_index}`;

  // Augment ranges
  /*
  if (mech) {
    ranges = Range.CalcTotalRangeWithBonuses(weapon, weapon.system.selected_profile_index, mech, mod ?? undefined);
  }

  // Augment tags
  let tags = profile.tags;
  if (mod) {
    tags = Tag.MergeTags(tags, mod.system.added_tags);
  }
  */

  // Generate loading segment as needed
  let loading = "";
  if (weapon.system.all_tags.some(t => t.is_loading)) {
    loading = loading_indicator(weapon.system.loaded, weapon_path);
  }

  // Generate effects
  let effect = profile.effect ? effect_box("Effect", profile.effect) : "";
  let on_attack = profile.on_attack ? effect_box("On Attack", profile.on_attack) : "";
  let on_hit = profile.on_hit ? effect_box("On Hit", profile.on_hit) : "";
  let on_crit = profile.on_crit ? effect_box("On Crit", profile.on_crit) : "";

  let limited = "";
  if (weapon.system.all_tags.some(t => t.is_limited)) {
    limited = limited_uses_indicator(weapon, weapon_path);
  }

  return `
  <div class="mech-weapon-wrapper${mod_text ? "-modded" : ""}">
    <div class="ref set drop-settable ${EntryType.MECH_WEAPON} flexcol item"
                  ${ref_params(weapon, weapon_path)}
                  data-accept-types="${EntryType.MECH_WEAPON}"
                  style="max-height: fit-content;">
      <div class="lancer-header ${weapon.system.destroyed ? "destroyed" : ""}">
        <i class="${weapon.system.destroyed ? "mdi mdi-cog" : "cci cci-weapon i--m i--light"}"> </i>
        <span class="minor" >
          ${weapon.name} // ${weapon.system.size.toUpperCase()} ${profile.type.toUpperCase()}
        </span>
        ${collapseButton(collapse, weapon)}
        <a class="lancer-context-menu" data-path="${weapon_path}">
          <i class="fas fa-ellipsis-v"></i>
        </a>
      </div> 
      <div class="lancer-body collapse" ${collapseParam(collapse, weapon, true)}>
        ${weapon.system.sp ? `<strong>${weapon.system.sp} SP</strong>` : ""}
        ${profiles}
        <div class="flexrow" style="text-align: left; white-space: nowrap;">
          <a class="roll-attack"><i class="fas fa-dice-d20 i--m i--dark"></i></a>
          <hr class="vsep">
          ${show_range_array(profile.range, options)}
          <hr class="vsep">
          ${show_damage_array(profile.damage, options)}

          ${inc_if(`<hr class="vsep"><div class="uses-wrapper">`, loading || limited)}
          <!-- Loading toggle, if we are loading-->
          ${loading}
          <!-- Limited toggle if we are limited-->
          ${limited}
          ${inc_if(`</div>`, loading || limited)}
        </div>
        
        <div class="flexcol">
          ${effect}
          ${on_attack}
          ${on_hit}
          ${on_crit}
          ${compact_tag_list(profile_path + ".tags", profile.tags, false)}
        </div>
        ${mod_text}
      </div>
    </div>
  </div>`;
}

export function loading_indicator(loaded: boolean, weapon_path: string): string {
  let loading_icon = `mdi ${loaded ? "mdi-hexagon-slice-6" : "mdi-hexagon-outline"} loaded-hex`;
  let indicator = `<a class="gen-control" data-action="set" data-action-value="(bool)${!loaded}" data-path="${weapon_path}.system.loaded"><i class="${loading_icon} i--m"></i></a>`;
  return `<div class="clipped card limited-card">LOADED ${indicator}</div>`;
}

// Renders a weapon mod slot
export function weapon_mod_ref(mod_path: string, weapon_path: string | null, options: HelperOptions): string {
  let mod: LancerWEAPON_MOD | null = resolve_helper_dotpath(options, mod_path);
  let weapon: LancerMECH_WEAPON | null = weapon_path ? resolve_helper_dotpath(options, weapon_path) : null;
  if (!mod) {
    return `<div class="${EntryType.WEAPON_MOD} ref slot drop-settable card flexrow"
        data-path="${mod_path}"
        data-accept-types="${EntryType.WEAPON_MOD}">
      <i class="cci cci-weaponmod i--m i--light"> </i>
      <span>No Mod Installed</span>
    </div>`;
  }

  let sp = mod.system.sp ? sp_display(mod.system.sp) : "";
  let limited = mod.system.tags.some(t => t.is_limited) ? limited_uses_indicator(mod, mod_path) : "";
  let added_range = "";
  if (mod.system.added_range.length) {
    added_range = `
      <div class="effect-box">
        <div class="effect-title clipped-bot">ADDED RANGE</div>
        ${show_range_array(mod.system.added_range, options)}
      </div>`;
  }
  let added_damage = "";
  if (mod.system.added_damage.length) {
    added_damage = `
      <div class="effect-box">
        <div class="effect-title clipped-bot">ADDED DAMAGE</div>
        ${show_damage_array(mod.system.added_damage, options)}
      </div>`;
  }
  let effect = mod.system.effect ? effect_box("Effect", mod.system.effect) : "";
  let bonuses = mod.system.bonuses.length > 0 ? bonuses_display(`${mod_path}.system.bonuses`, false, options) : "";
  let added_tags = "";
  if (mod.system.added_tags.length) {
    added_tags = `
    <div class="effect-box">
      <span class="effect-title clipped-bot">ADDED TAGS</span>
      ${compact_tag_list(mod_path + ".system.added_tags", mod.system.added_tags, false)}
    </div>
    `;
  }
  let tags = mod.system.tags.length ? compact_tag_list(`${mod_path}.system.tags`, mod.system.tags, false) : "";
  let actions = "";
  if (mod.system.actions.length) {
    actions = buildActionArrayHTML(mod, "system.actions");
  }

  return `
  <div class="set flexcol clipped-top ref ${EntryType.WEAPON_MOD} drop-settable" ${ref_params(
    mod,
    mod_path
  )} data-accept-types="${EntryType.WEAPON_MOD}">
    <div class="lancer-header">
      <i class="cci cci-weaponmod i--m i--light"> </i>
      <span class="minor">${mod.name}</span>
      <a class="lancer-context-menu" data-path="${mod_path}">
        <i class="fas fa-ellipsis-v"></i>
      </a>
    </div>
    <div class="lancer-body">
      <div class="flexrow">${sp} ${limited}</div>
      <div class="flexrow">
        ${added_range}
        ${added_damage}
      </div>
      ${effect}
      ${bonuses}
      ${actions}
      ${added_tags}
      ${tags}
    </div>
  </div>`;
}

// A specific ref helper focused on displaying manufacturer info.
/*
export function manufacturer_ref(source_path: string, options: HelperOptions): string {
  let source_: Manufacturer | null = resolve_helper_dotpath(options, source_path);
  let cd = ref_doc_common_attrs(source_);
  // TODO? maybe do a little bit more here, aesthetically speaking
  if (cd) {
    let source = source_!;
    return `<div class="set ${EntryType.MANUFACTURER} ref ref-card drop-settable" ${ref_params(cd.ref, source_path)}> 
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
*/

// A specific ref helper focused on displaying license info.
// This if for display purposes and does not provide editable fields
export function license_ref(item_path: string, options: HelperOptions): string {
  let license = resolve_helper_dotpath(options, item_path) as LancerLICENSE;
  return `
    <li class="card clipped ref set" ${ref_params(license)}>
      <div class="lancer-header lancer-license-header medium clipped-top" style="grid-area: 1/1/2/3">
        <i class="cci cci-license i--m i--dark"> </i>
        <div class="major modifier-name">${license.name} ${license.system.curr_rank}</div>
        <div class="ref-controls">
          <a class="lancer-context-menu" data-path="${item_path}"">
            <i class="fas fa-ellipsis-v"></i>
          </a>
        </div>
      </div>
    </li>`;
}

export function framePreview(path: string, options: HelperOptions): string {
  let frame = resolve_helper_dotpath<LancerFRAME>(options, path);
  if (!frame) {
    return "";
  } else {
    let frame_img = encodeURI(frameToPath(frame.name) ?? "systems/lancer/assets/icons/frame.svg");
    return `
    <li class="card clipped ref set click-open" ${ref_params(frame)}>
      <div class="compact-frame medium flexrow">
        <span class="img-bar" style="background-image: url(${frame_img})"></span>
        <div class="major modifier-name i--light">${frame.system.manufacturer} ${frame.name}</div>
        <div class="ref-controls">
          <a class="lancer-context-menu" data-path="${path}"">
            <i class="fas fa-ellipsis-v i--light"></i>
          </a>
        </div>
      </div>
    </li>`;
  }
}

export function npc_class_ref(npc_class: LancerNPC_CLASS | null, item_path?: string): string {
  if (!npc_class) {
    return "";
  } else {
    let frame_img = encodeURI(frameToPath(npc_class.name) ?? "systems/lancer/assets/icons/npc_class.svg");
    return `
    <div class="card clipped ref set click-open" ${ref_params(npc_class)}>
      <div class="compact-class medium flexrow">
        <span class="img-bar" style="background-image: url(${frame_img})"></span>
        <div class="major modifier-name i--light">${npc_class.name} // ${npc_class.system.role.toUpperCase()}</div>
        <div class="ref-controls">
          <a class="lancer-context-menu" data-path="${item_path}"">
            <i class="fas fa-ellipsis-v i--light"></i>
          </a>
        </div>
      </div>
    </div>`;
  }
}

export function npc_template_ref(template: LancerNPC_TEMPLATE | null, item_path?: string): string {
  if (!template) {
    return "";
  } else {
    return `
    <div class="card clipped ref set" ${ref_params(template)}>
      <div class="compact-template medium flexrow">
        <span class="img-bar" style="background-image: url(${template.img})"></span>
        <div class="major modifier-name i--light">${template.name}</div>
        <div class="ref-controls">
          <a class="lancer-context-menu" data-path="${item_path}"">
            <i class="fas fa-ellipsis-v i--light"></i>
          </a>
        </div>
      </div>
    </div>`;
  }
}

export function action_type_icon(a_type: string) {
  const a = a_type ? a_type.toLowerCase() : ActivationType.None.toLowerCase();
  let html = "";
  switch (a) {
    case ActivationType.Full.toLowerCase():
      html += `<i class="cci cci-activation-full i--m"></i>`;
      break;
    case ActivationType.Quick.toLowerCase():
      html += `<i class="cci cci-activation-quick i--m"></i>`;
      break;
    case ActivationType.Reaction.toLowerCase():
      html += `<i class="cci cci-reaction i--m"></i>`;
      break;
    case ActivationType.Protocol.toLowerCase():
      html += `<i class="cci cci-protocol i--m"></i>`;
      break;
    case ActivationType.Free.toLowerCase():
      html += `<i class="cci cci-free-action i--m"></i>`;
      break;
    case ActivationType.FullTech.toLowerCase():
      html += `<i class="cci cci-tech-full i--m"></i>`;
      break;
    case ActivationType.QuickTech.toLowerCase():
    case ActivationType.Invade.toLowerCase():
      html += `<i class="cci cci-tech-quick i--m"></i>`;
      break;
  }
  return html;
}

/**
 * Builds the HTML for a given action in a given document
 * @param doc  Document which holds the action
 * @param path  Path to the action within the document
 * @param options Options such as:
 *        full    Determines if we should generate full HTML info or just mini version (title & action)
 *        tags    If we should show tags here
 * @returns Activation HTML in string form
 */
export function buildActionHTML(
  doc: LancerItem | LancerActor,
  path: string,
  options?: { editable?: boolean; full?: boolean; tags?: boolean }
): string {
  let action = resolve_dotpath<ActionData>(doc, path);
  if (!action) return "";
  let detailText: string | undefined;
  let chip: string | undefined;
  let tags: string | undefined;
  let editor: string | undefined;

  // Not using type yet but let's plan forward a bit
  let icon: ChipIcons | undefined;

  // If we don't have a trigger do a simple detail
  if (!action.trigger)
    detailText = `
      <div class="action-detail">
        <hr class="hsep">
        ${action.detail}
      </div>`;
  // Otherwise, look to be explicit about which is which
  else {
    detailText = `
      <div class="action-detail ${options?.full ? "" : "collapsed"}">
        <hr class="hsep">
        <div class="overline">${game.i18n.localize("lancer.chat-card.label.trigger")}</div> 
        <div>${action.trigger}</div>
        <div class="overline">${game.i18n.localize("lancer.chat-card.label.effect")}</div> 
        <div>${action.detail}</div> 
      </div>`;
  }

  // Deduce what type of action it is broadly. Tech? Deployable? Normal? It wouldn't be a weapon, not here anyways
  switch (action.activation) {
    case ActivationType.QuickTech:
    case ActivationType.FullTech:
    case ActivationType.Invade:
      icon = ChipIcons.Roll;
      break;
    default:
      icon = ChipIcons.Chat;
      break;
  }

  chip = buildChipHTML(action.activation, { icon: icon, uuid: doc.uuid, path: path });

  if (options?.editable) {
    // If it's editable, it's deletable
    editor = `
    <div class="action-editor-wrapper">
      <a class="gen-control" data-uuid="${doc.uuid} data-action="splice" data-path="${path}"><i class="fas fa-trash"></i></a>
      <a class="action-editor fas fa-edit" data-path="${path}"></a>
    </div>`;
  }

  if (options?.tags && doc instanceof LancerItem && doc.getTags()) {
    tags = compact_tag_list("", doc.getTags()!, false);
  }

  return `
  <div class="action-wrapper">
    <div class="title-wrapper flexrow">
      ${action_type_icon(action.activation)}
      <span class="action-title collapse-trigger">
        ${action.name?.toUpperCase() ?? doc.name}
      </span>
      ${editor ?? ""}
    </div>
    ${detailText ?? ""}
    ${chip}
    ${tags ?? ""}
  </div>
  `;
}

export function buildActionArrayHTML(doc: LancerActor | LancerItem, path: string): string {
  let actions = resolve_dotpath<Array<ActionData>>(doc, path, []);
  let cards = actions.map((_, i) => buildActionHTML(doc, `${path}.${i}`));
  return cards.join("");
}

/**
 * Builds the HTML for a given in-system deployable.
 * @param item  Path to this item
 * @param array_path  Path to this deployables (LID) location relative to item
 * @returns Activation HTML in string form
 */
export function buildDeployablesArray(item: LancerItem, array_path: string, options: HelperOptions): string {
  let cards = [] as string[];
  let lids = resolve_dotpath<Array<string>>(item, array_path, []);
  for (let lid of lids) {
    let dep = resolve_helper_dotpath<LancerDEPLOYABLE>(options, `deployables.${lid}`);
    if (dep) {
      cards.push(
        buildDeployableHTML(
          dep,
          {
            item,
            path: array_path,
          },
          options.hash["full"] ?? false
        )
      );
    } else {
      cards.push(`<span>Unresolved deployabled LID "${lid}". Re-import + Set yourself as its owner</span>`);
    }
  }
  return cards.join("");
}

/**
 * Builds the HTML for a given deployable.
 * @param dep The deployable, already resolved
 * @param source Information about where it came from, if applicable
 * @returns Activation HTML in string form
 */
export function buildDeployableHTML(
  dep: LancerDEPLOYABLE,
  source: {
    item: LancerItem;
    path: string;
  } | null,
  full: boolean
): string {
  let detailText: string | undefined;
  let chip: string;

  detailText = "";
  if (full)
    detailText = `
    <div class="deployable-detail">
      <hr class="hsep">
      ${dep.system.detail}
    </div>`;

  // All places we could get our activation, in preferred order
  let activation = dep.system.activation;

  if (source) {
    chip = buildChipHTML(activation, { icon: ChipIcons.Deployable, uuid: source.item.uuid, path: source.path });
  } else {
    chip = buildChipHTML(activation, { icon: ChipIcons.Deployable });
  }

  return `
  <div class="deployable-wrapper ref set click-open" ${ref_params(dep)}>
    <img style="grid-area: img; border: none" src="${encodeURI(dep.img!)}">
    <div style="grid-area: title" class="title-wrapper">
      <span class="deployable-title">
        ${dep.name ? dep.name.toUpperCase() : ""}
      </span>
    </div>
    <div style="grid-area: desc">${detailText ? detailText : ""}</div>
    <div style="grid-area: chip">${chip}</div>
  </div>
  `;
}

/** Build a little clickable chip to activate an item.
 * If trying to use a deployable, you should still provide the item uuid & the path to the deployable within it
 *
 * @param activation The type of activation.
 * @param macroData More substantive information about it
 * @returns
 */
export function buildChipHTML(
  activation: ActivationType,
  macroData?: {
    icon?: ChipIcons;

    // These must be provided together
    uuid?: string;
    path?: string;

    // Or just provide a prebuilt invocation
    fullData?: LancerFlowState.InvocationData | null;
  }
): string {
  if (macroData && (macroData.fullData || (macroData.uuid && macroData.path !== undefined))) {
    if (!macroData.icon) macroData.icon = ChipIcons.Chat;
    let data: string | undefined;
    if (macroData?.fullData) {
      data = `data-macro=${encodeMacroData(macroData.fullData)}`;
    } else {
      data = `data-uuid=${macroData.uuid} data-path="${macroData.path}"`;
    }
    return `<a class="${macroData?.fullData ? "lancer-macro" : "activation-macro"} activation-chip activation-${slugify(
      activation,
      "-"
    )}" ${data}>
            ${macroData.icon ? macroData.icon : ""}
            ${activation.toUpperCase()}
          </a>`;
  } else return `<div class="activation-chip activation-${activation.toLowerCase()}">${activation.toUpperCase()}</div>`;
}

export function buildSystemHTML(system: LancerMECH_SYSTEM): string {
  let eff: string | undefined;
  let actions: string | undefined;
  let deployables: string | undefined;
  let useFirstActivation = false;

  if (system.system.effect) eff = system.system.effect;
  else {
    // If our first action doesn't have a name & we don't have an effect then first action is our "effect"
    // Always first action? Or a better way?
    useFirstActivation = system.system.actions.length ? !system.system.actions[0].name : false;
  }

  if (system.system.actions) {
    actions = buildActionArrayHTML(system, "system.action");
  }

  if (system.system.deployables) {
    deployables = ""; /* system.system.deployables
      .map((d, i) => {
        return d.status == "resolved" ? buildDeployableHTML(d.value, false) : d.status;
      })
      .join("");*/
  }

  let html = `<div class="card clipped-bot system-wrapper" ${ref_params(system)} style="margin: 0px;">
  <div class="lancer-header mech-system">// SYSTEM :: ${system.name} //</div>
  ${eff ? eff : ""}
  ${actions ? actions : ""}
  ${deployables ? deployables : ""}
  ${compact_tag_list("data.Tags", system.system.tags, false)}
</div>`;
  return html;
}

// This has gotten very messy to account for the pilots, should refactor - TODO
export function buildCounterHTML(data: CounterData, path: string, can_delete?: boolean): string {
  let hexes = [...Array(data.max)].map((_ele, index) => {
    const available = index + 1 <= data.value;
    return `<i class="counter-hex mdi ${
      available ? "mdi-hexagon-slice-6" : "mdi-hexagon-outline"
    } theme--light" data-available="${available}" data-path="${path}"></i>`;
  });

  return `
  <div class="card clipped-bot counter-wrapper" data-path="${path}">
    ${buildCounterHeader(data, path, can_delete)}
    <div class="flexrow flex-center no-wrap">
      <button class="clicker-minus-button hex" type="button">-</button>
      ${hexes.join("")}
      <button class="clicker-plus-button hex" type="button">+</button>
    </div>
  </div>`;
}

/**
 * NOTE IT DOES NOT INCLUDE TRAILING /div tag!
 */
export function buildCounterHeader(data: CounterData, path: string, can_delete?: boolean): string {
  //
  return `
    <div class="lancer-header">
      <span>// ${data.name} //</span>
      <a class="lancer-context-menu" data-path="${path}" data-can-delete="${can_delete ? can_delete : false}">
        <i class="fas fa-ellipsis-v"></i>
      </a>
    </div>`;
}

export function buildCounterArrayHTML(
  counters: CounterData[] | { counter: CounterData; source: any }[],
  path: string,
  fully_editable?: boolean
): string {
  let counter_detail = "";
  let counter_arr: CounterData[] | undefined;

  function isCounters(array: CounterData[] | { counter: CounterData; source: any }[]): array is CounterData[] {
    return !("counter" in array[0]);
  }

  // Is our path sourced or direct?
  if (counters.length > 0) {
    if (isCounters(counters)) {
      for (let i = 0; i < counters.length; i++) {
        counter_detail = counter_detail.concat(buildCounterHTML(counters[i], path.concat(`.${i}`)));
      }
    } else {
      counter_arr = counters.map(x => {
        return x.counter;
      });
      for (let i = 0; i < counters.length; i++) {
        counter_detail = counter_detail.concat(buildCounterHTML(counter_arr[i], path.concat(`.${i}.counter`)));
      }
    }
  }

  return `
  <div class="card clipped double">
    <span class="lancer-header submajor ">
      COUNTERS
      <a class="gen-control fas fa-plus" data-action="append" data-path="${path}"
       data-action-value="(struct)counter"></a>
    </span>
    ${counter_detail}
  </div>`;
}

export function generic_counter(name: string, data: FullBoundedNum, path: string): string {
  const counterData: CounterData = {
    name,
    min: data.min,
    max: data.max,
    value: data.value,
    default_value: data.min,
    lid: "",
  };
  return buildCounterHTML(counterData, path, false);
}

async function _updateCounterData(root_doc: LancerActor | LancerItem, path: string, delta: number) {
  let dd = drilldownDocument(root_doc, path);
  const counter = dd.terminus as CounterData;
  const min = counter.min || 0;
  const max = counter.max || 6;

  let new_val = counter.value + delta;
  if (new_val < min) new_val = min;
  if (new_val > max) new_val = max;

  dd.sub_doc.update({ [dd.sub_path + ".value"]: new_val });
}

// Handles  +/- buttons around _an input_
export function handleInputPlusMinusButtons(html: JQuery, root_doc: LancerActor | LancerItem) {
  const mod_handler =
    (delta: number) => async (evt: JQuery.ClickEvent<HTMLElement, undefined, HTMLElement, HTMLElement>) => {
      evt.stopPropagation();
      const elt = $(evt.currentTarget).siblings("input")[0] as HTMLInputElement;
      const path = elt.name;
      if (path) {
        let dd = drilldownDocument(root_doc, path);
        dd.sub_doc.update({ [dd.sub_path]: elt.valueAsNumber + delta });
      }
    };

  // Behavior is identical, just +1 or -1 depending on button
  let decr = html.find('button[class*="clicker-minus-button"].input-update');
  decr.on("click", mod_handler(-1));
  let incr = html.find('button[class*="clicker-plus-button"].input-update');
  incr.on("click", mod_handler(+1));
}

// Handles +/- buttons and hex clickables for _counters_
export function handleCounterInteraction(html: JQuery, root_doc: LancerActor | LancerItem) {
  // Make the hexes themselves clickable
  html.find(".counter-hex").on("click", async evt => {
    evt.stopPropagation();
    const elt = evt.currentTarget;
    const path = elt.dataset.path;
    const available = elt.dataset.available === "true";
    if (path) {
      _updateCounterData(root_doc, path, available ? -1 : 1);
    }
  });

  // Make the +/- buttons clickable
  const mod_handler =
    (delta: number) => async (evt: JQuery.ClickEvent<HTMLElement, undefined, HTMLElement, HTMLElement>) => {
      evt.stopPropagation();
      const elt = $(evt.currentTarget).siblings(".counter-hex")[0];
      const path = elt.dataset.path;
      if (path) {
        _updateCounterData(root_doc, path, delta);
      }
    };

  // Behavior is identical, just +1 or -1 depending on button
  let decr = html.find('button[class*="clicker-minus-button"].hex');
  decr.on("click", mod_handler(-1));
  let incr = html.find('button[class*="clicker-plus-button"].hex');
  incr.on("click", mod_handler(+1));
}

export function handlePowerUsesInteraction<T>(html: JQuery, doc: LancerActor | LancerItem) {
  let elements = html.find(".power-uses-hex");
  elements.on("click", async ev => {
    ev.stopPropagation();

    const params = ev.currentTarget.dataset;
    if (params.path) {
      const pathParts = params.path.split(".");
      const powerIndex = parseInt(pathParts[pathParts.length - 1]);
      const dd = drilldownDocument(doc, params.path);
      const item = dd.sub_doc as LancerBOND;
      const power = item.system.powers[powerIndex];
      const available = params.available === "true";
      if (!item || !power || !power.uses) return;

      let newUses = power.uses.value;
      if (available) {
        // Deduct uses.
        newUses = Math.max(newUses - 1, power.uses.min);
      } else {
        // Increment uses.
        newUses = Math.min(newUses + 1, power.uses.max);
      }
      item.update({ [`system.powers.${powerIndex}.uses.value`]: newUses });
    }
  });
}

/**
 * Attach context menus to the appropriate elements and events
 * @param html The html to bind listeners to
 * @param doc Document to be modified
 * @param view_only If edit options should be presented
 */
export function handleContextMenus(html: JQuery, doc: LancerActor | LancerItem, view_only: boolean = false) {
  _handleContextMenus(html, ".lancer-context-menu", "click", doc, view_only);
  _handleContextMenus(html, ".weapon-profile-tab", "contextmenu", doc, view_only);
  _handleContextMenus(html, ".tag-list-append > .editable-tag-instance", "contextmenu", doc, view_only);
}

/** Handles context menus for
 * - Viewing an item sheet
 * - Marking items destroyed
 * - Deleting items
 * - Removing items from slots
 * - Edit counters
 * - Remove counters/tags
 * - Rename weapon profiles (and possibly more?)
 * - TODO: more, perhaps
 * @param html The html to bind listeners to
 * @param selector CSS selector to narrow which elements to bind to
 * @param event The event to listen for
 * @param doc Document to be modified
 * @param view_only If edit options should be presented
 */
function _handleContextMenus(
  html: JQuery,
  selector: string,
  event: string,
  doc: LancerActor | LancerItem,
  view_only: boolean
) {
  // Define some common utilities
  const path = (html: JQuery) => (html[0].dataset.path || null) as string | null;
  const dd = (html: JQuery) => (path(html) ? drilldownDocument(doc, path(html)!) : null);

  // Renders the sheet for the document referenced at data-path
  let edit: ContextMenuEntry = {
    name: view_only ? "View" : "Edit",
    icon: view_only ? `<i class="fas fa-eye"></i>` : `<i class="fas fa-edit"></i>`,
    callback: html => {
      let found_doc = dd(html)?.terminus as LancerActor | LancerItem | null;
      if (found_doc) {
        let sheet = found_doc.sheet;
        // If the sheet is already rendered:
        if (sheet?.rendered) {
          sheet.maximize().then(() => sheet!.bringToTop());
        }
        // Otherwise render the sheet
        else sheet?.render(true);
      }
    },
    condition: html => dd(html)?.terminus instanceof foundry.abstract.Document,
  };

  // Renders the editor for the effect referenced at data-path
  let edit_effect: ContextMenuEntry = {
    name: view_only ? "View" : "Edit",
    icon: view_only ? `<i class="fas fa-eye"></i>` : `<i class="fas fa-edit"></i>`,
    callback: html => {
      // @ts-expect-error
      let effects = [...doc.allApplicableEffects()];
      let index = parseInt(html[0].dataset.activeEffectIndex ?? "-1");
      if (effects[index]) {
        let sheet = effects[index].sheet;
        // If the sheet is already rendered:
        if (sheet?.rendered) {
          sheet.maximize().then(() => sheet!.bringToTop());
        }
        // Otherwise render the sheet
        else sheet?.render(true);
      }
    },
    condition: html => html[0].dataset.activeEffectIndex != undefined,
  };

  // Toggle destroyed status, for items that support it
  let repair_item: ContextMenuEntry = {
    name: "Mark Repaired",
    icon: `<i class="fas fa-fw fa-wrench"></i>`,
    callback: html => {
      let item = dd(html)?.terminus as LancerMECH_SYSTEM | LancerMECH_WEAPON | LancerNPC_FEATURE | null;
      item?.update({ "system.destroyed": !item!.system.destroyed });
    },
    condition: html => {
      let item = dd(html)?.terminus as LancerItem | null;
      return (
        !view_only &&
        item instanceof LancerItem &&
        (item.is_mech_system() || item.is_mech_weapon() || item.is_npc_feature()) &&
        item.system.destroyed
      );
    },
  };

  // Toggle destroyed status, for items that support it
  let destroy_item: ContextMenuEntry = {
    name: "Mark Destroyed",
    icon: `<i class="cci cci-eclipse"></i>`,
    callback: html => {
      let item = dd(html)?.terminus as LancerMECH_SYSTEM | LancerMECH_WEAPON | LancerNPC_FEATURE | null;
      item?.update({ "system.destroyed": !item!.system.destroyed });
    },
    condition: html => {
      let item = dd(html)?.terminus as LancerItem | null;
      return (
        !view_only &&
        item instanceof LancerItem &&
        (item.is_mech_system() || item.is_mech_weapon() || item.is_npc_feature()) &&
        !item.system.destroyed
      );
    },
  };

  // Fully delete a document
  let delete_document: ContextMenuEntry = {
    name: "Delete Document",
    icon: '<i class="fas fa-fw fa-trash"></i>',
    callback: async (html: JQuery) => {
      (dd(html)?.terminus as foundry.abstract.Document<any, any> | null)?.delete();
    },
    condition: html => !view_only && dd(html)?.terminus instanceof foundry.abstract.Document,
  };

  // Sets a reference to null
  // Logic elsewhere will clean up the array item (if any) if said array item would be problematic left blank
  let clear_reference: ContextMenuEntry = {
    name: "Unlink",
    icon: '<i class="fas fa-times"></i>',
    callback: async (html: JQuery) => {
      // Set as null
      doc.update({ [path(html)!]: null });
    },
    condition: html => {
      // We support this if the path ends with a .value, and the ref has a truthy value
      let p = path(html);
      if (!p?.endsWith(".value")) return false;
      return !!(!view_only && dd(html)?.terminus);
    },
  };

  // Remove an array item (e.x. a counter or weapon profile)
  let array_remove: ContextMenuEntry = {
    name: "Remove",
    icon: '<i class="fas fa-fw fa-trash"></i>',
    callback: (html: JQuery) => {
      // Find the counter
      // let change = array_path_edit_changes(dd.sub_doc, dd.sub_path, null, "delete");
      // dd.sub_doc.update({ [change.path]: change.new_val });
    },
    condition: () => !view_only && false, // TODO - fix so counters etc an be removed
  };

  // Summon counter editor dialogue
  let counter_edit: ContextMenuEntry = {
    name: "Edit",
    icon: `<i class="fas fa-edit"></i>`,
    callback: html => {
      CounterEditForm.edit(doc, path(html)!);
    },
    condition: html => !view_only && !!path(html)?.includes("counters"), // Crude but effective
  };

  // Summon a tag editor dialog
  let tag_edit: ContextMenuEntry = {
    name: "Edit",
    icon: '<i class="fas fa-edit"></i>',
    callback: html => {
      TagEditForm.edit(doc, path(html)!);
    },
    condition: html => !view_only && !!path(html)?.includes("tags"), // Crude but effective
  };

  // If the "renameSubpath" appears in the dataset, allow simple-prompt to change the name
  let rename: ContextMenuEntry = {
    name: "Rename",
    icon: '<i class="fas fa-fw fa-edit"></i>',
    callback: async html => {
      let full_path = path(html)! + html[0].dataset.renameSubpath;
      let old_val = drilldownDocument(doc, full_path).terminus as string;
      let new_val = await promptText("Rename profile", old_val);
      if (new_val) {
        doc.update({
          [full_path]: new_val,
        });
      }
    },
    condition: html => !!(!view_only && html[0].dataset.renameSubpath && dd(html)?.terminus),
  };

  let all = [
    edit,
    edit_effect,
    repair_item,
    destroy_item,
    delete_document,
    clear_reference,
    array_remove,
    counter_edit,
    tag_edit,
    rename,
  ];

  // Finally, setup the context menu
  tippyContextMenu(html.find(selector), event, all);
}
