import {  LancerSkillItemData, 
          LancerTalentItemData,
          LancerCoreBonusItemData,
          LancerLicenseItemData,
          LancerPilotArmorItemData,
          LancerPilotWeaponItemData,
          LancerPilotGearItemData, 
          LancerFrameItemData,
          LancerMechSystemItemData,
          LancerMechWeaponItemData,
          LancerNPCFeatureItemData,
          LancerNPCTemplateItemData,
          LancerNPCClassItemData,
          TagData,
          RangeData,
          DamageData} from '../interfaces';
import { LANCER } from '../config';
import { NPCFeatureType, RangeType, WeaponType, WeaponSize, DamageType } from '../enums';
const lp = LANCER.log_prefix;

export function lancerItemInit(data: any) {
  console.log(`${lp} Initializing new ${data.type}`);
  let img: string = 'systems/lancer/assets/icons/';
  if (data.type === 'skill') {
    img += 'skill.svg';
  }
  else if (data.type === 'talent') {
    img += 'talent.svg';
  }
  else if (data.type === 'core_bonus') {
    img += 'corebonus.svg';
  }
  else if (data.type === 'license') {
    img += 'license.svg';
  }
  else if (data.type === 'pilot_armor') {
    img += 'shield_outline.svg';
  }
  else if (data.type === 'pilot_weapon') {
    img += 'weapon.svg';
  }
  else if (data.type === 'pilot_gear') {
    img += 'generic_item.svg';
  }
  else if (data.type === 'frame') {
    img += 'frame.svg';
  }
  else if (data.type === 'mech_weapon') {
    img += 'weapon.svg';
  }
  else if (data.type === 'mech_system') {
    img += 'system.svg';
    // TODO: set default system type
  }
  else if (data.type === 'npc_class') {
    img += 'npc_class.svg';
  }
  else if (data.type === 'npc_template') {
    img += 'npc_template.svg';
  }
  else if (data.type === 'npc_feature') {
    img += 'trait.svg';
    mergeObject(data, {
      // Default new NPC features to traits
      "data.feature_type": NPCFeatureType.Trait
    })
  }
  else {
    img += 'generic_item.svg';
  }

  mergeObject(data, {
    // Initialize image
    "img": img
  });
}

export class LancerItem extends Item {
  data: LancerSkillItemData | LancerTalentItemData | LancerCoreBonusItemData |
        LancerLicenseItemData | LancerPilotArmorItemData | LancerPilotWeaponItemData |
        LancerPilotGearItemData | LancerFrameItemData | LancerMechSystemItemData |
        LancerMechWeaponItemData| LancerNPCFeatureItemData | LancerNPCTemplateItemData |
        LancerNPCClassItemData;

  /**
   * Return a skill trigger's bonus to rolls
   */
  get triggerBonus(): number {
    // Only works for skills.
    if (this.data.type !== "skill") return 0;
    return (this.data as LancerSkillItemData).data.rank * 2;
  }
}

export class LancerSkill extends LancerItem {
  data: LancerSkillItemData;
}

export class LancerTalent extends LancerItem {
  data: LancerTalentItemData;
}

export class LancerCoreBonus extends LancerItem {
  data: LancerCoreBonusItemData;
}

export class LancerLicense extends LancerItem {
  data: LancerLicenseItemData;
}

export class LancerPilotArmor extends LancerItem {
  data: LancerPilotArmorItemData;
}

export class LancerPilotWeapon extends LancerItem {
  data: LancerPilotWeaponItemData;
}

export class LancerPilotGear extends LancerItem {
  data: LancerPilotGearItemData;
}

export class LancerFrame extends LancerItem {
  data: LancerFrameItemData;
}

export class LancerMechSystem extends LancerItem {
  data: LancerMechSystemItemData;
}

export class LancerMechWeapon extends LancerItem {
  data: LancerMechWeaponItemData;
}

export class LancerNPCFeature extends LancerItem {
  data: LancerNPCFeatureItemData;
}

export class LancerNPCTemplate extends LancerItem{
  data: LancerNPCTemplateItemData;
}

