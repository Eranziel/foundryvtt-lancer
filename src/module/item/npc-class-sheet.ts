import { LancerActor } from "../actor/lancer-actor";
import { LANCER } from "../config";
import { LancerNPCFeatureItemData } from "../interfaces";
import { LancerItemSheet } from "./item-sheet";
import { LancerItem, LancerNPCClass, npc_feature_preview } from "./lancer-item";
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

    // Propogate to owner
    if(this.item.isOwned) {
      (<LancerActor>this.item.actor).swapNPCClassOrTier((<LancerNPCClass>this.item).data.data.stats,false);
    }

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
    // This nesting is necessary to listen properly
    item.base_feature_items.then(base_features => {
      this._displayFeatures(base_features, html.find("#base_feature_items"))
      item.optional_feature_items.then(optional_features => {
        this._displayFeatures(optional_features, html.find("#optional_feature_items"))
        // Delete Item when trash can is clicked
        let arrControl = html.find('.arr-control[data-action*="delete"]');
        arrControl.on("click", (ev: Event) => {
          if (!ev.currentTarget) return; // No target, let other handlers take care of it.
          ev.stopPropagation(); // Avoids triggering parent event handlers
          console.log(ev);
          const itemEl = $(ev.currentTarget).closest(".item");
          let fakeId: string = itemEl.data("item-fakeid");

          if(itemEl.parent().parent().hasClass("base-features-container")){
            // TODO: Remove this on NPC Feature rework
            // Since we could have non-features here...
            //@ts-ignore
            let newArr = item.data.data.base_features.filter(feat => {
              return feat !== fakeId;
            });
            item.update({data: {base_features: newArr}},{});
            item.render();
          } else if (itemEl.parent().parent().hasClass("opt-features-container")) {
            // TODO: Remove this on NPC Feature rework
            // Since we could have non-features here...
            //@ts-ignore
            let newArr = item.data.data.optional_features.filter(feat => {
              return feat !== fakeId;
            });
            item.update({data: {optional_features: newArr}},{});
            item.render();
          }
        });
      });
    });
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

  /** @override */
  _onDrop(event: DragEvent) {  
    // I promise this works
    // At least for now
    //@ts-ignore
    event.dataTransfer.items[0].getAsString(arg => {
      let dropData = JSON.parse(arg);
      console.log(`Dropped feature ${dropData.id} on class sheet ${this.id}`);

      this.addFeature(dropData.id, dropData?.pack);
    })
  }

  // TODO:
  // * Make trash can work

  /**
   * Adds the given item ID as a feature to the class
   * @param featID      String ID of the feature to add
   * @param compendium  Optionally, the compendium path to find the item at
   */
   private async addFeature(featID: string, compendium?: string) {
    let itemString = "";
    if(compendium) {
      itemString = "Compendium." + compendium + "." + featID;
    } else {
      itemString = "Item." + featID;
    }
    // Yes, this exists
    //@ts-ignore
    let foundFeat: LancerNPCFeature | null = await fromUuid(itemString);    
    if(!foundFeat) {
      console.log("That item doesn't exist!");
      return;
    }
    
    if(!(foundFeat.type === "npc_feature")) {
      console.log("You didn't drop a feature!");
      return;
    }

    let isBase = foundFeat.data.data.origin_base;

    // Naming this fakeId so we know it's not the item ID but the... feature ID.
    // shut up
    // TODO: Remove this on NPC Feature Rework
    let fakeId = foundFeat.data.data.id;

    // Apparently this will only work for features that exist in the feature compendium
    // Because our feature renderer grabs data from there
    // WHY!?!?!?
    if(isBase){
      let baseFeats = [...this.object.data.data.base_features];
      if (baseFeats.includes(fakeId)) {
        return;
      }
      baseFeats.push(fakeId);
      await this.object.update({data: {base_features: baseFeats}});
    } else {
      let optFeats = [...this.object.data.data.optional_features];
      if (optFeats.includes(fakeId)) {
        return;
      }
      optFeats.push(fakeId);
      await this.object.update({data: {optional_features: optFeats}});
    }
    this.render();
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
