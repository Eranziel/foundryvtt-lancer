import {
  ActivationType,
  DamageType,
  FittingSize,
  FrameEffectUse,
  MountType,
  NpcFeatureType,
  OrgType,
  RangeType,
  SynergyLocation,
  SystemType,
  WeaponSize,
  WeaponType,
} from "../../enums";

export interface PackedActionData {
  name?: string;
  activation: ActivationType;
  cost?: number;
  frequency?: string;
  init?: string;
  trigger?: string;
  terse?: string;
  detail: string;
  pilot?: boolean;
  mech?: boolean;
  tech_attack?: boolean;
  hide_active?: boolean;
  synergy_locations?: string[];
  confirm?: string[];
  log?: string;
  ignore_used?: boolean;
  heat_cost?: number;

  id?: string;
  damage?: PackedDamageData[];
  range?: PackedRangeData[];
}

export interface PackedSkillData {
  id: string;
  name: string;
  description: string; // terse, prefer fewest chars
  detail: string; // v-html
  family: any; // These exist in lancer-data, but we will purposefully ignore them
  rank?: number;
  custom?: true;
  custom_desc?: string;
  custom_detail?: string;
}

export interface PackedDamageData {
  type?: DamageType;
  val?: string | number;
  override?: boolean; // If player can set the damage of this, I guess????
}

export interface PackedRangeData {
  type?: RangeType;
  val?: string | number;
}

export interface PackedBonusData {
  id: string;
  val: string | number;
  damage_types?: DamageType[];
  range_types?: RangeType[];
  weapon_types?: WeaponType[];
  weapon_sizes?: WeaponSize[];

  // ugh
  overwrite?: boolean;
  replace?: boolean;
}

export interface PackedSynergyData {
  locations?: SynergyLocation[] | SynergyLocation; // I do not know why the hell you would use any here, but its easier than checking for edge cases, lol
  detail: string; // v-html
  system_types?: Array<SystemType | "any"> | SystemType | "any";
  weapon_types?: Array<WeaponType | "any"> | WeaponType | "any";
  weapon_sizes?: Array<WeaponSize | "any"> | WeaponSize | "any";
}

export interface PackedDeployableData {
  name: string;
  type: string; // this is for UI furnishing only,
  detail: string;
  activation?: ActivationType;
  deactivation?: ActivationType;
  recall?: ActivationType;
  redeploy?: ActivationType;
  range?: Range[];

  size: number;
  instances?: number;
  cost?: number;
  armor?: number;
  hp?: number;
  evasion?: number;
  edef?: number;
  heatcap?: number;
  repcap?: number;
  pilot?: boolean;
  mech?: boolean;
  sensor_range?: number;
  tech_attack?: number;
  save?: number;
  speed?: number;
  resistances?: string[];
  actions?: PackedActionData[];
  bonuses?: PackedBonusData[];
  synergies?: PackedSynergyData[];
  counters?: PackedCounterData[];
  tags?: PackedTagData[];
}

export interface PackedTagTemplateData {
  id: string;
  name: string;
  description: string;
  filter_ignore?: boolean;
  hidden?: boolean;
}

export interface PackedTagData {
  id: string;
  val?: string | number;
}

export interface PackedCounterData {
  id: string;
  name: string;
  min?: number;
  max?: number;
  default_value?: number;
  custom?: boolean;
}

export interface PackedCounterSaveData {
  id: string;
  val: number;
}

export interface PackedRankedData {
  id: string;
  rank: number;
  custom?: boolean;
  custom_desc?: string;
  custom_detail?: string;
}

export interface PackedAmmoData {
  name: string;
  description: string;
  cost?: number;
  allowed_types?: WeaponType[];
  allowed_sizes?: WeaponSize[];
  restricted_types?: WeaponType[];
  restricted_sizes?: WeaponSize[];
}

export interface PackedReserveData {
  id: string;
  type: string;
  name: string;
  label: string;
  description?: string;
  resource_name?: string; // Seems vestigial, unused by lancer-data
  resource_note?: string; // Seems vestigial, unused by lancer-data
  resource_cost?: string; // Seems vestigial, unused by lancer-data
  used: boolean;
  consumable: boolean;
  synergies?: PackedSynergyData[];
  deployables?: PackedDeployableData[];
  counters?: PackedCounterData[];
  integrated?: string[];
  bonuses?: PackedBonusData[];
  actions?: PackedActionData[];
}

export interface PackedOrganizationData {
  name: string;
  purpose: OrgType;
  description: string;
  efficiency: number;
  influence: number;
  actions: string;
  lid: string;
}

