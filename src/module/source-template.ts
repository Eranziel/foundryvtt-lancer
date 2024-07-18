import { ActionTrackingData } from "./action";
import { InheritedEffectsState } from "./effects/effector";
import {
  ActivationType,
  DeployableType,
  EntryType,
  FittingSize,
  FrameEffectUse,
  MechType,
  MountType,
  NpcFeatureType,
  NpcTechType,
  OrgType,
  ReserveType,
  SystemType,
  WeaponSize,
  WeaponSizeChecklist,
  WeaponType,
  WeaponTypeChecklist,
} from "./enums";
import { ActionData } from "./models/bits/action";
import { AmmoData } from "./models/bits/ammo";
import { BonusData } from "./models/bits/bonus";
import { CounterData } from "./models/bits/counter";
import { DamageData } from "./models/bits/damage";
import { PowerData } from "./models/bits/power";
import { BondQuestionData } from "./models/bits/question";
import { RangeData } from "./models/bits/range";
import { SynergyData } from "./models/bits/synergy";
import { TagData } from "./models/bits/tag";

export type DataTypeMap = { [key in EntryType]: object };

export interface BoundedNum {
  min?: number;
  max?: number;
  value: number;
}

export type WithNullableProperties<T> = {
  [K in keyof T]: T[K] | null;
};

export type FullBoundedNum = Required<BoundedNum>;
export type UUIDRef = string; // A UUID reference to a document.
export type EmbeddedRef = string; // A local item on an actor. Used for loadouts / active equipment
export type LIDRef = string; // A LID reference to a document.
// UUID lookups are comparatively expensive, and should only be done when we need them, not passively
// Additionally, maintaining things as LID references in general makes them less fragile
// Each tag holds a minified version of the full version, which should theoretically be accessible via clicking on it

export namespace SourceTemplates {
  export interface actor_universal {
    lid: string;
    hp: FullBoundedNum;
    overshield: FullBoundedNum;
    burn: number;
    activations: number;
    custom_counters: CounterData[];
    inherited_effects: InheritedEffectsState | null;
  }

  export interface item_universal {
    lid: string;
  }

  // An item that is provided as part of a license
  export interface licensed {
    manufacturer: string;
    license_level: number;
    license: string;
  }

  // The core data in virtually every lancer item
  export interface bascdt {
    bonuses: BonusData[];
    actions: ActionData[];
    synergies: SynergyData[];
    counters: CounterData[];
    deployables: LIDRef[];
    integrated: LIDRef[];
    tags: TagData[];
  }

  // For items and mods that can enter failing states
  export interface destructible {
    cascading: boolean;
    destroyed: boolean;
  }

  export interface action_tracking {
    action_tracker: ActionTrackingData;
  }

  export interface heat {
    heat: FullBoundedNum;
  }

  export interface uses {
    uses: FullBoundedNum;
  }

  export interface struss {
    stress: FullBoundedNum;
    structure: FullBoundedNum;
  }

  export namespace NPC {
    // These are provided/modified by npc classes and features
    export interface StatBlock {
      activations: number;
      armor: number;
      hp: number;
      evasion: number;
      edef: number;
      heatcap: number;
      speed: number;
      sensor_range: number;
      save: number;
      hull: number;
      agi: number;
      sys: number;
      eng: number;
      size: number;
      structure: number;
      stress: number;
    }
    export type NullableStatBlock = WithNullableProperties<StatBlock>;

    // All features have at least this core data
    export interface BaseFeatureData extends uses, destructible {
      lid: string;
      // We strip origin - it isn't particularly helpful to store in source, but could be derived maybe
      effect: string;
      bonus: NullableStatBlock;
      override: NullableStatBlock;
      tags: TagData[];
      type: NpcFeatureType;

      // State tracking. Not always used
      charged: boolean;
      loaded: boolean;

      // If we want this feature to have a distinct tier fixed regardless of underlying npc tier. 0 = no override
      tier_override: number;
    }

