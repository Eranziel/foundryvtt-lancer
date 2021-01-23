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
} from "machine-mind";
import { MechWeapon, MechWeaponProfile } from "machine-mind";
import { LANCER, TypeIcon } from "../config";
import { NPCDamageData, RangeData, TagData } from "../interfaces";
import { LancerItemType, LancerNpcFeatureData } from "../item/lancer-item";
import { compact_tag_list } from "../item/tags";
import { checked, render_icon, resolve_dotpath, resolve_helper_dotpath, selected } from "./commons";
import { ref_commons, ref_params, simple_mm_ref } from "./refs";


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
export function system_type_selector(s_type: string, data_target: string) {
  const s = s_type ? s_type.toLowerCase() : SystemType.System.toLowerCase();
  return `<select name="${data_target}" data-type="String" style="height: 2em; align-self: center;" >
    <option value="${SystemType.System}" ${
    s === SystemType.System.toLowerCase() ? "selected" : ""
  }>SYSTEM</option>
    <option value="${SystemType.AI}" ${
    s === SystemType.AI.toLowerCase() ? "selected" : ""
  }>AI</option>
    <option value="${SystemType.Armor}" ${
    s === SystemType.Armor.toLowerCase() ? "selected" : ""
  }>ARMOR</option>
    <option value="${SystemType.Deployable}" ${
    s === SystemType.Deployable.toLowerCase() ? "selected" : ""
  }>DEPLOYABLE</option>
    <option value="${SystemType.Drone}" ${
    s === SystemType.Drone.toLowerCase() ? "selected" : ""
  }>DRONE</option>
    <option value="${SystemType.FlightSystem}" ${
    s === SystemType.FlightSystem.toLowerCase() ? "selected" : ""
  }>FLIGHT SYSTEM</option>
    <option value="${SystemType.Integrated}" ${
    s === SystemType.Integrated.toLowerCase() ? "selected" : ""
  }>INTEGRATED</option>
    <option value="${SystemType.Mod}" ${
    s === SystemType.Mod.toLowerCase() ? "selected" : ""
  }>MOD</option>
    <option value="${SystemType.Shield}" ${
    s === SystemType.Shield.toLowerCase() ? "selected" : ""
  }>SHIELD</option>
    <option value="${SystemType.Tech}" ${
    s === SystemType.Tech.toLowerCase() ? "selected" : ""
  }>TECH</option>
  </select>`;
}

/**
 * Handlebars partial for a mech system preview card.
 */
