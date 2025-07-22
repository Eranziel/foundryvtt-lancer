import { LancerActor } from "../actor/lancer-actor";
import { AttackType, DamageType, NpcFeatureType, StabOptions1, StabOptions2, SystemType } from "../enums";
import { AccDiffHudData } from "../apps/acc_diff";
import { ActionData } from "../models/bits/action";
import { DamageData } from "../models/bits/damage";
import { Tag, TagData } from "../models/bits/tag";
import { LancerToken } from "../token";
import { DamageHudData } from "../apps/damage";

// -------- Flow state data types -------------------------------------
// Each flow uses one of these data types to track its state.

export interface TalentEffect {
  title: string;
  text: string;
}
export namespace LancerFlowState {
  // Shared by all rolls
  interface BaseRollData {
    type: "base";
    title: string;
    roll_str: string;
    result?: RollResult;
    icon?: string;
  }

  export interface RollResult {
    roll: Roll;
    tt: string | HTMLElement | JQuery<HTMLElement>; // Tooltip
  }

  // Configuration passed to initiate a stat roll
  export interface StatRollData extends Omit<BaseRollData, "type"> {
    type: "stat";
    path: string; // The dotpath to the stat in the item or actor
    bonus: string | number;
    acc_diff?: AccDiffHudData;
    effect?: string;
  }

  export interface SaveRollData extends Omit<StatRollData, "type"> {
    type: "save";
    // TODO
  }

  export type AttackRolls = {
    roll: string;
    targeted: {
      target: LancerToken;
      roll: string;
      usedLockOn: boolean | null;
    }[];
  };

  export type AttackResult = {
    roll: Roll;
    tt: string | HTMLElement | JQuery<HTMLElement>; // Tooltip
  };

  export type DamageResult = {
    roll: Roll;
    tt: string | HTMLElement | JQuery<HTMLElement>; // Tooltip
    d_type: DamageType;
    bonus: boolean;
    target?: LancerToken;
  };

  export interface DamageResultSerialized extends Omit<DamageResult, "target"> {
    // UUID instead of the actual token/document
    target?: string;
  }

  export type SelfHeatResult = {
    roll: Roll;
    tt: string | HTMLElement | JQuery<HTMLElement>; // Tooltip
  };

  export type HitResult = {
    target: LancerToken;
    base: string;
    total: string;
    usedLockOn: boolean;
    hit: boolean;
    crit: boolean;
  };

  export interface HitResultWithRoll extends HitResult {
    roll: Roll;
    tt: string | HTMLElement | JQuery<HTMLElement>;
  }

  export interface RolledDamage {
    type: DamageType;
    amount: number;
  }

  export interface DamageTargetResult {
    target: LancerToken;
    damage: RolledDamage[];
    hit: boolean;
    crit: boolean;
    ap: boolean;
    paracausal: boolean;
    half_damage: boolean;
  }

  export interface DamageTargetResultSerialized extends Omit<DamageTargetResult, "target"> {
    // UUID instead of the actual token/document
    target: string;
  }

  // Configuration passed to initiate an attack roll
  export interface AttackRollData extends Omit<BaseRollData, "type"> {
    type: "attack";
    grit: number;
    flat_bonus: number;
    acc_diff?: AccDiffHudData;

    attack_type: AttackType; // Melee, Ranged, Quick Tech, Full Tech
    action: ActionData | null;
    effect?: string;
    on_attack?: string;
    on_hit?: string;
    on_crit?: string;
    talent_effects?: TalentEffect[];

    tags?: Tag[];
    self_heat?: string; // The self heat roll string if present
    self_heat_result?: SelfHeatResult;

    scene_uuid?: string;
    origin_space?: [number, number];
    target_spaces?: [number, number][];
    // Data for output chat template
    is_smart: boolean;
    defense?: string;
    attack_rolls: AttackRolls;
    attack_results: AttackResult[];
    hit_results: HitResult[];
    // TODO: deprecate base64 encoded reroll data
    reroll_data: string;
  }

  // Specifically for weapons
  export interface WeaponRollData extends Omit<AttackRollData, "type"> {
    type: "weapon";
    damage?: DamageData[];
    bonus_damage?: DamageData[];
    loaded?: boolean;
    destroyed?: boolean;
  }

  export interface TechAttackRollData extends Omit<AttackRollData, "type"> {
    type: "tech";
    invade: boolean;
    damage?: DamageData[]; // Typically heat for invades
    bonus_damage?: DamageData[];
    destroyed?: boolean;
  }

  export interface DamageRollData extends Omit<Omit<BaseRollData, "type">, "roll_str"> {
    type: "damage";
    configurable: boolean;
    add_burn: boolean;
    damage_hud_data?: DamageHudData;
    invade?: boolean;
    tags: Tag[];
    ap: boolean;
    paracausal: boolean;
    half_damage: boolean;
    overkill: boolean;
    overkill_heat?: number;
    reliable: boolean;
    reliable_val?: number;
    tech: boolean;
    damage: DamageData[];
    bonus_damage?: DamageData[];
    hit_results: HitResult[];
    has_normal_hit: boolean;
    has_crit_hit: boolean;
    reliable_results?: DamageResult[];
    damage_results: DamageResult[];
    crit_damage_results: DamageResult[];
    reliable_total?: number;
    damage_total: number;
    crit_total: number;
    targets: DamageTargetResult[];
  }

