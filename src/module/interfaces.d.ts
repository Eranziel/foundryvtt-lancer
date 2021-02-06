import {
  LancerSkill,
  LancerTalent,
  LancerCoreBonus,
  LancerLicense,
  LancerFrame,
  LancerPilotArmor,
  LancerPilotWeapon,
  LancerPilotGear,
  LancerMechWeapon,
  LancerMechSystem,
  LancerNPCFeature,
  LancerNPCClass,
  LancerNPCTemplate,
  LancerItemData,
} from "./item/lancer-item";
import { RangeType, NPCTag } from "./enums";
import { EffectData } from "./item/effects";
import * as mm from "machine-mind";
import { MountType } from "machine-mind";

// ------------------------------------------------------
// |       UTILITY DATA TYPES                           |
// ------------------------------------------------------

// TODO: several of these may be moved to classes later to enable specialized logic
// TODO: Range and Damage are good examples of objects that should be aware of their string representation and html representation

/*
declare interface TagDataShort {
  id: string;
  val?: number | string;
}
*/
declare type TagDataShort = mm.ITagData;

// Alias, except it also have a val for some reason? TODO: Verify that this wasn't just a typo. Why would val matter here (reliable maybe? why not present in CC/mm?)
/*
declare interface TagData {
  id: string;
  name: string;
  description: string;
  val?: number | string;
  filter_ignore?: boolean;
  hidden?: boolean;
}
*/
declare interface TagData extends mm.ITagCompendiumData {
  val?: number | string;
}

// Alias
/*
declare interface RangeData {
  type: RangeType;
  val: number;
  override?: boolean;
  bonus?: number;
}*/
declare type RangeData =
  | mm.IRangeData
  | {
      type: "None";
      val: 0;
    };

// Alias
/*
declare interface DamageData {
  type: DamageType;
  val: string | number;
  override?: boolean;
}
*/
declare type DamageData = mm.IDamageData;

