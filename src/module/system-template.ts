import type { InheritedEffectsState } from "./effects/effector";
import type { ActionData } from "./models/bits/action";
import type { BonusData } from "./models/bits/bonus";
import type { CounterData } from "./models/bits/counter";
import { Damage } from "./models/bits/damage";
import { Range } from "./models/bits/range";
import type { SynergyData } from "./models/bits/synergy";
import { Tag, type TagData } from "./models/bits/tag";
import type { FullBoundedNum, LIDRef, SourceTemplates } from "./source-template";

export namespace SystemTemplates {
  // We mimic these types, such that if we later decide to modify how they are hydrated, our job is easier
  export interface item_universal extends SourceTemplates.item_universal {
    equipped: boolean; // Derived
  }
  export interface licensed extends SourceTemplates.licensed {}
  export interface destructible extends SourceTemplates.destructible {}
  export interface action_tracking extends SourceTemplates.action_tracking {}

  // Allows for applying bonuses to specific roll types
  export interface RollBonusTargets {
    range_attack: number;
    melee_attack: number;
    tech_attack: number;
    ram: number;
    grapple: number;
    hull: number;
    agi: number;
    sys: number;
    eng: number;
  }

  // And, here are the ones where we ended up modifying them!
  export type actor_universal = {
    // These are exactly the same
    lid: string;
    burn: number;

    activations: number;
    custom_counters: CounterData[];
    inherited_effects: InheritedEffectsState | null;

    // We replace these with bounded alternatives
    hp: FullBoundedNum;
    overshield: FullBoundedNum;

    // And a ton of additions
    // These won't make sense for every actor, but that doesn't matter much.
    // A reliable set of derived attributes for every actor is very convenient.
    edef: number;
    evasion: number;
    speed: number;
    armor: number;
    size: number;
    save: number;
    sensor_range: number;
    tech_attack: number;
    statuses: {
      // These can be set by active effects / right click statuses
      dangerzone: boolean;
      downandout: boolean;
      engaged: boolean;
      exposed: boolean;
      invisible: boolean;
      prone: boolean;
      shutdown: boolean;
      immobilized: boolean;
      impaired: boolean;
      jammed: boolean;
      lockon: boolean;
      shredded: boolean;
      slowed: boolean;
      stunned: boolean;
      hidden: boolean;
    };
    resistances: {
      // These can be set by active effects
      kinetic: boolean;
      energy: boolean;
      explosive: boolean;
      heat: boolean;
      burn: boolean;
      variable: boolean;
    };

    // All actors will populate these. Pilots have them by default
    hull: number;
    agi: number;
    sys: number;
    eng: number;

    // Set principally by active effects
    bonuses: {
      flat: Record<string, number>;
      weapon_bonuses: BonusData[];
    };
    // TODO
    /*
    bonuses: {
      flat: RollBonusTargets;
      accuracy: RollBonusTargets;
    };
    */

    // Also set by active effects, but to allow for more specific criteria. TODO - finalize details of this
    /*weapon_bonuses: Array<{
      sizes: BonusData["weapon_sizes"];
      types: BonusData["weapon_types"];
      damages: BonusData["damage_types"];
      ranges: BonusData["range_types"];
      bonus: "range" | "damage";
      value: number;
    }>;*/
  };

  // Modify bascdt to use system tagfields, and resolved deployables/integrateds
  export interface bascdt {
    bonuses: BonusData[];
    actions: ActionData[];
    synergies: SynergyData[];
    counters: CounterData[];
    deployables: LIDRef[];
    integrated: LIDRef[];
    tags: Tag[]; // Redefined
  }

  // Modify heat to be bounded
  export interface heat {
    heat: FullBoundedNum;
  }

  // Modify uses to be bounded
  export interface uses {
    uses: FullBoundedNum;
  }

  // Modify struct/stress to be bounded
  export interface struss {
    stress: FullBoundedNum;
    structure: FullBoundedNum;
  }

  // NPC stuff
  export namespace NPC {
    // Everything herein is more or less an exact copy
    // These duplicated here for clarity and future proofing
    export interface StatBlock extends SourceTemplates.NPC.StatBlock {}
    export interface NullableStatBlock extends SourceTemplates.NPC.NullableStatBlock {}

    // This small helper type is just used to repair npc types "tags" field
    type NPCFixup<T extends { tags: TagData[]; uses: FullBoundedNum }> = Omit<
      T,
      "tags" | "uses" | "range" | "damage"
    > & {
      tags: Tag[];
      uses: FullBoundedNum;
    };

    export interface WeaponData extends NPCFixup<SourceTemplates.NPC.WeaponData> {
      range: Range[];
      damage: Damage[][];
    }

    export interface TraitData extends NPCFixup<SourceTemplates.NPC.TraitData> {}

    export interface ReactionData extends NPCFixup<SourceTemplates.NPC.ReactionData> {}

    export interface SystemData extends NPCFixup<SourceTemplates.NPC.SystemData> {}

    export interface TechData extends NPCFixup<SourceTemplates.NPC.TechData> {}

    export type AnyFeature = TechData | SystemData | ReactionData | TraitData | WeaponData;
    export type AllFeature = TechData & SystemData & ReactionData & TraitData & WeaponData;
  }

  // Embedded refs local to the actor, can always be resolved synchronously
  // Note that "didn't resolve" is distinct from null, and so we track that separately
  export type ResolvedEmbeddedRef<T> =
    | {
        status: "resolved"; // Resolved successfully! Value should be usable
        id: string;
        value: T;
      }
    | {
        status: "missing"; // Was unable to resolve successfully. This indicates an invalid ref that should be purged
        id: string;
        value: null;
      };
  export type ResolvedSyncUuidRef<T> = ResolvedEmbeddedRef<T>;
}

// Use this for some "collected" items (e.x. all counters on a mech) or for effect-applied data
export type Origined<T> = {
  label: string;
  origin: string;
  val: T;
};
