// TODO: Just use machine mind, where possible

export enum PilotEquipType {
  PilotArmor = "armor",
  PilotWeapon = "weapon",
  PilotGear = "gear",
}

export enum EffectType {
  Generic = "Generic", // Covers old/fallback/simple
  Basic = "Basic",
  Charge = "Charge",
  Deployable = "Deployable",
  AI = "AI",
  Protocol = "Protocol",
  Reaction = "Reaction",
  Tech = "Tech",
  Drone = "Drone",
  Bonus = "Bonus",
  Offensive = "Offensive",
  Profile = "Profile",
}

export enum ChargeType {
  Grenade = "Grenade",
  Mine = "Mine",
}

export enum NPCTag {
  Mech = "Mech",
  Vehicle = "Vehicle",
  Ship = "Ship",
  Biological = "Biological",
  Squad = "Squad",
}

export enum ActivationOptions {
  ACTION = "Action",
  TECH = "Tech",
  ATTACK = "Attack",
  DEPLOYABLE = "Deployable",
}

export enum ChipIcons {
  Roll = `<i class="fas fa-dice-d20"></i>`,
  Chat = `<i class="mdi mdi-message"></i>`,
  Deployable = `<i class="cci cci-deployable"></i>`,
  Core = `<i class="cci cci-corebonus"></i>`,
}

export enum StabOptions1 {
  Cool = "Cool",
  Repair = "Repair",
}

export enum StabOptions2 {
  Reload = "Reload",
  ClearBurn = "ClearBurn",
  ClearOwnCond = "ClearOwnCond",
  ClearOtherCond = "ClearOtherCond",
}

export enum EntryType {
  CORE_BONUS = "core_bonus",
  // CORE_SYSTEM = "core_system", // -- Merged into frame
  DEPLOYABLE = "deployable",
  FRAME = "frame",
  MECH = "mech", // Mech actors
  LICENSE = "license",
  NPC = "npc",
  NPC_CLASS = "npc_class",
  NPC_TEMPLATE = "npc_template",
  NPC_FEATURE = "npc_feature",
  WEAPON_MOD = "weapon_mod",
  MECH_SYSTEM = "mech_system",
  MECH_WEAPON = "mech_weapon",
  ORGANIZATION = "organization",
  PILOT_ARMOR = "pilot_armor",
  PILOT_GEAR = "pilot_gear",
  PILOT_WEAPON = "pilot_weapon",
  PILOT = "pilot",
  RESERVE = "reserve",
  SKILL = "skill",
  STATUS = "status",
  TAG = "tag",
  TALENT = "talent",
}

// Holds enums that are as of yet seen nowhere else
export enum MountType {
  Main = "Main",
  Heavy = "Heavy",
  AuxAux = "Aux/Aux",
  Aux = "Aux",
  MainAux = "Main/Aux",
  Flex = "Flex",
  Integrated = "Integrated",
  // This is just to handle undetermined, e.g. by auto addition
  Unknown = "Unknown",
}

export enum NpcFeatureType {
  Trait = "Trait",
  System = "System",
  Reaction = "Reaction",
  Weapon = "Weapon",
  Tech = "Tech",
}

export enum NpcTechType {
  Quick = "Quick",
  Full = "Full",
}

// Defaults to main
export function getMountType(raw: string): MountType {
  switch (raw.toLowerCase()) {
    default:
    case "main":
      return MountType.Main;
    case "heavy":
      return MountType.Heavy;
    case "auxaux":
      return MountType.AuxAux;
    case "aux":
      return MountType.Aux;
    case "mainaux":
      return MountType.MainAux;
    case "flex":
      return MountType.Flex;
    case "integrated":
      return MountType.Integrated;
  }
}
// governs what can be added to a mount (weapon slot)
export enum FittingSize {
  Auxiliary = "Auxiliary",
  Main = "Main",
  Flex = "Flex",
  Heavy = "Heavy",
  Integrated = "Integrated", // wildcard basically
}

export function getFittingSize(raw: string): FittingSize {
  switch (raw.toLowerCase()) {
    case "auxiliary":
      return FittingSize.Auxiliary;
    default:
    case "main":
      return FittingSize.Main;
    case "flex":
      return FittingSize.Flex;
    case "heavy":
      return FittingSize.Heavy;
    case "integrated":
      return FittingSize.Integrated;
  }
}

