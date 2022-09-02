import { Any } from "io-ts";
import {
  ActivationType,
  AnyRegNpcFeatureData,
  EntryType,
  FittingSize,
  FrameEffectUse,
  ISynergyData,
  MechType,
  MountType,
  OrgType,
  RegActionData,
  RegBonusData,
  RegCounterData,
  RegDamageData,
  RegRangeData,
  ReserveType,
  SystemType,
  WeaponSize,
  WeaponSizeChecklist,
  WeaponType,
  WeaponTypeChecklist,
} from "machine-mind";
import { DeployableType } from "machine-mind/dist/classes/Deployable";

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
    custom_counters: RegCounterData[];
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
    actions: RegActionData[];
    synergies: ISynergyData[];
    counters: RegCounterData[];
    deployables: UUIDRef[];
    integrated: UUIDRef[];
    tags: TagField[];
  }

  // For items and mods that can enter failing states
  export interface destructible {
    cascading: boolean;
    destroyed: boolean;
  }

  export interface action_tracking {
    action_tracker: {
      protocol: boolean;
      move: number;
      full: boolean;
      quick: boolean;
      reaction: boolean;
      free: boolean;
      used_reactions: string[];
    };
  }
  export interface heat {
    heat: number;
  }

  export interface struss {
    stress: number;
    structure: number;
  }

  export interface TagField {
    lid: string;
    value: string;
    name: string;
  }

  export type _npc_base = item_universal & // TODO: determine whether this is necessary
    destructible & {
      origin: {
        type: "Class" | "Template";
        name: string;
        base: boolean;
      };
      effect: string;
      bonus: Record<string, number>; // TODO: clarify this type. as same as base stats item
      override: Record<string, number>; // TODO: clarify this type. as same as base stats item. Probably after we flatten it into an array
      tags: TagField[];

      charged: boolean;
      uses: number;
      loaded: boolean;

      tier_override: number;
    };
}

