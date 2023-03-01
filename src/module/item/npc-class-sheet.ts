import { LANCER } from "../config";
import { EntryType } from "../enums";
import type { LancerItemSheetData } from "../interfaces";
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
    return mergeObject(super.defaultOptions, {
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
      item.system.base_features.map(lid => lookupLID(lid, EntryType.NPC_FEATURE))
    );
    (data as any).optional_features = await Promise.all(
      item.system.optional_features.map(lid => lookupLID(lid, EntryType.NPC_FEATURE))
    );

    return data;
  }

  /** @override */
  _updateObject(_event: any, formData: any) {
    /*
    formData["data.stats.size"] = (formData["data.stats.size"] as number[]).map(x => {
      if (x < 0.5) return 0.5;
      else if (x !== 0.5 && x % 1 < 1) return Math.floor(x);
      else return x;
    });
    */
    console.log("TODO");

    console.log(`${lp} Item sheet form data: `, formData);

    // Update the Item
    return this.object.update(formData);
  }

  static arrayifyStats(data: string[]) {
    return data.map(x => parseFloat(x));
  }

  // TODO: npc_feature_preview expects a path to the feature, not a feature reference
  /*
  private _displayFeatures(features: LancerNpcFeatureData[], elementToReplace: JQuery<Element>) {
    let featureItems = features
      .map(feature => {
        return npc_feature_preview(feature, 0, {});
      })
      .map(featureItem => {
        if (featureItem) {
          const element = jQuery(featureItem);
          element.each((i: number, item: any) => {
            item.setAttribute("draggable", "true");
            item.addEventListener("dragstart", (ev: DragEvent) => this._onDragStart(ev), false);
          });
          return element;
        }
        return jQuery("");
      })
      .map(element => element[0]);

    elementToReplace.replaceWith(featureItems);
  }
   */
}
