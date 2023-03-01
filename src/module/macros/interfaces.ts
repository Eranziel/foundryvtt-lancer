import { ActionType } from "../action";
import { ActivationType } from "../enums";
import { AccDiffData, AccDiffDataSerialized } from "../helpers/acc_diff";
import type { DamageData } from "../models/bits/damage";
import { Tag, TagData } from "../models/bits/tag";

// -------- Macro data types -------------------------------------
// Within our macro ecosystem these serve 2 primary purposes
// - In the many-to-one Prepare->Roll paradigm, these provide
//   a unified interface to feed into rollWhatever function
// - For rerolls, these provide a serializable state of what was rolled,
//   which we can either instantaneously repeat, or present for further editing (then roll)

export namespace LancerMacro {
  // Shared by all rolls
  interface BaseRoll {
    docUUID: string; // The item or actor this roll is principally based on
    title: string;
  }

  // Configuration passed to initiate a stat roll
  export interface StatRoll extends BaseRoll {
    bonus: string | number;
    acc_diff: AccDiffDataSerialized;
    effect?: string;
  }

  // Configuration passed to initiate an attack roll
  export interface AttackRoll extends BaseRoll {
    flat_bonus: number;
    acc_diff: AccDiffDataSerialized;

    attack_type: string;
    effect?: string;
    on_attack?: string;
    on_hit?: string;

    self_heat?: string; // The self heat roll if present
    tags?: TagData[];
  }

  // Specifically for weapons
  export interface WeaponRoll extends AttackRoll {
    damage?: DamageData[];
    loaded?: boolean;
    destroyed?: boolean;
    overkill?: boolean;
    on_crit?: string;
  }

  // Configuration passed to initiate the use of an action
  export interface ActionUse extends BaseRoll {
    acc: number;
    actionName: string;
    detail: string;
    tags: TagData[];
  }

  // Configuration passed to initiate the printing of a talent
  export interface TalentUse {
    talent: unknown;
    rank: number;
  }

  // Just like, if you want to
  export interface Generic {
    title: string;
    effect: string;
  }

  export interface ReactionRoll extends BaseRoll {
    title: string;
    trigger: string;
    effect: string;
    tags?: TagData[];
  }

  export interface TextRoll extends BaseRoll {
    title: string;
    description: string;
    item_uuid?: string;
    tags?: TagData[];
  }

  // Configuration passed to show an overcharge roll
  export interface OverchargeRoll {
    level: number;
    roll: string;
  }

  // We encode these into our UI, and use them to quickly generate macro invocations
  export interface Invocation {
    fn: string;
    args: Array<any>;
    iconPath?: string;
    title: string;
  }
}
