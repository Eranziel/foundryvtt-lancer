
import { LancerPilot } from './actor/lancer-actor.js'

declare interface ResourceData {
  value: number;
  min: number;
  max: number;
}

declare interface LancerMechData {
  frame: string;
  hull: number;
  agility: number;
  systems: number;
  engingeering: number;
  hp: ResourceData;
  structure: ResourceData;
  heat: ResourceData;
  stress: ResourceData;
  armor: number;
  speed: number;
  evasion: number;
  edef: number;
  sensors: number;
  save: number;
}

declare interface LancerMechLoadoutData {
  mounts: object[];
  systems: object[];
}

declare interface LancerPilotStatsData {
  hp: ResourceData;
  armor: number;
  evasion: number;
  edef: number;
  speed: number;
}

declare interface LancerPilotLoadoutData {
  armor: LancerPilotArmorData;
  weapons: LancerPilotWeaponData[];
  gear: LancerPilotGearData[];
}

declare interface LancerPilotSubData {
  level: number;
  grit: number;
  callsign: string;
  status: string;
  notes: string;
  quirk: string;
  background: string;
  history: string;
  stats: LancerPilotStatsData;
  loadout: LancerPilotLoadoutData;
  licenses: LancerLicenseData[];
  skills: LancerSkillData[];
  talents: LancerTalentData[];
  core_bonuses: LancerCoreBonusData[];
  reserves: Item[]; // TODO: reserve data type
}

declare interface LancerPilotData extends ActorData {
  pilot: LancerPilotSubData;
  mech: LancerMechData;
  loadout: LancerMechLoadoutData;
}

declare interface LancerPilotSheetData extends ActorSheetData {
  actor: LancerPilot;
  data: LancerPilotData;
}

declare interface LancerNPCData extends ActorData {
  mech: LancerMechData;
  type: string;
  class: string;
  npc_templates: string[];
  activations: number;
  features: Item[]; // TODO: NPC feature data type
}

declare interface LancerCompendiumItemData {
  id: string;
  name: string;
  description: string;
  note: string;
  item_type: string;
  flavor_name: string;
  flavor_description: string;
}

declare interface LancerPilotEquipmentData {
  type: string;
  tags: object[]; // TODO: replace with real type
  current_uses: number;
  custom_damage_type: string;
}

declare interface LancerMechEquipmentData {
  type: string;
  tags: object[]; // TODO: replace with real type
}

declare interface LancerSkillData extends BaseEntityData {
  id: string;
  name: string;
  description: string;
  detail: string;
  rank: number;
}

declare interface LancerTalentData extends BaseEntityData {
  id: string;
  name: string;
  description: string;
  ranks: { // TODO: do we need a specific type here?
    name: string; 
    description: string
  }[];
  rank: number;
}

declare interface LancerCoreBonusData extends BaseEntityData {
  id: string;
  source: string;
  effect: string;
  mounted_effect: string;
}

declare interface LancerLicenseData extends BaseEntityData {
  name: string;
  source: string;
  rank: number;
}

declare interface LancerPilotArmorData extends BaseEntityData, LancerCompendiumItemData, LancerPilotEquipmentData {
  hp_bonus: number;
  speed: number;
  speed_bonus: number;
  armor: number;
  edef: number;
  edef_bonus: number;
  evasion: number;
  evasion_bonus: number;
}

declare interface LancerPilotWeaponData extends BaseEntityData, LancerCompendiumItemData, LancerPilotEquipmentData {
  range: object[]; // TODO: replace with Range type
  damage: object[]; // TODO: replace with Damage type
  effect: string;
}

declare interface LancerPilotGearData extends BaseEntityData, LancerCompendiumItemData, LancerPilotEquipmentData {
  uses: number;
}
