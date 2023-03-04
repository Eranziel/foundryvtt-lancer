import { LancerItem } from "./item/lancer-item";
import type { LancerItemType } from "./item/lancer-item";
import type { LancerLICENSE } from "./item/lancer-item";
import { LancerActor } from "./actor/lancer-actor";
import type { LancerActorType } from "./actor/lancer-actor";
import type { LancerDEPLOYABLE, LancerMECH, LancerPILOT } from "./actor/lancer-actor";
import { LancerActiveEffect } from "./effects/lancer-active-effect";
import type { SystemDataType } from "./system-template";
import type { CollapseRegistry } from "./helpers/collapse";

// ------------------------------------------------------
// |       SHEET DATA TYPES                             |
// ------------------------------------------------------

// These single generic type should cover all basic sheet use cases
export interface LancerItemSheetData<T extends LancerItemType> extends ItemSheet.Data<ItemSheet.Options> {
  // The license, if it could be recovered
  license: LancerLICENSE | null;
  system: SystemDataType<T>;
  collapse: CollapseRegistry;
  deployables: Record<string, LancerDEPLOYABLE>;
}

export type CachedCloudPilot = {
  id: string;
  name: string;
  cloudID: string;
  cloudOwnerID: string;
};

export interface LancerActorSheetData<T extends LancerActorType> extends ActorSheet.Data<ActorSheet.Options> {
  // Store active mech/pilot at the root level
  active_mech?: LancerMECH;
  pilot?: LancerPILOT;
  // Store cloud pilot cache and potential cloud ids at the root level
  pilotCache: CachedCloudPilot[];
  cleanedOwnerID: string;
  vaultID: string;
  rawID: string;
  effect_categories: ReturnType<(typeof LancerActiveEffect)["prepareActiveEffectCategories"]>;
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

// Context menu interface compatible with core foundry and our custom tippy menus
export interface ContextMenuItem {
  name: string;
  icon?: string; // class used to generate icon, if it should exist at all. e.x. "fa fa-fw fa-times"
  callback: (target: JQuery) => void | Promise<void>; // argument is the element to which the context menu attaches
}