// The compcon export format. This stuff just gets converted into owned items.
export interface PackedPilotData {
  campaign: string;
  group: string;
  sort_index: number;
  cloudID: string;
  cloudOwnerID: string;
  lastCloudUpdate: string;
  level: number;
  callsign: string;
  name: string;
  player_name: string;
  status: string;
  text_appearance: string;
  notes: string;
  history: string;
  portrait: string;
  cloud_portrait: string;
  background: string;
  mechSkills: [number, number, number, number];
  cc_ver: string;

  id: string;
  licenses: PackedRankedData[];
  skills: Array<PackedRankedData | (PackedSkillData & { custom: true })>;
  talents: PackedRankedData[];
  reserves: PackedReserveData[];
  orgs: PackedOrganizationData[];
  bondId: string;
  xp: number;
  stress: number;
  maxStress: number;
  burdens: PackedClockBurdenData[];
  clocks: PackedClockBurdenData[];
  bondPowers: PackedBondPowerData[];
  powerSelections: number;
  bondAnswers: string[];
  minorIdeal: string;
  mechs: PackedMechData[];
  state?: IMechState;
  counter_data: PackedCounterSaveData[];
  custom_counters: PackedCounterData[];
  special_equipment?: {
    PilotArmor: [];
    PilotWeapons: [];
    PilotGear: [];
    Frames: [];
    MechWeapons: [];
    WeaponMods: [];
    MechSystems: [];
    SystemMods: [];
  };
  combat_history: {
    moves: 0;
    kills: 0;
    damage: 0;
    hp_damage: 0;
    structure_damage: 0;
    overshield: 0;
    heat_damage: 0;
    reactor_damage: 0;
    overcharge_uses: 0;
    core_uses: 0;
  };
  loadout?: PackedPilotLoadoutData;
  loadouts?: PackedPilotLoadoutData[];
  brews: string[];
  core_bonuses: string[];
  factionID: string;
  quirk: string;
  current_hp: number;
  resistances?: string[];
}

export interface PackedPilotLoadoutData {
  id: string;
  name: string;
  armor: (PackedPilotEquipmentState | null)[]; // Accounts for gaps in the inventory slots.... Were it my call this wouldn't be how it was, but it ain't my way
  weapons: (PackedPilotEquipmentState | null)[];
  gear: (PackedPilotEquipmentState | null)[];
  extendedWeapons: (PackedPilotEquipmentState | null)[];
  extendedGear: (PackedPilotEquipmentState | null)[];
}

export interface PackedPilotEquipmentState {
  id: string;
  destroyed: boolean;
  uses: number;
  cascading: false;
  customDamageType: null;
}

export interface IMechState {
  active_mech_id: string;
  stage: string;
  turn: number;
  actions: number;
  braced: boolean;
  overcharged: boolean;
  prepare: boolean;
  bracedCooldown: boolean;
  redundant: boolean;
  mounted: boolean;
  stats: {
    moves: number;
    kills: number;
    damage: number;
    hp_damage: number;
    structure_damage: number;
    overshield: number;
    heat_damage: number;
    reactor_damage: number;
    overcharge_uses: number;
    core_uses: number;
  };
  deployed: [];
}

export interface PackedMechData {
  name: string;
  notes: string;
  gm_note: string;
  portrait: string;
  cloud_portrait: string;
  overshield: number;
  burn: number;
  ejected: boolean;
  meltdown_imminent: boolean; // TODO: Make this active effect
  cc_ver: string;
  core_active: boolean;

  id: string;
  active: boolean;
  current_structure: number;
  current_hp: number;
  current_stress: number;
  current_heat: number;
  current_repairs: number;
  current_core_energy: number;
  current_overcharge: number;
  frame: string;
  statuses: string[];
  conditions: string[];
  resistances: string[];
  reactions: string[];
  loadouts: PackedMechLoadoutData[];
  active_loadout_index: number;
  activations: number; // We don't track this or other current-state things quite yet

  // These are easily deduced and thus not kept
  reactor_destroyed: boolean;
  destroyed: boolean;
  defeat: string;
}

export interface PackedMechLoadoutData {
  id: string;
  name: string;
  systems: PackedEquipmentData[];
  integratedSystems: PackedEquipmentData[];
  mounts: PackedMountData[];
  integratedMounts: { weapon: PackedMechWeaponSaveData }[];
  improved_armament: PackedMountData;
  integratedWeapon: PackedMountData;
  superheavy_mounting: PackedMountData;
}

