import {
  ActivationType,
  FrameEffectUse,
  WeaponSize,
  SystemType,
  NpcFeatureType,
  NpcTechType,
  DamageType,
  RangeType,
  OrgType,
  ReserveType,
  SkillFamily,
  MountType,
  WeaponType,
  EntryType,
  MechType,
  makeWeaponTypeChecklist,
  makeWeaponSizeChecklist,
  FittingSize,
} from "../../enums";
import { nanoid } from "nanoid";
import { DeployableType } from "../../enums";
import type { ActionData } from "../../models/bits/action";
import { generateBonus } from "../../models/bits/bonus";
import type { BonusData } from "../../models/bits/bonus";
import type { SourceData, SourceDataType, SourceTemplates } from "../../source-template";
import type { DamageData } from "../../models/bits/damage";
import type { ActionTrackingData } from "../../action";
import type { RangeData } from "../../models/bits/range";
import type { CounterData } from "../../models/bits/counter";
import type { SystemTemplates } from "../../system-template";

const DEFAULT_DESCRIPTION = "...";

// TODO: Deprecate this in favor of just letting fields handle defaults? Maybe?

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
    val: 1,
  };
}

export function CORE_BONUS(): SourceDataType<EntryType.CORE_BONUS> {
  return {
    actions: [],
    bonuses: [],
    synergies: [],
    counters: [],
    deployables: [],
    description: DEFAULT_DESCRIPTION,
    integrated: [],
    effect: "",
    lid: "cb_" + nanoid(),
    mounted_effect: "",
    manufacturer: "GMS",
    tags: [],
  };
}

export function CORE_SYSTEM(): SourceDataType<EntryType.FRAME>["core_system"] {
  return {
    name: "New Core System",
    description: DEFAULT_DESCRIPTION,
    use: FrameEffectUse.Unknown,

    activation: ActivationType.Quick,
    active_name: "Core Active",
    active_effect: "",
    active_actions: [],
    active_bonuses: [],
    active_synergies: [],
    deactivation: ActivationType.None,

    counters: [],
    deployables: [],
    integrated: [],
    passive_actions: [],
    passive_effect: "",
    passive_name: "Core Passive",
    passive_bonuses: [],
    passive_synergies: [],
    tags: [],
  };
}

