import { LANCER } from "../config";
import { EntryType } from "../enums";
import { LancerItemSheetData } from "../interfaces";
import { lookupLID } from "../util/lid";
import { LancerItemSheet } from "./item-sheet";
import type { LancerItem, LancerNPC_CLASS, LancerNPC_TEMPLATE } from "./lancer-item";
const lp = LANCER.log_prefix;

/**
 * Extend the generic Lancer item sheet
 * @extends {LancerItemSheet}
 */
export class LancerNPCClassSheet extends LancerItemSheet<EntryType.NPC_CLASS | EntryType.NPC_TEMPLATE> {
  /**
   * @override
   * Extend and override the default options used by the generic Lancer item sheet
   */
  static get defaultOptions(): ItemSheet.Options {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 900,
      height: 750,
    });
  }

  base_feature_items!: (LancerItem["data"] & { type: EntryType.NPC_FEATURE })[];
  optional_feature_items!: (LancerItem["data"] & { type: EntryType.NPC_FEATURE })[];

  async getData(): Promise<LancerItemSheetData<EntryType.NPC_CLASS | EntryType.NPC_TEMPLATE>> {
    let data = await super.getData();

    // Want to resolve all of our lids
    let item = this.item as LancerNPC_CLASS | LancerNPC_TEMPLATE;
    (data as any).base_features = await Promise.all(
      Array.from(item.system.base_features).map(lid => lookupLID(lid, EntryType.NPC_FEATURE))
    );
    (data as any).optional_features = await Promise.all(
      Array.from(item.system.optional_features).map(lid => lookupLID(lid, EntryType.NPC_FEATURE))
    );

    return data;
  }
}