export interface PackedEquipmentData {
  id: string;
  destroyed: boolean;
  cascading: boolean;
  note: string;
  uses?: number;
  flavorName?: string;
  flavorDescription?: string;
  customDamageType?: string;
}

export interface PackedMountData {
  mount_type: string;
  lock?: boolean; // Superheavy bracing
  slots: PackedWeaponSlotData[];
  extra: PackedWeaponSlotData[];
  bonus_effects: string[]; // "cb_mount_retrofitting", "cb_auto_stabilizing_hardpoints"
}

export interface PackedWeaponSlotData {
  size: FittingSize; // Superheavy? look into that
  weapon: PackedMechWeaponSaveData | null;
}

export interface PackedMechWeaponSaveData extends PackedEquipmentData {
  loaded: boolean;
  mod?: PackedEquipmentData;
  customDamageType?: string;
  maxUseOverride?: number;
}

export interface IContentPackManifest {
  name: string;
  item_prefix: string; // Note - this is applied only on initial load. Dynamic, at runtime packs do not care about this
  author: string;
  version: string;
  description?: string;
  website?: string;
  image_url?: string;
}
export interface IContentPackData {
  manufacturers?: PackedManufacturerData[];
  factions?: PackedFactionData[];
  coreBonuses?: PackedCoreBonusData[];
  frames?: PackedFrameData[];
  weapons?: PackedMechWeaponData[];
  systems?: PackedMechSystemData[];
  mods?: PackedWeaponModData[];
  pilotGear?: PackedPilotEquipmentData[];
  talents?: PackedTalentData[];
  bonds?: PackedBondData[];
  tags?: PackedTagTemplateData[];

  npcClasses?: PackedNpcClassData[];
  npcFeatures?: AnyPackedNpcFeatureData[];
  npcTemplates?: PackedNpcTemplateData[];

  // New additions courtesy of whitespine
  skills?: PackedSkillData[];
  statuses?: PackedStatusData[];
  reserves?: PackedReserveData[];
  environments?: PackedEnvironmentData[];
  sitreps?: PackedSitrepData[];
}

export interface IContentPack {
  id: string;
  active: boolean;
  manifest: IContentPackManifest;
  data: IContentPackData;
}

interface PackedManufacturerData {
  name: string;
  logo: string;
  light: string;
  description: string;
  dark: string;
  quote: string;
  logo_url?: string;
  id: string;
}

interface PackedFactionData {
  name: string;
  description: string;
  logo: string;
  color: string;
  logo_url?: string;
  id: string;
}

export interface PackedCoreBonusData {
  name: string;
  effect: string; // v-html
  description: string; // v-html
  mounted_effect?: string;
  synergies?: PackedSynergyData[];
  id: string;
  bonuses?: PackedBonusData[];
  deployables?: PackedDeployableData[];
  counters?: PackedCounterData[];
  integrated?: string[];
  source: string; // must be the same as the Manufacturer ID to sort correctly
  actions?: PackedActionData[];
}

export interface PackedFrameData {
  license_id?: string;
  license_level: number; // set to zero for this item to be available to a LL0 character
  name: string;
  mechtype: string[]; // can be customized
  y_pos: number; // used for vertical alignment of the mech in banner views (like in the new mech selector)
  description: string; // v-html
  mounts: MountType[];
  stats: IFrameStats;
  image_url?: string;
  other_art?: IArtLocation[];
  id: string;
  traits: PackedFrameTraitData[];
  core_system: PackedCoreSystemData;
  source: string;
  variant?: string; // If an alt frame, this is the primary license name
}
export interface IFrameStats {
  size: number;
  structure: number;
  stress: number;
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

export interface PackedCoreSystemData {
  name: string;
  description: string; // v-html
  activation: ActivationType;
  deactivation?: ActivationType;
  use?: FrameEffectUse;

  //
  active_name: string;
  active_effect: string; // v-html
  active_synergies: PackedSynergyData[];

  // Basically the same but passives
  passive_name?: string;
  passive_effect?: string; // v-html,
  passive_synergies?: PackedSynergyData[];