interface SourceDataTypesMap extends DataTypeMap {
  [EntryType.CORE_BONUS]: SourceTemplates.item_universal &
    SourceTemplates.bascdt & {
      description: string;
      effect: string;
      mounted_effect: string;
      manufacturer: string;
    };
  [EntryType.DEPLOYABLE]: SourceTemplates.actor_universal &
    SourceTemplates.heat & {
      actions: RegActionData[];
      bonuses: RegBonusData[];
      counters: RegCounterData[];
      synergies: ISynergyData[];
      tags: SourceTemplates.TagField[];
      activation: ActivationType;
      armor: number;
      cost: number;
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
      deployer: UUIDRef;
    };
  [EntryType.FRAME]: SourceTemplates.item_universal &
    SourceTemplates.licensed & {
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
        bonuses: RegBonusData[];
        counters: RegCounterData[];
        integrated: UUIDRef[];
        deployables: UUIDRef[];
        actions: RegActionData[];
      }>;
      core_system: {
        name: string;
        description: string; // v-html
        activation: ActivationType;
        deactivation?: ActivationType;
        use?: FrameEffectUse; // This maybe should be deprecated

        active_name: string;
        active_effect: string; // v-html
        active_synergies: ISynergyData[];
        active_bonuses: RegBonusData[];
        active_actions: RegActionData[];

        // Should mirror actives exactly
        passive_name?: string;
        passive_effect?: string; // v-html,
        passive_synergies?: ISynergyData[];
        passive_actions: RegActionData[];
        passive_bonuses: RegBonusData[];

        deployables: UUIDRef[];
        counters: RegCounterData[];
        integrated: UUIDRef[];
        tags: SourceTemplates.TagField[];
      };
    };
  [EntryType.LICENSE]: SourceTemplates.item_universal & {
    manufacturer: string;
    key: string;
    rank: number;
  };
  [EntryType.MECH]: SourceTemplates.actor_universal &
    SourceTemplates.action_tracking &
    SourceTemplates.heat &
    SourceTemplates.struss & {
      overcharge: number;
      repairs: number;
      loadout: {
        core_active: boolean;
        core_energy: boolean;
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
    };
  [EntryType.MECH_SYSTEM]: SourceTemplates.item_universal &
    SourceTemplates.bascdt &
    SourceTemplates.destructible &
    SourceTemplates.licensed & {
      effect: string;
      sp: number;
      uses: number;
      description: string;
      type: SystemType;
    };
  [EntryType.MECH_WEAPON]: SourceTemplates.item_universal &
    SourceTemplates.destructible &
    SourceTemplates.licensed & {
      deployables: UUIDRef[];
      integrated: UUIDRef[];
      sp: number;
      uses: number;
      profiles: Array<{
        name: string;
        type: WeaponType;
        damage: RegDamageData[];
        range: RegRangeData[];
        tags: SourceTemplates.TagField[];
        description: string;
        effect: string;
        on_attack: string;
        on_hit: string;
        on_crit: string;
        cost: number;
        skirmishable: boolean;
        barrageable: boolean;
        actions: RegActionData[];
        bonuses: RegBonusData[];
        synergies: ISynergyData[];
        counters: RegCounterData[];
      }>;
      loaded: false;
      selected_profile: number;
      size: WeaponSize;
      no_core_bonuses: boolean;
      no_mods: boolean;
      no_bonuses: boolean;
      no_synergies: boolean;
      no_attack: boolean;
    };
  [EntryType.NPC]: SourceTemplates.actor_universal &
    SourceTemplates.action_tracking &
    SourceTemplates.heat &
    SourceTemplates.struss & {
      notes: string;
      meltdown_timer: number | null;
      tier: number;
    };
  [EntryType.NPC_CLASS]: SourceTemplates.item_universal & {
    role: string;
    info: {
      flavor: string;
      tactics: string;
    };
    base_features: UUIDRef[];
    optional_features: UUIDRef[];
    base_stats: Array<{
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
      size: number; // TODO: don't miss this in migrations
    }>;
  };
  [EntryType.NPC_FEATURE]: AnyRegNpcFeatureData; // TODO make this owned by lancer-vtt? maybe?
  [EntryType.NPC_TEMPLATE]: SourceTemplates.item_universal & {
    description: string;
    base_features: UUIDRef[];
    optional_features: UUIDRef[];
  };
  [EntryType.ORGANIZATION]: SourceTemplates.item_universal & {
    actions: string;
    description: string;
    efficiency: number;
    influence: 0;
    purpose: OrgType;
  };
  [EntryType.PILOT_ARMOR]: SourceTemplates.item_universal &
    SourceTemplates.bascdt & {
      description: string;
      uses: number;
    };
  [EntryType.PILOT_GEAR]: SourceTemplates.item_universal &
    SourceTemplates.bascdt & {
      description: string;
      uses: number;
    };
  [EntryType.PILOT_WEAPON]: SourceTemplates.item_universal &
    SourceTemplates.bascdt & {
      description: string;
      range: RegRangeData[];
      damage: RegDamageData[];
      effect: string;
      loaded: boolean;
      uses: number;
    };
  [EntryType.PILOT]: SourceTemplates.actor_universal &
    SourceTemplates.action_tracking & {
      active_mech: UUIDRef | null;
      background: string;
      callsign: string;
      cloud_id: string;
      cloud_owner_id: string;
      history: string;
      last_cloud_update: string;
      level: string;
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
    };
  [EntryType.RESERVE]: SourceTemplates.item_universal &
    SourceTemplates.bascdt & {
      consumable: boolean;
      label: string;
      resource_name: string;
      resource_note: string;
      resource_cost: string;
      type: ReserveType;
      used: string;
      description: string;
    };
  [EntryType.SKILL]: SourceTemplates.item_universal & {
    description: string;
    detail: string;
    family: string;
    rank: number;
  };
  [EntryType.STATUS]: SourceTemplates.item_universal & {
    effects: string;
    icon: string;
    type: "Status" | "Condition" | "Effect";
  };
  [EntryType.TAG]: SourceTemplates.item_universal & {
    description: string;
    hidden: boolean;
  };
  [EntryType.TALENT]: SourceTemplates.item_universal & {
    curr_rank: number;
    description: string;
    icon: string;
    ranks: Array<{
      name: string;
      description: string;
      exclusive: boolean;
      actions: RegActionData[];
      bonuses: RegBonusData[];
      synergies: ISynergyData[];
      deployables: UUIDRef[];
      counters: RegCounterData[];
      integrated: UUIDRef[];
    }>;
    terse: string;
  };
  [EntryType.WEAPON_MOD]: SourceTemplates.item_universal &
    SourceTemplates.bascdt &
    SourceTemplates.destructible &
    SourceTemplates.licensed & {
      added_tags: SourceTemplates.TagField[];
      added_damage: RegDamageData[];
      effect: string;
      sp: number;
      uses: number;
      allowed_sizes: WeaponSizeChecklist;
      allowed_types: WeaponTypeChecklist;
      added_range: RegRangeData[];
    };
}

export type SourceDataType<T extends EntryType> = T extends keyof SourceDataTypesMap ? SourceDataTypesMap[T] : never;
