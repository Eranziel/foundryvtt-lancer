import { LancerActor, LancerDEPLOYABLE, LancerMECH, LancerPILOT } from "./actor/lancer-actor";
import {
  ActivationType,
  DeployableType,
  EntryType,
  FittingSize,
  FrameEffectUse,
  MechType,
  MountType,
  OrgType,
  SystemType,
  WeaponSize,
  WeaponSizeChecklist,
  WeaponType,
  WeaponTypeChecklist,
} from "./enums";
import {
  LancerCORE_BONUS,
  LancerFRAME,
  LancerItem,
  LancerLICENSE,
  LancerMECH_SYSTEM,
  LancerMECH_WEAPON,
  LancerNPC_CLASS,
  LancerNPC_FEATURE,
  LancerPILOT_ARMOR,
  LancerPILOT_GEAR,
  LancerPILOT_WEAPON,
  LancerSKILL,
  LancerTALENT,
  LancerWEAPON_MOD,
} from "./item/lancer-item";
import { ActionData } from "./models/bits/action";
import { BonusData } from "./models/bits/bonus";
import { CounterData } from "./models/bits/counter";
import { Damage, DamageData } from "./models/bits/damage";
import { Range } from "./models/bits/range";
import { SynergyData } from "./models/bits/synergy";
import { Tag, TagData } from "./models/bits/tag";
import { FullBoundedNum, LIDRef, SourceData, SourceTemplates, UUIDRef } from "./source-template";

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
      invisibe: boolean;
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

    // Set by active effects
    bonuses: {
      flat: RollBonusTargets;
      accuracy: RollBonusTargets;
    };

    // Also set by active effects, but to allow for more specific criteria. TODO - finalize details of this
    weapon_bonuses: Array<{
      sizes: BonusData["weapon_sizes"];
      types: BonusData["weapon_types"];
      damages: BonusData["damage_types"];
      ranges: BonusData["range_types"];
      bonus: "range" | "damage";
      value: number;
    }>;
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

  // Modify struct/stress to be bounded
  export interface struss {
    stress: FullBoundedNum;
    structure: FullBoundedNum;
  }

  // Uses to be bounded
  export interface limited {
    uses: FullBoundedNum;
  }

  // NPC stuff
  export namespace NPC {
    // Everything herein is more or less an exact copy
    export interface StatBlock extends SourceTemplates.NPC.StatBlock {}

    // This small helper type is just used to repair npc types "tags" field
    type NPCFixup<T extends { tags: TagData[]; uses: number }> = Omit<T, "tags" | "uses" | "range" | "damage"> & {
      tags: Tag[];
      uses: FullBoundedNum;
    };

    export interface WeaponData extends NPCFixup<SourceTemplates.NPC.WeaponData> {
      range: Range[][];
      damage: Damage[][];

      // The current tier's values for these
      tier_damage: Damage[];
      tier_range: Range[];
      tier_accuracy: number;
      tier_attack_bonus: number;
    }

    export interface TraitData extends NPCFixup<SourceTemplates.NPC.TraitData> {}

    export interface ReactionData extends NPCFixup<SourceTemplates.NPC.ReactionData> {}

    export interface SystemData extends NPCFixup<SourceTemplates.NPC.SystemData> {}

    export interface TechData extends NPCFixup<SourceTemplates.NPC.TechData> {
      tier_accuracy: number;
      tier_attack_bonus: number;
    }

    export type AnyFeature = TechData | SystemData | ReactionData | TraitData | WeaponData;
    export type AllFeature = TechData & SystemData & ReactionData & TraitData & WeaponData;
  }

  // Embedded refs local to the actor, can always be resolved synchronously
  // Note that "didn't resolve" is distinct from null, and so we track that separately
  export type ResolvedEmbeddedRef<T> =
    | {
        status: "resolved"; // Resolved successfully! Value should be usable
        value: T;
      }
    | {
        status: "missing"; // Was unable to resolve successfully. This indicates an invalid ref that should be purged
        value: null;
      };

  // UUID refs could be in the compendium (oh no!). In which case they'll be a promise. bleh
  export type ResolvedUuidRef<T> =
    | ResolvedEmbeddedRef<T>
    | {
        status: "async"; // Was unable to resolve synchronously, but as of yet may be resolved as a promise. Oftentimes, we will choose to ignore the async possible
        value: Promise<T>;
      };
}

