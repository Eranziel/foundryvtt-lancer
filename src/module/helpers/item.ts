/* ------------------------------------ */
/* Handlebars Helpers                    */
/* ------------------------------------ */

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
} from "machine-mind";
import { MechWeapon, MechWeaponProfile } from "machine-mind";
import { LancerActor } from "../actor/lancer-actor";
import { LANCER, LancerActorType, LancerItemType } from "../config";
import { DamageData, NPCDamageData, RangeData, TagData } from "../interfaces";
import { LancerItem, LancerNpcFeatureData } from "../item/lancer-item";
import { FlagData, FoundryReg } from "../mm-util/foundry-reg";
import { selected } from "./commons";

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
export function weapon_size_selector(weapon: MechWeapon, data_target_prefix: string) {
  const data_target = `${data_target_prefix}.Size`;
  let options: string[] = [];

  // Build our options
  for (let size of Object.values(WeaponSize)) {
    let is_selected = weapon.Size.toLowerCase() == size.toLowerCase(); // Case tolerant selected
    options.push(`<option value="${size}" ${selected(is_selected)}>${size.toUpperCase()}</option>`);
  }

  return `<select name="${data_target}" data-type="String" style="align-self: center;"> 
    ${options.join("\n")} 
  </select>`;
}

/**
 * Handlebars helper for weapon type selector. First parameter is the existing selection.
 */
