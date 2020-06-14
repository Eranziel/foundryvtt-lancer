
import { LancerPilot, LancerNPC, LancerDeployable } from './actor/lancer-actor'
import { LancerSkill, LancerTalent, LancerCoreBonus, LancerLicense, LancerFrame } from './item/lancer-item';
import { DamageType, RangeType, WeaponSize, WeaponType, SystemType, MechType, ItemType, PilotEquipType } from './enums';

// ------------------------------------------------------
// |       UTILITY DATA TYPES                           |
// ------------------------------------------------------

// TODO: several of these may be moved to classes later to enable specialized logic

declare interface TagData {
  id: string;
  name: string;
  description: string;
  val: number | string;
}

declare interface RangeData {
  type: RangeType;
  val: number;
  override?: boolean;
  bonus?: number;
}

declare interface DamageData {
  type: DamageType;
  val: string | number;
  override?: boolean;
}

// ------------------------------------------------------
// |       ACTOR DATA TYPES                             |
// ------------------------------------------------------

// ------- Actor data templates -------------------------
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
  systems: LancerMechSystemData[];
}

// ------- Pilot data ----------------------------------
declare interface LancerPilotStatsData {
  size: number;
  hp: ResourceData;
  armor: number;
  evasion: number;
  edef: number;
  speed: number;
}

declare interface LancerPilotLoadoutData {
  armor: string;      // ID of armor Item
  weapons: string[];  // IDs of weapon Items
  gear: string[];     // IDs of gear Items
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
}

declare interface LancerPilotData {
  pilot: LancerPilotSubData;
  mech: LancerMechData;
  loadout: LancerMechLoadoutData;
}

declare interface LancerPilotActorData extends ActorData {
  data: LancerPilotData;
}

declare interface LancerPilotSheetData extends ActorSheetData {
  actor: LancerPilot;
  data: LancerPilotActorData;
}

// ------- NPC data ---------------------------------------------
declare interface LancerNPCData {
  mech: LancerMechData;
  type: string;
  class: string;
  npc_templates: string[];
  activations: number;
}

declare interface LancerNPCActorData extends ActorData {
  data: LancerNPCData;
}

declare interface LancerNPCSheetData extends ActorSheetData {
  actor: LancerNPC;
  data: LancerNPCActorData;
}

// ------- Deployable data --------------------------------------
declare interface LancerDeployableData {
  size: number;
  hp: ResourceData;
  armor: number;
  evasion: number;
  edef: number;
  description: string;
  effect: string;
}

declare interface LancerDeployableActorData extends ActorData {
  data: LancerDeployableData;
}

declare interface LancerDeployableSheetData extends ActorSheetData {
  actor: LancerDeployable;
  data: LancerDeployableActorData;
}

// ------------------------------------------------------
// |       ITEM DATA TYPES                             |
// ------------------------------------------------------

// -------- Item data templates -------------------------
declare interface LancerCompendiumItemData {
  id: string;
  name: string;
  description: string;
  note: string;
  item_type: ItemType;
  flavor_name: string;
  flavor_description: string;
}

declare interface LancerPilotEquipmentData {
  tags: TagData[];
}

declare interface LancerLicensedItemData extends LancerCompendiumItemData {
  source: string;
  license: string;
  license_level: number;
}

declare interface LancerMechEquipmentData {
  sp: number;
  uses: number;
  max_uses: number;
  max_use_override: number;
  destroyed: boolean;
  cascading: boolean;
  loaded: boolean;
  tags: TagData[];
  effect: object[]; // TODO: replace with specific type
  integrated: boolean;
  // TODO: not needed? Used in Comp/Con for some of its mech building logic.
  // talent_item: boolean; 
  // frame_id: boolean;
}

// -------- Skill Trigger data -----------------------------------
declare interface LancerSkillData {
  id: string;
  name: string;
  description: string;
  detail: string;
  rank: number;
}

declare interface LancerSkillItemData extends ItemData {
  data: LancerSkillData;
}

