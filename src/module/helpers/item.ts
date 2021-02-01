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
} from "machine-mind";
import { MechWeapon } from "machine-mind";
import { BonusEditDialog } from "../apps/bonus-editor";
import { TypeIcon } from "../config";
import { TagData } from "../interfaces";
import { npc_reaction_effect_preview, npc_system_effect_preview, npc_tech_effect_preview, npc_trait_effect_preview, npc_weapon_effect_preview } from "../item/effects";
import { compact_tag_list } from "../item/tags";
import { checked, inc_if, render_light_icon, resolve_dotpath, resolve_helper_dotpath, selected } from "./commons";
import { ref_commons, ref_params  } from "./refs";


// Helper to handle formatting for on hit, crit, etc effects
export function effect_helper(header: string, body: string): string { 
  return `
  <div class="flexcol effect-text" style="padding: 5px">
    <div class="medium effect-title">EFFECT</div>
    <div class="effect-text">${body}</div>
  </div>`;
}

/**
 * Handlebars helper which checks whether a weapon is loading by examining its tags
 * @param tags The tags for the weapon
 */
export function is_loading(tags: TagData[]) {
  if (!tags || !Array.isArray(tags) || tags.length < 1) return false;
  for (let i = 0; i < tags.length; i++) {
    if (tags[i].id && tags[i].id === "tg_loading") {
      return true;
    }
    if (tags[i].name && tags[i].name.toUpperCase() === "LOADING") {
      return true;
    }
  }
  return false;
}

// TODO
// function loading_switch() {}

/**
 * Handlebars helper for weapon size selector
 */
export function weapon_size_selector(size_path: string, helper: HelperOptions) {
  let curr_size: WeaponSize = resolve_helper_dotpath(helper, size_path);
  let options: string[] = [];

  // Build our options
  for (let size of Object.values(WeaponSize)) {
    let is_selected = curr_size.toLowerCase() == size.toLowerCase(); // Case tolerant selected
    options.push(`<option value="${size}" ${selected(is_selected)}>${size.toUpperCase()}</option>`);
  }

  return `<select name="${size_path}" data-type="String"> 
    ${options.join("\n")} 
  </select>`;
}

/**
 * Handlebars helper for weapon type selector. First parameter is the existing selection.
 */
export function weapon_type_selector(type_path: string, helper: HelperOptions) {
  let curr_type: WeaponSize = resolve_helper_dotpath(helper, type_path);
  let options: string[] = [];

  // Build our options
  for (let type of Object.values(WeaponType)) {
    let is_selected = curr_type.toLowerCase() == type.toLowerCase(); // Case tolerant selected
    options.push(`<option value="${type}" ${selected(is_selected)}>${type.toUpperCase()}</option>`);
  }

  return `<select name="${type_path}" data-type="String"> 
    ${options.join("\n")} 
  </select>`;
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

  // Build our options
  let rangetype_options: string[] = [];
  for (let type of Object.values(RangeType)) {
    let is_selected = range.RangeType.toLowerCase() == type.toLowerCase(); // Case tolerant selected
    rangetype_options.push(
      `<option value="${type}" ${selected(is_selected)}>${type.toUpperCase()}</option>`
    );

    // to do icon, would use the following
    let _type_icon = Range.icon_for(type);
    let _type_icon_html = `<i class="cci ${_type_icon} i--m i--dark"></i>`;
  }

  let select_html = `<select name="${data_target_prefix}.RangeType" data-type="String" style="align-self: center;"> 
    ${rangetype_options.join("\n")} 
  </select>`;

  let input_html = `<input class="lancer-stat" type="string" name="${data_target_prefix}.Value" value="${range.Value}"
  data-dtype="String" style="max-width: 80%;"/>`;

  return `<div class="flexrow flex-center" style="padding: 5px;">
    ${icon_html}
    ${select_html}
    ${input_html}
  </div>
  `;
}

