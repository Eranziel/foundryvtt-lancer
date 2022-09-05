import { ActivationType, DamageType, RangeType, SkillFamily, SynergyLocation, SystemType, WeaponSize, WeaponType } from "./enums";

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
    tags?: PackedTagInstanceData[];
}

export interface PackedTagTemplateData {
    id: string;
    name: string;
    description: string;
    filter_ignore?: boolean;
    hidden?: boolean;
}

export interface PackedTagInstanceData {
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