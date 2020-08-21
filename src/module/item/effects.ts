import { TagData, RangeData, DamageData } from "../interfaces";
import { EffectType, ActivationType, ChargeType } from "../enums";

export const EffectIcons = {
  'Generic': 'systems/lancer/assets/icons/generic_item.svg',
  'Basic': 'systems/lancer/assets/icons/generic_item.svg',
  'Charge': 'systems/lancer/assets/icons/mine.svg',
  'Deployable': 'systems/lancer/assets/icons/deployable.svg',
  'AI': 'systems/lancer/assets/icons/mech_system.svg',
  'Protocol': 'systems/lancer/assets/icons/protocol.svg',
  'Reaction': 'systems/lancer/assets/icons/reaction.svg',
  'Tech': 'systems/lancer/assets/icons/tech_quick.svg',
  'Drone': 'systems/lancer/assets/icons/drone.svg',
  'Bonus': 'systems/lancer/assets/icons/shape_polygon_plus.svg',
  'Offensive': 'systems/lancer/assets/icons/sword_array.svg',
  'Profile': 'systems/lancer/assets/icons/weapon_profile.svg',
};

// Note that this type can be replaced with a descriptive string in some cases.
interface EffectData {
  effect_type: EffectType;
  name?: string;
  activation?: ActivationType;
  tags?: TagData[];
}

declare interface BasicEffectData extends EffectData {
  detail: string;
}

declare interface AIEffectData extends EffectData {
  detail: string;
  abilities: EffectData[];
}

declare interface BonusEffectData extends EffectData {
  detail: string;
  size?: number;
  hp?: number;
  armor?: number;
  evasion?: number;
  edef?: number;
}

declare interface ChargeData {
  name: string;
  charge_type: ChargeType;
  detail: string;
  range?: RangeData[];
  damage?: DamageData[];
  tags?: TagData[];
}

declare interface ChargeEffectData extends EffectData {
  charges: ChargeData[];
}

declare interface DeployableEffectData extends EffectData {
  count?: number;
  size?: number;
  hp?: number;
  heat?: number;
  evasion?: number;
  edef?: number;
  detail: string;
}

declare interface DroneEffectData extends EffectData {
  size: number;
  hp: number;
  armor?: number;
  edef: number;
  evasion: number;
  detail: string;
  abilities?: EffectData[];
}

declare interface GenericEffectData extends EffectData {
  detail: string;
}

declare interface OffensiveEffectData extends EffectData {
  detail?: string;
  attack?: string;
  hit?: string;
  critical?: string;
  abilities?: EffectData[];
}

declare interface ProfileEffectData extends EffectData {
  name: string;
  range?: RangeData[];
  damage?: DamageData[];
  detail?: string;
}

declare interface ProtocolEffectData extends EffectData {
  detail: string;
}

// Note that Reactions, like Tech or Protocols, may be more generic than an effect. Yet to be seen.
declare interface ReactionEffectData extends EffectData {
  name: string;
  detail: string;
  frequency: string;  // May need a specialized parser and interface for compatibility with About Time by Tim Posney
  trigger: string;
  init?: string;
}

declare interface InvadeOptionData {
  name: string;
  detail: string;
  activation?: ActivationType;
}

// Tech seems to either have detail, or have option_set and options.
declare interface TechEffectData extends EffectData {
  detail: string;
  activation: ActivationType;
  options?: InvadeOptionData[];
  options_set?: string;
}

/* ------------------------------------ */
/* Handlebars Helpers                   */
/* ------------------------------------ */

/**
 * Handlebars helper for effect action type
 */
function action_type_selector(a_type: string, data_target: string) {
  const a = a_type ? a_type.toLowerCase() : ActivationType.None.toLowerCase();
  let html = '<div class="flexrow flex-center" style="padding: 5px; flex-wrap: nowrap;">';

  if (a === ActivationType.Full.toLowerCase()) {
    html += `<i class="cci cci-activation-full i--m"></i>`;
  } else if (a === ActivationType.Quick.toLowerCase()) {
    html += `<i class="cci cci-activation-quick i--m"></i>`;
  } else if (a === ActivationType.Reaction.toLowerCase()) {
    html += `<i class="cci cci-reaction i--m"></i>`;
  } else if (a === ActivationType.Protocol.toLowerCase()) {
    html += `<i class="cci cci-protocol i--m"></i>`;
  }

  html +=
  `<select name="${data_target}" data-type="String" style="height: 2em;float: right" >
    <option value="${ActivationType.None}" ${a === ActivationType.None.toLowerCase() ? 'selected' : ''}>NONE</option>
    <option value="${ActivationType.Full}" ${a === ActivationType.Full.toLowerCase() ? 'selected' : ''}>FULL</option>
    <option value="${ActivationType.Quick}" ${a === ActivationType.Quick.toLowerCase() ? 'selected' : ''}>QUICK</option>
    <option value="${ActivationType.Reaction}" ${a === ActivationType.Reaction.toLowerCase() ? 'selected' : ''}>REACTION</option>
    <option value="${ActivationType.Protocol}" ${a === ActivationType.Protocol.toLowerCase() ? 'selected' : ''}>PROTOCOL</option>
    <option value="${ActivationType.Passive}" ${a === ActivationType.Passive.toLowerCase() ? 'selected' : ''}>PASSIVE</option>
    <option value="${ActivationType.Other}" ${a === ActivationType.Other.toLowerCase() ? 'selected' : ''}>OTHER</option>
  </select>
  </div>`;
  return html;
}


/**
 * Handlebars helper for charge type selector
 */
function charge_type_selector(c_type: string, data_target: string) {
  const c = c_type ? c_type.toLowerCase() : ChargeType.Grenade.toLowerCase();
  const html = 
  `<select name="${data_target}" data-type="String" style="height: 2em;float: right" >
    <option value="${ChargeType.Grenade}" ${c === ChargeType.Grenade.toLowerCase() ? 'selected' : ''}>GRENADE</option>
    <option value="${ChargeType.Mine}" ${c === ChargeType.Mine.toLowerCase() ? 'selected' : ''}>MINE</option>
  </select>`;
  return html;
}


const charge_effect_editable = 
``;


export {
  EffectData,
  BasicEffectData,
  AIEffectData,
  BonusEffectData,
  ChargeData,
  ChargeEffectData,
  DeployableEffectData,
  DroneEffectData,
  GenericEffectData,
  OffensiveEffectData,
  ProfileEffectData,
  ProtocolEffectData,
  ReactionEffectData,
  TechEffectData,
  action_type_selector,
  charge_type_selector,
}