declare interface LancerSkillSheetData extends ItemSheetData {
  item?: LancerSkill;
  data?: LancerSkillData;
}

// -------- Talent data ------------------------------------------
declare interface LancerTalentData {
  id: string;
  name: string;
  description: string;
  ranks: {
    name: string; 
    description: string
  }[];
  rank: number;
}

declare interface LancerTalentItemData extends ItemData {
  data: LancerTalentData;
}

declare interface LancerTalentSheetData extends ItemSheetData {
  item?: LancerTalent;
  data?: LancerTalentData;
}

// -------- Core Bonus data --------------------------------------
declare interface LancerCoreBonusData {
  id: string;
  name: string;
  source: string;
  effect: string;
  mounted_effect: string;
}

declare interface LancerCoreBonusItemData extends ItemData {
  data: LancerCoreBonusData;
}

declare interface LancerCoreBonusSheetData extends ItemSheetData {
  item?: LancerCoreBonus;
  data?: LancerCoreBonusData;
}

// -------- License data -----------------------------------------
declare interface LancerLicenseData {
  name: string;
  source: string;
  rank: number;
}

declare interface LancerLicenseItemData extends ItemData {
  data: LancerLicenseData;
}

declare interface LancerLicenseSheetData extends ItemSheetData {
  item?: LancerLicense;
  data?: LancerLicenseData;
}

// -------- Reserve data -----------------------------------------
// TODO: reserve data type

// -------- Pilot Armor data -------------------------------------
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

declare interface LancerPilotArmorItemData extends ItemData {
  data: LancerPilotArmorData;
}

// -------- Pilot Weapon data ------------------------------------
declare interface LancerPilotWeaponData extends LancerCompendiumItemData, LancerPilotEquipmentData {
  range: RangeData[];
  damage: DamageData[];
  effect: string;
  custom_damage_type: DamageType;
}

declare interface LancerPilotWeaponItemData extends ItemData {
  data: LancerPilotWeaponData;
}

// -------- Pilot Gear data --------------------------------------
declare interface LancerPilotGearData extends LancerCompendiumItemData, LancerPilotEquipmentData {
  uses: number;
  current_uses: number;
}

declare interface LancerPilotGearItemData extends ItemData {
  data: LancerPilotGearData;
}

// -------- Frame data -------------------------------------------
declare interface LancerFrameStatsData {
  size: number;
  armor: number;
  hp: number;
  evasion: number;
  edef: number;
  heatcap: number;
  repcap: number;
  sensor_range: number;
  tech_attack: number;
  save: number;
  speed: number;
  sp: number;
}

declare interface LancerCoreSystemData {
  name: string;
  description: string;
  integrated?: { id: string }
  passive_name?: string
  passive_effect?: string
  active_name: string;
  active_effect: string;
  tags: TagData[];
}

declare interface LancerFrameData extends LancerLicensedItemData {
  mechtype: MechType[];
  stats: LancerFrameStatsData;
  mounts: object[]; // TODO: replace with specific type
  core_system: LancerCoreSystemData;
}

declare interface LancerFrameItemData extends ItemData {
  data: LancerFrameData;
}

declare interface LancerFrameSheetData extends ItemSheetData {
  item?: LancerFrame;
  data?: LancerFrameData;
}

// -------- Mech System data -------------------------------------
declare interface LancerMechSystemData extends LancerLicensedItemData, LancerMechEquipmentData {
  system_type: SystemType;
}

declare interface LancerMechSystemItemData extends ItemData {
  data: LancerMechSystemData;
}

// -------- Mech Weapon data -------------------------------------
declare interface LancerMechWeaponData extends LancerLicensedItemData, LancerMechEquipmentData {
  mount: WeaponSize;
  weapon_type: WeaponType;
  damage: DamageData[];
  range: RangeData[];
  mod: object | null; // TODO: weapon mod type
  custom_damage_type: DamageType;
}

declare interface LancerMechWeaponItemData extends ItemData {
  data: LancerMechWeaponData;
}
