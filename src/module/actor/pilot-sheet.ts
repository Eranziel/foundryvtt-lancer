import { LancerPilot } from './lancer-actor'
import { LancerPilotSheetData, LancerSkillData } from '../interfaces';

const entryPrompt = "//:AWAIT_ENTRY>";

/**
 * Extend the basic ActorSheet
 */
export class LancerPilotSheet extends ActorSheet {
  _sheetTab: string;

  constructor(...args) {
    super(...args);

    /**
     * Keep track of the currently active sheet tab
     * @type {string}
     */
    this._sheetTab = "dossier";
  }

  /**
   * A convenience reference to the Actor entity
   */
  // get actor(): LancerPilot {
  //   return this.actor;
  // };

  /* -------------------------------------------- */

  /**
   * Extend and override the default options used by the Pilot Sheet
   * @returns {Object}
   */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["lancer", "sheet", "actor"],
      template: "systems/lancer/templates/actor/pilot.html",
      width: 600,
      height: 600
    });
  }

<<<<<<< HEAD
    getData() {
      const data: LancerPilotSheetData = super.getData() as LancerPilotSheetData;
      // data.dtypes = ["String", "Number", "Boolean"];
    //   for ( let attr of Object.values(data.data.attributes) ) {
    //     attr.isCheckbox = attr.dtype === "Boolean";
    //   }
      if (data.data.pilot.background == "") data.data.pilot.background = entryPrompt;
      if (data.data.pilot.history == "")    data.data.pilot.history = entryPrompt;
      if (data.data.pilot.notes == "")      data.data.pilot.notes = entryPrompt;
      console.log("LANCER | Pilot data: ");
      console.log(data);

      // Mirror items into filtered list properties
      const accumulator = {};
      for (let item of data.items) {
        if (accumulator[item.type] === undefined)
          accumulator[item.type] = [];
        accumulator[item.type].push(item);
      }

      // TODO: change types so that instead of arrays of duplicate item references
      //   (since actor.items has all the references already), the arrays store either
      //   simple IDs or ID:name pairs.
      data.data.pilot.skills = accumulator['skill'] || [];
      data.data.pilot.talents = accumulator['talent'] || [];
      data.data.pilot.licenses = accumulator['license'] || [];
      data.data.pilot.core_bonuses = accumulator['core_bonus'] || [];
      data.data.pilot.loadout.gear = accumulator['pilot_gear'] || [];
      data.data.mech_loadout.systems = accumulator['mech_system'] || [];

      return data;
    }
  
    /* -------------------------------------------- */
  
    /**
     * Activate event listeners using the prepared sheet HTML
     * @param html {HTML}   The prepared HTML object ready to be rendered into the DOM
     */
    activateListeners(html) {
      super.activateListeners(html);
  
      // Activate tabs
      let tabs = html.find('.tabs');
      let initial = this._sheetTab;
      new Tabs(tabs, {
        initial: initial,
        callback: clicked => this._sheetTab = clicked.data("tab")
      });
  
      // Everything below here is only needed if the sheet is editable
      if (!this.options.editable) return;

      if (this.actor.owner) {
        // Item Dragging
        let handler = ev => this._onDragStart(ev);
        html.find('span[class*="item"]').each((i, item) => {
          if ( item.classList.contains("inventory-header") ) return;
          item.setAttribute("draggable", true);
          item.addEventListener("dragstart", handler, false);
        });
      }
  
      // Update Inventory Item
      let items = html.find('.item');
      items.click(ev => {
        console.log(ev)
        const li = $(ev.currentTarget);
        const item = this.actor.getOwnedItem(li.data("itemId"));
        if (item) {
          item.sheet.render(true);
        }
      });
      items.contextmenu(ev => {
        console.log(ev)
        const li = $(ev.currentTarget);
        this.actor.deleteOwnedItem(li.data("itemId"));
        li.slideUp(200, () => this.render(false));
      })
  
    //   // Add or Remove Attribute
    //   html.find(".attributes").on("click", ".attribute-control", this._onClickAttributeControl.bind(this));
    }

  async _onDrop (event) {
    event.preventDefault();
    // Get dropped data
    let data;
    try {
      data = JSON.parse(event.dataTransfer.getData('text/plain'));
    } catch (err) {
      return false;
    }

    // Call parent on drop logic
    return super._onDrop(event);
  }
  
    /* -------------------------------------------- */
  
    // async _onClickAttributeControl(event) {
    //   event.preventDefault();
    //   const a = event.currentTarget;
    //   const action = a.dataset.action;
    //   const attrs = this.object.data.data.attributes;
    //   const form = this.form;
  
    //   // Add new attribute
    //   if ( action === "create" ) {
    //     const nk = Object.keys(attrs).length + 1;
    //     let newKey = document.createElement("div");
    //     newKey.innerHTML = `<input type="text" name="data.attributes.attr${nk}.key" value="attr${nk}"/>`;
    //     newKey = newKey.children[0];
    //     form.appendChild(newKey);
    //     await this._onSubmit(event);
    //   }
  
    //   // Remove existing attribute
    //   else if ( action === "delete" ) {
    //     const li = a.closest(".attribute");
    //     li.parentElement.removeChild(li);
    //     await this._onSubmit(event);
    //   }

  /**
   * Implement the _updateObject method as required by the parent class spec
   * This defines how to update the subject of the form when the form is submitted
   * @private
   */
  _updateObject(event: Event | JQuery.Event, formData: any): Promise<any> {
    let token: any = this.actor.token;
    // Set the prototype token image if the prototype token isn't initialized
    if (!this.actor.token) {
      this.actor.update({"token.img": formData.img})
    }
    // Update token image if it matches the old actor image
    else if ((this.actor.img == token.img) 
        && (this.actor.img != formData.img)) {
      this.actor.update({"token.img": formData.img});
    }

    // TODO: "attributes" aren't used anymore.
    // Handle the free-form attributes list
    // const formAttrs = formData.data.attributes || {};
    // const attributes = Object.values(formAttrs).reduce((obj, v) => {
    //   let k = v["key"].trim();
    //   if ( /[\s\.]/.test(k) )  return ui.notifications.error("Attribute keys may not contain spaces or periods");
    //   delete v["key"];
    //   obj[k] = v;
    //   return obj;
    // }, {});
    
    // // Remove attributes which are no longer used
    // for ( let k of Object.keys(this.object.data.data.attributes) ) {
    //   if ( !attributes.hasOwnProperty(k) ) attributes[`-=${k}`] = null;
    // }

    // // Re-combine formData
    // formData = Object.entries(formData).filter(e => !e[0].startsWith("data.attributes")).reduce((obj, e) => {
    //   obj[e[0]] = e[1];
    //   return obj;
    // }, {_id: this.object._id, "data.attributes": attributes});
    
    // Update the Actor
    return this.object.update(formData);
  }
}
  