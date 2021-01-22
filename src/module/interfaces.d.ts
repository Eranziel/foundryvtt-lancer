import {
  LancerSkill,
  LancerTalent,
  LancerCoreBonus,
  LancerLicense,
  LancerFrame,
  LancerPilotArmor,
  LancerPilotWeapon,
  LancerPilotGear,
  LancerMechWeapon,
  LancerMechSystem,
  LancerNpcFeature,
  LancerNpcClass,
  LancerNpcTemplate,
  LancerItemData,
} from "./item/lancer-item";
import { RangeType, NPCTag } from "./enums";
import { EffectData } from "./item/effects";
import * as mm from "machine-mind";
import {
  EntryType,
  ITagTemplateData,
  License,
  MountType,
  OpCtx,
  Pilot,
  RegEntryTypes,
  Registry,
  RegNpcData,
  RegPilotData,
  RegSkillData,
} from "machine-mind";
import { FoundryRegActorData, FoundryRegItemData } from "./mm-util/foundry-reg";
import { MMEntityContext, abracadabra } from "./mm-util/helpers";

// ------------------------------------------------------
// |       UTILITY DATA TYPES                           |
// ------------------------------------------------------

// TODO: several of these may be moved to classes later to enable specialized logic
// TODO: Range and Damage are good examples of objects that should be aware of their string representation and html representation

/*
declare interface TagDataShort {
  id: string;
  val?: number | string;
}
*/
declare type TagDataShort = mm.ITagData;

// Alias, except it also have a val for some reason? TODO: Verify that this wasn't just a typo. Why would val matter here (reliable maybe? why not present in CC/mm?)
/*
declare interface TagData {
  id: string;
  name: string;
  description: string;
  val?: number | string;
  filter_ignore?: boolean;
  hidden?: boolean;
}
*/
declare interface TagData extends ITagTemplateData {
  val?: number | string;
}

// Alias
/*
declare interface RangeData {
  type: RangeType;
  val: number;
  override?: boolean;
  bonus?: number;
}*/
declare type RangeData =
  | mm.IRangeData
  | {
      type: "None";
      val: 0;
    };

// Alias
/*
declare interface DamageData {
  type: DamageType;
  val: string | number;
  override?: boolean;
}
*/
declare type DamageData = mm.IDamageData;

// This type significantly diverges for some reason.
// declare type NPCDamageData = mm.INpcDamageData;
declare interface NPCDamageData {
  type: mm.DamageType;
  val: string[];
  override?: boolean;
}

// ------------------------------------------------------
// |       ACTOR DATA TYPES                             |
// ------------------------------------------------------

// ------- Actor data templates -------------------------
declare interface ResourceData {
  value: number;
  min: number;
  max: number;
}

// Significance divergence from the CC mech. Seems useful for code reuse, but more than any other data type I'd like to have this one refactored to mirror CC/MM
declare interface LancerMechData {
  name: string;
  size: number;
  hull: number;
  agility: number;
  systems: number;
  engineering: number;
  hp: ResourceData;
  structure: ResourceData;
  heat: ResourceData;
  stress: ResourceData;
  repairs: ResourceData;
  armor: number;
  speed: number;
  evasion: number;
  edef: number;
  sensors: number;
  save: number;
  tech_attack: number;
  sp: number;
  current_core_energy: number;
  overcharge_level: number;
}

// Seems like it should eventually mirror IMechLoadoutData
declare interface LancerMechLoadoutData {
  mounts: LancerMountData[]; // TODO
  systems: LancerMechSystemData[];
}

declare interface LancerMountData {
  secondary_mount: string; // ????
  type: MountType;
  weapons: LancerMechWeaponItemData[];
}

// ------- Pilot data ----------------------------------
// No MM equivalent
declare interface LancerPilotStatsData {
  size: number;
  hp: ResourceData;
  armor: number;
  evasion: number;
  edef: number;
  speed: number;
}

// Stripped down version of IPilotLoadoutData, that instead uses IDs. Honestly, probably better done this way
declare interface LancerPilotLoadoutData {
  armor: string; // ID of armor Item
  weapons: string[]; // IDs of weapon Items
  gear: string[]; // IDs of gear Items
}

// Kind of like IPilotData. Lots of loss here, but dunno how much we care about
declare interface LancerPilotSubData {
  level: number;
  grit: number;
  callsign: string;
  name: string;
  status: string;
  notes: string;
  quirk: string;
  background: string;
  history: string;
  stats: LancerPilotStatsData;
  cloud_code: string;
  cloud_owner_code: string;
  cloud_time: string;
  loadout: LancerPilotLoadoutData;
}

declare interface LancerPilotData extends RegPilotData {
  // pilot: LancerPilotSubData;
  // mech: LancerMechData;
  // mech_loadout: LancerMechLoadoutData;
}

// Utility interface that basically just asserts the type of an actors data
declare interface LancerPilotActorData extends ActorData {
  data: LancerPilotData;
}

// Derived/consolidated data for an actor, used by handlebars template.
declare interface LancerPilotSheetData extends ActorSheetData {
  actor: LancerPilotActorData;
  items: Item[];
  data: Pilot;