  // And all the rest
  deployables?: PackedDeployableData[];
  counters?: PackedCounterData[];
  integrated?: string[];
  tags: PackedTagInstanceData[];
  active_bonuses?: PackedBonusData[];
  passive_bonuses?: PackedBonusData[];
  active_actions?: PackedActionData[];
  passive_actions?: PackedActionData[];
}

export interface PackedTagInstanceData {
  id: string;
  val?: string | number;
}

export interface IArtLocation {
  tag?: string;
  src?: string;
  url?: string;
}

export interface PackedFrameTraitData {
  name: string;
  description: string; // v-html
  use?: FrameEffectUse;
  synergies?: PackedSynergyData[];
  integrated?: string[];
  counters?: PackedCounterData[];
  deployables?: PackedDeployableData[];
  bonuses?: PackedBonusData[];
  actions?: PackedActionData[];
}

export interface PackedMechWeaponData {
  id: string;
  name: string;
  source: string; // must be the same as the Manufacturer ID to sort correctly
  license: string; // reference to the Frame name of the associated license
  license_level: number; // set to zero for this item to be available to a LL0 character
  mount: WeaponSize;
  type?: WeaponType;
  damage?: PackedDamageData[];
  range?: PackedRangeData[];
  tags?: PackedTagInstanceData[];
  sp?: number;
  description: string; // v-html
  effect?: string; // v-html
  on_attack?: string; // v-html
  on_hit?: string; // v-html
  on_crit?: string; // v-html
  actions?: PackedActionData[];
  bonuses?: PackedBonusData[];
  synergies?: PackedSynergyData[];
  deployables?: PackedDeployableData[];
  counters?: PackedCounterData[];
  integrated?: string[];
  cost?: number; // How many limited uses to consume per firing?
  skirmish?: boolean; // Can we fire this weapon as part of a skirmish? Default true
  barrage?: boolean; // Can we fire this weapon as part of a barrage? Default true
  profiles: PackedMechWeaponProfile[];

  // Some weapons don't like nice things
  no_attack?: boolean;
  no_bonus?: boolean;
  no_synergy?: boolean;
  no_mods?: boolean;
  no_core_bonus?: boolean;
  license_id?: string;
}
export type PackedMechWeaponProfile = Partial<
  Omit<PackedMechWeaponData, "id" | "profiles" | "source" | "license" | "license_level" | "mount" | "sp">
>;

export interface PackedMechSystemData {
  name: string;
  license: string; // reference to the Frame name of the associated license
  license_level: number; // set to zero for this item to be available to a LL0 character
  type?: SystemType;
  sp: number;
  description: string; // v-html
  effect: string; // v-html
  synergies?: PackedSynergyData[];

  id: string;
  deployables?: PackedDeployableData[];
  integrated?: string[];
  counters?: PackedCounterData[];
  bonuses?: PackedBonusData[];
  actions?: PackedActionData[];
  ammo?: PackedAmmoData[];
  tags?: PackedTagInstanceData[];
  source: string; // must be the same as the Manufacturer ID to sort correctly
  license_id?: string;
}

export interface PackedWeaponModData {
  name: string;
  sp: number;
  description: string;
  license: string; // Frame Name
  license_level: number; // set to 0 to be available to all Pilots
  effect: string; // v-html
  synergies?: PackedSynergyData[];

