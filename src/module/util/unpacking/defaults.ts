import {
  ActivationType,
  FrameEffectUse,
  DamageType,
  RangeType,
  MountType,
  WeaponType,
  EntryType,
  FittingSize,
} from "../../enums";
import { nanoid } from "nanoid";
import { ActionData } from "../../models/bits/action";
import { BonusData, generateBonus } from "../../models/bits/bonus";
import { SourceData, SourceDataType, SourceTemplates } from "../../source-template";
import { DamageData } from "../../models/bits/damage";
import { RangeData } from "../../models/bits/range";
import { CounterData } from "../../models/bits/counter";
import { SystemTemplates } from "../../system-template";
import { PowerData } from "../../models/bits/power";
import { BondQuestionData } from "../../models/bits/question";

const DEFAULT_DESCRIPTION = "...";

// Our default bonus basically does nothing but allows everything
export function BONUS(): BonusData {
  return {
    lid: "unknown",
    val: "0",
    overwrite: false,
    replace: false,
    damage_types: {
      Burn: true,
      Energy: true,
      Explosive: true,
      Heat: true,
      Kinetic: true,
      Variable: true,
    },
    range_types: {
      Blast: true,
      Burst: true,
      Cone: true,
      Line: true,
      Range: true,
      Threat: true,
      Thrown: true,
    },
    weapon_sizes: {
      Auxiliary: true,
      Heavy: true,
      Main: true,
      Superheavy: true,
    },
    weapon_types: {
      CQB: true,
      Cannon: true,
      Launcher: true,
      Melee: true,
      Nexus: true,
      Rifle: true,
    },
  };
}

export function ACTION(): ActionData {
  return {
    name: "New action",
    lid: "act_" + nanoid(),
    activation: ActivationType.Quick,
    detail: DEFAULT_DESCRIPTION,
    // confirm: ["CONFIRM"],
    cost: 1,
    frequency: "",
    heat_cost: 0,
    init: "",
    damage: [],
    range: [],
    // log: "",
    mech: true,
    pilot: true,
    synergy_locations: [],
    terse: "Terse Description",
    trigger: "",
    tech_attack: false,
    // available_mounted: true,
  };
}

export function COUNTER(): CounterData {
  return {
    lid: "count_" + nanoid(),
    name: "New Counter",
    min: 1,
    max: 6,
    default_value: 1,
    value: 1,
  };
}

export function BOND_QUESTION(): BondQuestionData {
  return {
    question: DEFAULT_DESCRIPTION,
    options: [DEFAULT_DESCRIPTION],
  };
}

export function POWER(): PowerData {
  return {
    name: "New Power",
    description: DEFAULT_DESCRIPTION,
    unlocked: false,
    frequency: null,
    uses: null,
    veteran: false,
    master: false,
    prerequisite: null,
  };
}

export function FRAME_TRAIT(): SourceDataType<EntryType.FRAME>["traits"][0] {
  return {
    name: "New Trait",
    actions: [],
    bonuses: [],
    counters: [],
    synergies: [],
    deployables: [],
    integrated: [],
    description: DEFAULT_DESCRIPTION,
    use: FrameEffectUse.Unknown,
  };
}

export function DAMAGE(): DamageData {
  return {
    type: DamageType.Kinetic,
    val: "1d6",
  };
}

export function RANGE(): RangeData {
  return {
    type: RangeType.Range,
    val: 5,
  };
}

export function TALENT_RANK(): SourceDataType<EntryType.TALENT>["ranks"][0] {
  return {
    name: "New Rank",
    actions: [],
    bonuses: [],
    synergies: [],
    counters: [],
    deployables: [],
    description: DEFAULT_DESCRIPTION,
    exclusive: false,
    integrated: [],
  };
}

export function WEAPON_PROFILE(): SourceData.MechWeapon["profiles"][0] {
  return {
    name: "Standard Profile",
    actions: [],
    bonuses: [],
    counters: [],
    damage: [],
    description: DEFAULT_DESCRIPTION,
    effect: "",
    on_attack: "",
    on_crit: "",
    on_hit: "",
    range: [],
    synergies: [],
    tags: [],
    type: WeaponType.Rifle,
    barrageable: true,
    cost: 1,
    skirmishable: true,
  };
}

export function WEAPON_MOUNT(): SourceData.Mech["loadout"]["weapon_mounts"][0] {
  return {
    type: MountType.Main,
    bracing: false,
    slots: [MOUNT_SLOT()],
  };
}

export function MOUNT_SLOT(): SourceData.Mech["loadout"]["weapon_mounts"][0]["slots"][0] {
  return {
    mod: null,
    size: FittingSize.Main,
    weapon: null,
  };
}

export function ROLL_BONUS_TARGETS(): SystemTemplates.RollBonusTargets {
  return {
    hull: 0,
    agi: 0,
    sys: 0,
    eng: 0,
    melee_attack: 0,
    range_attack: 0,
    tech_attack: 0,
    grapple: 0,
    ram: 0,
  };
}
