import { ActionType } from "../action";
import { ActivationType, AttackType, DamageType } from "../enums";
import { AccDiffData, AccDiffDataSerialized } from "../helpers/acc_diff";
import { DamageData } from "../models/bits/damage";
import { Tag, TagData } from "../models/bits/tag";

// -------- Macro data types -------------------------------------
// Within our macro ecosystem these serve 2 primary purposes
// - In the many-to-one Prepare->Roll paradigm, these provide
//   a unified interface to feed into rollWhatever function
// - For rerolls, these provide a serializable state of what was rolled,
//   which we can either instantaneously repeat, or present for further editing (then roll)

export namespace LancerFlowState {
  // Shared by all rolls
  interface BaseRollData {
    type: "base";
    title: string;
    roll_str: string;
  }

  // Configuration passed to initiate a stat roll
  export interface StatRollData extends Omit<BaseRollData, "type"> {
    type: "stat";
    bonus: string | number;
    acc_diff: AccDiffDataSerialized;
    effect?: string;
  }

  export type AttackRolls = {
    roll: string;
    targeted: {
      target: Token;
      roll: string;
      usedLockOn: { delete: () => void } | null;
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
  };

  export type HitResult = {
    token: { name: string; img: string };
    total: string;
    hit: boolean;
    crit: boolean;
  };

  // Configuration passed to initiate an attack roll
  export interface AttackRollData extends Omit<BaseRollData, "type"> {
    type: "attack";
    flat_bonus: number;
    acc_diff?: AccDiffData;

    attack_type: AttackType; // Melee, Ranged, Quick Tech, Full Tech
    effect?: string;
    on_attack?: string;
    on_hit?: string;
    on_crit?: string;

    tags?: Tag[];
    self_heat?: string; // The self heat roll if present
    overkill?: boolean;

    scene_uuid?: string;
    origin_space?: [number, number];
    target_spaces?: [number, number][];
    // Data for output chat template
    is_smart: boolean;
    attack_rolls: AttackRolls;
    attack_results: AttackResult[];
    hit_results: HitResult[];
    damage_results: DamageResult[];
    crit_damage_results: DamageResult[];
    overkill_heat?: number;
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

  // Configuration passed to initiate the use of an action
  export interface ActionUseData extends Omit<BaseRollData, "type"> {
    type: "action";
    acc: number;
    actionName: string;
    detail: string;
    tags: TagData[];
  }

  // Configuration passed to initiate the printing of a talent
  export interface TalentUseData {
    talent: unknown;
    rank: number;
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

  // Configuration passed to show an overcharge roll
  export interface OverchargeRollData {
    level: number;
    roll: string;
  }

  export interface StructureRollData {
    reroll_data?: { structure: number };
    hull_check?: boolean;
    secondary_roll_check?: boolean;
    destruction_check?: boolean;
    primary_roll: Roll;
    primary_roll_result: number;
    primary_roll_title: string;
    primary_roll_desc: string;
    primary_roll_tooltip: string;
    secondary_roll_result: number;
    struct_lost: number;
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
}
