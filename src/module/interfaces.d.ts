
import { LancerPilot, LancerNPC, LancerDeployable } from './actor/lancer-actor'
import { LancerSkill, LancerTalent, LancerCoreBonus, LancerLicense } from './item/lancer-item';

declare interface ResourceData {
  value: number;
  min: number;
  max: number;
}

declare interface LancerMechData {
  frame: string;
  size: number;
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
  mounts: object[]; // TODO
  systems: object[]; // TODO
}

declare interface LancerPilotStatsData {
  size: number;
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

declare interface LancerNPCSheetData extends ActorSheetData {
  actor: LancerNPC;
  data: LancerNPCData;
}

declare interface LancerDeployableData extends ActorData {
  size: number;
  hp: ResourceData;
  armor: number;
  evasion: number;
  edef: number;
  description: string;
  effect: string;
}

declare interface LancerDeployableSheetData extends ActorSheetData {
  actor: LancerDeployable;
  data: LancerDeployableData;
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

declare interface LancerSkillData {
  id: string;
  name: string;
  description: string;
  detail: string;
  rank: number;
}

declare interface LancerSkillEntityData extends BaseEntityData {
  data: LancerSkillData;
}

declare interface LancerSkillSheetData extends ItemSheetData {
  item?: LancerSkill;
  data?: LancerSkillData;
}

declare interface LancerTalentData {
  id: string;
  name: string;
  description: string;
  ranks: { // TODO: do we need a specific type here?
    name: string; 
    description: string
  }[];
  rank: number;
}

declare interface LancerTalentEntityData extends BaseEntityData {
  data: LancerTalentData;
}

declare interface LancerTalentSheetData extends ItemSheetData {
  item?: LancerTalent;
  data?: LancerTalentData;
}

declare interface LancerCoreBonusData {
  id: string;
  name: string;
  source: string;
  effect: string;
  mounted_effect: string;
}

declare interface LancerCoreBonusEntityData extends BaseEntityData {
  data: LancerCoreBonusData;
}

declare interface LancerCoreBonusSheetData extends ItemSheetData {
  item?: LancerCoreBonus;
  data?: LancerCoreBonusData;
}

declare interface LancerLicenseData {
  name: string;
  source: string;
  rank: number;
}

declare interface LancerLicenseEntityData extends BaseEntityData {
  data: LancerLicenseData;
}

declare interface LancerLicenseSheetData extends ItemSheetData {
  item?: LancerLicense;
  data?: LancerLicenseData;
}

declare interface LancerPilotArmorData extends LancerCompendiumItemData, LancerPilotEquipmentData {
  hp_bonus: number;
  speed: number;
  speed_bonus: number;
  armor: number;
  edef: number;
  edef_bonus: number;
  evasion: number;
  evasion_bonus: number;
}

declare interface LancerPilotArmorEntityData extends BaseEntityData {
  data: LancerPilotArmorData;
}

declare interface LancerPilotWeaponData extends LancerCompendiumItemData, LancerPilotEquipmentData {
  range: object[]; // TODO: replace with Range type
  damage: object[]; // TODO: replace with Damage type
  effect: string;
}

declare interface LancerPilotWeaponEntityData extends BaseEntityData {
  data: LancerPilotWeaponData;
}

declare interface LancerPilotGearData extends LancerCompendiumItemData, LancerPilotEquipmentData {
  uses: number;
}

declare interface LancerPilotGearEntityData extends BaseEntityData {
  data: LancerPilotGearData;
}
