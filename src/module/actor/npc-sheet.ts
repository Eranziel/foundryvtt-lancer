import { LancerNPCSheetData, LancerNPCClassStatsData, LancerNPCData } from '../interfaces';
import { LancerItem, LancerNPCClass, LancerNPCTemplate, LancerNPCFeature } from '../item/lancer-item';
import { MechType, NPCTier } from '../enums';
import { LancerActor } from './lancer-actor';

const entryPrompt = "//:AWAIT_ENTRY>";

/**
 * Extend the basic ActorSheet
 */
export class LancerNPCSheet extends ActorSheet {
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
   * Extend and override the default options used by the NPC Sheet
   * @returns {Object}
   */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["lancer", "sheet", "actor"],
      template: "systems/lancer/templates/actor/npc.html",
      width: 600,
      height: 600,
      tabs: [{
        navSelector: ".lancer-tabs",
        contentSelector: ".sheet-body",
        initial: "mech"
      }]
    });
  }

  /* -------------------------------------------- */

  /**
   * Prepare data for rendering the Actor sheet
   * The prepared data object contains both the actor data as well as additional sheet options
   */
  getData() :LancerNPCSheetData {
    const data: LancerNPCSheetData = super.getData() as LancerNPCSheetData;

    this._prepareItems(data);

    // Populate name if blank (new Actor)
    if (data.data.name === "") {
      data.data.name = data.actor.name;
    }



    console.log("LANCER | NPC data: ");
    console.log(data);
    return data;
  }


  _prepareItems(data: LancerNPCSheetData) {

    // Mirror items into filtered list properties
    const accumulator = {};
    for (let item of data.items) {
      if (accumulator[item.type] === undefined)
        accumulator[item.type] = [];
      accumulator[item.type].push(item);
    }
    data.npc_templates = accumulator['npc_template'] || [];
    data.npc_features = accumulator['npc_feature'] || [];
    if (accumulator['npc_class']) data.npc_class = accumulator['npc_class'][0];
    else data.npc_class = undefined;
    //TODO Templates, Classes and Features
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
        if (item.classList.contains("inventory-header")) return;
        item.setAttribute("draggable", true);
        // TODO: I think handler needs to be item.*something*._onDragStart(ev).
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
    }
  }

  async _onDrop(event) {
    event.preventDefault();
    // Get dropped data
    let data;
    try {
      data = JSON.parse(event.dataTransfer.getData('text/plain'));
      if (data.type !== "Item") return;
    } catch (err) {
      return false;
    }
    console.log(event);

    let item: Item;
    const actor = this.actor as LancerActor;
    // NOTE: these cases are copied almost verbatim from ActorSheet._onDrop
    // Case 1 - Item is from a Compendium pack
    if (data.pack) {
      item = (await game.packs.get(data.pack).getEntity(data.id)) as Item;
    }
    // Case 2 - Item is a World entity
    else if (!data.data) {
      item = game.items.get(data.id);
      if (!item) return;
    }

    if (actor.owner) {
      // Swap mech class
      if (item && item.type === "npc_class") {
        let newNPCClassStats: LancerNPCClassStatsData;
        let oldNPCClassStats: LancerNPCClassStatsData;
        // Remove old class
        actor.items.forEach(async (i: LancerItem) => {
          if (i.type === "npc_class") {
            oldNPCClassStats = duplicate((i as LancerNPCClass).data.data.stats);
            await this.actor.deleteOwnedItem(i._id);
          }
        });
        // Add the new class from Compendium pack
        if (data.pack) {
          const npcClass = await actor.importItemFromCollection(data.pack, data.id) as any;
          console.log(npcClass);
          newNPCClassStats = npcClass.data.stats;
        }
        // Add the new Class from a World entity
        else {
          await actor.createEmbeddedEntity("OwnedItem", duplicate(item.data));
          newNPCClassStats = (actor.items.find((i: Item) => i.type === "npc_class") as any).data.stats;
        }
        if (newNPCClassStats) {
          actor.swapNPCClass(newNPCClassStats, oldNPCClassStats);
        }
      }
      //TODO add basic features to NPC
      //TODO remove basic feature from NPC on Class swap
      //TODO implement similar logi for Templates

      return super._onDrop(event);
    }
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
    console.log(formData);
    // Use the Actor's name for the pilot's callsign
    formData.name = formData["data.npc.name"];

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