    export interface WeaponData extends BaseFeatureData {
      weapon_type: string;
      damage: DamageData[][]; // Damage array by tier
      range: RangeData[]; // Range array
      on_hit: string;
      accuracy: number[]; // Accuracy by tier
      attack_bonus: number[]; // Attack bonus by tier
      type: NpcFeatureType.Weapon;
    }

    export interface TraitData extends BaseFeatureData {
      type: NpcFeatureType.Trait;
    }

    export interface ReactionData extends BaseFeatureData {
      type: NpcFeatureType.Reaction;
      trigger: string;
    }

    export interface SystemData extends BaseFeatureData {
      type: NpcFeatureType.System;
    }

    export interface TechData extends BaseFeatureData {
      type: NpcFeatureType.Tech;
      tech_type: NpcTechType;
      tech_attack: boolean;
      accuracy: number[] | null; // Accuracy by tier
      attack_bonus: number[] | null; // Attack bonus by tier
    }

    export type AnyFeature = TechData | SystemData | ReactionData | TraitData | WeaponData;
    export type AllFeature = TechData & SystemData & ReactionData & TraitData & WeaponData;
  }
}

export namespace SourceData {
  export interface CoreBonus extends SourceTemplates.item_universal, SourceTemplates.bascdt {
    description: string;
    effect: string;
    mounted_effect: string;
    manufacturer: string;
  }
  export interface Deployable extends SourceTemplates.actor_universal, SourceTemplates.heat {
    actions: ActionData[];
    bonuses: BonusData[];
    counters: CounterData[];
    synergies: SynergyData[];
    tags: TagData[];
    activation: ActivationType;
    stats: {
      armor: number;
      edef: number;
      evasion: number;
      heatcap: number;
      hp: string;
      save: number;
      size: number;
      speed: number;
    };
    cost: number;
    instances: number;
    deactivation: ActivationType;
    detail: string;
    recall: ActivationType;
    redeploy: ActivationType;