// Use this for some "collected" items (e.x. all counters on a mech) or for effect-applied data
export type Origined<T> = {
  label: string;
  origin: string;
  val: T;
};

// Note: We could have, theoretically, done this via clever OMIT spam.
// But I _tried_ that. the result was hideous, confusing in the extreme. We're not doing it
export namespace SystemData {
  export interface CoreBonus extends SystemTemplates.item_universal, SystemTemplates.bascdt {
    description: string;
    effect: string;
    mounted_effect: string; // Effect attached to a mount modified by this
    manufacturer: string;
  }

  export interface Deployable extends SystemTemplates.actor_universal, SystemTemplates.heat {
    actions: ActionData[];
    // bonuses: BonusData[];
    counters: CounterData[];
    synergies: SynergyData[];
    tags: Tag[];
    activation: ActivationType;
    stats: {
      armor: number;
      edef: number;
      evasion: number;
      heatcap: number;
      hp: number;
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
    deployer: SystemTemplates.ResolvedUuidRef<LancerActor> | null;
  }
  export interface Frame extends SystemTemplates.item_universal, SystemTemplates.licensed {
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
    }>;
    core_system: {
      name: string;
      description: string;
      activation: ActivationType;
      deactivation?: ActivationType;
      use?: FrameEffectUse;

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
      tags: Tag[];
    };
  }
  export interface License extends SystemTemplates.item_universal {
    manufacturer: string;
    key: string;
    rank: number;
  }
  export interface Mech
    extends SystemTemplates.actor_universal,
      SystemTemplates.action_tracking,
      SystemTemplates.heat,
      SystemTemplates.struss {
    overcharge: number;
    repairs: FullBoundedNum;
    core_active: boolean;
    core_energy: number;
    loadout: {
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
      systems: SystemTemplates.ResolvedEmbeddedRef<LancerMECH_SYSTEM>[];
      sp: FullBoundedNum; // Entirely derived
      ai_cap: FullBoundedNum; // Entirely derived
      limited_bonus: number; // Entirely derived
    };
    meltdown_timer: number | null;
    notes: string;
    pilot: SystemTemplates.ResolvedUuidRef<LancerPILOT> | null; // UUID to a LancerPILOT
    overcharge_sequence: string[]; // Derived so its overrideable

    // Set by pilot active effect
    grit: number;
    psd: null | SourceData.Pilot; // Short for "pilot system dump". An active-effect provided dump of active pilots sytem data
  }