export class LancerNPCClass extends LancerItem{
  data: LancerNPCClassItemData;
}


/* ------------------------------------ */
/* Handlebars Helpers                    */
/* ------------------------------------ */

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

export function loading_switch() {
  
}

/**
 * Handlebars partial for weapon size selector
 */
export function weapon_size_selector(mount: string, data_target: string) {
  const html = 
  `<select name="${data_target}" data-type="String" style="align-self: center;">
    <option value="${WeaponSize.Aux}" ${mount === WeaponSize.Aux ? 'selected' : ''}>AUX</option>
    <option value="${WeaponSize.Main}" ${mount === WeaponSize.Main ? 'selected' : ''}>MAIN</option>
    <option value="${WeaponSize.Heavy}" ${mount === WeaponSize.Heavy ? 'selected' : ''}>HEAVY</option>
    <option value="${WeaponSize.Superheavy}" ${mount === WeaponSize.Superheavy ? 'selected' : ''}>SUPERHEAVY</option>
    <option value="Other" ${mount === 'Other' ? 'selected' : ''}>OTHER</option>
  </select>`;
  return html;
}

/**
 * Handlebars partial for weapon type selector
 */
export function weapon_type_selector(w_type: string, data_target: string) {
  const html =
  `<select name="${data_target}" data-type="String" style="align-self: center;">
    <option value="${WeaponType.Rifle}" ${w_type === WeaponType.Rifle ? 'selected' : ''}>RIFLE</option>
    <option value="${WeaponType.Cannon}" ${w_type === WeaponType.Cannon ? 'selected' : ''}>CANNON</option>
    <option value="${WeaponType.Launcher}" ${w_type === WeaponType.Launcher ? 'selected' : ''}>LAUNCHER</option>
    <option value="${WeaponType.CQB}" ${w_type === WeaponType.CQB ? 'selected' : ''}>CQB</option>
    <option value="${WeaponType.Nexus}" ${w_type === WeaponType.Nexus ? 'selected' : ''}>NEXUS</option>
    <option value="${WeaponType.Melee}" ${w_type === WeaponType.Melee ? 'selected' : ''}>MELEE</option>
    <option value="Other" ${w_type === 'Other' ? 'selected' : ''}>OTHER</option>
  </select>`;
  return html;
}

export function weapon_range_selector(rng_arr: RangeData[], key: string, data_target: string) {
  const rng = rng_arr[key];
  let html = '<div class="flexrow flex-center" style="padding: 5px;">';
  if (rng.type) {
    html += `<i class="cci cci-${rng.type.toLowerCase()} i--m i--dark"></i>`;
  }
  /* TODO: For a next iteration--would be really nifty to set it up to select images rather than text. 
    But that seems like a non-trivial task...
    <img class="med-icon" src="../systems/lancer/assets/icons/range.svg">
    <img class="med-icon" src="../systems/lancer/assets/icons/aoe_blast.svg">
    <img class="med-icon" src="../systems/lancer/assets/icons/damage_explosive.svg">
  */
  html += 
  `<select name="${data_target}.type" data-type="String" style="align-self: center;">
    <option value="" ${rng.type === '' ? 'selected' : ''}>NONE</option>
    <option value="${RangeType.Range}" ${rng.type === RangeType.Range ? 'selected' : ''}>RANGE</option>
    <option value="${RangeType.Threat}" ${rng.type === RangeType.Threat ? 'selected' : ''}>THREAT</option>
    <option value="${RangeType.Thrown}" ${rng.type === RangeType.Thrown ? 'selected' : ''}>THROWN</option>
    <option value="${RangeType.Line}" ${rng.type === RangeType.Line ? 'selected' : ''}>LINE</option>
    <option value="${RangeType.Cone}" ${rng.type === RangeType.Cone ? 'selected' : ''}>CONE</option>
    <option value="${RangeType.Blast}" ${rng.type === RangeType.Blast ? 'selected' : ''}>BLAST</option>
    <option value="${RangeType.Burst}" ${rng.type === RangeType.Burst ? 'selected' : ''}>BURST</option>
  </select>
  <input class="lancer-stat-input " type="string" name="${data_target}.val" value="${rng.val ? rng.val : ''}" data-dtype="String"/>
  </div>`;
  return html;
}

