import { LancerPilotSheetData, LancerNPCSheetData } from '../interfaces';

const entryPrompt = "//:AWAIT_ENTRY>";

/**
 * Extend the basic ActorSheet
 */
export class LancerPilotSheet extends ActorSheet {
  _sheetTab: string;

  constructor(...args) {
    super(...args);
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
      height: 600,
      tabs: [{
        navSelector: ".tabs",
        contentSelector: ".sheet-body",
        initial: "dossier"}]
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

    // Put placeholder prompts in empty fields
    if (data.data.pilot.background == "") data.data.pilot.background = entryPrompt;
    if (data.data.pilot.history == "")    data.data.pilot.history = entryPrompt;
    if (data.data.pilot.notes == "")      data.data.pilot.notes = entryPrompt;

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
       data.data.pilot.loadout.weapons = accumulator['pilot_weapon'] || [];
       data.data.mech_loadout.systems = accumulator['mech_system'] || [];
       data.data.pilot.loadout.armor = accumulator['pilot_armor'] || [];

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
  }

  /* -------------------------------------------- */

  /**
   * Activate event listeners using the prepared sheet HTML
   * @param html {HTML}   The prepared HTML object ready to be rendered into the DOM
   */
  activateListeners(html) {
    super.activateListeners(html);

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

    // Delete Item on Right Click
    items.contextmenu(ev => {
      console.log(ev);
      const li = $(ev.currentTarget);
      this.actor.deleteOwnedItem(li.data("itemId"));
      li.slideUp(200, () => this.render(false));
    });

    // Delete Item when trash can is clicked
    items = html.find('.stats-control[data-action*="delete"]');
    items.click(ev => {
      ev.stopPropagation();  // Avoids triggering parent event handlers
      console.log(ev);
      const li = $(ev.currentTarget).closest('.item');
      this.actor.deleteOwnedItem(li.data("itemId"));
      li.slideUp(200, () => this.render(false));
    });
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

    // Update the Actor
    return this.object.update(formData);
  }
}