  export interface BurnCheckData extends DamageRollData {
    // If we name this property 'result', DSN will show double d20 rolls for the Eng
    check_total?: number;
    amount: number;
  }

  // Configuration passed to initiate the use of an action
  export interface ActionUseData extends Omit<BaseRollData, "type"> {
    type: "action";
    acc: number;
    action_path: string;
    action: ActionData | null;
    self_heat?: string; // The self heat roll string if present
    self_heat_result?: SelfHeatResult;
    detail: string;
    tags: Tag[];
  }

  export interface SystemUseData {
    title: string;
    type: SystemType.System | SystemType.Mod | NpcFeatureType | null;
    effect: string;

    tags?: Tag[];
    self_heat?: string; // The self heat roll string if present
    self_heat_result?: SelfHeatResult;
  }

  // Configuration passed to initiate the printing of a talent
  export interface TalentUseData {
    title: string;
    lvl: number;
    rank: { name: string; description: string };
  }

  export interface BondPowerUseData {
    title: string;
    powerIndex: number;
    description: string;
  }

  // Just like, if you want to
  export interface GenericData {
    title: string;
    effect: string;
  }

  // TODO: do Reaction and Text need to extend BaseRollData? Shouldn't typically have a roll...
  export interface ReactionRollData {
    title: string;
    trigger: string;
    effect: string;
    tags?: TagData[];
  }

  export interface TextRollData {
    title: string;
    description: string;
    tags?: TagData[];
  }

  export interface HTMLToChatData {
    html: string;
  }

  export interface ActionTrackData extends TextRollData {
    start: boolean;
  }

  // Configuration passed to show an overcharge roll
  export interface OverchargeRollData extends Omit<BaseRollData, "type"> {
    type: "overcharge";
    level: number;
  }

  export interface RechargeRollData extends Omit<BaseRollData, "type"> {
    type: "recharge";
    recharging_uuids: string[];
    charged: { name: string; target: number; charged: boolean }[];
  }

  export interface PrimaryStructureRollData extends Omit<BaseRollData, "type"> {
    type: "structure";
    desc: string;
    val: number;
    max: number;
    // result adds "total" to RollResult
    result?: {
      roll: Roll;
      tt: string | HTMLElement | JQuery<HTMLElement>; // Tooltip
      total: string; // String representation of the roll total
    };
    reroll_data?: { structure: number };
    remStruct: number;
    embedButtons?: Array<string>; // HTML for flow buttons to embed in the chat card
  }

  export interface SecondaryStructureRollData extends Omit<BaseRollData, "type"> {
    type: "secondary_structure";
    desc: string;
    // result adds "total" to RollResult
    result?: {
      roll: Roll;
      tt: string | HTMLElement | JQuery<HTMLElement>; // Tooltip
      total: string; // String representation of the roll total
    };
  }

  export interface OverheatRollData extends Omit<BaseRollData, "type"> {
    type: "overheat";
    desc: string;
    val: number;
    max: number;
    // result adds "total" to RollResult
    result?: {
      roll: Roll;
      tt: string | HTMLElement | JQuery<HTMLElement>; // Tooltip
      total: string; // String representation of the roll total
    };
    reroll_data?: { stress: number };
    remStress: number;
    embedButtons?: Array<string>; // HTML for flow buttons to embed in the chat card
  }

  export interface CascadeRollData extends Omit<BaseRollData, "type"> {
    type: "cascade";
    desc: string;
    ai_systems: string[]; // The UUIDs of AI systems which can cascade
    // result adds "total" to RollResult
    result?: {
      roll: Roll;
      tt: string | HTMLElement | JQuery<HTMLElement>; // Tooltip
      total: string; // String representation of the roll total
    };
  }

  export interface StabilizeData {
    title: string;
    description: string;
    option1: StabOptions1;
    option2: StabOptions2;
  }

  // export interface StressRollData {
  // }

  // We encode these into our UI, and use them to quickly generate macro invocations
  // TODO: deprecate
  export interface InvocationData {
    fn: string;
    args: Array<any>;
    iconPath?: string;
    title: string;
  }

  // Type narrowers for state data
  type RollData = BaseRollData | StatRollData | AttackRollData | WeaponRollData | TechAttackRollData | ActionUseData;
  export function isStatRoll(data: RollData): data is StatRollData {
    return data.type === "stat";
  }
  export function isAttackRoll(data: RollData): data is AttackRollData {
    return data.type === "attack";
  }
  export function isWeaponRoll(data: RollData): data is WeaponRollData {
    return data.type === "weapon";
  }
  export function isTechRoll(data: RollData): data is TechAttackRollData {
    return data.type === "tech";
  }
  export function isActionRoll(data: RollData): data is ActionUseData {
    return data.type === "action";
  }

  export enum BasicFlowType {
    FullRepair = "FullRepair",
    Stabilize = "Stabilize",
    Overheat = "Overheat",
    Structure = "Structure",
    Burn = "Burn",
    Overcharge = "Overcharge",
    BasicAttack = "BasicAttack",
    Damage = "Damage",
    TechAttack = "TechAttack",
  }
}
