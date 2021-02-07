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
} from "machine-mind";
import { MechWeapon } from "machine-mind";
import { BonusEditDialog } from "../apps/bonus-editor";
import { TypeIcon } from "../config";
import { npc_reaction_effect_preview, npc_system_effect_preview, npc_tech_effect_preview, npc_trait_effect_preview, npc_weapon_effect_preview } from "./npc";
import { compact_tag_list } from "./tags";
import { effect_box, IconFactory, inc_if, resolve_dotpath, resolve_helper_dotpath, selected, std_checkbox, std_enum_select, std_num_input, std_string_input, std_x_of_y } from "./commons";
import { ref_commons, ref_params  } from "./refs";

/**
 * Handlebars helper for weapon size selector
 */
export function weapon_size_selector(size_path: string, helper: HelperOptions) {
  let curr_size: WeaponSize = resolve_helper_dotpath(helper, size_path);
  return std_enum_select(size_path, WeaponSize, curr_size, WeaponSize.Main);
}

/**
 * Handlebars helper for weapon type selector. First parameter is the existing selection.
 */
export function weapon_type_selector(type_path: string, helper: HelperOptions) {
  let curr_type: WeaponType = resolve_helper_dotpath(helper, type_path);
  return std_enum_select(type_path, WeaponType, curr_type, WeaponType.Rifle);
}

/**
 * Handlebars helper for range type/value editing
 */
export function range_editor(range: Range, data_target_prefix: string) {
  let icon_html = `<i class="cci ${range.Icon} i--m i--dark"></i>`;
  /* TODO: For a next iteration--would be really nifty to set it up to select images rather than text. 
    But that seems like a non-trivial task...
    <img class="med-icon" src="../systems/lancer/assets/icons/range.svg">
    <img class="med-icon" src="../systems/lancer/assets/icons/aoe_blast.svg">
    <img class="med-icon" src="../systems/lancer/assets/icons/damage_explosive.svg">
  */
  let range_type_selector = std_enum_select(data_target_prefix + ".RangeType", RangeType, range.RangeType, RangeType.Range);

  let value_input = std_string_input(data_target_prefix + ".Value", "", range.Value);

  return `<div class="flexrow flex-center" style="padding: 5px;">
    ${icon_html}
    ${range_type_selector}
    ${value_input}
  </div>
  `;
}

/**
 * Handlebars helper for weapon damage type/value editing
 */
export function damage_editor(damage: Damage, data_target_prefix: string) {
  let icon_html = `<i class="cci ${damage.Icon} i--m i--dark"></i>`;

  let damage_type_selector = std_enum_select(data_target_prefix + ".DamageType", DamageType, damage.DamageType, DamageType.Kinetic);

  let value_input = std_string_input(data_target_prefix + ".Value", "", damage.Value);

  return `<div class="flexrow flex-center" style="padding: 5px;">
    ${icon_html}
    ${damage_type_selector}
    ${value_input}
  </div>
  `;
}

/**
 * Handlebars helper for showing damage values
 */
export function show_damage_array(damages: Damage[]): string {
  let results: string[] = [];
  for(let damage of damages) {
    let damage_item = `<span class="compact-damage"><i class="cci ${damage.Icon} i--m i--dark"></i>${damage.Value}</span>`;
    results.push(damage_item);
  }
  return `<div class="flexrow no-grow">${results.join(" ")}</div>`
}

/**
 * Handlebars helper for showing range values
 */
export function show_range_array(ranges: Range[]): string {
  let results: string[] = [];
  for(let range of ranges) {
    let range_item = `<span class="compact-range"><i class="cci ${range.Icon} i--m i--dark"></i>${range.Value}</span>`;
    results.push(range_item);
  }
  return `<div class="flexrow compact-range">${results.join(" ")}</div>`
}

/**
 * Handlebars helper for an NPC feature preview attack bonus stat
 * @param atk {number} Attack bonus to render
 */
export function npc_attack_bonus_preview(atk: number) {
  return `<div class="compact-acc">
    <i class="cci cci-reticule i--m i--dark"></i>
    <span class="medium"> ${atk < 0 ? "-" : "+"}${atk} ATTACK BONUS</span>
  </div>`;
}

