import { LancerPilotSheetData, LancerNPCSheetData } from '../interfaces';

// TODO: should probably move to HTML/CSS
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
      width: 700,
      height: 800,
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

    // Mirror items into filtered list properties
    const accumulator = {};
    for (let item of data.items) {
      if (accumulator[item.type] === undefined)
        accumulator[item.type] = [];
      accumulator[item.type].push(item);
    }

    data.skills = accumulator['skill'] || [];
    data.talents = accumulator['talent'] || [];
    data.licenses = accumulator['license'] || [];
    data.core_bonuses = accumulator['core_bonus'] || [];
    data.pilot_loadout = {
      gear: accumulator['pilot_gear'] || [],
      weapons: accumulator['pilot_weapon'] || [],
      armor: accumulator['pilot_armor'] || []
    };
    data.mech_loadout = {
      weapons: accumulator['mech_weapon'] || [], // TODO: subdivide into mounts
      systems: accumulator['mech_system'] || []
    }
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
      html.find('li[class*="item"]').add('span[class*="item"]').each((i, item) => {
        if ( item.classList.contains("inventory-header") ) return;
        item.setAttribute("draggable", true);
        item.addEventListener("dragstart", handler, false);
      });

      // Update Inventory Item
      let items = html.find('.item');
      items.click(ev => {
        console.log(ev)
        const li = $(ev.currentTarget);
        //TODO: Check if in mount and update mount
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

      // Create Mounts
      let add_button = html.find('.add-button[data-action*="create"]');
      add_button.click(ev => {
        ev.stopPropagation();
        console.log(ev);
        let mount = {
          type: "main",
          weapons: []
        };

        let mounts = duplicate(this.actor.data.data.mech_loadout.mounts)
        mounts.push(mount);
        this.actor.update({"data.mech_loadout.mounts": mounts});
        this._onSubmit(ev);
      });

      // Update Mounts
      let mount_selector = html.find('select.mounts-control[data-action*="update"]');
      mount_selector.change(ev => {
        ev.stopPropagation();
        console.log(ev);
        let mounts = duplicate(this.actor.data.data.mech_loadout.mounts);
        mounts[parseInt($(ev.currentTarget).closest(".lancer-mount-container").data("itemId"))].type = $(ev.currentTarget).children("option:selected").val();
        console.log(mounts);
        this.actor.update({"data.mech_loadout.mounts": mounts});
        this._onSubmit(ev);
      });

      // Delete Mounts
      let mount_trash = html.find('a.mounts-control[data-action*="delete"]');
      mount_trash.click(ev => {
        ev.stopPropagation();
        console.log(ev);
        let mounts = duplicate(this.actor.data.data.mech_loadout.mounts);
        mounts.splice(parseInt($(ev.currentTarget).closest(".lancer-mount-container").data("itemId")), 1);
        this.actor.update({"data.mech_loadout.mounts": mounts});
        this._onSubmit(ev);
      });
    }
  }

  async _onDrop(event) {
    event.preventDefault();
    // Get dropped data
    let data;
    try {
      data = JSON.parse(event.dataTransfer.getData('text/plain'));
    } catch (err) {
      return false;
    }
    console.log(event);

    // Add to a mount or call parent on drop logic
    if (this.actor.owner) {
      let mount_element = $(event.target.closest(".lancer-mount-container"));
      console.log(mount_element);

      if (mount_element.length)  {
        let index = mount_element;
        let mounts = duplicate(this.actor.data.data.mech_loadout.mounts);
        mounts[parseInt(mount_element.data("itemId"))].weapons.push(data.data);
        console.log("Dropping Item Into Mount", mount_element);
        this.actor.update({"data.mech_loadout.mounts": mounts});
        this._onSubmit(event);
      }
      return super._onDrop(event);
    }
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
