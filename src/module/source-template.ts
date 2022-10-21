import { ActionTrackingData } from "./action";
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
import { BonusData } from "./models/bits/bonus";
import { CounterData } from "./models/bits/counter";
import { DamageData } from "./models/bits/damage";
import { RangeData } from "./models/bits/range";
import { SynergyData } from "./models/bits/synergy";
import { TagData } from "./models/bits/tag";

export type DataTypeMap = { [key in EntryType]: object };

export interface BoundedNum {
  min?: number;
  max?: number;
  value: 0;
}

export type FullBoundedNum = Required<BoundedNum>;
export type UUIDRef = string; // A UUID. TODO: Implement a fallback lid measure?
export type EmbeddedRef = string; // A local item on an actor. Used for loadouts / active equipment
// Each tag holds a minified version of the full version, which should theoretically be accessible via clicking on it

export namespace SourceTemplates {
  export interface actor_universal {
    lid: string;
    hp: number;
    overshield: number;
    burn: number;

    resistances: {
      Kinetic: boolean;
      Energy: boolean;
      Explosive: boolean;
      Heat: boolean;
      Burn: boolean;
      Variable: boolean;
    };

    activations: number;
    custom_counters: CounterData[];
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
    actions: ActionData[];
    synergies: SynergyData[];
    counters: CounterData[];
    deployables: UUIDRef[];
    integrated: UUIDRef[];
    tags: TagField[];
    bonuses: BonusData[];
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
    heat: number;
  }

  export interface struss {
    stress: number;
    structure: number;
  }

  export namespace NPC {
    // These are provided/modified by npc classes and features
    export interface StatBlock {
      activations: number;
      armor: number;
      hp: number;
      evade: number;
      edef: number;
      heatcap: number;
      speed: number;
      sensor: number;
      save: number;
      hull: number;
      agility: number;
      systems: number;
      engineering: number;
      size: number;
      structure: number;
      stress: number;
    }

    // All features have at least this core data
    export interface BaseFeatureData {
      lid: string;
      // We strip origin - it isn't particularly helpful to store in source, but could be derived maybe
      effect: string;
      bonus: Partial<StatBlock>;
      override: Partial<StatBlock>;
      tags: TagData[];
      type: NpcFeatureType;

      // State tracking. Not always used
      charged: boolean;
      uses: number;
      loaded: boolean;
      destroyed: boolean;

      // If we want this feature to have a distinct tier fixed regardless of underlying npc tier
      tier_override: number;
    }

    export interface WeaponData extends BaseFeatureData {
      weapon_type: string;
      damage: DamageData[][]; // Damage array by tier
      range: RangeData[][]; // Range array by ties
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
      accuracy: number[]; // Accuracy by tier
      attack_bonus: number[]; // Attack bonus by tier
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
    armor: number;
    cost: number;
    max_hp: number;
    max_heat: number;
    size: number;
    speed: number; // Some have it!
    edef: number;
    evasion: number;
    instances: number;
    deactivation: ActivationType;
    detail: string;
    recall: ActivationType;
    redeploy: ActivationType;

    type: DeployableType;
    avail_mounted: boolean;
    avail_unmounted: boolean;
    deployer: UUIDRef | null;
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
      integrated: UUIDRef[];
      deployables: UUIDRef[];
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

      deployables: UUIDRef[];
      counters: CounterData[];
      integrated: UUIDRef[];
      tags: TagData[];
    };
  }
  export interface License extends SourceTemplates.item_universal {
    manufacturer: string;
    key: string;
    rank: number;
  }
  export interface Mech
    extends SourceTemplates.actor_universal,
      SourceTemplates.action_tracking,
      SourceTemplates.heat,
      SourceTemplates.struss {
    overcharge: number;
    repairs: number;
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
    ejected: boolean;
    notes: string;
    pilot: UUIDRef | null; // UUID to a LancerPILOT
  }
  export interface MechSystem
    extends SourceTemplates.item_universal,
      SourceTemplates.bascdt,
      SourceTemplates.destructible,
      SourceTemplates.licensed {
    effect: string;
    sp: number;
    uses: number;
    description: string;
    type: SystemType;
  }
  export interface MechWeapon
    extends SourceTemplates.item_universal,
      SourceTemplates.destructible,
      SourceTemplates.licensed {
    deployables: UUIDRef[];
    integrated: UUIDRef[];
    sp: number;
    uses: number;
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
    selected_profile: number;
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
    info: {
      flavor: string;
      tactics: string;
    };
    base_features: UUIDRef[];
    optional_features: UUIDRef[];
    base_stats: Array<SourceTemplates.NPC.StatBlock>;
  }
  export type NpcFeature = SourceTemplates.NPC.AnyFeature;
  export interface NpcTemplate extends SourceTemplates.item_universal {
    description: string;
    base_features: UUIDRef[];
    optional_features: UUIDRef[];
  }
  export interface Organization extends SourceTemplates.item_universal {
    actions: string;
    description: string;
    efficiency: number;
    influence: 0;
    purpose: OrgType;
  }
  export interface PilotArmor extends SourceTemplates.item_universal, SourceTemplates.bascdt {
    description: string;
    uses: number;
  }
  export interface PilotGear extends SourceTemplates.item_universal, SourceTemplates.bascdt {
    description: string;
    uses: number;
  }
  export interface PilotWeapon extends SourceTemplates.item_universal, SourceTemplates.bascdt {
    description: string;
    range: RangeData[];
    damage: DamageData[];
    effect: string;
    loaded: boolean;
    uses: number;
  }
  export interface Pilot extends SourceTemplates.actor_universal, SourceTemplates.action_tracking {
    active_mech: UUIDRef | null;
    background: string;
    callsign: string;
    cloud_id: string;
    cloud_owner_id: string;
    history: string;
    last_cloud_update: string;
    level: number;
    loadout: {
      armor: UUIDRef[];
      gear: UUIDRef[];
      weapons: UUIDRef[];
    };
    mech_skills: [number, number, number, number];
    mounted: boolean;
    notes: string;
    player_name: string;
    status: string;
    text_appearance: string;
  }
  export interface Reserve extends SourceTemplates.item_universal, SourceTemplates.bascdt {
    consumable: boolean;
    label: string;
    resource_name: string;
    resource_note: string;
    resource_cost: string;
    type: ReserveType;
    used: boolean;
    description: string;
  }
  export interface Skill extends SourceTemplates.item_universal {
    description: string;
    detail: string;
    family: string;
    rank: number;
  }
  export interface Status extends SourceTemplates.item_universal {
    effects: string;
    type: "Status" | "Condition" | "Effect";
  }
  export interface Tag extends SourceTemplates.item_universal {
    description: string;
    hidden: boolean;
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
      deployables: UUIDRef[];
      counters: CounterData[];
      integrated: UUIDRef[];
    }>;
    terse: string;
  }
  export interface WeaponMod
    extends SourceTemplates.item_universal,
      SourceTemplates.bascdt,
      SourceTemplates.destructible,
      SourceTemplates.licensed {
    added_tags: TagData[];
    added_damage: DamageData[];
    effect: string;
    description: string;
    sp: number;
    uses: number;
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
  [EntryType.TAG]: SourceData.Tag;
  [EntryType.TALENT]: SourceData.Talent;
  [EntryType.WEAPON_MOD]: SourceData.WeaponMod;
};

export type SourceDataType<T extends EntryType> = T extends keyof SourceDataTypesMap ? SourceDataTypesMap[T] : never;
