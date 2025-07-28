import type { FullBoundedNum } from "./source-template";
import type { BonusData } from "./models/bits/bonus";
import type {
  LancerBOND,
  LancerFRAME,
  LancerMECH_SYSTEM,
  LancerMECH_WEAPON,
  LancerNPC_CLASS,
  LancerNPC_TEMPLATE,
  LancerWEAPON_MOD,
} from "./item/lancer-item";
import type { SystemTemplates } from "./system-template.ts";
import type { InitializedProfile } from "./models/items/mech_weapon";
import type { SimpleMerge } from "fvtt-types/utils";
import { FittingSize, MountType } from "./enums";
import type { ActionData } from "./models/bits/action";
import type { CounterData } from "./models/bits/counter";
import { Damage } from "./models/bits/damage";
import { Range } from "./models/bits/range";
import type { SynergyData } from "./models/bits/synergy";
import { Tag } from "./models/bits/tag";

export declare namespace BaseData {
  interface actor_universal {
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
  }

  interface Pilot extends actor_universal {
    grit: number;
    bond: LancerBOND | null;
    size: number;
    sensor_range: number;
    save: number;
  }

  interface Mech extends actor_universal {
    loadout: {
      // TODO(LukeAbby): `frame` and `weapon_mount` already exists on the schema and so should be
      // merged already.
      frame: SystemTemplates.ResolvedEmbeddedRef<LancerFRAME> | null;
      weapon_mounts: Array<{
        slots: Array<{
          weapon: SystemTemplates.ResolvedEmbeddedRef<LancerMECH_WEAPON> | null;
          mod: SystemTemplates.ResolvedEmbeddedRef<LancerWEAPON_MOD> | null;
          size: FittingSize;
        }>;
        type: MountType;
        bracing: boolean;
      }>;
      systems: Array<SystemTemplates.ResolvedEmbeddedRef<LancerMECH_SYSTEM> | null>; // Will rarely be null, but it is possible
      sp: FullBoundedNum; // Entirely derived
      ai_cap: FullBoundedNum; // Entirely derived
      limited_bonus: number; // Entirely derived
    };
    overcharge_sequence: string;

    structure_repair_cost: number;
    stress_repair_cost: number;

    // Set by pilot active effect
    level: number;
    grit: number;
  }

  interface Npc extends actor_universal {
    class: LancerNPC_CLASS | null;
    templates: LancerNPC_TEMPLATE[];
  }

  interface Deployable extends actor_universal {
    // Set by active effects
    level: number;
    grit: number;
    hp_bonus: number; // Used to get around an obnoxious chicken egg situation
  }

  interface item_universal {
    equipped: boolean;
  }

  type DerivedProfile = SimpleMerge<
    InitializedProfile,
    {
      // Derived
      bonus_damage: Damage[];
      bonus_tags: Tag[];
      bonus_range: Range[];
      all_damage: Damage[];
      all_tags: Tag[];
      all_range: Range[];
    }
  >;

  interface Bond extends item_universal {}

  interface CoreBonus extends item_universal {}

  interface Frame extends item_universal {}

  interface License extends item_universal {}

  interface MechSystem extends item_universal {}

  interface MechWeapon extends item_universal {
    profiles: Array<DerivedProfile>;
    // Derived - all base tags across all profiles
    all_base_tags: Tag[];
    // All tags, inncluding bonus tags
    all_tags: Tag[];
    // The current profile
    active_profile: DerivedProfile;
    // The mod on this slot
    mod: LancerWEAPON_MOD;
  }

  interface NpcClass extends item_universal {}

  interface NpcFeature extends item_universal {}

  interface NpcTemplate extends item_universal {}

  interface Organization extends item_universal {}

  interface PilotArmor extends item_universal {}

  interface PilotGear extends item_universal {}

  interface PilotWeapon extends item_universal {}

  interface Reserve extends item_universal {}

  interface Skill extends item_universal {}

  interface Status extends item_universal {}

  interface Talent extends item_universal {
    // Flattened lists, computed
    actions: ActionData[]; // All unlocked actions
    bonuses: BonusData[]; // All unlocked bonuses
    synergies: SynergyData[]; // All unlocked synergies
    counters: CounterData[]; // All unlocked counters
  }

  interface WeaponMod extends item_universal {}
}