  // reg ctx
  reg: Registry;
  ctx: OpCtx;
}

declare interface LancerMechData extends RegMechData {}

// Utility interface that basically just asserts the type of an actors data
declare interface LancerMechActorData extends ActorData {
  data: LancerMechData;
}

// Derived/consolidated data for a mech actor, used by handlebars template.
declare interface LancerMechSheetData extends ActorSheetData {
  actor: LancerMechActorData;
  data: LancerMechData;
  items: Item[];

  // reg ctx
  mm: MMEntityContext<EntryType.MECH>;
}

// ------- NPC data ---------------------------------------------
// Similar to mech and pilot, not currently easily converted
declare interface LancerNPCData extends RegNpcData {
  // mech: LancerMechData;
  // type: string;
  // name: string;
  // tier: "npc-tier-1" | "npc-tier-2" | "npc-tier-3" | "npc-tier-custom"; //tier1-3 = 1-3 and custom = 4
  // tier_num: number;
  // tag: NPCTag;
  // activations: number;
  // npc_size: string;
}

// Utility interface that basically just asserts the type of an actors data
declare interface LancerNPCActorData extends ActorData {
  data: LancerNPCData;
}

// Derived/consolidated data for an npc, used by handlebars template.
declare interface LancerNPCSheetData extends ActorSheetData {
  actor: LancerNPCActorData;
  data: LancerNPCData;
  npc_class: LancerNpcClass;
  npc_templates: LancerNpcTemplate[];
  npc_features: LancerNpcFeature[];
}

// ------- Deployable data --------------------------------------
// Represents a _significant_ divergence from the CC/MM way of doing things
// This is likely because this is serving a dual role as a token stats and a resource, whereas CC just tracks the resource
declare interface LancerDeployableData {
  name: string;
  size: number;
  hp: ResourceData;
  heat: ResourceData;
  armor: number;
  evasion: number;
  edef: number;
  description: string;
  effect: EffectData;
}

// Utility interface that basically just asserts the type of an actors data
declare interface LancerDeployableActorData extends ActorData {
  data: LancerDeployableData;
}

declare interface LancerDeployableSheetData extends ActorSheetData {
  actor: LancerDeployableActorData;
  data: LancerDeployableData;
}

// ------------------------------------------------------
// |       ITEM DATA TYPES                             |
// ------------------------------------------------------

// -------- Item data templates -------------------------
// This is similar to CompendiumItem. Note however, that CompendiumItem does not actually implement usage of flavor_name and flavor_description.
// they are, at this time, utterly useless on the CC/MM side
declare interface LancerCompendiumItemData {
  id: string;
  name: string;
  description: string;
  note: string;
  item_type: mm.ItemType;
  flavor_name: string;
  flavor_description: string;
}

// Highly simplified version of CC PilotEquipment
declare interface LancerPilotEquipmentData {
  tags: TagData[];
}

declare interface LancerLicensedItemData extends LancerCompendiumItemData {
  source: string;
  license: string;
  license_level: number;
}

declare interface LancerMechEquipmentData {
  sp: number;
  uses: number;
  max_uses: number;
  max_use_override: number;
  destroyed: boolean;
  cascading: boolean;
  loaded: boolean;
  tags: TagData[];
  effect: EffectData; // EffectData;
  integrated: boolean;
  // TODO: not needed? Used in Comp/Con for some of its mech building logic.
  // talent_item: boolean;
  // frame_id: boolean;
}

// These single generic type should cover all basic sheet use cases
export type LancerItemSheetData<T extends EntryType> = {
  item: FoundryRegItemData<T>;
  data: RegEntryTypes<T>;

  // reg ctx
  mm: MMEntityContext<T>;

  // The license, if it could be recovered
  license: License | null;
};

export type LancerActorSheetData<T extends EntryType> = {
  actor: FoundryRegActorData<T>;
  data: RegEntryTypes<T>;
  items: Item[];

  // reg ctx
  mm: MMEntityContext<T>;
};

// -------- Macro data -------------------------------------
declare interface LancerStatMacroData {
  title: string;
  bonus: string | number;
  effect?: EffectData | string;
}

declare interface LancerAttackMacroData {
  title: string;
  grit: number;
  acc: number;
  damage: DamageData[];
  overkill: boolean;
  effect: EffectData | string;
  on_hit?: string; // For NPC weapons - to be removed once they use EffectData
  tags: TagDataShort[];
}

declare interface LancerTechMacroData {
  title: string;
  t_atk: number;
  acc: number;
  effect: string;
  tags: TagDataShort[];
}

declare interface LancerTalentMacroData {
  talent: LancerTalentData;
  rank: number;
}

declare interface LancerGenericMacroData {
  title: string;
  effect: EffectData | string;
}

declare interface LancerReactionMacroData {
  title: string;
  trigger: string;
  effect: string;
  tags?: TagDataShort[];
}

declare interface LancerTextMacroData {
  title: string;
  description: string;
  tags?: TagDataShort[];
}
