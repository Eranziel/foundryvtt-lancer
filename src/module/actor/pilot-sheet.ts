import { LancerPilotSheetData, LancerNPCSheetData } from '../interfaces';

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

  /* -------------------------------------------- */

  /**
   * Prepare data for rendering the Actor sheet
   * The prepared data object contains both the actor data as well as additional sheet options
   */
  getData(): LancerPilotSheetData {
    let data: LancerPilotSheetData = super.getData() as LancerPilotSheetData;

    this._prepareItems(data);
    // data.dtypes = ["String", "Number", "Boolean"];
  //   for ( let attr of Object.values(data.data.attributes) ) {
  //     attr.isCheckbox = attr.dtype === "Boolean";
  //   }

    // Put placeholder prompts in empty fields
    if (data.data.pilot.background == "") data.data.pilot.background = entryPrompt;
    if (data.data.pilot.history == "")    data.data.pilot.history = entryPrompt;
    if (data.data.pilot.notes == "")      data.data.pilot.notes = entryPrompt;
    
    console.log("LANCER | Pilot sheet data: ");
    console.log(data);
    return data;
  }

  /* -------------------------------------------- */

  /**
   * Organize and classify Owned Items for Character sheets
   * @private
   */
  _prepareItems(data: LancerPilotSheetData) {
    data.skills = [];
    data.talents = [];
    data.core_bonuses = [];

    data.items.forEach(item => {
      if (item.type === "skill") {
        data.skills.push(item);
      }
      else if (item.type === "talent") {
        data.talents.push(item);
      }
      else if (item.type === "core_bonus") {
        data.core_bonuses.push(item);
      }
    });
    console.log("LANCER | Sheet skills:");
    console.log(data.skills);
    // EXAMPLE - from D&D5E
    //---------------------------------------------------------------------------
    // // Categorize items as inventory, spellbook, features, and classes
    // const inventory = {
    //   skills: { label: "Skill Triggers", items: [], dataset: {type: "skill"} },
    //   talents: { label: "Talents", items: [], dataset: {type: "talent"} },
    //   core_bonuses: { label: "Core Bonuses", items: [], dataset: {type: "core_bonus"} },
    //   licenses: { label: "Licenses", items: [], dataset: {type: "license"} },
    //   pilot_armor: { label: "Armor", items: [], dataset: {type: "pilot_armor"} },
    //   pilot_weapon: { label: "Weapons", items: [], dataset: {type: "pilot_weapon"} },
    //   pilot_gear: { label: "Gear", items: [], dataset: {type: "pilot_gear"} }
    // };

    // // Partition items by category
    // let [items, spells, feats, classes] = data.items.reduce((arr, item) => {

    //   // Item details
    //   item.img = item.img || DEFAULT_TOKEN;
    //   item.isStack = item.data.quantity ? item.data.quantity > 1 : false;

    //   // Item usage
    //   item.hasUses = item.data.uses && (item.data.uses.max > 0);
    //   item.isOnCooldown = item.data.recharge && !!item.data.recharge.value && (item.data.recharge.charged === false);
    //   item.isDepleted = item.isOnCooldown && (item.data.uses.per && (item.data.uses.value > 0));
    //   item.hasTarget = !!item.data.target && !(["none",""].includes(item.data.target.type));

    //   // Item toggle state
    //   this._prepareItemToggleState(item);

    //   // Classify items into types
    //   if ( item.type === "spell" ) arr[1].push(item);
    //   else if ( item.type === "feat" ) arr[2].push(item);
    //   else if ( item.type === "class" ) arr[3].push(item);
    //   else if ( Object.keys(inventory).includes(item.type ) ) arr[0].push(item);
    //   return arr;
    // }, [[], [], [], []]);

    // // Apply active item filters
    // items = this._filterItems(items, this._filters.inventory);
    // spells = this._filterItems(spells, this._filters.spellbook);
    // feats = this._filterItems(feats, this._filters.features);

    // // Organize Spellbook and count the number of prepared spells (excluding always, at will, etc...)
    // const spellbook = this._prepareSpellbook(data, spells);
    // const nPrepared = spells.filter(s => {
    //   return (s.data.level > 0) && (s.data.preparation.mode === "prepared") && s.data.preparation.prepared;
    // }).length;

    // // Organize Inventory
    // let totalWeight = 0;
    // for ( let i of items ) {
    //   i.data.quantity = i.data.quantity || 0;
    //   i.data.weight = i.data.weight || 0;
    //   i.totalWeight = Math.round(i.data.quantity * i.data.weight * 10) / 10;
    //   inventory[i.type].items.push(i);
    //   totalWeight += i.totalWeight;
    // }
    // data.data.attributes.encumbrance = this._computeEncumbrance(totalWeight, data);

    // // Organize Features
    // const features = {
    //   classes: { label: "DND5E.ItemTypeClassPl", items: [], hasActions: false, dataset: {type: "class"}, isClass: true },
    //   active: { label: "DND5E.FeatureActive", items: [], hasActions: true, dataset: {type: "feat", "activation.type": "action"} },
    //   passive: { label: "DND5E.FeaturePassive", items: [], hasActions: false, dataset: {type: "feat"} }
    // };
    // for ( let f of feats ) {
    //   if ( f.data.activation.type ) features.active.items.push(f);
    //   else features.passive.items.push(f);
    // }
    // classes.sort((a, b) => b.levels - a.levels);
    // features.classes.items = classes;

    // // Assign and return
    // data.inventory = Object.values(inventory);
    // data.spellbook = spellbook;
    // data.preparedSpells = nPrepared;
    // data.features = Object.values(features);
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

    // Update Inventory Item
    // html.find('.item-edit').click(ev => {
    //   const li = $(ev.currentTarget).parents(".item");
    //   const item = this.actor.getOwnedItem(li.data("itemId"));
    //   item.sheet.render(true);
    // });

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
  