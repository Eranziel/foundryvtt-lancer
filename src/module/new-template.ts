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
import { LancerMECH, LancerPILOT } from "./actor/lancer-actor";
import {
  LancerFRAME,
  LancerLICENSE,
  LancerMECH_SYSTEM,
  LancerMECH_WEAPON,
  LancerNPC_CLASS,
  LancerNPC_FEATURE,
  LancerNPC_TEMPLATE,
  LancerWEAPON_MOD,
} from "./item/lancer-item";

type DataTypeMap = { [key in EntryType]: object };

interface BoundedNum {
  min?: number;
  max?: number;
  value: 0;
}

type FullBoundedNum = Required<BoundedNum>;
type Ref = string; // A UUID. TODO: Implement a fallback lid measure?
// Each tag holds a minified version of the full version, which should theoretically be accessible via clicking on it
interface TagInstance {
  lid: string;
  name: string;
  value: string | null;
  terse: string;
}

namespace SourceTemplates {
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

    actions: number;
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
    deployables: Ref[];
    integrated: Ref[];
    tags: [];
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
      used_reactions: any[];
    };
  }
  export interface heat {
    heat: number;
  }

  export interface struss {
    stress: number;
    structure: number;
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
      tags: TagInstance[];

      charged: boolean;
      uses: number;
      loaded: boolean;

      tier_override: number;
    };
}
namespace SystemTemplates {
  // These won't make sense for every actor, but that doesn't matter much
  export interface actor_attributes {
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
      slow: boolean;
      stunned: boolean;
    };
  }
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
      tags: TagInstance[];
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
      deployer: Ref;
    };
  [EntryType.ENVIRONMENT]: SourceTemplates.item_universal & {
    description: string;
  };
  [EntryType.FACTION]: SourceTemplates.item_universal & {
    description: string;
    logo: string;
    logo_url: string;
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
        integrated: Ref[];
        deployables: Ref[];
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

        deployables: Ref[];
        counters: RegCounterData[];
        integrated: Ref[];
        tags: TagInstance[];
      };
      image_url: string;
      other_art: string[];
    };
  [EntryType.LICENSE]: SourceTemplates.item_universal & {
    manufacturer: string;
    key: string;
    rank: 0;
  };
  [EntryType.MECH]: SourceTemplates.actor_universal &
    SourceTemplates.action_tracking &
    SourceTemplates.heat &
    SourceTemplates.struss & {
      overcharge: number;
      repairs: FullBoundedNum;
      loadout: {
        core_active: boolean;
        core_energy: boolean;
        frame: Ref | null; // UUID to a LancerFRAME
        weapon_mounts: Array<{
          slots: Array<{
            weapon: Ref | null; // UUID to a LancerMECH_WEAPON
            mod: Ref | null; // UUID to a LancerWEAPON_MOD
            size: FittingSize;
          }>;
          type: MountType;
          bracing: boolean;
        }>;
        system_mounts: Array<Ref>;
      };
      meltdown_timer: number | null;
      notes: string;
      pilot: Ref | null; // UUID to a LancerPILOT
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
      deployables: Ref[];
      integrated: Ref[];
      sp: number;
      uses: number;
      profiles: Array<{
        name: string;
        type: WeaponType;
        damage: RegDamageData[];
        range: RegRangeData[];
        tags: TagInstance[];
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
    base_features: Ref[];
    optional_features: Ref[];
    base_stats: {
      // TODO: Make this an array of objects, not an object of arrays
      activations: number[];
      armor: number[];
      hp: number[];
      evade: number[];
      edef: number[];
      heatcap: number[];
      speed: number[];
      sensor: number[];
      save: number[];
      hull: number[];
      agility: number[];
      systems: number[];
      engineering: number[];
      size: number[]; // TODO: don't miss this in migrations
    };
  };
  [EntryType.NPC_FEATURE]: AnyRegNpcFeatureData; // TODO make this owned by lancer-vtt? maybe?
  [EntryType.NPC_TEMPLATE]: SourceTemplates.item_universal & {
    description: string;
    base_features: Ref[];
    optional_features: Ref[];
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
      uses: 0;
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
      active_mech: Ref | null;
      background: string;
      callsign: string;
      cloud_id: string;
      cloud_owner_id: string;
      history: string;
      last_cloud_update: string;
      level: string;
      loadout: {
        armor: Ref[];
        gear: Ref[];
        weapons: Ref[];
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
      deployables: Ref[];
      counters: RegCounterData[];
      integrated: Ref[];
    }>;
    terse: string;
  };
  [EntryType.WEAPON_MOD]: SourceTemplates.item_universal &
    SourceTemplates.bascdt &
    SourceTemplates.destructible &
    SourceTemplates.licensed & {
      added_tags: TagInstance[];
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

// Make some helper types for fixing up our system types
interface SystemDataTypesMap extends DataTypeMap {
  // [EntryType.CONDITION]: IStatusData;
  [EntryType.CORE_BONUS]: SourceDataTypesMap[EntryType.CORE_BONUS];
  [EntryType.DEPLOYABLE]: Omit<SourceDataTypesMap[EntryType.DEPLOYABLE], "hp" | "heat" | "overshield"> &
    SystemTemplates.actor_attributes & {
      hp: BoundedNum;
      heat: BoundedNum;
      overshield: BoundedNum;
    };
  [EntryType.FRAME]: SourceDataTypesMap[EntryType.FRAME];
  [EntryType.LICENSE]: SourceDataTypesMap[EntryType.LICENSE];
  [EntryType.MECH]: Omit<
    SourceDataTypesMap[EntryType.MECH],
    "hp" | "heat" | "repairs" | "structure" | "stress" | "overshield"
  > &
    SystemTemplates.actor_attributes & {
      hp: BoundedNum;
      heat: BoundedNum;
      repairs: BoundedNum;
      structure: BoundedNum;
      stress: BoundedNum;
      overshield: BoundedNum;

      frame: LancerFRAME | null;
      weapons: LancerMECH_WEAPON[];
      systems: LancerMECH_SYSTEM[];
      // todo: more enumerations
    };
  [EntryType.MECH_SYSTEM]: SourceDataTypesMap[EntryType.MECH_SYSTEM];
  [EntryType.MECH_WEAPON]: SourceDataTypesMap[EntryType.MECH_WEAPON];
  [EntryType.NPC]: Omit<SourceDataTypesMap[EntryType.NPC], "hp" | "heat" | "structure" | "stress" | "overshield"> &
    SystemTemplates.actor_attributes & {
      hp: BoundedNum;
      heat: BoundedNum;
      structure: BoundedNum;
      stress: BoundedNum;
      overshield: BoundedNum;

      class: LancerNPC_CLASS | null;
      templates: Array<LancerNPC_TEMPLATE>;
      features: Array<LancerNPC_FEATURE>;
    };
  [EntryType.NPC_CLASS]: SourceDataTypesMap[EntryType.NPC_CLASS];
  [EntryType.NPC_FEATURE]: AnyRegNpcFeatureData;
  [EntryType.NPC_TEMPLATE]: SourceDataTypesMap[EntryType.NPC_TEMPLATE];
  [EntryType.ORGANIZATION]: SourceDataTypesMap[EntryType.ORGANIZATION];
  [EntryType.PILOT_ARMOR]: SourceDataTypesMap[EntryType.PILOT_ARMOR];
  [EntryType.PILOT_GEAR]: SourceDataTypesMap[EntryType.PILOT_GEAR];
  [EntryType.PILOT_WEAPON]: SourceDataTypesMap[EntryType.PILOT_WEAPON];
  [EntryType.PILOT]: Omit<SourceDataTypesMap[EntryType.PILOT], "hp" | "overshield"> &
    SystemTemplates.actor_attributes & {
      hp: BoundedNum;
      overshield: BoundedNum;

      active_mech: LancerMECH | null;
      owned_mechs: LancerMECH[];
      licenses: LancerLICENSE[];
      // todo: more enumerations
    };
  [EntryType.RESERVE]: SourceDataTypesMap[EntryType.RESERVE];
  [EntryType.SKILL]: SourceDataTypesMap[EntryType.SKILL];
  [EntryType.STATUS]: SourceDataTypesMap[EntryType.STATUS];
  [EntryType.TAG]: SourceDataTypesMap[EntryType.TAG];
  [EntryType.TALENT]: SourceDataTypesMap[EntryType.TALENT];
  [EntryType.WEAPON_MOD]: SourceDataTypesMap[EntryType.WEAPON_MOD];
}

export type SystemDataType<T extends EntryType> = T extends keyof SystemDataTypesMap ? SystemDataTypesMap[T] : never;