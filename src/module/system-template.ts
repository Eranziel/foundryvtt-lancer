import {
  ActivationType,
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
  SystemType,
  WeaponSize,
  WeaponType,
} from "machine-mind";
import { DeployableType } from "machine-mind/dist/classes/Deployable";
import { LancerActor, LancerDEPLOYABLE, LancerPILOT } from "./actor/lancer-actor";
import {
  LancerFRAME,
  LancerItem,
  LancerMECH_SYSTEM,
  LancerMECH_WEAPON,
  LancerNPC_CLASS,
  LancerNPC_FEATURE,
  LancerWEAPON_MOD,
} from "./item/lancer-item";
import { BoundedNum, DataTypeMap, FullBoundedNum, SourceDataType, SourceTemplates, UUIDRef } from "./source-template";

export namespace SystemTemplates {
  // We mimic these types, such that if we later decide to modify how they are hydrated, our job is easier
  export interface item_universal extends SourceTemplates.item_universal {}
  export interface licensed extends SourceTemplates.licensed {}
  export interface destructible extends SourceTemplates.destructible {}
  export interface action_tracking extends SourceTemplates.action_tracking {}

  // And, here are the ones where we ended up modifying them!
  export type actor_universal = Omit<SourceTemplates.actor_universal, "hp" | "overshield"> & {
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
      slow: boolean;
      stunned: boolean;
    };
  };

  // Modify bascdt to use system tagfields, and resolved deployables/integrateds
  export interface bascdt {
    actions: RegActionData[];
    synergies: ISynergyData[];
    counters: RegCounterData[];
    deployables: ResolvedUuidRef<LancerDEPLOYABLE>[];
    integrated: ResolvedUuidRef<LancerItem>[];
    tags: TagField[]; // Redefined
  }

  // Modify heat to be bounded
  export interface heat {
    heat: FullBoundedNum;
  }

  // Modify struct/stress to be bounded
  export interface struss {
    stress: FullBoundedNum;
    structure: FullBoundedNum;
  }

  export interface TagField extends SourceTemplates.TagField {
    num_val: number | null;
    description: string; // Async fetched
  }

  // Embedded refs local to the actor, can always be resolved synchronously
  // Note that "didn't resolve" is distinct from null, and so we track that separately
  export type ResolvedEmbeddedRef<T> =
    | {
        status: "resolved"; // Resolved successfully!
        value: T;
      }
    | {
        status: "missing"; // Was unable to resolve successfully 
        value: null;
      };

  // UUID refs could be in the compendium (oh no!). In which case they'll be a promise. bleh
  export type ResolvedUuidRef<T> = ResolvedEmbeddedRef<T>
    | {
        status: "async";
        value: Promise<T>;
    };
}

// Note: We could have, theoretically, done this via clever OMIT spam.
// But I _tried_ that. the result was hideous, confusing in the extreme. We're not doing it
interface SystemDataTypesMap extends DataTypeMap {
  [EntryType.CORE_BONUS]: SystemTemplates.item_universal &
    SystemTemplates.bascdt & {
      description: string;
      effect: string;
      mounted_effect: string;
      manufacturer: string;
    };

