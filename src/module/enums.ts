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

export enum StatusConditionType {
  Condition = "Condition",
  Status = "Status",
  Effect = "Effect",
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
  TALENT = "talent",
  BOND = "bond",
}

export function EntryTypeLidPrefix(type: EntryType): string {
  switch (type) {
    case EntryType.CORE_BONUS:
      return "cb_";
    case EntryType.DEPLOYABLE:
      return "dep_";
    case EntryType.FRAME:
      return "mf_";
    case EntryType.MECH:
      return "mech_";
    case EntryType.LICENSE:
      return "lic_";
    case EntryType.NPC:
      return "npc_";
    case EntryType.NPC_CLASS:
      return "npcc_";
    case EntryType.NPC_TEMPLATE:
      return "npct_";
    case EntryType.NPC_FEATURE:
      return "npcf_";
    case EntryType.WEAPON_MOD:
      return "wm_";
    case EntryType.MECH_SYSTEM:
      return "ms_";
    case EntryType.MECH_WEAPON:
      return "mw_";
    case EntryType.ORGANIZATION:
      return "org_";
    case EntryType.PILOT_ARMOR:
    case EntryType.PILOT_GEAR:
    case EntryType.PILOT_WEAPON:
      return "pg_";
    case EntryType.PILOT:
      return "pilot_";
    case EntryType.RESERVE:
      return "reserve_";
    case EntryType.SKILL:
      return "sk_";
    case EntryType.STATUS:
      return "";
    case EntryType.TALENT:
      return "t_";
    case EntryType.BOND:
      return "bond_";
    default:
      return "";
  }
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
  Superheavy = "Superheavy",
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
  Flex = "Flex", // Behaves as a main, but allows us to complain if used as a main with a sibling slot
  Heavy = "Heavy",
  Superheavy = "Superheavy",
  Integrated = "Integrated", // wildcard basically
}

// Return an acceptable setting of fittings for a given mount type
export function fittingsForMount(mount: MountType): FittingSize[] {
  switch (mount) {
    case MountType.Aux:
      return [FittingSize.Auxiliary];
    case MountType.AuxAux:
      return [FittingSize.Auxiliary, FittingSize.Auxiliary];
    case MountType.Flex:
      return [FittingSize.Flex, FittingSize.Auxiliary];
    case MountType.Main:
      return [FittingSize.Main];
    case MountType.MainAux:
      return [FittingSize.Main, FittingSize.Auxiliary];
    case MountType.Heavy:
      return [FittingSize.Heavy];
    case MountType.Superheavy:
      return [FittingSize.Superheavy];
    case MountType.Integrated:
    case MountType.Unknown:
      return [FittingSize.Integrated];
  }
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
    case "superheavy":
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

export enum DefenseType {
  EDef = "E-Defense",
  Evasion = "Evasion",
}

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

export type SystemTypeChecklist = { [key in SystemType]: boolean };

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

export enum AttackType {
  Melee = "Melee",
  Ranged = "Ranged",
  Tech = "Tech",
}

export type AttackTypeChecklist = { [key in AttackType]: boolean };

export enum MechType {
  Balanced = "Balanced",
  Artillery = "Artillery",
  Striker = "Striker",
  Controller = "Controller",
  Support = "Support",
  Defender = "Defender",
  Specialty = "Specialty", // Suldan is pretty popular...
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
  Bonus = "Bonus",
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

export type SynergyLocation =
  | "any" // Acts as a wildcard
  | "active_effects"
  | "rest"
  | "core_power"
  | "weapon"
  | "system"
  | "deployable"
  | "drone"
  | "move"
  | "boost"
  | "other"
  | "ram"
  | "grapple"
  | "tech_attack"
  | "hp"
  | "armor"
  | "repair"
  | "overshield"
  | "burn"
  | "structure"
  | "heat"
  | "stress"
  | "overcharge"
  | "skill_check"
  | "overwatch"
  | "skirmish"
  | "barrage"
  | "improvised_attack"
  | "disengage"
  | "stabilize"
  | "tech"
  | "lock_on"
  | "bolster"
  | "hase"
  | "hull"
  | "agility"
  | "systems"
  | "engineering"
  | "brace"
  | "cascade"
  | "pilot_weapon";
export const AllSynergyLocations = [
  "any", // Acts as a wildcard
  "active_effects",
  "rest",
  "core_power",
  "weapon",
  "system",
  "deployable",
  "drone",
  "move",
  "boost",
  "other",
  "ram",
  "grapple",
  "tech_attack",
  "hp",
  "armor",
  "repair",
  "overshield",
  "burn",
  "structure",
  "heat",
  "stress",
  "overcharge",
  "skill_check",
  "overwatch",
  "skirmish",
  "barrage",
  "improvised_attack",
  "disengage",
  "stabilize",
  "tech",
  "lock_on",
  "bolster",
  "hase",
  "hull",
  "agility",
  "systems",
  "engineering",
  "brace",
  "cascade",
  "pilot_weapon",
];

export enum DeployableType {
  Deployable = "Deployable",
  Drone = "Drone",
  Mine = "Mine",
}

export enum ActivePeriod {
  Turn = "Turn",
  Round = "Round",
  Encounter = "Encounter",
  Scene = "Scene",
  Mission = "Mission",
  Unlimited = "Unlimited",
}

export function makeWeaponTypeChecklist(types: WeaponType[]): WeaponTypeChecklist {
  let override = types.length == 0;
  return {
    CQB: override || types.includes(WeaponType.CQB),
    Cannon: override || types.includes(WeaponType.Cannon),
    Launcher: override || types.includes(WeaponType.Launcher),
    Melee: override || types.includes(WeaponType.Melee),
    Nexus: override || types.includes(WeaponType.Nexus),
    Rifle: override || types.includes(WeaponType.Rifle),
  };
}

// Undo the above conversion
export function flattenWeaponTypeChecklist(types: WeaponTypeChecklist): WeaponType[] {
  return Object.keys(types).filter(t => types[t as keyof WeaponTypeChecklist]) as WeaponType[];
}

export function makeWeaponSizeChecklist(types: WeaponSize[]): WeaponSizeChecklist {
  let override = types.length == 0;
  return {
    Auxiliary: override || types.includes(WeaponSize.Aux),
    Heavy: override || types.includes(WeaponSize.Heavy),
    Main: override || types.includes(WeaponSize.Main),
    Superheavy: override || types.includes(WeaponSize.Superheavy),
  };
}

// Undo the above conversion
export function flattenWeaponSizeChecklist(sizes: WeaponSizeChecklist): WeaponSize[] {
  return Object.keys(sizes).filter(s => sizes[s as keyof WeaponSizeChecklist]) as WeaponSize[];
}

export function makeSystemTypeChecklist(types: SystemType[]): SystemTypeChecklist {
  let override = types.length == 0;
  return {
    System: override || types.includes(SystemType.System),
    AI: override || types.includes(SystemType.AI),
    Shield: override || types.includes(SystemType.Shield),
    Deployable: override || types.includes(SystemType.Deployable),
    Drone: override || types.includes(SystemType.Drone),
    Tech: override || types.includes(SystemType.Tech),
    Armor: override || types.includes(SystemType.Armor),
    "Flight System": override || types.includes(SystemType.FlightSystem),
    Integrated: override || types.includes(SystemType.Integrated),
    Mod: override || types.includes(SystemType.Mod),
  };
}

// Undo the above conversion
export function flattenSystemTypeChecklist(types: SystemTypeChecklist): SystemType[] {
  return Object.keys(types).filter(t => types[t as keyof SystemTypeChecklist]) as SystemType[];
}