export function weapon_damage_selector(dmg_arr: DamageData[], key: string, data_target: string) {
  const dmg = dmg_arr[key];
  const isNPC = Array.isArray(dmg.val);
  let html = '<div class="flexrow flex-center" style="padding: 5px; flex-wrap: nowrap;">';

  if (dmg.type) {
    html += `<i class="cci cci-${dmg.type.toLowerCase()} i--m damage--${dmg.type.toLowerCase()}"></i>`;
  }
  html +=
  `<select name="${data_target}.type" data-type="String" style="align-self: center;">
    <option value="" ${dmg.type === '' ? 'selected' : ''}>NONE</option>
    <option value="${DamageType.Kinetic}" ${dmg.type === DamageType.Kinetic ? 'selected' : ''}>KINETIC</option>
    <option value="${DamageType.Energy}" ${dmg.type === DamageType.Energy ? 'selected' : ''}>ENERGY</option>
    <option value="${DamageType.Explosive}" ${dmg.type === DamageType.Explosive ? 'selected' : ''}>EXPLOSIVE</option>
    <option value="${DamageType.Heat}" ${dmg.type === DamageType.Heat ? 'selected' : ''}>HEAT</option>
    <option value="${DamageType.Burn}" ${dmg.type === DamageType.Burn ? 'selected' : ''}>BURN</option>
    <option value="${DamageType.Variable}" ${dmg.type === DamageType.Variable ? 'selected' : ''}>VARIABLE</option>
  </select>`

  // NPC damage, 3 tiers
  if (isNPC) {
    html += 
    `</div>
    <div class="flexrow flex-center">
      <i class="cci cci-rank-1 i--m i--dark"></i>
      <input class="lancer-stat-input " type="string" name="${data_target}.val" value="${dmg.val[0] ? dmg.val[0] : ''}" data-dtype="String"/>
    </div>
    <div class="flexrow flex-center">
      <i class="cci cci-rank-2 i--m i--dark"></i>
      <input class="lancer-stat-input " type="string" name="${data_target}.val" value="${dmg.val[1] ? dmg.val[1] : ''}" data-dtype="String"/>
    </div>
    <div class="flexrow flex-center">
      <i class="cci cci-rank-3 i--m i--dark"></i>
      <input class="lancer-stat-input " type="string" name="${data_target}.val" value="${dmg.val[2] ? dmg.val[2] : ''}" data-dtype="String"/>
    </div>`;
  }
  // Player damage, single value
  else {
    html += `
      <input class="lancer-stat-input " type="string" name="${data_target}.val" value="${dmg.val ? dmg.val : ''}" data-dtype="String"/>
    </div>`;
  }
  return html;
}

/**
 * Handlebars partial for a weapon preview range stat
 */
export const weapon_range_preview = 
`{{#if range.val}}
{{#if (gtpi rkey "0")}}<span class="flexrow" style="align-items: center; justify-content: center; max-width: min-content;"> // </span>{{/if}}
<div class="compact-range">
    <i class="cci cci-{{lower-case range.type}} i--m i--dark"></i>
    <span class="medium">{{range.val}}</span>
</div>
{{/if}}`;

/**
 * Handlebars partial for a weapon preview damage stat
 */
export const weapon_damage_preview = 
`{{#if damage.type}}
<div class="compact-damage">
    <i class="card clipped cci cci-{{lower-case damage.type}} i--m damage--{{lower-case damage.type}}"></i>
    <span class="medium">{{dval}}</span>
</div>
{{/if}}`;

/**
 * Handlebars partial for an NPC feature preview attack bonus stat
 */
export const npc_attack_bonus_preview = 
`<div class="compact-acc">
  <i class="cci cci-reticule i--m i--dark"></i>
  <span class="medium">{{#if (ltpi atk "0")}}{{else}}+{{/if}}{{atk}} ATTACK BONUS</span>
</div>`;