/**
 * Handlebars helper for an NPC feature preview accuracy stat
 * @param acc {number} Accuracy bonus to render
 */
export function npc_accuracy_preview(acc: number) {
  let html = ``;
  if (acc > 0) {
    html += `<div class="compact-acc">
      <i class="cci cci-accuracy i--m i--dark"></i>
      <span class="medium"> +${acc} ACCURACY</span>
    </div>`;
  } else if (acc < 0) {
    html += `<div class="compact-acc">
      <i class="cci cci-difficulty i--m i--dark"></i>
      <span class="medium"> +${-acc} DIFFICULTY</span>
    </div>`;
  }
  return html;
}


/**
 * Handlebars partial for weapon type selector
 */
export function system_type_selector(s_type: SystemType, data_target: string) {
  return std_enum_select(data_target, SystemType, s_type, SystemType.System);
}

/**
 * Handlebars partial for limited uses remaining
 * TODO: make look more like compcon
 */
export function uses_control(uses_path: string, max_uses: number, helper: HelperOptions) {
  const curr_uses = resolve_helper_dotpath(helper, uses_path) ?? 0;
  return `
    <div class="card clipped">
      <span class="lancer-header"> USES </span>
      ${std_x_of_y(uses_path , curr_uses, max_uses)}
    </div>
    `;
}

/**
 * Handlebars partial for a mech system preview card.
 */
/*
export const mech_system_preview = `<li class="card clipped mech-system-compact item" data-item-id="{{system._id}}">
<div class="lancer-header" style="grid-area: 1/1/2/3; display: flex">
  <i class="cci cci-system i--m"> </i>
  <a class="system-macro macroable"><i class="mdi mdi-message"></i></a>
  <span class="minor grow">{{system.name}}</span>
  <a class="stats-control" data-action="delete"><i class="fas fa-trash"></i></a>
</div>
<div class="flexrow">
  <div style="float: left; align-items: center; display: inherit;">
    <i class="cci cci-system-point i--m i--dark"> </i>
    <span class="medium" style="padding: 5px;">{{system.data.sp}} SP</span>
  </div>
  {{#if system.data.uses}}
  <div class="compact-stat">
    <span class="minor" style="max-width: min-content;">USES: </span>
    <span class="minor" style="max-width: min-content;">{{system.data.uses}}</span>
    <span class="minor" style="max-width: min-content;" > / </span>
    <span class="minor" style="max-width: min-content;">{{system.data.max_uses}}</span>
  </div>
  {{/if}}
</div>
{{#if (ne system.data.description "")}}
<div class="desc-text" style="padding: 5px">
  {{{system.data.description}}}
</div>
{{/if}}
{{#with system.data.effect as |effect|}}
  {{#if effect.effect_type}}
    {{{eff-preview effect}}}
  {{else}}
    {{> generic-eff-preview effect=effect}}
  {{/if}}
{{/with}}
{{> tag-list tags=system.data.tags}}
</li>`;
*/

export function npc_feature_preview(npc_feature_path: string, tier: number, helper: HelperOptions) {
  console.log("Tier:" , tier);
  let feature: NpcFeature = resolve_helper_dotpath(helper, npc_feature_path);
  let delete_button = `<a class="gen-control" data-action="delete" data-path="${npc_feature_path}"><i class="fas fa-trash"></i></a>`

  switch (feature.FeatureType) {
    case "Reaction":
      return npc_reaction_effect_preview(npc_feature_path, feature, delete_button);
    case "System":
      return npc_system_effect_preview(npc_feature_path, feature, delete_button);
    case "Trait":
      return npc_trait_effect_preview(npc_feature_path, feature, delete_button);
    case "Tech":
      return npc_tech_effect_preview(npc_feature_path, feature, tier, delete_button);
    case "Weapon":
      return npc_weapon_effect_preview(npc_feature_path, feature, tier, delete_button);
    default:
      return "bad feature";
  }
}

/** Expected arguments:
 * - bonus_path=<string path to the individual bonus item>,  ex: ="ent.mm.Bonuses.3"
 * - bonus=<bonus object to pre-populate with>
 */
