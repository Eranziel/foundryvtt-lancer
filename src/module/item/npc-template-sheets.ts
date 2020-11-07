import { LancerNPCFeatureItemData } from "../interfaces";
import { LancerItemSheet } from "./item-sheet"
import { LancerItem, npc_feature_preview } from "./lancer-item";

/**
 * Extend the generic Lancer item sheet
 * @extends {LancerItemSheet}
 */
export class LancerNPCTemplateSheet extends LancerItemSheet {
    /**
   * @override
   * Extend and override the default options used by the generic Lancer item sheet
   * @returns {Object}
   */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      dragDrop: [{ dragSelector: ".item" }],
    });
  }

  base_feature_items!: LancerNPCFeatureItemData[];
  optional_feature_items!: LancerNPCFeatureItemData[];

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