export function DEPLOYABLE(): SourceDataType<EntryType.DEPLOYABLE> {
  return {
    lid: "dep_" + nanoid(),
    actions: [],
    bonuses: [],
    counters: [],
    synergies: [],
    tags: [],
    activation: ActivationType.None,
    stats: {
      armor: 0,
      edef: 0,
      evasion: 0,
      heatcap: 0,
      hp: 0,
      save: 0,
      size: 0,
      speed: 0,
    },
    cost: 1,
    instances: 1,
    hp: 0,
    heat: 0,
    deactivation: ActivationType.None,
    detail: "",
    overshield: 0,
    recall: ActivationType.None,
    redeploy: ActivationType.None,
    type: DeployableType.Deployable,
    avail_unmounted: false,
    avail_mounted: true,
    deployer: null,
    owner: null,
    burn: 0,
    activations: 0,
    custom_counters: [],
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

export function FRAME(): SourceDataType<EntryType.FRAME> {
  return {
    description: DEFAULT_DESCRIPTION,
    lid: "mf_" + nanoid(),
    license_level: 2,
    mechtype: [MechType.Balanced],
    mounts: [],
    license: "UNKNOWN",
    manufacturer: "GMS",
    stats: {
      armor: 0,
      edef: 8,
      evasion: 8,
      heatcap: 5,
      hp: 8,
      repcap: 5,
      save: 10,
      sensor_range: 10,
      size: 1,
      sp: 5,
      speed: 5,
      stress: 4,
      structure: 4,
      tech_attack: 0,
    },
    traits: [],
    core_system: CORE_SYSTEM(),
  };
}

export function LICENSE(): SourceDataType<EntryType.LICENSE> {
  return {
    lid: "lic_" + nanoid(),
    manufacturer: "GMS",
    key: "",
    curr_rank: 1,
  };
}

export function MECH(): SourceDataType<EntryType.MECH> {
  return {
    activations: 1,
    custom_counters: [],
    burn: 0,
    core_active: false,
    core_energy: 1,
    heat: 0,
    hp: 0,
    overcharge: 0,
    repairs: 0,
    stress: 0,
    structure: 0,
    lid: "mech_" + nanoid(),
    loadout: {
      frame: null,
      systems: [],
      weapon_mounts: [],
    },
    meltdown_timer: null,
    notes: "",
    overshield: 0,
    pilot: null,
    action_tracker: ACTION_TRACKER(),
  };
}

export function ACTION_TRACKER(): ActionTrackingData {
  return {
    free: true,
    full: true,
    move: 0,
    protocol: true,
    quick: true,
    reaction: true,
  };
}

export function MECH_WEAPON(): SourceDataType<EntryType.MECH_WEAPON> {
  return {
    cascading: false,
    deployables: [],
    destroyed: false,
    lid: "mw_" + nanoid(),
    integrated: [],
    license: "",
    license_level: 0,
    manufacturer: "GMS",
    sp: 0,
    uses: 0,
    profiles: [WEAPON_PROFILE()],
    no_attack: false,
    no_bonuses: false,
    no_core_bonuses: false,
    no_mods: false,
    no_synergies: false,
    loaded: false,
    selected_profile: 0,
    size: WeaponSize.Main,
  };
}

export function MECH_SYSTEM(): SourceDataType<EntryType.MECH_SYSTEM> {
  return {
    cascading: false,
    counters: [],
    deployables: [],
    destroyed: false,
    effect: "",
    lid: "ms_" + nanoid(),
    integrated: [],
    license: "",
    license_level: 0,
    manufacturer: "GMS",
    tags: [],
    sp: 0,
    uses: 0,
    actions: [],
    bonuses: [],
    synergies: [],
    description: DEFAULT_DESCRIPTION,
    type: SystemType.System,
  };
}

export function NPC(): SourceDataType<EntryType.NPC> {
  return {
    hp: 0,
    heat: 0,
    burn: 0,
    custom_counters: [],
    lid: "npc_" + nanoid(),
    overshield: 0,
    tier: 1,
    stress: 1,
    structure: 1,
    action_tracker: ACTION_TRACKER(),
    activations: 1,
    meltdown_timer: null,
    notes: "",
  };
}

export function NPC_CLASS(): SourceDataType<EntryType.NPC_CLASS> {
  return {
    lid: "npcc_" + nanoid(),
    base_features: [],
    base_stats: [NPC_STATS(), NPC_STATS(), NPC_STATS()],
    tactics: "No tactics provided",
    flavor: "No flavor provided",
    optional_features: [],
    role: "UNKNOWN",
  };
}

export function NPC_FEATURE(): SourceData.NpcFeature {
  return {
    ...NPC_TRAIT(),
    origin: {
      name: "N/A",
      type: "N/A",
    },
  };
}

function npc_feature_commons(): SourceTemplates.NPC.BaseFeatureData {
  return {
    lid: "npcf_" + nanoid(),
    tags: [],
    type: NpcFeatureType.Trait,
    bonus: {},
    effect: "No Effect",
    override: {},
    charged: true,
    uses: 0,
    loaded: true,
    destroyed: false,
    tier_override: 0,
    cascading: false,
  };
}

export function NPC_TECH(): SourceTemplates.NPC.TechData {
  return {
    ...npc_feature_commons(),
    type: NpcFeatureType.Tech,
    accuracy: [],
    attack_bonus: [],
    tech_type: NpcTechType.Quick,
  };
}

export function NPC_WEAPON(): SourceTemplates.NPC.WeaponData {
  return {
    ...npc_feature_commons(),
    type: NpcFeatureType.Weapon,
    accuracy: [0, 0, 0],
    attack_bonus: [0, 0, 0],
    weapon_type: "Unknown",
    damage: [[DAMAGE()], [DAMAGE()], [DAMAGE()]],
    range: [RANGE()],
    on_hit: "",
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

export function NPC_REACTION(): SourceTemplates.NPC.ReactionData {
  return {
    ...npc_feature_commons(),
    trigger: "Undefined trigger",
    type: NpcFeatureType.Reaction,
  };
}

export function NPC_TRAIT(): SourceTemplates.NPC.TraitData {
  return {
    ...npc_feature_commons(),
    type: NpcFeatureType.Trait,
  };
}

export function NPC_SYSTEM(): SourceTemplates.NPC.SystemData {
  return {
    ...npc_feature_commons(),
    type: NpcFeatureType.System,
  };
}

export function NPC_TEMPLATE(): SourceDataType<EntryType.NPC_TEMPLATE> {
  return {
    lid: "npct_" + nanoid(),
    base_features: [],
    description: DEFAULT_DESCRIPTION,
    optional_features: [],
  };
}

export function NPC_STATS(): SourceTemplates.NPC.StatBlock {
  return {
    activations: 0,
    agi: 0,
    armor: 0,
    edef: 0,
    eng: 0,
    evasion: 0,
    heatcap: 0,
    hp: 0,
    hull: 0,
    save: 0,
    sensor_range: 0,
    size: 1,
    speed: 0,
    sys: 0,
    stress: 0,
    structure: 0,
  };
}

export function ORGANIZATION(): SourceDataType<EntryType.ORGANIZATION> {
  return {
    actions: "",
    description: DEFAULT_DESCRIPTION,
    efficiency: 0,
    influence: 0,
    purpose: OrgType.Academic, // Just the alphabetic first
    lid: "ord_" + nanoid(),
  };
}

export function PILOT_GEAR(): SourceDataType<EntryType.PILOT_GEAR> {
  return {
    actions: [],
    bonuses: [],
    deployables: [],
    description: DEFAULT_DESCRIPTION,
    uses: 0,
    lid: "pg_" + nanoid(),
    synergies: [],
    tags: [],
    counters: [],
    integrated: [],
  };
}

export function PILOT_ARMOR(): SourceDataType<EntryType.PILOT_ARMOR> {
  // Provides the basic bonus stat info
  return {
    ...PILOT_GEAR(),
    bonuses: [
      generateBonus("pilot_hp", 3, true),
      generateBonus("pilot_evasion", 3, true),
      generateBonus("pilot_edef", 3, true),
      generateBonus("pilot_speed", 3, true),
      generateBonus("pilot_armor", 0, true),
    ],
  };
}

export function PILOT_WEAPON(): SourceDataType<EntryType.PILOT_WEAPON> {
  // Provides the basic bonus stat info
  return {
    ...PILOT_GEAR(),
    range: [
      {
        type: RangeType.Range,
        val: 5,
      },
    ],
    damage: [
      {
        type: DamageType.Kinetic,
        val: "1d3",
      },
    ],
    effect: "",
    loaded: true,
  };
}

export function PILOT(): SourceDataType<EntryType.PILOT> {
  return {
    active_mech: null,
    background: "",
    callsign: "",
    hp: 0,
    custom_counters: [],
    history: "",
    lid: "pilot_" + nanoid(),
    level: 0,
    loadout: {
      armor: [],
      gear: [],
      weapons: [],
    },
    hull: 0,
    agi: 0,
    sys: 0,
    eng: 0,
    mounted: false,
    notes: "",
    player_name: "",
    status: "",
    text_appearance: "",
    overshield: 0,
    burn: 0,
    action_tracker: ACTION_TRACKER(),
    activations: 1,
    cloud_id: "",
    last_cloud_update: "",
  };
}

export function RESERVE(): SourceDataType<EntryType.RESERVE> {
  return {
    consumable: true,
    counters: [],
    integrated: [],
    label: "",
    resource_name: "",
    resource_note: "",
    resource_cost: "",
    type: ReserveType.Resources,
    used: false,
    actions: [],
    bonuses: [],
    deployables: [],
    description: DEFAULT_DESCRIPTION,
    lid: "res_" + nanoid(),
    synergies: [],
    tags: [],
  };
}

export function SKILL(): SourceDataType<EntryType.SKILL> {
  return {
    lid: "sk_" + nanoid(),
    description: "No description",
    detail: "",
    family: SkillFamily.cha,
    curr_rank: 1,
  };
}

export function STATUS(): SourceDataType<EntryType.STATUS> {
  return {
    lid: "cond_" + nanoid(),
    effects: "Unknown effect",
    terse: "Unknown",
    type: "status",
  };
}

export function TALENT(): SourceDataType<EntryType.TALENT> {
  return {
    curr_rank: 1,
    description: DEFAULT_DESCRIPTION,
    lid: "t_" + nanoid(),
    ranks: [TALENT_RANK(), TALENT_RANK(), TALENT_RANK()],
    terse: "",
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

export function WEAPON_MOD(): SourceDataType<EntryType.WEAPON_MOD> {
  return {
    added_damage: [],
    added_tags: [],
    cascading: false,
    counters: [],
    deployables: [],
    destroyed: false,
    description: DEFAULT_DESCRIPTION,
    effect: "",
    lid: "wm_" + nanoid(),
    integrated: [],
    license: "",
    license_level: 0,
    manufacturer: "GMS",
    tags: [],
    sp: 0,
    uses: 0,
    allowed_sizes: makeWeaponSizeChecklist([]),
    allowed_types: makeWeaponTypeChecklist([]),
    actions: [],
    added_range: [],
    bonuses: [],
    synergies: [],
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
