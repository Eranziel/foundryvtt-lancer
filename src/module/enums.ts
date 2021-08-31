// TODO: Just use machine mind, where possible

export enum PilotEquipType {
  PilotArmor = "armor",
  PilotWeapon = "weapon",
  PilotGear = "gear",
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

export enum MechType {
  Balanced = "Balanced",
  Artillery = "Artillery",
  Striker = "Striker",
  Controller = "Controller",
  Support = "Support",
  Defender = "Defender",
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