  id: string;
  source: string; // Manufacturer ID
  tags: PackedTagInstanceData[]; // tags related to the mod itself
  added_tags?: PackedTagInstanceData[]; // tags propogated to the weapon the mod is installed on
  deployables?: PackedDeployableData[];
  counters?: PackedCounterData[];
  bonuses?: PackedBonusData[]; // these bonuses are applied to the pilot, not parent weapon
  actions?: PackedActionData[];
  added_damage?: PackedDamageData[]; // damage added to the weapon the mod is installed on
  added_range?: PackedRangeData[]; // range added to the weapon the mod is installed on
  integrated?: string[];
  restricted_types?: WeaponType[]; // weapon types the mod CAN NOT be applied to
  restricted_sizes?: WeaponSize[]; // weapon sizes the mod CAN NOT be applied to
  allowed_types?: WeaponType[]; // weapon types the mod CAN be applied to
  allowed_sizes?: WeaponSize[]; // weapon sizes the mod CAN be applied to
  license_id?: string;
}

export type PackedPilotEquipmentData = PackedPilotWeaponData | PackedPilotArmorData | PackedPilotGearData;

interface AllPilotStuffPackedData {
  id: string;
  name: string; // v-html
  description: string;
  actions?: PackedActionData[]; // these are only available to UNMOUNTED pilots
  bonuses?: PackedBonusData[]; // these bonuses are applied to the pilot, not parent system
  synergies?: PackedSynergyData[];
  deployables?: PackedDeployableData[];
  tags?: PackedTagInstanceData[];
}

export interface PackedPilotWeaponData extends AllPilotStuffPackedData {
  type: "Weapon";
  damage: PackedDamageData[];
  range: PackedRangeData[];
  effect?: string;
}
export interface PackedPilotGearData extends AllPilotStuffPackedData {
  type: "Gear";
}

export interface PackedPilotArmorData extends AllPilotStuffPackedData {
  type: "Armor";
}

export interface PackedTalentData {
  id: string;
  name: string;
  icon: string;
  terse: string; // terse text used in short descriptions. The fewer characters the better
  description: string; // v-html
  ranks: PackedTalentRank[];
}

export interface PackedTalentRank {
  name: string;
  description: string; // v-html
  exclusive: boolean; // see below
  actions?: PackedActionData[];
  bonuses?: PackedBonusData[];
  synergies?: PackedSynergyData[];
  deployables?: PackedDeployableData[];
  counters?: PackedCounterData[];
  integrated?: string[];
}

export interface PackedBondData {
  id: string;
  name: string;
  major_ideals: string[];
  minor_ideals: string[];
  questions: PackedQuestionData[];
  powers: PackedBondPowerData[];
}

export interface PackedQuestionData {
  question: string;
  options: string[];
}

export interface PackedBondPowerData {
  name: string;
  description: string;
  frequency: string | undefined;
  veteran: boolean | undefined;
  master: boolean | undefined;
  prerequisite: string | undefined;
}

export interface PackedClockBurdenData {
  id: string;
  title: string;
  description: string;
  resolution: string;
  segments: number;
  progress: number;
}

interface AllNpcClassData {
  name: string;
  role: string;
  info: { flavor: string; tactics: string };
  power: number;
}
export interface PackedNpcClassData extends AllNpcClassData {
  id: string;
  base_features: string[];
  optional_features: string[];
  stats: PackedNpcClassStats;
}

export interface PackedNpcClassStats {
  activations: number[];
  armor: number[];
  hp: number[];
  evade: number[];
  edef: number[];
  heatcap: number[];
  speed: number[];
  sensor: number[];
  save: number[];
  hull: number[];
  agility: number[];
  systems: number[];
  engineering: number[];
  size: number[][];
  structure?: number[];
  stress?: number[];
}

// Combines all of our types
export type AnyPackedNpcFeatureData =
  | PackedNpcTechData
  | PackedNpcTraitData
  | PackedNpcWeaponData
  | PackedNpcSystemData
  | PackedNpcReactionData;

// Note: At present, just a raw implementation of the compcon method, which is due to be refactored at some point
interface PackedNpcFeatureData {
  id: string;
  name: string;
  origin: IOriginData;
  effect?: string;
  bonus?: object;
  override?: object;

  tags: PackedTagInstanceData[];
  locked: boolean; // If it can be removed, maybe?
  hide_active: boolean; // ???????
  type: NpcFeatureType;
}

export interface PackedNpcWeaponData extends PackedNpcFeatureData {
  weapon_type: string;
  damage: PackedNpcDamageData[];
  range: PackedRangeData[];
  on_hit: string;
  accuracy?: number[] | null;
  attack_bonus?: number[] | null;
  tags: PackedTagInstanceData[];
  type: NpcFeatureType.Weapon;
}

export interface PackedNpcTraitData extends PackedNpcFeatureData {
  type: NpcFeatureType.Trait;
}

export interface PackedNpcReactionData extends PackedNpcFeatureData {
  type: NpcFeatureType.Reaction;
  trigger: string;
}

export interface PackedNpcSystemData extends PackedNpcFeatureData {
  type: NpcFeatureType.System;
}

export interface PackedNpcTechData extends PackedNpcFeatureData {
  type: NpcFeatureType.Tech;

  tags: PackedTagInstanceData[];
  tech_type: string;
  accuracy?: number[] | null;
  attack_bonus?: number[] | null;
}

export interface IOriginData {
  type: "Class" | "Template";
  name: string; // The class or template it is from
  base: boolean; // Whether it is a base feature of that class or template
}

export interface PackedNpcDamageData {
  type: string;
  damage: number[]; // The damage at each tier
}

export interface PackedNpcTemplateData {
  name: string;
  description: string;
  power: number;
  id: string;
  base_features: string[];
  optional_features: string[];
}

export interface PackedStatusData {
  name: string;
  icon: string;
  id?: string;
  terse?: string;
  effects: string | string[];
  type: "Status" | "Condition";
}

export interface PackedEnvironmentData {
  id: string;
  name: string;
  description: string; // v-html
}

export interface PackedSitrepData {
  name: string;
  description: string;
  pcVictory: string;
  enemyVictory: string;
  noVictory?: string;
  deployment?: string;
  objective?: string;
  controlZone?: string;
  extraction?: string;
  id: string;
}
