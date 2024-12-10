import { LancerItemType } from "./item/lancer-item";
import { LancerActorType, LancerDEPLOYABLE, LancerMECH, LancerPILOT } from "./actor/lancer-actor";
import { LancerActiveEffect } from "./effects/lancer-active-effect";
import { SystemDataTypesMap, SystemDataType } from "./system-template";
import { Damage, DamageData } from "./models/bits/damage";
import { Tag } from "./models/bits/tag";
import { CollapseRegistry } from "./helpers/collapse";

// ------------------------------------------------------
// |       SHEET DATA TYPES                             |
// ------------------------------------------------------

// These single generic type should cover all basic sheet use cases
export interface LancerItemSheetData<T extends LancerItemType> extends ItemSheet.Data<ItemSheet.Options> {
  // The license, if it could be recovered
  license: LANCERLicense | null;
  system: SystemDataType<T>;
  collapse: CollapseRegistry;
  deployables: Record<string, LancerDEPLOYABLE>;
  org_types?: { [key: string]: string }; // Organization types, only provided on org sheets
  status_types?: { [key: string]: string }; // Status types, only provided on status sheets
}

export type CachedCloudPilot = {
  id: string;
  name: string;
  callsign: string;
  cloudID: string;
  cloudOwnerID: string;
};

export interface LancerActorSheetData<T extends LancerActorType> extends ActorSheet.Data<ActorSheet.Options> {
  // Store active mech/pilot at the root level
  active_mech?: LancerMECH;
  pilot?: LancerPILOT;
  // Store cloud pilot cache and potential cloud ids at the root level
  compConPilotList: Record<string, string>;
  cleanedOwnerID: string;
  vaultID: string;
  rawID: string;
  effect_categories: ReturnType<typeof LancerActiveEffect["prepareActiveEffectCategories"]>;
  system: SystemDataType<T>;
  itemTypes: LancerActor["itemTypes"];
  collapse: CollapseRegistry;
  deployables: Record<string, LancerDEPLOYABLE>;
}

export interface GenControlContext {
  // T is whatever is yielded by get_data/handled by commit_func
  // Raw information
  elt: HTMLElement; // The control element which fired this control event
  base_document: LancerActor | LancerItem; // The base document of this sheet
  path: string; // The data path stored on the control
  action: "delete" | "null" | "splice" | "set" | "append" | "insert"; // The action stored on the control
  raw_val?: string; // The unprocessed val stored on the control, if applicable

  // Deduced information
  path_target: null | any; // What path resolved to on data, if anything
  target_document: LancerActor | LancerItem; // The last document we were able to resolve on the path. Will be the target of our update
  relative_path: string; // Our update path relative to document
  parsed_val?: any; // Parsed version of raw_val
}