  export interface MechSystem
    extends SystemTemplates.item_universal,
      SystemTemplates.bascdt,
      SystemTemplates.destructible,
      SystemTemplates.limited,
      SystemTemplates.licensed {
    effect: string;
    sp: number;
    description: string;
    type: SystemType;
  }
  export interface MechWeapon
    extends SystemTemplates.item_universal,
      SystemTemplates.destructible,
      SystemTemplates.limited,
      SystemTemplates.licensed {
    deployables: LIDRef[];
    integrated: LIDRef[];
    sp: number;
    profiles: Array<{
      name: string;
      type: WeaponType;
      damage: Damage[];
      range: Range[];
      tags: Tag[];
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

      // Derived - though for now not really used (much)
      bonus_damage: Origined<DamageData>[];
      bonus_tags: Origined<Tag>[];
      added_range: Origined<Range>[];
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
    all_tags: Tag[];
    // The current profile
    active_profile: this["profiles"][0];
  }
  export interface Npc
    extends SystemTemplates.actor_universal,
      SystemTemplates.action_tracking,
      SystemTemplates.heat,
      SystemTemplates.struss {
    notes: string;
    meltdown_timer: number | null;
    tier: number;

    // TODO: derived convenience arrays of features/actions? Active class?
    class: LancerNPC_CLASS | null;
  }
  export interface NpcClass extends SystemTemplates.item_universal {
    role: string;
    info: {
      flavor: string;
      tactics: string;
    };
    base_features: LIDRef[];
    optional_features: LIDRef[];
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
  }
  export type NpcFeature = SystemTemplates.NPC.AnyFeature;
  export interface NpcTemplate extends SystemTemplates.item_universal {
    description: string;
    base_features: LIDRef[];
    optional_features: LIDRef[];
  }

  export interface Organization extends SystemTemplates.item_universal {
    actions: string;
    description: string;
    efficiency: number;
    influence: 0;
    purpose: OrgType;
  }

  export interface PilotArmor extends SystemTemplates.item_universal, SystemTemplates.bascdt, SystemTemplates.limited {
    description: string;
  }
  export interface PilotGear extends SystemTemplates.item_universal, SystemTemplates.bascdt, SystemTemplates.limited {
    description: string;
  }
  export interface PilotWeapon extends SystemTemplates.item_universal, SystemTemplates.bascdt, SystemTemplates.limited {
    description: string;
    range: Range[];
    damage: Damage[];
    effect: string;
    loaded: boolean;
  }
  export interface Pilot extends SystemTemplates.actor_universal, SystemTemplates.action_tracking {
    active_mech: SystemTemplates.ResolvedUuidRef<LancerMECH> | null;
    background: string;
    callsign: string;
    cloud_id: string;
    cloud_owner_id: string;
    history: string;
    last_cloud_update: string;
    level: number;
    loadout: {
      armor: SystemTemplates.ResolvedEmbeddedRef<LancerPILOT_ARMOR>[];
      gear: SystemTemplates.ResolvedEmbeddedRef<LancerPILOT_GEAR>[];
      weapons: SystemTemplates.ResolvedEmbeddedRef<LancerPILOT_WEAPON>[];
    };
    mounted: boolean;
    notes: string;
    player_name: string;
    status: string;
    text_appearance: string;

    // Derived attributes
    grit: number;

    // Collected items
    core_bonuses: LancerCORE_BONUS[];
    licenses: LancerLICENSE[];
    skills: LancerSKILL[];
    talents: LancerTALENT[];
    counters: CounterData[];
  }
  export interface Reserve extends SourceData.Reserve {}
  export interface Skill extends SourceData.Skill {}
  export interface Status extends SourceData.Status {}

  export interface Talent extends SystemTemplates.item_universal {
    // Copied
    curr_rank: number;
    description: string;
    terse: string;

    // but with replaced bascdt
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

    // Flattened lists, computed
    actions: ActionData[]; // All unlocked actions
    synergies: ActionData[]; // All unlocked synergies
    counters: ActionData[]; // All unlocked counters
  }
  export interface WeaponMod
    extends SystemTemplates.item_universal,
      SystemTemplates.bascdt,
      SystemTemplates.destructible,
      SystemTemplates.licensed {
    added_tags: Tag[];
    added_damage: Damage[];
    effect: string;
    description: string;
    sp: number;
    uses: FullBoundedNum;
    allowed_sizes: WeaponSizeChecklist;
    allowed_types: WeaponTypeChecklist;
    added_range: Range[];
  }
}

export type SystemDataTypesMap = {
  // [EntryType.CONDITION]: IStatusData;
  [EntryType.CORE_BONUS]: SystemData.CoreBonus;
  [EntryType.DEPLOYABLE]: SystemData.Deployable;
  [EntryType.FRAME]: SystemData.Frame;
  [EntryType.LICENSE]: SystemData.License;
  [EntryType.MECH]: SystemData.Mech;
  [EntryType.MECH_SYSTEM]: SystemData.MechSystem;
  [EntryType.MECH_WEAPON]: SystemData.MechWeapon;
  [EntryType.NPC]: SystemData.Npc;
  [EntryType.NPC_CLASS]: SystemData.NpcClass;
  [EntryType.NPC_FEATURE]: SystemData.NpcFeature;
  [EntryType.NPC_TEMPLATE]: SystemData.NpcTemplate;
  [EntryType.ORGANIZATION]: SystemData.Organization;
  [EntryType.PILOT_ARMOR]: SystemData.PilotArmor;
  [EntryType.PILOT_GEAR]: SystemData.PilotGear;
  [EntryType.PILOT_WEAPON]: SystemData.PilotWeapon;
  [EntryType.PILOT]: SystemData.Pilot;
  [EntryType.RESERVE]: SystemData.Reserve;
  [EntryType.SKILL]: SystemData.Skill;
  [EntryType.STATUS]: SystemData.Status;
  [EntryType.TALENT]: SystemData.Talent;
  [EntryType.WEAPON_MOD]: SystemData.WeaponMod;
};

export type SystemDataType<T extends EntryType> = T extends keyof SystemDataTypesMap ? SystemDataTypesMap[T] : never;
