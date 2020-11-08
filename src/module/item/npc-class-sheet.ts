import { LANCER } from "../config";
import { LancerNPCFeatureItemData } from "../interfaces";
import { LancerItemSheet } from "./item-sheet";
import { LancerItem, npc_feature_preview } from "./lancer-item";
const lp = LANCER.log_prefix;

/**
 * Extend the generic Lancer item sheet
 * @extends {LancerItemSheet}
 */
export class LancerNPCClassSheet extends LancerItemSheet {
  /**
   * @override
   * Extend and override the default options used by the generic Lancer item sheet
   * @returns {Object}
   */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      width: 900,
      height: 750,
      dragDrop: [{ dragSelector: ".item" }],
    });
  }

  base_feature_items!: LancerNPCFeatureItemData[];
  optional_feature_items!: LancerNPCFeatureItemData[];

  /** @override */
  _updateObject(event: any, formData: any) {
    formData["data.stats.hp"] = LancerNPCClassSheet.arrayifyStats(formData["data.stats.hp"]);
    formData["data.stats.heatcap"] = LancerNPCClassSheet.arrayifyStats(
      formData["data.stats.heatcap"]
    );
    formData["data.stats.structure"] = LancerNPCClassSheet.arrayifyStats(
      formData["data.stats.structure"]
    );
    formData["data.stats.stress"] = LancerNPCClassSheet.arrayifyStats(
      formData["data.stats.stress"]
    );
    formData["data.stats.armor"] = LancerNPCClassSheet.arrayifyStats(formData["data.stats.armor"]);
    formData["data.stats.evasion"] = LancerNPCClassSheet.arrayifyStats(
      formData["data.stats.evasion"]
    );
    formData["data.stats.edef"] = LancerNPCClassSheet.arrayifyStats(formData["data.stats.edef"]);
    formData["data.stats.speed"] = LancerNPCClassSheet.arrayifyStats(formData["data.stats.speed"]);
    formData["data.stats.sensor_range"] = LancerNPCClassSheet.arrayifyStats(
      formData["data.stats.sensor_range"]
    );
    formData["data.stats.save"] = LancerNPCClassSheet.arrayifyStats(formData["data.stats.save"]);
    formData["data.stats.activations"] = LancerNPCClassSheet.arrayifyStats(
      formData["data.stats.activations"]
    );
    formData["data.stats.size"] = LancerNPCClassSheet.arrayifyStats(formData["data.stats.size"]);
    formData["data.stats.hull"] = LancerNPCClassSheet.arrayifyStats(formData["data.stats.hull"]);
    formData["data.stats.agility"] = LancerNPCClassSheet.arrayifyStats(
      formData["data.stats.agility"]
    );
    formData["data.stats.systems"] = LancerNPCClassSheet.arrayifyStats(
      formData["data.stats.systems"]
    );
    formData["data.stats.engineering"] = LancerNPCClassSheet.arrayifyStats(
      formData["data.stats.engineering"]
    );

    formData["data.stats.size"] = (formData["data.stats.size"] as number[]).map(x => {
      if (x < 0.5) return 0.5;
      else if (x !== 0.5 && x % 1 < 1) return Math.floor(x);
      else return x;
    });

    console.log(`${lp} Item sheet form data: `, formData);
    // Update the Item
    return this.object.update(formData);
  }

  static arrayifyStats(data: string[]) {
    return data.map(x => parseFloat(x));
  }

  getData(): ItemSheetData {
    let item = this.item as LancerItem;
    //Fetching local copies for use in drag-and-drop flow
    item.base_feature_items.then(features => (this.base_feature_items = features));
    item.optional_feature_items.then(features => (this.optional_feature_items = features));

    return super.getData();
  }

  activateListeners(html: JQuery) {
    super.activateListeners(html);

    const item = this.item as LancerItem;

    //These have to be refetched here despite also being fetched in getData because getData isn't allowed to be async in ItemSheets, thanks Foundry
    //So even if this looks like it's wrong, it's not
    item.base_feature_items.then(base_features =>
      this._displayFeatures(base_features, html.find("#base_feature_items"))
    );
    item.optional_feature_items.then(optional_features =>
      this._displayFeatures(optional_features, html.find("#optional_feature_items"))
    );
  }

  /** @override */
  _onDragStart(event: DragEvent) {
    const li = event.currentTarget as HTMLElement;
    const features = this.base_feature_items.concat(this.optional_feature_items);

    const selectedFeature = features.find(feature => feature._id === li.dataset["itemId"]);
    if (selectedFeature) {
      const dragData = {
        type: "Item",
        data: selectedFeature,
      };

      if (event.dataTransfer) {
        event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
      }
    }
  }

  private _displayFeatures(
    features: LancerNPCFeatureItemData[],
    elementToReplace: JQuery<Element>
  ) {
    let featureItems = features
      .map(feature => {
        return npc_feature_preview(feature, 0);
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
}