/**
 * Handlebars helper for weapon damage type/value editing
 */
export function damage_editor(damage: Damage, data_target_prefix: string) {
  let icon_html = `<i class="cci ${damage.Icon} i--m i--dark"></i>`;

  // Build our options
  let damagetype_options: string[] = [];
  for (let type of Object.values(DamageType)) {
    let is_selected = damage.DamageType.toLowerCase() == type.toLowerCase(); // Case tolerant selected
    damagetype_options.push(
      `<option value="${type}" ${selected(is_selected)}>${type.toUpperCase()}</option>`
    );
  }

  let select_html = `<select name="${data_target_prefix}.DamageType" data-type="String" style="align-self: center;"> 
    ${damagetype_options.join("\n")} 
  </select>`;

  let input_html = `<input class="lancer-stat" type="string" name="${data_target_prefix}.Value" value="${damage.Value}"
  data-dtype="String" style="max-width: 80%;"/>`;

  return `<div class="flexrow flex-center" style="padding: 5px;">
    ${icon_html}
    ${select_html}
    ${input_html}
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
  return `<div class="flexrow">${results.join(" // ")}</div>`
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
  const sep = ` <span class="i--m"> // </span> `;
  return `<div class="flexrow compact-range">${results.join(sep)}</div>`
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
  const s = s_type ? s_type.toLowerCase() : SystemType.System.toLowerCase();
  let options: string[] = [];
  for(let type of Object.values(SystemType)) {
    options.push(`<option value="${type}" ${selected(s === type.toLowerCase())}>${type.toUpperCase()}</option>`);
  }

  return `<select name="${data_target}" data-type="String" style="height: 2em; align-self: center;" >
      ${options.join("")}
    </select>`;
}

/**
 * Handlebars partial for limited uses remaining
 */
export function uses_control(uses_path: string, max_uses: number, helper: HelperOptions) {
  const curr_uses = resolve_helper_dotpath(helper, uses_path) ?? 0;
  // TODO: Remove this "justify-content" stuff, that should really be accomplished via a class
  return ` <div class="flexrow">
              <span>USES</span>
              <input class="lancer-stat lancer-invisible-input" type="number" name="${uses_path}" value="${curr_uses}" data-dtype="Number" style="justify-content: left"/>
              <span>/</span>
              <span class="lancer-stat" style="justify-content: left"> ${max_uses}</span>
            </div>`;
}

/**
 * Handlebars partial for a mech system preview card.
 */
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