    type: DeployableType;
    avail_mounted: boolean;
    avail_unmounted: boolean;
    deployer: UUIDRef | null;
    owner: UUIDRef | null;
  }
  export interface Frame extends SourceTemplates.item_universal, SourceTemplates.licensed {
    description: string;
    mechtype: MechType[];
    mounts: MountType[];
    stats: {
      armor: number;
      edef: number;
      evasion: number;
      heatcap: number;
      hp: number;
      repcap: number;
      save: number;
      sensor_range: number;
      size: number;
      sp: number;
      speed: number;
      stress: number;
      structure: number;
      tech_attack: number;
    };
    traits: Array<{
      name: string;
      description: string;
      bonuses: BonusData[];
      counters: CounterData[];
      integrated: LIDRef[];
      deployables: LIDRef[];
      actions: ActionData[];
      synergies: SynergyData[];
      use: FrameEffectUse;
    }>;
    core_system: {
      name: string;
      description: string; // v-html
      activation: ActivationType;
      deactivation?: ActivationType;
      use?: FrameEffectUse; // This maybe should be deprecated

      active_name: string;
      active_effect: string; // v-html
      active_synergies: SynergyData[];
      active_bonuses: BonusData[];
      active_actions: ActionData[];

      // Should mirror actives exactly
      passive_name?: string;
      passive_effect?: string; // v-html,
      passive_synergies?: SynergyData[];
      passive_actions: ActionData[];
      passive_bonuses: BonusData[];

      deployables: LIDRef[];
      counters: CounterData[];
      integrated: LIDRef[];
      tags: TagData[];
    };
  }
  export interface License extends SourceTemplates.item_universal {
    manufacturer: string;
    key: string;
    curr_rank: number;
  }
  export interface Mech
    extends SourceTemplates.actor_universal,
      SourceTemplates.action_tracking,
      SourceTemplates.heat,
      SourceTemplates.struss {
    overcharge: number;
    repairs: FullBoundedNum;
    core_active: boolean;
    core_energy: number;
    loadout: {
      frame: EmbeddedRef | null; // ID to a LancerFRAME on the mech
      weapon_mounts: Array<{
        slots: Array<{
          weapon: EmbeddedRef | null; // ID to a LancerMECH_WEAPON on the mech
          mod: EmbeddedRef | null; // ID to a LancerWEAPON_MOD on the mech
          size: FittingSize;
        }>;
        type: MountType;
        bracing: boolean;
      }>;
      systems: Array<EmbeddedRef>;
    };
    meltdown_timer: number | null;
    notes: string;
    pilot: UUIDRef | null; // UUID to a LancerPILOT
  }
  export interface MechSystem
    extends SourceTemplates.item_universal,
      SourceTemplates.bascdt,
      SourceTemplates.destructible,
      SourceTemplates.licensed,
      SourceTemplates.uses {
    effect: string;
    sp: number;
    description: string;
    type: SystemType;
    ammo: AmmoData[];
  }
  export interface MechWeapon
    extends SourceTemplates.item_universal,
      SourceTemplates.destructible,
      SourceTemplates.licensed,
      SourceTemplates.uses {
    deployables: LIDRef[];
    integrated: LIDRef[];
    sp: number;
    actions: ActionData[];
    profiles: Array<{
      name: string;
      type: WeaponType;
      damage: DamageData[];
      range: RangeData[];
      tags: TagData[];
      description: string;
      effect: string;
      on_attack: string;
      on_hit: string;
      on_crit: string;
      cost: number;
      skirmishable: boolean;
      barrageable: boolean;
      actions: ActionData[];
      bonuses: BonusData[];
      synergies: SynergyData[];
      counters: CounterData[];
    }>;
    loaded: false;
    selected_profile_index: number;
    size: WeaponSize;
    no_core_bonuses: boolean;
    no_mods: boolean;
    no_bonuses: boolean;
    no_synergies: boolean;
    no_attack: boolean;
  }
  export interface Npc
    extends SourceTemplates.actor_universal,
      SourceTemplates.action_tracking,
      SourceTemplates.heat,
      SourceTemplates.struss {
    notes: string;
    meltdown_timer: number | null;
    tier: number;
  }
  export interface NpcClass extends SourceTemplates.item_universal {
    role: string;
    flavor: string;
    tactics: string;
    base_features: UUIDRef[];
    optional_features: UUIDRef[];
    base_stats: Array<SourceTemplates.NPC.StatBlock>;
  }
  export type NpcFeature = SourceTemplates.NPC.AnyFeature & {
    origin: {
      type: string;
      name: string;
    };
  };
  export interface NpcTemplate extends SourceTemplates.item_universal {
    description: string;
    base_features: UUIDRef[];
    optional_features: UUIDRef[];
  }
  export interface Organization extends SourceTemplates.item_universal {
    actions: string;
    description: string;
    efficiency: number;
    influence: number;
    purpose: OrgType;
  }
  export interface PilotArmor extends SourceTemplates.item_universal, SourceTemplates.bascdt, SourceTemplates.uses {
    description: string;
  }
  export interface PilotGear extends SourceTemplates.item_universal, SourceTemplates.bascdt, SourceTemplates.uses {
    description: string;
  }
  export interface PilotWeapon extends SourceTemplates.item_universal, SourceTemplates.bascdt, SourceTemplates.uses {
    description: string;
    range: RangeData[];
    damage: DamageData[];
    effect: string;
    loaded: boolean;
  }
  export interface Pilot extends SourceTemplates.actor_universal, SourceTemplates.action_tracking {
    active_mech: UUIDRef | null;
    background: string;
    callsign: string;
    cloud_id: string;
    history: string;
    last_cloud_update: string;
    level: number;
    loadout: {
      armor: Array<EmbeddedRef | null>;
      gear: Array<EmbeddedRef | null>;
      weapons: Array<EmbeddedRef | null>;
    };
    hull: number;
    agi: number;
    sys: number;
    eng: number;
    mounted: boolean;
    notes: string;
    player_name: string;
    status: string;
    text_appearance: string;
    bond_state: {
      xp: FullBoundedNum;
      stress: FullBoundedNum;
      xp_checklist: {
        major_ideals: Array<boolean>;
        minor_ideal: boolean;
        veteran_power: boolean;
      };
      answers: Array<string>;
      minor_ideal: string;
      burdens: Array<CounterData>;
      clocks: Array<CounterData>;
    };
  }
  export interface Reserve extends SourceTemplates.item_universal, SourceTemplates.bascdt {
    consumable: boolean;
    label: string;
    // These attributes are in the lancer-data spec, but seem to be unused.
    // resource_name: string;
    // resource_note: string;
    // resource_cost: string;
    type: ReserveType;
    used: boolean;
    description: string;
  }
  export interface Skill extends SourceTemplates.item_universal {
    description: string;
    detail: string;
    curr_rank: number;
  }
  export interface Status extends SourceTemplates.item_universal {
    terse: string;
    effects: string;
    type: "status" | "condition" | "effect";
  }
  export interface Talent extends SourceTemplates.item_universal {
    curr_rank: number;
    description: string;
    ranks: Array<{
      name: string;
      description: string;
      exclusive: boolean;
      actions: ActionData[];
      bonuses: BonusData[];
      synergies: SynergyData[];
      deployables: LIDRef[];
      counters: CounterData[];
      integrated: LIDRef[];
    }>;
    terse: string;
  }
  export interface Bond extends SourceTemplates.item_universal {
    major_ideals: string[];
    minor_ideals: string[];
    questions: BondQuestionData[];
    powers: PowerData[];
  }
  export interface WeaponMod
    extends SourceTemplates.item_universal,
      SourceTemplates.bascdt,
      SourceTemplates.destructible,
      SourceTemplates.licensed,
      SourceTemplates.uses {
    added_tags: TagData[];
    added_damage: DamageData[];
    effect: string;
    description: string;
    sp: number;
    allowed_sizes: WeaponSizeChecklist;
    allowed_types: WeaponTypeChecklist;
    added_range: RangeData[];
  }
}