export function weapon_type_selector(profile: MechWeaponProfile, data_target_prefix: string) {
  const data_target = `${data_target_prefix}.WepType`;
  let options: string[] = [];

  // Build our options
  for (let type of Object.values(WeaponType)) {
    let is_selected = profile.WepType.toLowerCase() == type.toLowerCase(); // Case tolerant selected
    options.push(`<option value="${type}" ${selected(is_selected)}>${type.toUpperCase()}</option>`);
  }

  return `<select name="${data_target}" data-type="String" style="align-self: center;"> 
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
  data-dtype="Number" style="max-width: 80%;"/>`;

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
 * Handlebars helper for npc weapon damage selector, across all 3 tiers
 */
export function npc_weapon_damage_selector(
  dmg_arr: NPCDamageData[],
  key: number | string,
  data_target: string
) {
  if (typeof key == "string") key = Number.parseInt(key);
  let dmg: Partial<NPCDamageData> = {};
  if (dmg_arr && Array.isArray(dmg_arr)) {
    dmg = dmg_arr[key];
  }
  // Default in
  dmg = {
    type: DamageType.Kinetic,
    val: ["0", "0", "0"],
    ...dmg,
  };

  function damage_selector(dmg_type: DamageType, key: number | string, data_target: string) {
    const dtype = dmg_type!.toLowerCase();
    let html = '<div class="flexrow flex-center" style="padding: 5px; flex-wrap: nowrap;">';

    if (dmg_type) {
      html += `<i class="cci cci-${dtype} i--m damage--${dtype}"></i>`;
    }
    html += `<select name="${data_target}.type" data-type="String" style="align-self: center;">
      <option value="" ${!dmg_type ? "selected" : ""}>NONE</option>
      <option value="${DamageType.Kinetic}" ${
      dtype === DamageType.Kinetic.toLowerCase() ? "selected" : ""
    }>KINETIC</option>
      <option value="${DamageType.Energy}" ${
      dtype === DamageType.Energy.toLowerCase() ? "selected" : ""
    }>ENERGY</option>
      <option value="${DamageType.Explosive}" ${
      dtype === DamageType.Explosive.toLowerCase() ? "selected" : ""
    }>EXPLOSIVE</option>
      <option value="${DamageType.Heat}" ${
      dtype === DamageType.Heat.toLowerCase() ? "selected" : ""
    }>HEAT</option>
      <option value="${DamageType.Burn}" ${
      dtype === DamageType.Burn.toLowerCase() ? "selected" : ""
    }>BURN</option>
      <option value="${DamageType.Variable}" ${
      dtype === DamageType.Variable.toLowerCase() ? "selected" : ""
    }>VARIABLE</option>
    </select>`;
    return html;
  }

  let html = damage_selector(dmg.type!, key, data_target);

  html += `</div>
  <div class="flexrow flex-center">
    <i class="cci cci-npc-tier-1 i--m i--dark"></i>
    <input class="lancer-stat" name="${data_target}.val" value="${
    dmg.val![0] ? dmg.val![0] : ""
  }" data-dtype="String" style="max-width: 80%;"/>
  </div>
  <div class="flexrow flex-center">
    <i class="cci cci-npc-tier-2 i--m i--dark"></i>
    <input class="lancer-stat" name="${data_target}.val" value="${
    dmg.val![1] ? dmg.val![1] : ""
  }" data-dtype="String" style="max-width: 80%;"/>
  </div>
  <div class="flexrow flex-center">
    <i class="cci cci-npc-tier-3 i--m i--dark"></i>
    <input class="lancer-stat" name="${data_target}.val" value="${
    dmg.val![2] ? dmg.val![2] : ""
  }" data-dtype="String" style="max-width: 80%;"/>
  </div>`;
  return html;
}

/**
 * Handlebars helper for a weapon preview range stat
 * @param range {RangeData} The range stat to render.
 * @param key {number} The range's index.
 */
export function weapon_range_preview(range: Range, key: number) {
  let html = ``;
  if (range.Value) {
    if (key > 0) {
      html += `<span class="flexrow" style="align-items: center; justify-content: center; max-width: min-content;"> // </span>`;
    }
    html += `
    <div class="compact-range">
      <i class="cci cci-${range.RangeType.toLowerCase()} i--m i--dark"></i>
      <span class="medium">${range.Value}</span>
    </div>`;
  }
  return html;
}

/**
 * Handlebars helper for a weapon preview damage stat
 * @param damage {DamageData | NPCDamageData} The damage stat to render.
 * @param tier {number} The tier number of the NPC, not applicable to pilot-type weapons.
 */
export function weapon_damage_preview(damage: Damage /* | NPCDamageData */, tier?: number) {
  let html = ``;
  let val: number | string;
  if (tier != undefined && Array.isArray((damage as any).val)) {
    // val = (damage as NPCDamageData).val[tier];
    val = "npcs not yet reimp";
  } else {
    val = damage.Value;
  }
  if (damage && damage.DamageType) {
    html += `<div class="compact-damage">
      <i class="cci cci-${damage.DamageType.toLowerCase()} i--m damage--${damage.DamageType.toLowerCase()}"></i>
      <span class="medium">${val}</span>
    </div>`;
  }
  return html;
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

// Previews an item posessed by a mech
export function item_preview(item: LiveEntryTypes<LancerItemType>) {
  /*
  event.preventDefault();
    const  a = event.currentTarget;
    let entity = null;

    // Target 1 - Compendium Link
    if ( a.dataset.pack ) {
      const pack = game.packs.get(a.dataset.pack);
      let id = a.dataset.id;
      if ( a.dataset.lookup ) {
        if ( !pack.index.length ) await pack.getIndex();
        const entry = pack.index.find(i => (i._id === a.dataset.lookup) || (i.name === a.dataset.lookup));
        id = entry._id;
      }
      entity = id ? await pack.getEntity(id) : null;
    }

    // Target 2 - World Entity Link
    else {
      const cls = CONFIG[a.dataset.entity].entityClass;
      entity = cls.collection.get(a.dataset.id);
      if ( entity.entity === "Scene" && entity.journal ) entity = entity.journal;
      if ( !entity.hasPerm(game.user, "LIMITED") ) {
        return ui.notifications.warn(`You do not have permission to view this ${entity.entity} sheet.`);
      }
    }
    if ( !entity ) return;

    // Action 1 - Execute an Action
    if ( entity.entity === "Macro" ) {
      if ( !entity.hasPerm(game.user, "LIMITED") ) {
        return ui.notifications.warn(`You do not have permission to use this ${entity.entity}.`);
      }
      return entity.execute();
    }

    // Action 2 - Render the Entity sheet
    return entity.sheet.render(true);
    */
  return `<span>${item.Name}</span>`;
}

/**
 * Handlebars partial for a mech weapon preview card.
 */
export const mech_weapon_preview = `<div class="flexcol clipped lancer-weapon-container weapon macroable item" style="max-height: fit-content;" data-item-id="{{weapon._id}}" data-item-key="{{key}}">
  <div class="lancer-weapon-header clipped-top" style="grid-area: 1/1/2/3">
    <i class="cci cci-weapon i--m i--light"> </i>
    <span class="minor">{{weapon.name}} // {{upper-case weapon.data.mount}} {{upper-case weapon.data.weapon_type}}</span>
    <a class="stats-control i--light" data-action="delete"><i class="fas fa-trash"></i></a>
  </div> 
  <div class="lancer-weapon-body">
    <a class="roll-attack" style="grid-area: 1/1/2/2;"><i class="fas fa-dice-d20 i--m i--dark"></i></a>
    <div class="flexrow" style="grid-area: 1/2/2/3; text-align: left; white-space: nowrap;">
      {{#each weapon.data.range as |range rkey|}}
        {{{wpn-range range rkey}}}
      {{/each}}
      <hr class="vsep">
      {{#each weapon.data.damage as |damage dkey|}}
        {{{wpn-damage damage}}}
      {{/each}}

      {{!-- Loading toggle - WIP, needs a way to link to related weapon. Maybe needs to be a callback instead of input.
      <hr class="vsep">
      {{#if (is-loading weapon.data.tags)}}
        <div class="flexrow" style="align-items: center;">
          LOADED: <label class="switch">
            <input type="checkbox" name="weapon.data.loaded" {{checked weapon.data.loaded}}>
            <span class="slider round"></span>
          </label>
        </div>
      {{/if}}
      --}}

    </div>
    {{#with weapon.data.effect as |effect|}}
    <div style="grid-area: 2/1/3/3; display: inherit;">
      {{{eff-preview effect}}}
    </div>
    {{/with}}
    <div style="grid-area: 4/1/5/3; display: inherit;">
      {{> tag-list tags=weapon.data.tags}}
    </div>
  </div>
</div>`;

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
 * Handlebars partial for effect type selector
 */
export function effect_type_selector(e_type: string, data_target: string) {
  /*
  const e = e_type ? e_type.toLowerCase() : EffectType.Basic.toLowerCase();
  return `<select name="${data_target}" data-type="String" style="height: 2em;float: right" >
    <option value="${EffectType.Basic}" ${
    e === EffectType.Basic.toLowerCase() ? "selected" : ""
  }>BASIC</option>
    <option value="${EffectType.AI}" ${
    e === EffectType.AI.toLowerCase() ? "selected" : ""
  }>AI</option>
    <option value="${EffectType.Charge}" ${
    e === EffectType.Charge.toLowerCase() ? "selected" : ""
  }>CHARGE</option>
    <option value="${EffectType.Bonus}" ${
    e === EffectType.Bonus.toLowerCase() ? "selected" : ""
  }>BONUS</option>
    <option value="${EffectType.Deployable}" ${
    e === EffectType.Deployable.toLowerCase() ? "selected" : ""
  }>DEPLOYABLE</option>
    <option value="${EffectType.Drone}" ${
    e === EffectType.Drone.toLowerCase() ? "selected" : ""
  }>DRONE</option>
    <option value="${EffectType.Protocol}" ${
    e === EffectType.Protocol.toLowerCase() ? "selected" : ""
  }>PROTOCOL</option>
    <option value="${EffectType.Reaction}" ${
    e === EffectType.Reaction.toLowerCase() ? "selected" : ""
  }>REACTION</option>
    <option value="${EffectType.Tech}" ${
    e === EffectType.Tech.toLowerCase() ? "selected" : ""
  }>TECH</option>
  </select>`;
  */
  return "<span>effects are deprecated</span>";
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

/**
 * Handlebars partial for non-editable Mech Trait
 */
export const mech_trait_preview = `<div class="lancer-mech-trait-header medium clipped-top" style="grid-area: 1/1/2/2">
  <i class="cci cci-trait i--m i--light"> </i>
  <span class="major">{{trait.name}}</span>
</div>
<div class="effect-text" style="grid-area: 2/1/3/2">{{{trait.description}}}</div>`;

/**
 * Handlebars partial for non-editable Core System
 */
export const core_system_preview = `<div class="card clipped frame-core flexcol">
  <div class="lancer-core-sys-header medium clipped-top">
    <i></i>
    <div class="major">{{csys.name}}</div>
    <div class="medium" style="justify-self: right;"> // CORE SYSTEM</div>
  </div>
  {{#if csys.description}}
  <div class="desc-text">{{{csys.description}}}</div>
  {{/if}}
  {{#if csys.passive_name}}
  <div class="card clipped">
    <div class="lancer-core-sys-header medium clipped-top" style="display:flex">
      <i class="mdi mdi-circle-expand i--m i--light "> </i>
      <a class="core-passive-macro macroable"><i class="mdi mdi-message"></i></a>
      <div class="medium" style="flex-grow: 1">{{csys.passive_name}}</div>
      <div class="medium" style="justify-self: right;"> // PASSIVE</div>
    </div>
    <div class="effect-text">{{{csys.passive_effect}}}</div>
  </div>
  {{/if}}
  <div class="card clipped">
    <div class="lancer-core-sys-header medium clipped-top" style="display:flex">
      <i class="cci cci-corebonus i--m i--light" > </i>
      <a class="core-active-macro macroable"><i class="mdi mdi-message"></i></a>
      <div class="medium" style="flex-grow: 1">{{csys.active_name}}</div>
      <div class="medium" style="justify-self: right;"> // ACTIVE</div>
    </div>
    <div class="effect-text">{{{csys.active_effect}}}</div>
    {{> tag-list tags=csys.tags}}
  </div>
</div>`;

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