export function npc_feature_preview(npc_feature_path: string, tier: number, helper: HelperOptions) {
  let feature: NpcFeature = resolve_helper_dotpath(helper, npc_feature_path);
  let delete_button = `<a class="gen-control" data-action="delete" data-path="${npc_feature_path}"><i class="fas fa-trash"></i></a>`

  switch (feature.FeatureType) {
    case "Reaction":
      return npc_reaction_effect_preview(feature, delete_button);
    case "System":
      return npc_system_effect_preview(feature, delete_button);
    case "Trait":
      return npc_trait_effect_preview(feature, delete_button);
    case "Tech":
      return npc_tech_effect_preview(feature, tier, delete_button);
    case "Weapon":
      return npc_weapon_effect_preview(feature, tier, delete_button);
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
  let id_input = `<label>ID: <input name="${bonus_path}.ID" value="${bonus.ID}" data-dtype="String" /> </label>`;
  let val_input = `<label>Value: <input name="${bonus_path}.Value" value="${bonus.Value}" data-dtype="String" /> </label>`;

  // Our type options
  let damage_checkboxes: string[] = [];
  for (let dt of Object.values(DamageType)) {
    damage_checkboxes.push(
      `<label>
        ${render_light_icon(Damage.icon_for(dt))} 
        <input type="checkbox" 
            name="${bonus_path}.DamageTypes.${dt}" 
            ${checked(bonus.DamageTypes[dt])} /> 
      </label>`
    );
  }

  let range_checkboxes: string[] = [];
  for (let rt of Object.values(RangeType)) {
    range_checkboxes.push(
      `<label>
        ${render_light_icon(Range.icon_for(rt))} 
        <input type="checkbox" 
            name="${bonus_path}.RangeTypes.${rt}"  
            ${checked(bonus.RangeTypes[rt])} /> 
      </label>`
    );
  }

  let type_checkboxes: string[] = [];
  for (let tt of Object.values(WeaponType)) {
    type_checkboxes.push(
      `<label> ${tt} 
        <input type="checkbox" 
          name="${bonus_path}.WeaponTypes.${tt}" 
          ${checked(bonus.WeaponTypes[tt])} /> 
      </label>`
    );
  }

  let size_checkboxes: string[] = [];
  for (let st of Object.values(WeaponSize)) {
    size_checkboxes.push(
      `<label> ${st} 
        <input type="checkbox" 
          name="${bonus_path}.WeaponSizes.${st}" 
          ${checked(bonus.WeaponSizes[st])} /> 
      </label>`
    );
  }

  // Consolidate them into rows
  return `<div class="card clipped" style="align-content: flex-start">
      ${id_input}
      ${val_input}
      <div class="flexrow">
        ${damage_checkboxes.join(" ")}
      </div>
      <div class="flexrow">
        ${range_checkboxes.join(" ")}
      </div>
      <div class="flexrow">
        ${type_checkboxes.join(" ")}
      </div>
      <div class="flexrow">
        ${size_checkboxes.join(" ")}
      </div>
    </div>`;
}

/** Expected arguments:
 * - bonuses_path=<string path to the bonuses array>,  ex: ="ent.mm.Bonuses"
 * - bonuses=<bonus array to pre-populate with>.
 * Displays a list of bonuses, with buttons to add/delete (if edit true)
 */
export function bonuses_display(bonuses_path: string, bonuses_array: Bonus[], edit: boolean) {
  let items: string[] = [];
  for(let i=0; i<bonuses_array.length; i++) {
    let bonus = bonuses_array[i];
    items.push(`
      <div class="${inc_if("editable", edit)} bonus card clipped" data-path="${bonuses_path}.${i}">
        <div class="lancer-header" title="${bonus.ID}">
          <span class="grow">${bonus.Title}</span> 
          ${inc_if(`<a class="gen-control" data-action="splice" data-path="${bonuses_path}.${i}"><i class="fas fa-trash"></i></a>`, edit)}
        </div>
        <span>${bonus.Detail}</span>
      </div>
    `);
  }

  return `
    <div class="card clipped">
      <div class="lancer-header">
        <span>BONUSES</span>
        ${inc_if(`<a class="gen-control" data-action="append" data-path="${bonuses_path}" data-action-value="(struct)bonus">+</a>`, edit)}
      </div>
      ${items.join("\n")}
    </div>
    `;
}
export function HANDLER_activate_edit_bonus<T>(
  html: JQuery,
  data_getter: () => Promise<T> | T,
  commit_func: (data: T) => void | Promise<void>
) {
  let bonuses = html.find(".editable.bonus.card");
  bonuses.on("click", async (event) => {
    // Find the bonus
    let bonus_path = event.currentTarget.dataset.path;
    if(!bonus_path) return;
    let data = await data_getter();
    return BonusEditDialog.edit_bonus(data, bonus_path, commit_func).catch(e => console.error("Dialog failed", e));
  });
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
            <div class="lancer-header" style="grid-area: 1/1/2/3">
              <i class="mdi mdi-shield-outline i--m i--light"> </i>
              <span class="minor">${armor!.Name}</span>
              <a class="gen-control i--light" data-action="null" data-path="${armor_path}"><i class="fas fa-trash"></i></a>
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
            ${compact_tag_list(armor.Tags)}
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
    return `<div class="${EntryType.PILOT_WEAPON} ref drop-settable card pilot-weapon-compact item" 
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

      <!-- Loading toggle - WIP
      <div class="flexrow">
        {{#if (is-loading weapon.data.tags)}}
          LOADING
        {{/if}}
      </div>
      -->

      <div class="flexrow">
        ${compact_tag_list(weapon.Tags)}
      </div>
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
    return `<div class="${EntryType.PILOT_GEAR} ref drop-settable card item" 
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

  return `<div class="valid ${EntryType.PILOT_GEAR} ref drop-settable card clipped item macroable"
                ${ref_params(cd.ref, gear_path)} >
    <div class="lancer-header">
      <i class="cci cci-generic-item i--m"> </i>
      <a class="gear-macro macroable"><i class="mdi mdi-message"></i></a>
      <span class="minor">${gear.Name}</span>
      <a class="gen-control i--light" data-action="null" data-path="${gear_path}"><i class="fas fa-trash"></i></a>
    </div>
    <div class="flexcol">
      ${uses}

      <!-- Loading toggle - WIP
      <div class="flexrow">
        {{#if (is-loading gear.data.tags)}}
          LOADING
        {{/if}}
      </div>
      -->
      <div class="effect-text" style=" padding: 5px">
        ${gear.Description}
      </div>

      <div class="flexrow">
        ${compact_tag_list(gear.Tags)}
      </div>
    </div>
  </div>`;
}

/**
 * Handlebars helper for a mech weapon preview card. Doubles as a slot. Mech path needed for bonuses
 */
export function mech_weapon_refview(weapon_path: string, mech_path: string | "", helper: HelperOptions): string { 
  // Fetch the item(s)
  let weapon_: MechWeapon | null = resolve_helper_dotpath(helper, weapon_path);
  let mech_: Mech | null = resolve_helper_dotpath(helper, mech_path);

  // Generate commons
  let cd = ref_commons(weapon_);

  if (!cd) {
    // Make an empty ref. Note that it still has path stuff if we are going to be dropping things here
    return `
      <div class="${EntryType.MECH_WEAPON} ref drop-settable card item" 
                        data-path="${weapon_path}" 
                        data-type="${EntryType.MECH_WEAPON}">
        <img class="ref-icon" src="${TypeIcon(EntryType.MECH_WEAPON)}"></img>
        <span class="major">Add weapon</span>
      </div>`;
  }

  // Assert not null
  let weapon = weapon_!;

  // What profile are we using?
  let profile = weapon.SelectedProfile;

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
  let effect = profile.Effect ? effect_helper("Effect", profile.Effect) : "";
  let on_attack = profile.OnAttack ? effect_helper("On Attack", profile.OnAttack) : "";
  let on_hit = profile.OnHit ? effect_helper("On Hit", profile.OnHit) : "";
  let on_crit = profile.OnCrit ? effect_helper("On Crit", profile.OnCrit) : "";

  return `
  <div class="valid ${EntryType.MECH_WEAPON} ref drop-settable flexcol clipped lancer-weapon-container macroable item"
                ${ref_params(cd.ref, weapon_path)}
                style="max-height: fit-content;">
    <div class="lancer-header">
      <i class="cci cci-weapon i--m i--light"> </i>
      <span class="minor">${weapon.Name} // ${weapon.Size.toUpperCase()} ${weapon.Type.toUpperCase()}</span>
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
        <hr class="vsep">
        ${loading}
      </div>
      
      <div class="flexcol">
        <span>${weapon.SelectedProfile.Description}</span>
        ${effect}
        ${on_attack}
        ${on_hit}
        ${on_crit}
        ${compact_tag_list(profile.Tags)}
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
              <h3 class="mfr-name" style="color: ${source!.GetColor(false)};">${source!.Name}</h3>
              <i>${source!.Quote}</i>
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