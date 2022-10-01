import type { EntryType } from "machine-mind";
import { LANCER } from "../config";
import { LancerItemSheet } from "./item-sheet";
import type { LancerItem } from "./lancer-item";
const lp = LANCER.log_prefix;

/**
 * Extend the generic Lancer item sheet
 * @extends {LancerItemSheet}
 */
export class LancerNPCClassSheet extends LancerItemSheet<EntryType.NPC_CLASS> {
  /**
   * @override
   * Extend and override the default options used by the generic Lancer item sheet
   */
  static get defaultOptions(): ItemSheet.Options {
    return mergeObject(super.defaultOptions, {
      width: 900,
      height: 750,
      dragDrop: [{ dragSelector: ".item" }],
    });
  }

  base_feature_items!: (LancerItem["data"] & { type: EntryType.NPC_FEATURE })[];
  optional_feature_items!: (LancerItem["data"] & { type: EntryType.NPC_FEATURE })[];

  /** @override */
  _updateObject(_event: any, formData: any) {
    formData["data.stats.hp"] = LancerNPCClassSheet.arrayifyStats(formData["data.stats.hp"]);
    formData["data.stats.heatcap"] = LancerNPCClassSheet.arrayifyStats(formData["data.stats.heatcap"]);
    formData["data.stats.structure"] = LancerNPCClassSheet.arrayifyStats(formData["data.stats.structure"]);
    formData["data.stats.stress"] = LancerNPCClassSheet.arrayifyStats(formData["data.stats.stress"]);
    formData["data.stats.armor"] = LancerNPCClassSheet.arrayifyStats(formData["data.stats.armor"]);
    formData["data.stats.evasion"] = LancerNPCClassSheet.arrayifyStats(formData["data.stats.evasion"]);
    formData["data.stats.edef"] = LancerNPCClassSheet.arrayifyStats(formData["data.stats.edef"]);
    formData["data.stats.speed"] = LancerNPCClassSheet.arrayifyStats(formData["data.stats.speed"]);
    formData["data.stats.sensor_range"] = LancerNPCClassSheet.arrayifyStats(formData["data.stats.sensor_range"]);
    formData["data.stats.save"] = LancerNPCClassSheet.arrayifyStats(formData["data.stats.save"]);
    formData["data.stats.activations"] = LancerNPCClassSheet.arrayifyStats(formData["data.stats.activations"]);
    formData["data.stats.size"] = LancerNPCClassSheet.arrayifyStats(formData["data.stats.size"]);
    formData["data.stats.hull"] = LancerNPCClassSheet.arrayifyStats(formData["data.stats.hull"]);
    formData["data.stats.agility"] = LancerNPCClassSheet.arrayifyStats(formData["data.stats.agility"]);
    formData["data.stats.systems"] = LancerNPCClassSheet.arrayifyStats(formData["data.stats.systems"]);
    formData["data.stats.engineering"] = LancerNPCClassSheet.arrayifyStats(formData["data.stats.engineering"]);

    formData["data.stats.size"] = (formData["data.stats.size"] as number[]).map(x => {
      if (x < 0.5) return 0.5;
      else if (x !== 0.5 && x % 1 < 1) return Math.floor(x);
      else return x;
    });

    console.log(`${lp} Item sheet form data: `, formData);

    // Propogate to owner
    // TODO: still needed with new MM?
    // if(this.item.isOwned) {
    //   (<LancerActor>this.item.actor).swapNPCClassOrTier((<LancerNPCClass>this.item).system.stats,false);
    // }

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
