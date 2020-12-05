import { DamageData, LancerMechSystemData, RangeData } from "../interfaces";
import { LANCER } from "../config";
import { NPCFeatureIcons } from "./npc-feature";
import { ActivationType, ChargeType, DamageType, EffectType, NpcFeatureType } from "machine-mind";
import { ChargeData, ChargeEffectData } from "./effects";

const lp = LANCER.log_prefix;

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class LancerItemSheet extends ItemSheet {
  /**
   * @override
   * Extend and override the default options used by the Item Sheet
   * @returns {Object}
   */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["lancer", "sheet", "item"],
      width: 700,
      height: 480,
      tabs: [
        {
          navSelector: ".sheet-tabs",
          contentSelector: ".sheet-body",
          initial: "description",
        },
      ],
    });
  }

  /** @override */
  get template() {
    const path = "systems/lancer/templates/item";
    return `${path}/${this.item.data.type}.html`;
  }

  /* -------------------------------------------- */

  /**
   * @override
   * Prepare data for rendering the Item sheet
   * The prepared data object contains both the item data as well as additional sheet options
   */
  getData(): ItemSheetData {
    const data: ItemSheetData = super.getData() as ItemSheetData;

    if (!data.item) {
      // Just junk it
      return {};
    }

    if (data.item.type === "npc_feature" && data.data.feature_type === NpcFeatureType.Weapon) {
      if (data.data.weapon_type) {
        const parts = data.data.weapon_type.split(" ");
        data.data.weapon_size = parts[0];
        data.data.weapon_type = parts[1];
      } else {
        data.data.weapon_size = "Main";
        data.data.weapon_type = "Rifle";
      }

      // TODO: Fill in 0's if attack bonus or accuracy are undefined or "".
    }

    if (data.item.type === "mech_system") {
      // For effects which are a basic string, construct a BasicEffectData for them.
      if (typeof data.data.effect === "string") {
        data.data.effect = {
          effect_type: EffectType.Basic,
          detail: data.data.effect,
        };
      }
    }

    console.log(`${lp} Item sheet data: `, data);
    return data;
  }

  /* -------------------------------------------- */

  /** @override */
  setPosition(options = {}) {
    // const sheetBody = (this.element as HTMLDivElement).find(".sheet-body");
    // const bodyHeight = position.height - 192;
    // sheetBody.css("height", bodyHeight);
    return super.setPosition(options);
  }

  /* -------------------------------------------- */

  /**
   * @override
   * Activate event listeners using the prepared sheet HTML
   * @param html {JQuery}   The prepared HTML object ready to be rendered into the DOM
   */
  activateListeners(html: JQuery) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Customized increment/decrement arrows
    let decr = html.find('button[class*="mod-minus-button"]');
    decr.on("click", (ev: Event) => {
      if (!ev.currentTarget) return; // No target, let other handlers take care of it.
      const but = $(ev.currentTarget as HTMLElement);
      (but.next()[0] as HTMLInputElement).value = (
        (but.next()[0] as HTMLInputElement).valueAsNumber - 1
      ).toString();
      this.submit({});
    });
    let incr = html.find('button[class*="mod-plus-button"]');
    incr.on("click", (ev: Event) => {
      if (!ev.currentTarget) return; // No target, let other handlers take care of it.
      const but = $(ev.currentTarget as HTMLElement);
      (but.prev()[0] as HTMLInputElement).value = (
        (but.prev()[0] as HTMLInputElement).valueAsNumber + 1
      ).toString();
      this.submit({});
    });

    // Add or Remove options
    // Yes, theoretically this could be abstracted out to one function. You do it then.
    html
      .find(".arrayed-item-container")
      .on("click", ".clickable", this._onClickArrayControl.bind(this));
    html
      .find(".arrayed-item-container")
      .on("change", ".delete-selector", this._onSelectDelete.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Listen for events on a selector to remove the referenced item
   * @param event    The originating event
   * @private
   */
  async _onSelectDelete(event: any) {
    const s = $(event.currentTarget);
    if (s.val() === "delete") {
      event.preventDefault();
      const itemString = s.data("item");
      const itemArr = duplicate(this["object"]["data"]["data"][itemString]);
      const parent = s.parents(".arrayed-item");
      const id = parent.data("key");

      delete itemArr[id];
      itemArr["-=" + id] = null;
      console.log(itemArr);
      await parent.remove();
      await this.object.update({ "data.mounts": itemArr });
    }
  }

  /**
   * Listen for click events on an attribute control to modify the composition of attributes in the sheet
   * @param {MouseEvent} event    The originating left click event
   * @private
   */
  async _onClickArrayControl(event: any) {
    let itemArr;
    event.preventDefault();
    const a = $(event.currentTarget);
    const action = a.data("action");
    const itemString = a.parents(".arrayed-item-container").data("item");
    console.log(itemString);
    const baseArr = getValue(this, "object.data.data." + itemString);
    if (!baseArr) {
      itemArr = [];
    } else {
      itemArr = duplicate(baseArr);
    }
    const dataRef = "data." + itemString;

    console.log("_onClickArrayControl()", action, itemArr, itemString);
    if (action === "create") {
      // I can't figure out a better way to prevent collisions
      // Feel free to come up with something better
      const keys = Object.keys(itemArr);
      let newIndex = 0;
      if (keys.length > 0) {
        // @ts-ignore
        newIndex = Math.max.apply(Math, keys) + 1;
      }
      itemArr[newIndex] = null;
      await this.object.update({ [dataRef]: itemArr });
    } else if (action === "delete") {
      // delete tag
      const parent = a.parents(".arrayed-item");
      const id = parent.data("key");

      // Since we're doing weird things with arrays, let's just split as needed
      if (Array.isArray(itemArr)) {
        // This is for arrays:
        itemArr.splice(id, 1);
      } else {
        // For dict
        delete itemArr[id];
        itemArr["-=" + id] = null;

        // So the question now becomes: why do all my arrays become dicts of objects?
      }

      this.object.update({ [dataRef]: itemArr });
    }
  }

  /* -------------------------------------------- */

  /** @override */
  _updateObject(event: any, formData: any) {
    formData = LancerItemSheet.arrayifyTags(formData, "data.tags");
    formData = LancerItemSheet.arrayifyTags(formData, "data.core_system.tags");
    formData = LancerItemSheet.arrayifyTags(formData, "data.traits");

    // Update the Lancer-data name to match the item name.
    formData["data.name"] = formData["name"];

    if (this.item.data.type === "npc_feature") {
      // Change image to match feature type, unless a custom image has been selected
      const imgPath = "systems/lancer/assets/icons/";
      const shortImg = formData["img"].slice(formData["img"].lastIndexOf("/") + 1);
      if (
        formData["img"].startsWith(imgPath) &&
        Object.values(NPCFeatureIcons).includes(shortImg)
      ) {
        formData["img"] =
          imgPath + NPCFeatureIcons[formData["data.feature_type"] as NpcFeatureType];
      }

      // Re-build NPC Weapon size and type
      if (
        this.item.data.type === "npc_feature" &&
        this.item.data.data.feature_type === NpcFeatureType.Weapon
      ) {
        formData[
          "data.weapon_type"
        ] = `${formData["data.weapon_size"]} ${formData["data.weapon_type"]}`;
        delete formData["data.weapon_size"];
      }

      // Give it a custom fake ID if it doesn't have one
      if(!(this.item.data.data.id)) {
        this.item.update({"data.id":"custom_npcf_" + this.item.id},{});
      }
    }

    // Weapons & systems can have ranges, consolidating into one place w/ better matching
    if (LANCER.weapon_items.includes(this.item.data.type) || this.item.data.type === 'mech_system') {
      // Safeguard against non-weapon NPC features
      if (
        this.item.data.type !== "npc_feature" ||
        (this.item.data.type === "npc_feature" &&
          this.item.data.data.feature_type === NpcFeatureType.Weapon)
      ) {

        // Uses Regex to dynamically find ranges/damages for better forward extensibility
        var damKeys = [];
        var rangeKeys = [];
        var damFilter = /(\.damage)\.\d\.(type|val)/;
        var rangeFilter = /(\.range)\.\d\.(type|val)/;
        var key = "";
        for (key in formData) {
          if (formData.hasOwnProperty(key) && damFilter.test(key)) {
            damKeys.push(key);
          }
          if (formData.hasOwnProperty(key) && rangeFilter.test(key)) {
            rangeKeys.push(key);
          }
        }

        // Sanity check to make sure it's all paired
        if(rangeKeys.length % 2 || damKeys.length % 2) {
          console.log("Error updating range/damage");
          ui.notifications.error(
            `Warning: Error updating item range/damage. Please report this`
          );
          return;
        }

        var newDamage: {[index:string]:Array<object>} = {};
        let newRange: {[index:string]:Array<object>} = {};
        var split = [];


        // We're going to process both at once because we're fancy like that
        var newCombined: Array<{[index:string]:Array<object>}> = [newDamage, newRange];
        var combinedKeys: Array<Array<string>> = [damKeys, rangeKeys];
        var combinedFilters: Array<RegExp> = [damFilter, rangeFilter];

        // Remember to use standard for loops if it's arrays...
        for(var i = 0; i < newCombined.length; i++) {
          for (var j = 0; j  < combinedKeys[i].length; j += 2 ) {
            // Grab our pre-damage/range path
            split = combinedKeys[i][j].split(combinedFilters[i]);
  
            // Initialize if it hasn't already
            if(!newCombined[i][split[0] + split[1]]) {
              newCombined[i][split[0] + split[1]] = []
            }
  
            // For now... assume type first (which should always be the case)
            newCombined[i][split[0] + split[1]].push({
              type: formData[combinedKeys[i][j]],
              val: formData[combinedKeys[i][j+1]]
            });

            // Remove the old data
            delete formData[combinedKeys[i][j]];
            delete formData[combinedKeys[i][j+1]];
          }

          // Put back in the real data
          for (key in newCombined[i]){
            formData[key] = newCombined[i][key];
          }
        }
      }
    }

    console.log(`${lp} Item sheet form data: `, formData);

    // Update the Item
    return this.object.update(formData);
  }

  static arrayifyTags(data: any, prefix: string) {
    if (data.hasOwnProperty(`${prefix}.0.name`)) {
      let tags = [];
      let i = 0;
      while (data.hasOwnProperty(`${prefix}.${i}.name`)) {
        tags.push({
          name: data[`${prefix}.${i}.name`],
          id: data[`${prefix}.${i}.id`],
          description: data[`${prefix}.${i}.description`],
          val: data[`${prefix}.${i}.val`],
        });
        delete data[`${prefix}.${i}.name`];
        delete data[`${prefix}.${i}.id`];
        delete data[`${prefix}.${i}.description`];
        delete data[`${prefix}.${i}.val`];
        i++;
      }
      data[`${prefix}`] = tags;
    }
    return data;
  }
}

// Helper function to get arbitrarily deep array references
function getValue(object: any, path: string) {
  return path
    .replace(/\[/g, ".")
    .replace(/]/g, "")
    .split(".")
    .reduce((o, k) => (o || {})[k], object);
}