export function single_bonus_editor(bonus_path: string, bonus: Bonus) {
  // Our main two inputs
  let id_input = std_string_input(`${bonus_path}.ID`, "ID", bonus.ID);
  let val_input = std_string_input(`${bonus_path}.Value`, "Value", bonus.Value);

  // Icon factory
  let iconer = new IconFactory({
    size: "m",
  });

  // Our type options
  let damage_checkboxes: string[] = [];
  for (let dt of Object.values(DamageType)) {
    damage_checkboxes.push(std_checkbox(`${bonus_path}.DamageTypes.${dt}`, iconer.r(Damage.icon_for(dt)), !!bonus.DamageTypes[dt]));
  }

  let range_checkboxes: string[] = [];
  for (let rt of Object.values(RangeType)) {
    range_checkboxes.push(std_checkbox(`${bonus_path}.RangeTypes.${rt}`, iconer.r(Range.icon_for(rt)), !!bonus.RangeTypes[rt]));
  }

  let type_checkboxes: string[] = [];
  for (let wt of Object.values(WeaponType)) {
    type_checkboxes.push(std_checkbox(`${bonus_path}.WeaponTypes.${wt}`, wt, !!bonus.WeaponTypes[wt]));
  }

  let size_checkboxes: string[] = [];
  for (let st of Object.values(WeaponSize)) {
    size_checkboxes.push(std_checkbox(`${bonus_path}.WeaponSizes.${st}`, st, !!bonus.WeaponSizes[st]));
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
  for(let i=0; i<bonuses_array.length; i++) {
    let bonus = bonuses_array[i];
    /*
    items.push(`
      <div class="${inc_if("editable", edit)} bonus" data-path="${bonuses_path}.${i}">
        <div class="lancer-header minor" title="${bonus.ID}">
          <span class="grow">${bonus.Title}</span> 
          ${inc_if(`<a class="gen-control" data-action="splice" data-path="${bonuses_path}.${i}"><i class="fas fa-trash"></i></a>`, edit)}
        </div>
        <span>${bonus.Detail}</span>
      </div>
    `);
    */
   let delete_button = `<a class="gen-control" data-action="splice" data-path="${bonuses_path}.${i}"><i class="fas fa-trash"></i></a>`;
   let title = `<span class="grow">${bonus.Title}</span> ${inc_if(delete_button, edit)}`;
   let boxed = `
    <div class="bonus ${inc_if("editable", edit)}" data-path="${bonuses_path}.${i}">
      ${effect_box(title, ""+bonus.Detail)}
    </div>
   `;
   items.push(boxed); 
  }

  return `
    <div class="card bonus-list">
      <div class="lancer-header">
        <span class="left">// Bonuses</span>
        ${inc_if(`<a class="gen-control fas fa-plus" data-action="append" data-path="${bonuses_path}" data-action-value="(struct)bonus"></a>`, edit)}
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
  bonuses.on("click", async (event) => {
    // Find the bonus
    let bonus_path = event.currentTarget.dataset.path;
    if(!bonus_path) return;
    let data = await data_getter();
    return BonusEditDialog.edit_bonus(data, bonus_path, commit_func).catch(e => console.error("Dialog failed", e));
  });
}

/** Expected arguments:
 * - bonus_path=<string path to the individual bonus item>,  ex: ="ent.mm.Bonuses.3"
 * - bonus=<bonus object to pre-populate with>
 */
export function single_action_editor(action_path: string, action: Action) {
  // Make inputs for each important field
  let id_input = std_string_input(`${action_path}.ID`, "ID", action.ID ?? "");
  let name_input = std_string_input(`${action_path}.Name`, "Name", action.Name);


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
  let armor_val = armor.Bonuses.find(b => b.ID == "pilot_armor")?.Value ?? "0";
  let speed_val = armor.Bonuses.find(b => b.ID == "pilot_speed")?.Value ?? "0";
  let edef_val = armor.Bonuses.find(b => b.ID == "pilot_edef")?.Value ?? "0";
  let eva_val = armor.Bonuses.find(b => b.ID == "pilot_evasion")?.Value ?? "0";
  let hp_val = armor.Bonuses.find(b => b.ID == "pilot_hp")?.Value ?? "0";

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
            ${compact_tag_list(armor_path + ".Tags", armor.Tags)}
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
  return `<div class="valid ${EntryType.PILOT_WEAPON} ref drop-settable card clipped pilot-weapon-compact item macroable"
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
        ${show_range_array(weapon.Range)}
        <hr class="vsep">
        ${show_damage_array(weapon.Damage)}
      </div>

      ${compact_tag_list(weapon_path + ".Tags", weapon.Tags)}
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
  if(limited) {
    uses = `
      <div class="compact-stat">
        <span class="minor" style="max-width: min-content;">USES: </span>
        <span class="minor" style="max-width: min-content;">todo</span>
        <span class="minor" style="max-width: min-content;" > / </span>
        <span class="minor" style="max-width: min-content;">${limited.Value}</span>
      </div>
    `
  }

  return `<div class="valid ${EntryType.PILOT_GEAR} ref drop-settable card clipped macroable"
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

      ${compact_tag_list(gear_path + ".Tags", gear.Tags)}
    </div>
  </div>`;
}

/**
 * Handlebars helper for a mech weapon preview card. Doubles as a slot. Mech path needed for bonuses
 */
export function mech_weapon_refview(weapon_path: string, mech_path: string | "", helper: HelperOptions, size?: FittingSize): string { 
  // Fetch the item(s)
  let weapon_: MechWeapon | null = resolve_helper_dotpath(helper, weapon_path);
  let mech_: Mech | null = resolve_helper_dotpath(helper, mech_path);

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

  // Assert not null
  let weapon = weapon_!;

  // What profile are we using?
  let profile = weapon.SelectedProfile;
  let profile_path = `${weapon_path}.Profiles.${weapon.SelectedProfileIndex}`;

  // Augment ranges
  let ranges = profile.BaseRange;
  if(mech_) {
    ranges = Range.calc_range_with_bonuses(weapon, profile, mech_);
  }

  // Generate loading segment as needed
  let loading = "";
  if(weapon.IsLoading) {
    let loading_icon = `mdi mdi-hexagon-slice-${weapon.Loaded ? 6 : 0}`;
    loading = `<span> 
                LOADED: 
                <a class="gen-control" data-action="set" data-set-value="(bool)${!weapon.Loaded}" data-path="${weapon_path}.Loaded"><i class="${loading_icon}"></i></a>
                </span>`;
  }

  // Generate effects
  let effect = profile.Effect ? effect_box("Effect", profile.Effect) : "";
  let on_attack = profile.OnAttack ? effect_box("On Attack", profile.OnAttack) : "";
  let on_hit = profile.OnHit ? effect_box("On Hit", profile.OnHit) : "";
  let on_crit = profile.OnCrit ? effect_box("On Crit", profile.OnCrit) : "";

  return `
  <div class="valid ${EntryType.MECH_WEAPON} ref drop-settable flexcol clipped lancer-weapon-container macroable item"
                ${ref_params(cd.ref, weapon_path)}
                style="max-height: fit-content;">
    <div class="lancer-header">
      <i class="cci cci-weapon i--m i--light"> </i>
      <span class="minor">${weapon.Name} // ${weapon.Size.toUpperCase()} ${weapon.SelectedProfile.WepType.toUpperCase()}</span>
      <a class="gen-control i--light" data-action="null" data-path="${weapon_path}"><i class="fas fa-trash"></i></a>
    </div> 
    <div class="lancer-body">
      <div class="flexrow" style="text-align: left; white-space: nowrap;">
        <a class="roll-attack"><i class="fas fa-dice-d20 i--m i--dark"></i></a>
        <hr class="vsep">
        ${show_range_array(ranges)}
        <hr class="vsep">
        ${show_damage_array(weapon.SelectedProfile.BaseDamage)}

        <!-- Loading toggle, if we are loading-->
        ${inc_if(`<hr class="vsep"> ${loading}`, loading)}
      </div>
      
      <div class="flexcol">
        <span>${weapon.SelectedProfile.Description}</span>
        ${effect}
        ${on_attack}
        ${on_hit}
        ${on_crit}
        ${compact_tag_list(profile_path + ".Tags", profile.Tags)}
      </div>
    </div>
  </div>`
};

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
                ${source!.ID}
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