// This type significantly diverges for some reason.
// declare type NPCDamageData = mm.INpcDamageData;
declare interface NPCDamageData {
  type: mm.DamageType;
  val: string[];
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

// Significance divergence from the CC mech. Seems useful for code reuse, but more than any other data type I'd like to have this one refactored to mirror CC/MM
declare interface LancerMechData {
  name: string;
  size: number;
  hull: number;
  agility: number;
  systems: number;
  engineering: number;
  hp: ResourceData;
  structure: ResourceData;
  heat: ResourceData;
  stress: ResourceData;
  repairs: ResourceData;
  armor: number;
  speed: number;
  evasion: number;
  edef: number;
  sensors: number;
  save: number;
  tech_attack: number;
  sp: number;
  current_core_energy: number;
  overcharge_level: number;
}

// Seems like it should eventually mirror IMechLoadoutData
declare interface LancerMechLoadoutData {
  mounts: LancerMountData[]; // TODO
  systems: LancerMechSystemData[];
}

declare interface LancerMountData {
  secondary_mount: string; // ????
  type: MountType;
  weapons: LancerMechWeaponItemData[];
}

// ------- Pilot data ----------------------------------
// No MM equivalent
declare interface LancerPilotStatsData {
  size: number;
  hp: ResourceData;
  armor: number;
  evasion: number;
  edef: number;
  speed: number;
}

// Stripped down version of IPilotLoadoutData, that instead uses IDs. Honestly, probably better done this way
declare interface LancerPilotLoadoutData {
  armor: string; // ID of armor Item
  weapons: string[]; // IDs of weapon Items
  gear: string[]; // IDs of gear Items
}

// Kind of like IPilotData. Lots of loss here, but dunno how much we care about
declare interface LancerPilotSubData {
  level: number;
  grit: number;
  callsign: string;
  name: string;
  status: string;
  notes: string;
  quirk: string;
  background: string;
  history: string;
  stats: LancerPilotStatsData;
  cloud_code: string;
  cloud_owner_code: string;
  cloud_time: string;
  loadout: LancerPilotLoadoutData;
}

// Ditto above
declare interface LancerPilotData {
  pilot: LancerPilotSubData;
  mech: LancerMechData;
  mech_loadout: LancerMechLoadoutData;
}

// Utility interface that basically just asserts the type of an actors data
declare interface LancerPilotActorData extends ActorData {
  data: LancerPilotData;
}

// Derived/consolidated data for an actor, used by handlebars template.
declare interface LancerPilotSheetData extends ActorSheetData {
  actor: LancerPilotActorData;
  data: LancerPilotData;
  skills: LancerSkill[];
  talents: LancerTalent[];
  core_bonuses: LancerCoreBonus[];
  licenses: LancerLicense[];
  pilot_loadout: {
    armor: LancerPilotArmor[];
    weapons: LancerPilotWeapon[];
    gear: LancerPilotGear[];
  };
  frame: LancerFrame;
  frame_size: string;
  // TODO: subdivide into mounts
  mech_loadout: {
    weapons: LancerMechWeapon[];
    systems: LancerMechSystem[];
  };
  sp_used: number;
}

// ------- NPC data ---------------------------------------------
// Similar to mech and pilot, not currently easily converted
declare interface LancerNPCData {
  mech: LancerMechData;
  type: string;
  name: string;
  tier: "npc-tier-1" | "npc-tier-2" | "npc-tier-3" | "npc-tier-custom"; //tier1-3 = 1-3 and custom = 4
  tier_num: number;
  tag: NPCTag;
  activations: number;
  npc_size: string;
}

// Utility interface that basically just asserts the type of an actors data
declare interface LancerNPCActorData extends ActorData {
  data: LancerNPCData;
}

// Derived/consolidated data for an npc, used by handlebars template.
declare interface LancerNPCSheetData extends ActorSheetData {
  actor: LancerNPCActorData;
  data: LancerNPCData;
  npc_class: LancerNPCClass;
  npc_templates: LancerNPCTemplate[];
  npc_features: LancerNPCFeature[];
}

// ------- Deployable data --------------------------------------
// Represents a _significant_ divergence from the CC/MM way of doing things
// This is likely because this is serving a dual role as a token stats and a resource, whereas CC just tracks the resource
declare interface LancerDeployableData {
  name: string;
  size: number;
  hp: ResourceData;
  heat: ResourceData;
  armor: number;
  evasion: number;
  edef: number;
  description: string;
  effect: EffectData;
}

// Utility interface that basically just asserts the type of an actors data
declare interface LancerDeployableActorData extends ActorData {
  data: LancerDeployableData;
}

declare interface LancerDeployableSheetData extends ActorSheetData {
  actor: LancerDeployableActorData;
  data: LancerDeployableData;
}

// ------------------------------------------------------
// |       ITEM DATA TYPES                             |
// ------------------------------------------------------

// -------- Item data templates -------------------------
// This is similar to CompendiumItem. Note however, that CompendiumItem does not actually implement usage of flavor_name and flavor_description.
// they are, at this time, utterly useless on the CC/MM side
declare interface LancerCompendiumItemData {
  id: string;
  name: string;
  description: string;
  note: string;
  item_type: mm.ItemType;
  flavor_name: string;
  flavor_description: string;
}

// Highly simplified version of CC PilotEquipment
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
  effect: EffectData; // EffectData;
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
  family: string;
}

declare interface LancerSkillItemData extends LancerItemData {
  data: LancerSkillData;
  type: "skill";
}

declare interface LancerSkillSheetData extends ItemSheetData {
  item?: LancerSkillItemData;
  data?: LancerSkillData;
}

// -------- Talent data ------------------------------------------
declare type LancerTalentRank = mm.ITalentRank;

// Basically is an ITalentData + an IRankedData. An acceptable divergence, as it needs to encapsulate
//
declare interface LancerTalentData {
  id: string;
  name: string;
  description: string;
  ranks: LancerTalentRank[];
  rank: number;
}

declare interface LancerTalentItemData extends LancerItemData {
  data: LancerTalentData;
  type: "talent";
}

