import { ActionType } from "../action";
import { ActivationType } from "../enums";
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
    title: string;
    roll_str: string;
  }

  // Configuration passed to initiate a stat roll
  export interface StatRollData extends BaseRollData {
    bonus: string | number;
    acc_diff: AccDiffDataSerialized;
    effect?: string;
  }

  // Configuration passed to initiate an attack roll
  export interface AttackRollData extends BaseRollData {
    flat_bonus: number;
    acc_diff: AccDiffDataSerialized;

    attack_type: string; // Melee, Ranged, Quick Tech, Full Tech
    effect?: string;
    on_attack?: string;
    on_hit?: string;

    self_heat?: string; // The self heat roll if present
    tags?: TagData[];

    scene_uuid?: string;
    origin_space?: [number, number];
    target_spaces?: [number, number][];
  }

  // Specifically for weapons
  export interface WeaponRollData extends AttackRollData {
    damage?: DamageData[];
    bonus_damage?: DamageData[];
    loaded?: boolean;
    destroyed?: boolean;
    overkill?: boolean;
    on_crit?: string;
  }

  export interface TechAttackRollData extends AttackRollData {
    invade: boolean;
    damage?: DamageData[]; // Typically heat for invades
    bonus_damage?: DamageData[];
    destroyed?: boolean;
    on_crit?: string;
  }

  // Configuration passed to initiate the use of an action
  export interface ActionUseData extends BaseRollData {
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

  // export interface StructureRollData {
  // }

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