  [EntryType.DEPLOYABLE]: SystemTemplates.actor_universal &
    SystemTemplates.heat & {
      actions: RegActionData[];
      bonuses: RegBonusData[];
      counters: RegCounterData[];
      synergies: ISynergyData[];
      tags: SystemTemplates.TagField[];
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
      deployer: SystemTemplates.ResolvedEmbeddedRef<LancerActor>;
    };
  [EntryType.FRAME]: SystemTemplates.item_universal &
    SystemTemplates.licensed & {
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
        integrated: SystemTemplates.ResolvedUuidRef<LancerItem>[];
        deployables: SystemTemplates.ResolvedUuidRef<LancerDEPLOYABLE>[];
        actions: RegActionData[];
      }>;
      core_system: {
        name: string;
        description: string;
        activation: ActivationType;
        deactivation?: ActivationType;
        use?: FrameEffectUse;

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

        deployables: SystemTemplates.ResolvedUuidRef<LancerDEPLOYABLE>[];
        counters: RegCounterData[];
        integrated: SystemTemplates.ResolvedUuidRef<LancerItem>[];
        tags: SystemTemplates.TagField[];
      };
    };
  [EntryType.LICENSE]: SystemTemplates.item_universal & {
    manufacturer: string;
    key: string;
    rank: number;
  };
  [EntryType.MECH]: SystemTemplates.actor_universal &
    SystemTemplates.action_tracking &
    SystemTemplates.heat &
    SystemTemplates.struss & {
      overcharge: number;
      repairs: FullBoundedNum;
      loadout: {
        core_active: boolean;
        core_energy: boolean;
        frame: SystemTemplates.ResolvedEmbeddedRef<LancerFRAME> | null; // UUID to a LancerFRAME
        weapon_mounts: Array<{
          slots: Array<{
            weapon: SystemTemplates.ResolvedEmbeddedRef<LancerMECH_WEAPON> | null; // UUID to a LancerMECH_WEAPON
            mod: SystemTemplates.ResolvedEmbeddedRef<LancerWEAPON_MOD> | null; // UUID to a LancerWEAPON_MOD
            size: FittingSize;
          }>;
          type: MountType;
          bracing: boolean;
        }>;
        systems: LancerMECH_SYSTEM[];
      };
      meltdown_timer: number | null;
      notes: string;
      pilot: SystemTemplates.ResolvedEmbeddedRef<LancerPILOT> | null; // UUID to a LancerPILOT

      // TODO: derived convenience arrays of features/actions? Active class?
    };

  [EntryType.MECH_SYSTEM]: SystemTemplates.item_universal &
    SystemTemplates.bascdt &
    SystemTemplates.destructible &
    SystemTemplates.licensed & {
      effect: string;
      sp: number;
      uses: number;
      description: string;
      type: SystemType;
    };
  [EntryType.MECH_WEAPON]: SystemTemplates.item_universal &
    SystemTemplates.destructible &
    SystemTemplates.licensed & {
      deployables: SystemTemplates.ResolvedUuidRef<LancerDEPLOYABLE>[];
      integrated: SystemTemplates.ResolvedUuidRef<LancerItem>[];
      sp: number;
      uses: number;
      profiles: Array<{
        name: string;
        type: WeaponType;
        damage: RegDamageData[];
        range: RegRangeData[];
        tags: SystemTemplates.TagField[];
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

      // Derived - all tags across all profiles
      all_tags: SystemTemplates.TagField[];
    };
  [EntryType.NPC]: SystemTemplates.actor_universal &
    SystemTemplates.action_tracking &
    SystemTemplates.heat &
    SystemTemplates.struss & {
      notes: string;
      meltdown_timer: number | null;
      tier: number;

      // TODO: derived convenience arrays of features/actions? Active class?
      features: LancerNPC_FEATURE[];
      class: LancerNPC_CLASS | null;
    };
  [EntryType.NPC_CLASS]: SystemTemplates.item_universal & {
    role: string;
    info: {
      flavor: string;
      tactics: string;
    };
    base_features: SystemTemplates.ResolvedUuidRef<LancerNPC_FEATURE>[];
    optional_features: SystemTemplates.ResolvedUuidRef<LancerNPC_FEATURE>[];
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
  [EntryType.NPC_FEATURE]: {}; // TODO: all this
  [EntryType.NPC_TEMPLATE]: SystemTemplates.item_universal & {
    description: string;
    base_features: SystemTemplates.ResolvedUuidRef<LancerNPC_FEATURE>[];
    optional_features: SystemTemplates.ResolvedUuidRef<LancerNPC_FEATURE>[];
  };

  [EntryType.ORGANIZATION]: SystemTemplates.item_universal & {
    actions: string;
    description: string;
    efficiency: number;
    influence: 0;
    purpose: OrgType;
  };


  [EntryType.PILOT_ARMOR]: SystemTemplates.item_universal &
    SystemTemplates.bascdt & {
      description: string;
      uses: number;
    };
  [EntryType.PILOT_GEAR]: SystemTemplates.item_universal &
    SystemTemplates.bascdt & {
      description: string;
      uses: number;
    };
  [EntryType.PILOT_WEAPON]: SystemTemplates.item_universal &
    SystemTemplates.bascdt & {
      description: string;
      range: RegRangeData[];
      damage: RegDamageData[];
      effect: string;
      loaded: boolean;
      uses: number;
    };
  [EntryType.PILOT]: SystemTemplates.actor_universal &
    SystemTemplates.action_tracking & {
      active_mech: SystemTemplates.ResolvedUuidRef<UUIDRef> | null;
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
  [EntryType.RESERVE]: SourceDataType<EntryType.RESERVE>;
  [EntryType.SKILL]: SourceDataType<EntryType.SKILL>;
  [EntryType.STATUS]: SourceDataType<EntryType.STATUS>;
  [EntryType.TAG]: SourceDataType<EntryType.TAG>;
  [EntryType.TALENT]: SourceDataType<EntryType.TALENT>;
  [EntryType.WEAPON_MOD]: SourceDataType<EntryType.WEAPON_MOD>;
}

export type SystemDataType<T extends EntryType> = T extends keyof SystemDataTypesMap ? SystemDataTypesMap[T] : never;