declare interface LancerTalentSheetData extends ItemSheetData {
  item?: LancerTalentItemData;
  data?: LancerTalentData;
}

// -------- Core Bonus data --------------------------------------
declare interface LancerCoreBonusData {
  id: string;
  name: string;
  source: string;
  effect: string; // EffectData; -- it is patently not an effect data
  mounted_effect: string;
}

declare interface LancerCoreBonusItemData extends LancerItemData {
  data: LancerCoreBonusData;
  type: "core_bonus";
}

declare interface LancerCoreBonusSheetData extends ItemSheetData {
  item?: LancerCoreBonusItemData;
  data?: LancerCoreBonusData;
}

// -------- License data -----------------------------------------
declare interface LancerLicenseRank {
  items: string[];
}

declare interface LancerLicenseData {
  id: string;
  name: string;
  source: string;
  ranks: LancerLicenseRank[];
  rank: number;
}

declare interface LancerLicenseItemData extends LancerItemData {
  data: LancerLicenseData;
  type: "license";
}

declare interface LancerLicenseSheetData extends ItemSheetData {
  item?: LancerLicenseItemData;
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

declare interface LancerPilotArmorItemData extends LancerItemData {
  data: LancerPilotArmorData;
  type: "pilot_armor";
}

declare interface LancerPilotArmorSheetData extends ItemSheetData {
  item?: LancerPilotArmorItemData;
  data?: LancerPilotArmorData;
}

// -------- Pilot Weapon data ------------------------------------
declare interface LancerPilotWeaponData extends LancerCompendiumItemData, LancerPilotEquipmentData {
  range: RangeData[];
  damage: DamageData[];
  effect: string;
  custom_damage_type: mm.DamageType | string | null;
}

declare interface LancerPilotWeaponItemData extends LancerItemData {
  data: LancerPilotWeaponData;
  type: "pilot_weapon";
}

declare interface LancerPilotWeaponSheetData extends ItemSheetData {
  item?: LancerPilotWeaponItemData;
  data?: LancerPilotWeaponData;
}

// -------- Pilot Gear data --------------------------------------
declare interface LancerPilotGearData extends LancerCompendiumItemData, LancerPilotEquipmentData {
  uses: number | null;
  current_uses: number | null;
}

declare interface LancerPilotGearItemData extends LancerItemData {
  data: LancerPilotGearData;
  type: "pilot_gear";
}

declare interface LancerPilotGearSheetData extends ItemSheetData {
  item?: LancerPilotGearItemData;
  data?: LancerPilotGearData;
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

declare interface LancerMechTraitData {
  name: string;
  description: string;
}

declare interface LancerCoreSystemData {
  name: string;
  description: string;
  integrated?: { id: string } | null;
  passive_name?: string | null;
  passive_effect?: string | null;
  active_name: string;
  active_effect: string;
  tags: TagData[];
}

declare interface LancerFrameData extends LancerCompendiumItemData, LancerLicensedItemData {
  mechtype: mm.MechType[];
  stats: LancerFrameStatsData;
  traits: LancerMechTraitData[];
  mounts: mm.MountType[];
  core_system: LancerCoreSystemData;
}

declare interface LancerFrameItemData extends LancerItemData {
  data: LancerFrameData;
  type: "frame";
}

declare interface LancerFrameSheetData extends ItemSheetData {
  item?: LancerFrameItemData;
  data?: LancerFrameData;
}

// -------- Mech System data -------------------------------------
declare interface LancerMechSystemData extends LancerLicensedItemData, LancerMechEquipmentData {
  system_type: mm.SystemType;
}

declare interface LancerMechSystemItemData extends LancerItemData {
  data: LancerMechSystemData;
  type: "mech_system";
}

declare interface LancerMechSystemSheetData extends ItemSheetData {
  item?: LancerMechSystemItemData;
  data?: LancerMechSystemData;
}

// -------- Mech Weapon data -------------------------------------
declare interface LancerMechWeaponData extends LancerLicensedItemData, LancerMechEquipmentData {
  mount: mm.WeaponSize;
  weapon_type: mm.WeaponType;
  damage: DamageData[];
  range: RangeData[];
  mod: object | null; // TODO: weapon mod type
  custom_damage_type: mm.DamageType | null;
}

declare interface LancerMechWeaponItemData extends LancerItemData {
  data: LancerMechWeaponData;
  type: "mech_weapon";
}

declare interface LancerMechWeaponSheetData extends ItemSheetData {
  item?: LancerMechWeaponItemData;
  data?: LancerMechWeaponData;
}

// -------- NPC Class data -------------------------------------
declare interface LancerNPCClassStatsData {
  hp: number[];
  heatcap: number[];
  structure: number[];
  stress: number[];
  armor: number[];
  evasion: number[];
  edef: number[];
  speed: number[];
  sensor_range: number[];
  save: number[];
  activations: number[];
  size: number[];
  hull: number[];
  agility: number[];
  systems: number[];
  engineering: number[];
}

declare interface LancerNPCInfoData {
  flavour: string;
  tactics: string;
}

declare interface LancerNPCClassData extends LancerCompendiumItemData {
  mechtype: mm.MechType;
  info: LancerNPCInfoData;
  stats: LancerNPCClassStatsData;
  base_features: string[];
  optional_features: string[];
}

declare interface LancerNPCClassItemData extends LancerItemData {
  data: LancerNPCClassData;
  type: "npc_class";
}

declare interface LancerNPCClassSheetData extends ItemSheetData {
  item?: LancerNPCClassItemData;
  data?: LancerNPCClassData;
}

// -------- NPC Template data -------------------------------------
declare interface LancerNPCTemplateData extends LancerCompendiumItemData {
  base_features: string[];
  optional_features: string[];
}

declare interface LancerNPCTemplateItemData extends LancerItemData {
  data: LancerNPCTemplateData;
  type: "npc_template";
}

declare interface LancerNPCTemplateSheetData extends ItemSheetData {
  item?: LancerNPCTemplateItemData;
  data?: LancerNPCTemplateData;
}

// -------- NPC Feature data -------------------------------------
declare interface LancerNPCFeatureData extends LancerCompendiumItemData {
  origin_type: string;
  origin_name: string;
  origin_base: boolean;
  feature_type: mm.NpcFeatureType;
  effect?: string;
  bonus?: object;
  override?: object;
  tags: TagData[];
  destroyed: boolean;
  charged: boolean;
  uses: number;
  max_uses: number;
}

declare interface LancerNPCFeatureItemData extends LancerItemData {
  data: LancerNPCFeatureData;
  type: "npc_feature";
}

declare interface LancerNPCFeatureSheetData extends ItemSheetData {
  item?: LancerNPCFeatureItemData;
  data?: LancerNPCFeatureData;
}

// -------- Macro data -------------------------------------
declare interface LancerStatMacroData {
  title: string;
  bonus: string | number;
  effect?: EffectData | string;
}

declare interface LancerAttackMacroData {
  item_id: string | undefined;
  title: string;
  grit: number;
  acc: number;
  damage: DamageData[];
  overkill: boolean;
  effect: EffectData | string;
  on_hit?: string; // For NPC weapons - to be removed once they use EffectData
  tags: TagDataShort[];
}

declare interface LancerTechMacroData {
  title: string;
  t_atk: number;
  acc: number;
  effect: string;
  tags: TagDataShort[];
}

declare interface LancerTalentMacroData {
  talent: LancerTalentData;
  rank: number;
}

declare interface LancerGenericMacroData {
  title: string;
  effect: EffectData | string;
}

declare interface LancerReactionMacroData {
  title: string;
  trigger: string;
  effect: string;
  tags?: TagDataShort[];
}

declare interface LancerTextMacroData {
  title: string;
  description: string;
  tags?: TagDataShort[];
}

declare interface LancerOverchargeMacroData {
  level: number;
  roll: Roll;
}
