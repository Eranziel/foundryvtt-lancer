import {
  ActivationType,
  DamageType,
  FittingSize,
  OrgType,
  RangeType,
  SkillFamily,
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
  family: SkillFamily;
  rank?: number;
  custom?: true;
  custom_desc?: string;
  custom_detail?: string;
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

export interface PackedDamageData {
  type: DamageType;
  val: string | number;
  override?: boolean; // If player can set the damage of this, I guess????
}

export interface PackedRangeData {
  type: RangeType;
  val: number;
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
export type ISynergyData = PackedSynergyData;

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
  synergies?: ISynergyData[];
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

export interface PackedReserveData {
  type?: string;
  name?: string;
  label?: string;
  description?: string;
  resource_name: string;
  resource_note: string;
  resource_cost: string;
  used: boolean;
  consumable: boolean;
  synergies?: ISynergyData[];
  id: string;
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
