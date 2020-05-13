import { LancerPCActor } from './classes/actor/lancer-actor.js'

/**
 * Extend the basic ActorSheet
 */
export class LancerPCSheet extends ActorSheet {
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
    // get actor(): LancerPCActor {
    //   return this.actor;
    // };

    /* -------------------------------------------- */
  
    /**
     * Extend and override the default options used by the 5e Actor Sheet
     * @returns {Object}
     */
    static get defaultOptions() {
      return mergeObject(super.defaultOptions, {
        classes: ["lancer", "sheet", "actor"],
        template: "systems/lancer/templates/actor-sheet.html",
        width: 600,
        height: 600
      });
    }
  
    /* -------------------------------------------- */
  
    /**
     * Prepare data for rendering the Actor sheet
     * The prepared data object contains both the actor data as well as additional sheet options
     */
    getData() {
      const data = super.getData();
    //   console.log(data)
      // data.dtypes = ["String", "Number", "Boolean"];
    //   for ( let attr of Object.values(data.data.attributes) ) {
    //     attr.isCheckbox = attr.dtype === "Boolean";
    //   }
      console.log(data)
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
  
    //   // Update Inventory Item
    //   html.find('.item-edit').click(ev => {
    //     const li = $(ev.currentTarget).parents(".item");
    //     const item = this.actor.getOwnedItem(li.data("itemId"));
    //     item.sheet.render(true);
    //   });
  
    //   // Delete Inventory Item
    //   html.find('.item-delete').click(ev => {
    //     const li = $(ev.currentTarget).parents(".item");
    //     this.actor.deleteOwnedItem(li.data("itemId"));
    //     li.slideUp(200, () => this.render(false));
    //   });
  
    //   // Add or Remove Attribute
    //   html.find(".attributes").on("click", ".attribute-control", this._onClickAttributeControl.bind(this));
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
    // }
  
    /* -------------------------------------------- */
  
    /**
     * Implement the _updateObject method as required by the parent class spec
     * This defines how to update the subject of the form when the form is submitted
     * @private
     */
    _updateObject(event, formData) {
      // TODO: This isn't used anymore.
  
      // Handle the free-form attributes list
      const formAttrs = formData.data.attributes || {};
      const attributes = Object.values(formAttrs).reduce((obj, v) => {
        let k = v["key"].trim();
        if ( /[\s\.]/.test(k) )  return ui.notifications.error("Attribute keys may not contain spaces or periods");
        delete v["key"];
        obj[k] = v;
        return obj;
      }, {});
      
      // Remove attributes which are no longer used
      for ( let k of Object.keys(this.object.data.data.attributes) ) {
        if ( !attributes.hasOwnProperty(k) ) attributes[`-=${k}`] = null;
      }
  
      // Re-combine formData
      formData = Object.entries(formData).filter(e => !e[0].startsWith("data.attributes")).reduce((obj, e) => {
        obj[e[0]] = e[1];
        return obj;
      }, {_id: this.object._id, "data.attributes": attributes});
      
      // Update the Actor
      return this.object.update(formData);
    }
  }
  