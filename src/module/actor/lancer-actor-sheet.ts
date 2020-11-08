import { LANCER } from "../config";
import { LancerStatMacroData } from "../interfaces";
import { LancerActor } from "./lancer-actor";
const lp = LANCER.log_prefix;

/**
 * Extend the basic ActorSheet
 */
export class LancerActorSheet extends ActorSheet {
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
  // static get defaultOptions() {
  //   return mergeObject(super.defaultOptions, {
  //     classes: ["lancer", "sheet", "actor", "npc"],
  //     template: "systems/lancer/templates/actor/deployable.html",
  //     width: 800,
  //     height: 800,
  //   });
  // }
  /* -------------------------------------------- */
  /**
   * @override
   * Activate event listeners using the prepared sheet HTML
   * @param html {HTMLElement}   The prepared HTML object ready to be rendered into the DOM
   */
  // activateListeners(html: any) {
  //   super.activateListeners(html);
  //
  //   // Everything below here is only needed if the sheet is editable
  //   if (!this.options.editable) return;
  //
  //   // Add or Remove options
  //   // Yes, theoretically this could be abstracted out to one function. You do it then.
  // }
  /* -------------------------------------------- */
  /**
   * Prepare data for rendering the Actor sheet
   * The prepared data object contains both the actor data as well as additional sheet options
   */
  // getData(): LancerDeployableSheetData {
  //   const data: LancerDeployableSheetData = super.getData() as LancerDeployableSheetData;
  //
  //   // Populate name if blank (new Actor)
  //   if (data.data.name === "") {
  //     data.data.name = data.actor.name;
  //   }
  //
  //   console.log(`${lp} Deployable data: `, data);
  //   return data;
  // }
  /**
   * Implement the _updateObject method as required by the parent class spec
   * This defines how to update the subject of the form when the form is submitted
   * @private
   */
  // _updateObject(event: Event | JQuery.Event, formData: any): Promise<any> {
  //   // Copy the new name to the prototype token.
  //   formData["token.name"] = formData["name"];
  //
  //   let token: any = this.actor.data["token"];
  //   // Set the prototype token image if the prototype token isn't initialized
  //   if (!token) {
  //     formData["token.img"] = formData["img"];
  //   }
  //   // Update token image if it matches the old actor image
  //   else if (this.actor.data.img === token["img"] && this.actor.img !== formData["img"]) {
  //     formData["token.img"] = formData["img"];
  //   }
  //
  //   // Update the Actor
  //   return this.object.update(formData);
  // }

  getStatPath(event: any): string | null {
    if (!event.currentTarget) return null;
    // Find the stat input to get the stat's key to pass to the macro function
    let el = $(event.currentTarget)
      .closest(".stat-container")
      .find(".lancer-stat")[0] as HTMLElement;

    if (el.nodeName === "INPUT") {
      return (<HTMLInputElement>el).name;
    } else if (el.nodeName === "DATA") {
      return (<HTMLDataElement>el).id;
    } else {
      throw "Error - stat macro was not run on an input or data element";
    }
  }

  /**
   * Activate event listeners for trigger macros using the prepared sheet HTML
   * @param html {JQuery}   The prepared HTML object ready to be rendered into the DOM
   */
  activateTriggerListeners(html: JQuery) {
    // Trigger rollers
    let triggerMacro = html.find(".roll-trigger");
    triggerMacro.on("click", (ev: Event) => {
      if (!ev.currentTarget) return; // No target, let other handlers take care of it.
      ev.stopPropagation(); // Avoids triggering parent event handlers

      let mData: LancerStatMacroData = {
        title: $(ev.currentTarget).closest(".skill-compact").find(".modifier-name").text(),
        bonus: parseInt($(ev.currentTarget).find(".roll-modifier").text()),
      };

      console.log(`${lp} Rolling '${mData.title}' trigger (d20 + ${mData.bonus})`);
      game.lancer.rollStatMacro(this.actor, mData);
    });
  }

  /**
   * Activate event listeners for editing owned items using the prepared sheet HTML
   * @param html {JQuery}   The prepared HTML object ready to be rendered into the DOM
   */
  activateOpenItemListeners(html: JQuery) {
    let items = html.find(".item");
    items.on("click", (ev: Event) => {
      if (!ev.currentTarget) return; // No target, let other handlers take care of it.
      const li = $(ev.currentTarget);
      const item = this.actor.getOwnedItem(li.data("itemId"));
      if (item) {
        item.sheet.render(true);
      }
    });
  }

  /**
   * Converts the data from a DragEvent event into an Item to add to the Actor.
   * If the data does not exist or is not an Item, fall back on super._onDrop.
   * This method does not modify the actor. Sub-classes must override _onDrop to
   * call super._onDrop and handle the resulting Item.
   * @param event {any}  The DragEvent.
   * @return The Item or null. Sub-classes must handle adding the Item to the Actor,
   *   and any other associated work.
   */
  async _onDrop(event: any): Promise<any> {
    event.preventDefault();
    console.log(event);
    // Get dropped data
    let data: any;
    let item: Item | null = null;
    try {
      data = JSON.parse(event.dataTransfer.getData("text/plain"));
      if (data.type !== "Item") {
        // Fall back on super if the data is not present or is not parsable.
        await super._onDrop(event);
        return Promise.resolve(null);
      }
    } catch (err) {
      // Fall back on super if the data is not present or is not parsable.
      await super._onDrop(event);
      return Promise.resolve(null);
    }

    // NOTE: these cases are copied almost verbatim from ActorSheet._onDrop
    // Case 1 - Item is from a Compendium pack
    if (data.pack) {
      item = (await game.packs.get(data.pack)!.getEntity(data.id)) as Item;
      console.log(`${lp} Item dropped from compendium: `, item);
    }
    // Case 2 - Item is a World entity
    else if (!data.data) {
      item = game.items.get(data.id);
      console.log(`${lp} Item dropped from world: `, item);
    }
    // If item isn't from a Compendium or World entity,
    // see if super can do something with it.
    if (!item) {
      await super._onDrop(event);
      return Promise.resolve(null);
    }

    const actor = this.actor as LancerActor;
    // Only return the Item if user is owner or GM.
    if (!actor.owner && !game.user.isGM) {
      ui.notifications.warn(
        `LANCER, you shouldn't try to modify ${actor.name}'s loadout. Access Denied.`
      );
      return Promise.resolve(null);
    }
    return Promise.resolve(item);
  }

  async _addOwnedItem(item: Item) {
    const actor = this.actor as LancerActor;
    console.log(`${lp} Copying ${item.name} to ${actor.name}.`);
    const dupData = duplicate(item.data);
    const newItem = await actor.createOwnedItem(dupData);
    // Make sure the new item includes all of the data from the original.
    (dupData as any)._id = newItem._id;
    await actor.updateOwnedItem(dupData);
    return Promise.resolve(true);
  }

  _updateTokenImage(formData: any) {
    let token: any = this.actor.data["token"];
    // Set the prototype token image if the prototype token isn't initialized
    if (!token) {
      formData["token.img"] = formData["img"];
    }
    // Update token image if it matches the old actor image
    else if (this.actor.data.img === token["img"] && this.actor.img !== formData["img"]) {
      formData["token.img"] = formData["img"];
    }
    return formData;
  }
}