export const mech_system_preview = `<li class="card clipped mech-system-compact item" data-item-id="{{system._id}}">
<div class="lancer-system-header clipped-top" style="grid-area: 1/1/2/3; display: flex">
  <i class="cci cci-system i--m"> </i>
  <a class="system-macro macroable"><i class="mdi mdi-message"></i></a>
  <span class="minor" style="flex-grow: 1">{{system.name}}</span>
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

export function npc_feature_preview(npc_feature: LancerNpcFeatureData, tier: number) {
  let body = ``;
  let type_class = `item`;
  console.warn("NPC feature types WIP");
  /*
  switch (npc_feature.data.type) {
    case "Reaction":
      body += npc_reaction_effect_preview(npc_feature.data as LancerNPCReactionData);
      break;
    case "System":
      body += npc_system_effect_preview(npc_feature.data as LancerNPCSystemData);
      break;
    case "Trait":
      body += npc_trait_effect_preview(npc_feature.data as LancerNPCTraitData);
      break;
    case "Tech":
      body += npc_tech_effect_preview(npc_feature.data as LancerNPCTechData, tier);
      type_class += ` tech`;
      break;
    case "Weapon":
      body += npc_weapon_effect_preview(npc_feature.data as LancerNPCWeaponData, tier);
      type_class += ` weapon`;
      break;
  }
  */
  let html = `<li class="card clipped npc-feature-compact ${type_class}" data-item-id="${npc_feature._id}">`;
  html += body;
  html += `</li>`;
  return html;
}

/** Expected arguments:
 * - bonus_path=<string path to the individual bonus item>,  ex: ="ent.mm.Bonuses.3"
 * - bonus=<bonus object to pre-populate with>
 */
export function bonus_editor(bonus_path: string, bonus: Bonus) {
  // Our main two inputs
  let id_input = `<label>ID: <input name="${bonus_path}.ID" value="${bonus.ID}" data-dtype="String" /> </label>`;
  let val_input = `<label>Value: <input name="${bonus_path}.Value" value="${bonus.Value}" data-dtype="String" /> </label>`;

  // Our type options
  let damage_checkboxes: string[] = [];
  for (let dt of Object.values(DamageType)) {
    damage_checkboxes.push(
      `<label>${render_icon(
        Damage.icon_for(dt)
      )} <input type="checkbox" name="${bonus_path}.DamageTypes.${dt}" ${checked(
        bonus.DamageTypes[dt]
      )} /> </label>`
    );
  }

  let range_checkboxes: string[] = [];
  for (let rt of Object.values(RangeType)) {
    range_checkboxes.push(
      `<label>
        ${render_icon(Range.icon_for(rt))} 
        <input type="checkbox" 
          name="${bonus_path}.RangeTypes.${rt}"  
          ${checked(bonus.RangeTypes[rt])} 
          /> 
        </label>`
    );
  }

  let type_checkboxes: string[] = [];
  for (let tt of Object.values(WeaponType)) {
    type_checkboxes.push(
      `<label> ${tt} 
        <input type="checkbox" 
          name="${bonus_path}.WeaponTypes.${tt}" 
          ${checked(bonus.WeaponTypes[tt])} 
          /> 
      </label>`
    );
  }

  let size_checkboxes: string[] = [];
  for (let st of Object.values(WeaponSize)) {
    size_checkboxes.push(
      `<label> ${st} 
        <input type="checkbox" 
          name="${bonus_path}.WeaponSizes.${st}" 
          ${checked(bonus.WeaponSizes[st])}
          /> 
      </label>`
    );
  }

  // Consolidate them into rows
  return `<div class="card clipped">
      ${id_input} <br>
      ${val_input} <br>
      <div class="d-flex">
        ${damage_checkboxes.join(" ")}
      </div>
      <div class="d-flex">
        ${range_checkboxes.join(" ")}
      </div>
      <div class="d-flex">
        ${type_checkboxes.join(" ")}
      </div>
      <div class="d-flex">
        ${size_checkboxes.join(" ")}
      </div>
    </div>`;
}

/** Expected arguments:
 * - bonuses_path=<string path to the bonuses array>,  ex: ="ent.mm.Bonuses"
 * - bonuses=<bonus array to pre-populate with>.
 */
export function bonus_array_editor(bonuses_path: string, bonuses_array: Bonus[]) {
  let rows = bonuses_array.map((bonus, index) => bonus_editor(`${bonuses_path}.${index}`, bonus));
  rows = rows.map(r => `<li> ${r} </li>`);
  return `<ul>
        ${rows.join("\n")}
    </ul>`;
}

// Helper for showing a piece of armor, or a slot to hold it (if path is provided)
export function pilot_armor_slot(armor_path: string, helper: HelperOptions): string {
  // Fetch the item
  let armor_: PilotArmor | null = resolve_helper_dotpath(helper, armor_path);

  // Generate commons
  let cd = ref_commons(armor_);


  if (!cd) {
    // Make an empty ref. Note that it still has path stuff if we are going to be dropping things here
    return `<div class="${EntryType.PILOT_ARMOR} ref drop-settable card clipped pilot-armor-compact-item" 
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
                ${ref_params(cd.ref)}
                data-path="${armor_path}">
            <div class="lancer-trait-header clipped-top" style="grid-area: 1/1/2/3">
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
    return `<div class="${EntryType.PILOT_WEAPON} ref drop-settable card clipped pilot-weapon-compact item" 
                        data-path="${weapon_path}" 
                        data-type="${EntryType.PILOT_WEAPON}">
          <img class="ref-icon" src="${TypeIcon(EntryType.PILOT_WEAPON)}"></img>
          <span class="major">Equip weapon</span>
      </div>`;
  }

  let weapon = weapon_!;
  return `<div class="valid ${EntryType.PILOT_WEAPON} ref drop-settable card clipped pilot-weapon-compact item macroable"
                ${ref_params(cd.ref)}
                data-path="${weapon_path}" >
    <div class="lancer-weapon-header clipped-top">
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
    return `<div class="${EntryType.PILOT_GEAR} ref drop-settable card clipped pilot-gear-compact item" 
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

  return `<div class="valid ${EntryType.PILOT_GEAR} ref drop-settable card clipped pilot-gear-compact item macroable"
                ${ref_params(cd.ref)}
                data-path="${gear_path}" >
    <div class="lancer-gear-header clipped-top">
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
      <div class="${EntryType.MECH_WEAPON} ref drop-settable card clipped pilot-gear-compact item" 
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
                ${ref_params(cd.ref)}
                data-path="${weapon_path}"
                style="max-height: fit-content;">
    <div class="lancer-weapon-header clipped-top" style="grid-area: 1/1/2/3">
      <i class="cci cci-weapon i--m i--light"> </i>
      <span class="minor">${weapon.Name} // ${weapon.Size.toUpperCase()} ${weapon.Type.toUpperCase()}</span>
      <a class="gen-control i--light" data-action="null" data-path="${weapon_path}"><i class="fas fa-trash"></i></a>
    </div> 
    <div class="lancer-weapon-body">
      <a class="roll-attack" style="grid-area: 1/1/2/2;"><i class="fas fa-dice-d20 i--m i--dark"></i></a>
      <div class="flexrow" style="grid-area: 1/2/2/3; text-align: left; white-space: nowrap;">
        ${show_range_array(ranges)}
        <hr class="vsep">
        ${show_damage_array(weapon.SelectedProfile.BaseDamage)}

        <!-- Loading toggle, if we are loading-->
        <hr class="vsep">
        ${loading}
      </div>
      
      <div class="flexcol" style="grid-area: 2/1/3/3;">
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