/**
 * Handlebars partial for an NPC feature preview accuracy stat
 */
export const npc_accuracy_preview = 
`{{#if (gtpi acc "0")}}
<div class="compact-acc">
    <i class="cci cci-accuracy i--m i--dark"></i>
    <span class="medium">+{{acc}} ACCURACY</span>
</div>
{{/if}}
{{#if (ltpi acc "0")}}
<div class="compact-acc">
    <i class="cci cci-difficulty i--m i--dark"></i>
    <span class="medium">+{{neg acc}} DIFFICULTY</span>
</div>
{{/if}}`;

/**
 * Handlebars partial for a mech weapon preview card.
 */
export const mech_weapon_preview = 
`<div class="flexcol clipped lancer-weapon-container weapon" style="max-height: fit-content;" data-item-id="{{key}}">
  <div class="lancer-weapon-header clipped-top item" style="grid-area: 1/1/2/3" data-item-id="{{weapon._id}}">
    <i class="cci cci-weapon i--m i--light"> </i>
    <span class="minor">{{weapon.name}} // {{upper-case weapon.data.mount}} {{upper-case weapon.data.weapon_type}}</span>
    <a class="stats-control i--light" data-action="delete"><i class="fas fa-trash"></i></a>
  </div> 
  <div class="lancer-weapon-body">
    <a class="roll-attack" style="grid-area: 1/1/2/2;"><i class="fas fa-dice-d20 i--m i--dark"></i></a>
    <div class="flexrow" style="grid-area: 1/2/2/3; text-align: left; white-space: nowrap;">
      {{#each weapon.data.range as |range rkey|}}
        {{> wpn-range range=range rkey=rkey}}
      {{/each}}
      <hr class="vsep">
      {{#each weapon.data.damage as |damage dkey|}}
        {{> wpn-damage damage=damage dkey=dkey dval=damage.val}}
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
    <div class="flexcol" style="grid-area: 2/1/2/3; text-align: left; white-space: wrap">
      {{#if effect.effect_type}}
        <h3 class="medium flexrow">{{upper-case effect.effect_type}} EFFECT</h3>
        <span class="effect-text">{{{effect.hit}}}</span>
      {{/if}}
      {{#unless effect.effect_type}}<span class="effect-text">{{{effect}}}</span>{{/unless}}
      </div>
    {{/with}}
    <div class="flexrow" style="justify-content: flex-end; grid-area: 4/1/5/3">
      {{#each weapon.data.tags as |tag tkey|}}
      {{{compact-tag tag}}}
      {{/each}}
    </div>
  </div>
</div>`;

/**
 * Handlebars partial for non-editable Mech Trait
 */
export const mech_trait_preview = 
`<div class="lancer-mech-trait-header medium clipped-top" style="grid-area: 1/1/2/2">
  <i class="cci cci-trait i--m i--light"> </i>
  <span class="major">{{trait.name}}</span>
</div>
<div class="effect-text" style="grid-area: 2/1/3/2">{{{trait.description}}}</div>`;

/**
 * Handlebars partial for non-editable Core System
 */
export const core_system_preview = 
`<div class="card clipped frame-core flexcol">
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
    <div class="lancer-core-sys-header medium clipped-top">
      <i class="mdi mdi-circle-expand i--m i--light"> </i>
      <div class="medium">{{csys.passive_name}}</div>
      <div class="medium" style="justify-self: right;"> // PASSIVE</div>
    </div>
    <div class="effect-text">{{{csys.passive_effect}}}</div>
  </div>
  {{/if}}
  <div class="card clipped">
    <div class="lancer-core-sys-header medium clipped-top">
      <i class="cci cci-corebonus i--m i--light"> </i>
      <div class="medium">{{csys.active_name}}</div>
      <div class="medium" style="justify-self: right;"> // ACTIVE</div>
    </div>
    <div class="effect-text">{{{csys.active_effect}}}</div>
    <div class="flexrow">
    {{#each csys.tags as |tag key|}}
      {{{compact-tag tag key}}}
    {{/each}}
    </div>
  </div>
</div>`;