export enum WeaponSize {
  Aux = "Auxiliary",
  Main = "Main",
  Heavy = "Heavy",
  Superheavy = "Superheavy",
}

export type WeaponSizeChecklist = { [key in WeaponSize]: boolean };

export function getWeaponSize(raw: string): WeaponSize {
  switch (raw.toLowerCase()) {
    default:
    case "main":
      return WeaponSize.Main;
    case "auxiliary":
      return WeaponSize.Aux;
    case "heavy":
      return WeaponSize.Heavy;
    case "superheavyj":
      return WeaponSize.Superheavy;
  }
}

export enum WeaponType {
  Rifle = "Rifle",
  Cannon = "Cannon",
  Launcher = "Launcher",
  CQB = "CQB",
  Nexus = "Nexus",
  Melee = "Melee",
}

export type WeaponTypeChecklist = { [key in WeaponType]: boolean };

export enum SystemType {
  System = "System",
  AI = "AI",
  Shield = "Shield",
  Deployable = "Deployable",
  Drone = "Drone",
  Tech = "Tech",
  Armor = "Armor",
  FlightSystem = "Flight System",
  Integrated = "Integrated",
  Mod = "Mod",
}

export enum Duration {
  Free = "Free",
  Turn = "Turn",
  NextTurn = "NextTurn",
  Scene = "Scene",
  Mission = "Mission",
}

export enum FrameEffectUse { // Handles cores and traits usage duration thingies
  Turn = "Turn",
  NextTurn = "Next Turn",
  Round = "Round",
  NextRound = "Next Round",
  Scene = "Scene",
  Encounter = "Encounter",
  Mission = "Mission",
  Unknown = "?",
}

export enum ActivationType {
  None = "None",
  Passive = "Passive",
  Quick = "Quick",
  QuickTech = "Quick Tech",
  Invade = "Invade",
  Full = "Full",
  FullTech = "Full Tech",
  Other = "Other",
  Reaction = "Reaction",
  Protocol = "Protocol",
  Free = "Free",
}

export enum RangeType {
  Range = "Range",
  Threat = "Threat",
  Thrown = "Thrown",
  Line = "Line",
  Cone = "Cone",
  Blast = "Blast",
  Burst = "Burst",
}

export type RangeTypeChecklist = { [key in RangeType]: boolean };

export enum DamageType {
  Kinetic = "Kinetic",
  Energy = "Energy",
  Explosive = "Explosive",
  Heat = "Heat",
  Burn = "Burn",
  Variable = "Variable",
}

export type DamageTypeChecklist = { [key in DamageType]: boolean };

export enum MechType {
  Balanced = "Balanced",
  Artillery = "Artillery",
  Striker = "Striker",
  Controller = "Controller",
  Support = "Support",
  Defender = "Defender",
}

export enum HASE {
  H = "hull",
  A = "agi",
  S = "sys",
  E = "eng",
}

export enum ReserveType {
  Resources = "Resources",
  Tactical = "Tactical",
  Mech = "Mech",
  Project = "Project",
  Organization = "Organization",
}

export enum OrgType {
  Military = "Military",
  Scientific = "Scientific",
  Academic = "Academic",
  Criminal = "Criminal",
  Humanitarian = "Humanitarian",
  Industrial = "Industrial",
  Entertainment = "Entertainment",
  Political = "Political",
}

export enum EncounterSide {
  Enemy = "Enemy",
  Ally = "Ally",
  Neutral = "Neutral",
}

export enum SkillFamily {
  str = "str",
  dex = "dex",
  int = "int",
  cha = "cha",
  con = "con",
  // custom = "custom"
}

export type SynergyLocation =
  | "any"
  | "active_effects"
  | "rest"
  | "weapon"
  | "system"
  | "move"
  | "boost"
  | "other"
  | "ram"
  | "grapple"
  | "tech_attack"
  | "overcharge"
  | "skill_check"
  | "overwatch"
  | "improvised_attack"
  | "disengage"
  | "stabilize"
  | "tech"
  | "lock_on"
  | "hull"
  | "agility"
  | "systems"
  | "engineering";

export enum DeployableType {
  Deployable = "Deployable",
  Drone = "Drone",
  Mine = "Mine",
}

export enum ActivePeriod {
  Turn = "Turn",
  Round = "Round",
  Encounter = "Encounter",
  Mission = "Mission",
  Unlimited = "Unlimited",
}