export type SourceDataTypesMap = {
  // [EntryType.CONDITION]: IStatusData;
  [EntryType.CORE_BONUS]: SourceData.CoreBonus;
  [EntryType.DEPLOYABLE]: SourceData.Deployable;
  [EntryType.FRAME]: SourceData.Frame;
  [EntryType.LICENSE]: SourceData.License;
  [EntryType.MECH]: SourceData.Mech;
  [EntryType.MECH_SYSTEM]: SourceData.MechSystem;
  [EntryType.MECH_WEAPON]: SourceData.MechWeapon;
  [EntryType.NPC]: SourceData.Npc;
  [EntryType.NPC_CLASS]: SourceData.NpcClass;
  [EntryType.NPC_FEATURE]: SourceData.NpcFeature;
  [EntryType.NPC_TEMPLATE]: SourceData.NpcTemplate;
  [EntryType.ORGANIZATION]: SourceData.Organization;
  [EntryType.PILOT_ARMOR]: SourceData.PilotArmor;
  [EntryType.PILOT_GEAR]: SourceData.PilotGear;
  [EntryType.PILOT_WEAPON]: SourceData.PilotWeapon;
  [EntryType.PILOT]: SourceData.Pilot;
  [EntryType.RESERVE]: SourceData.Reserve;
  [EntryType.SKILL]: SourceData.Skill;
  [EntryType.STATUS]: SourceData.Status;
  [EntryType.TALENT]: SourceData.Talent;
  [EntryType.WEAPON_MOD]: SourceData.WeaponMod;
};

export type SourceDataType<T extends EntryType> = T extends keyof SourceDataTypesMap ? SourceDataTypesMap[T] : never;
