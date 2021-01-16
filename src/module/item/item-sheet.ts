import { DamageData, LancerItemSheetData, RangeData } from "../interfaces";
import { LANCER, LancerItemType } from "../config";
import { mm_wrap_item } from "../mm-util/helpers";
import { LancerItem } from "./lancer-item";
import { activate_general_controls, gentle_merge, resolve_dotpath } from "../helpers/commons";
import { HANDLER_openRefOnClick } from "../helpers/refs";

const lp = LANCER.log_prefix;

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class LancerItemSheet<T extends LancerItemType> extends ItemSheet {
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

    // Make refs clickable
    $(html).find(".ref.valid").on("click", HANDLER_openRefOnClick);

    // Enable general controls, so items can be deleted and such
    activate_general_controls(html.find(".gen-control"), () => this.getDataLazy(), (_) => this._commitCurrMM());

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Customized increment/decrement arrows. Same as in actor. TODO: Standardize??
    const mod_handler = (delta: number) => (ev: Event) => {
      if (!ev.currentTarget) return; // No target, let other handlers take care of it.
      const button = $(ev.currentTarget as HTMLElement);
      const input = button.siblings("input");
      const curr = Number.parseInt(input.prop("value"));
      if (!isNaN(curr)) {
        input.prop("value", curr + delta);
      }
      this.submit({});
    };

    // Behavior is identical, just +1 or -1 depending on button
    let decr = html.find('button[class*="mod-minus-button"]');
    decr.on("click", mod_handler(-1));
    let incr = html.find('button[class*="mod-plus-button"]');
    incr.on("click", mod_handler(+1));

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
    const baseArr = resolve_dotpath(this, "object.data.data." + itemString);
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
        // @ts-ignore ??? Some old array shenaniganry
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
  /*
  async _updateObject(event: any, formData: any) {
    console.log("DISABLED");
    return;
    formData = LancerItemSheet.arrayifyTags(formData, "data.tags");
    formData = LancerItemSheet.arrayifyTags(formData, "data.core_system.tags");
    formData = LancerItemSheet.arrayifyTags(formData, "data.traits");

    // Update the Lancer-data name to match the item name.
    formData["data.name"] = formData["name"];

    if (this.item.data.type === EntryType.NPC_FEATURE) {
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
        this.item.data.type === EntryType.NPC_FEATURE &&
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
        this.item.data.type !== EntryType.NPC_FEATURE ||
        (this.item.data.type === EntryType.NPC_FEATURE &&
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
  */

  // Helper function for making fields effectively target multiple attributes
  _propagateMMData(formData: any) {
    // Pushes relevant field data down from the "item" data block to the "mm.ent" data block
    // Returns true if any of these top level fields require updating (i.e. do we need to .update({img: ___, name: __, etc}))
    formData["mm.ent.Name"] = formData["item.name"];

    return this.item.img != formData["item.img"] || this.item.name != formData["item.name"];
  }

  /**
   * Implement the _updateObject method as required by the parent class spec
   * This defines how to update the subject of the form when the form is submitted
   * @private
   */
  async _updateObject(event: Event | JQuery.Event, formData: any): Promise<any> {
    // hmm
    console.log("UPDATE OBJECT CALLED");

    // Fetch data, modify, and writeback
    let ct = await this.getDataLazy();

    let need_top_update = this._propagateMMData(formData);
    gentle_merge(ct, formData);

    if (need_top_update) {
      await this.item.update(ct.item, undefined);
    }
    return ct.mm.ent.writeback();
  }

  /**
   * Prepare data for rendering the frame sheet
   * The prepared data object contains both the actor data as well as additional sheet options
   */
  //@ts-ignore Foundry-pc-types does not properly acknowledge that sheet `getData` functions can be/are asynchronous
  async getData(): Promise<LancerItemSheetData<T>> {
    const data = super.getData() as LancerItemSheetData<T>; // Not fully populated yet!

    // Load item, mm-wrapped
    data.mm = await mm_wrap_item(this.item as LancerItem<T>);
    console.log(`${lp} Item ctx: `, data);
    this._currData = data;
    return data;
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

  // Cached getdata
  private _currData: LancerItemSheetData<T> | null = null;
  async getDataLazy(): Promise<LancerItemSheetData<T>> {
    return this._currData ?? (await this.getData());
  }

  // Write back our currently cached _currData, then refresh this sheet
  // Useful for when we want to do non form-based alterations
  async _commitCurrMM(render: boolean = true) {
    await this._currData?.mm.ent.writeback();
    this._currData = null; // Reset
    if(render) {
      this.render();
    }
  }
}

