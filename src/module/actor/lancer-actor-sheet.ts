import { EntryType, RegRef } from "machine-mind";
import { LANCER, LancerActorType, LancerItemType } from "../config";
import { enable_dragging, enable_dropping, gentle_merge, HANDLER_onClickRef, is_ref, NativeDrop, recreate_ref_element_ref, resolve_native_drop, resolve_ref_element, safe_json_parse } from "../helpers/commons";
import { LancerActorSheetData, LancerItemSheetData, LancerMechSheetData, LancerStatMacroData } from "../interfaces";
import { FoundryReg, FoundryRegActorData, FoundryRegItemData } from "../mm-util/foundry-reg";
import { MMEntityContext, mm_wrap_actor, mm_wrap_item } from "../mm-util/helpers";
import { LancerActor } from "./lancer-actor";
const lp = LANCER.log_prefix;

/**
 * Extend the basic ActorSheet
 */
export class LancerActorSheet<T extends LancerActorType> extends ActorSheet {
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
  activateListeners(html: any) {
    super.activateListeners(html);

    // Make refs clickable to open the item
    $(html).find(".ref.valid").on("click", HANDLER_onClickRef);

    // Enable ref dragging
    this._activateRefDragging(html);

    // Enable native ref drag handlers
    this._activateNativeRefDrops(html);
  }

  // Enables dragging of ref items to slot
  _activateRefDragging(html: any) {
    // Allow every ".ref" to be dragged, with a payload of a JSON RegRef
    enable_dragging(html.find(".ref"), drag_src => {
      // Drag a JSON ref
      let ref = recreate_ref_element_ref(drag_src[0]);
      console.log("Dragging ref:", ref);
      return JSON.stringify(ref);
    });

    // Allow every ".refdrop" to have RegRefs dropped on it. Must be dragged from a .ref, and must match type
    enable_dropping(
      html.find(".refdrop"),
      async (ref_json, dest, evt) => {
        evt.stopPropagation();
        let recon_ref: RegRef<any> = JSON.parse(ref_json);

        // Resolve!
        let path = dest[0].dataset.path!;

        // Spawn an event to write and save
        let data = await this.getDataLazy();
        let ctx = data.mm.ctx; // Re-use ctx, for efficiency's sake
        let resolved = await new FoundryReg().resolve(ctx, recon_ref);

        // Set and save. Use gentle merge for data path resolution
        gentle_merge(data, { [path]: resolved });
        await data.mm.ent.writeback();
      },
      (data, dest) => {
        // Parse our drag data as a ref
        let recon_ref = safe_json_parse(data);
        if(is_ref(recon_ref)) {
          let dest_type = dest[0].dataset.type;
          return recon_ref.type == dest[0].dataset.type; // Simply confirm same type. 
        }
        return false;
      }
    );
  }

  // Enables functionality for converting native foundry drags to be handled by ref drop slots
  // This is primarily useful for dropping actors onto sheets
  _activateNativeRefDrops(html: any) {
    enable_dropping(
      html.find(".native-refdrop"),
      async (drop_json, dest, evt) => {
        evt.stopPropagation();
        // We resolve it as a real item
        let resolved = await resolve_native_drop(drop_json);

        // If it doesn't exist, well, darn
        if(!resolved) {
          return;
        }

        // From here, depends slightly on tye
        let item: MMEntityContext<EntryType>;
        if(resolved.type == "Actor") {
          item = await mm_wrap_actor(resolved.actor);
        } else if(resolved.type == "Item") {
          item = await mm_wrap_item(resolved.item);
        } else {
          return;
        }

        // Now, as far as whether it should really have any effect, that depends on the type
        if(item.ent.Type == dest[0].dataset.type) {
          // We're golden. Make the assignment
          let path = dest[0].dataset.path!;
          let data = await this.getDataLazy();
          gentle_merge(data, { [path]: item.ent });
          await data.mm.ent.writeback();
        }
      },
      (data, dest) => {
        // We have no idea if we should truly be able to drop here,
        // as doing so tends to require type resolution (an async op that we can't really afford to do here). 
        // But, so long as we have an ID and type, we should be able to resolve
        let pdata = safe_json_parse(data) as NativeDrop;
        if(pdata?.id !== undefined && pdata?.type !== undefined) {
          return true;
        }
        return false;

      }
    );
  }

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
        return null;
      }
    } catch (err) {
      // Fall back on super if the data is not present or is not parsable.
      await super._onDrop(event);
      return null;
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

    const actor = this.actor as LancerActor<any>;

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
    const actor = this.actor as LancerActor<any>;
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

  _propagateMMData(formData: any): boolean {
    // Pushes relevant field data down from the "actor" data block to the "mm.ent" data block
    // Also meant to encapsulate all of the behavior of _updateTokenImage
    // Returns true if any of these top level fields require updating (i.e. do we need to .update({img: ___, token: __, etc}))
    let token: any = this.actor.data["token"];
    let needs_update = false;

    // Set the prototype token image if the prototype token isn't initialized
    if (!token) {
      formData["actor.token.img"] = formData["actor.img"];
      needs_update = true;
    }

    // Update token image if it matches the old actor image
    else if (this.actor.data.img === token["img"] && this.actor.img !== formData["actor.img"]) {
      formData["actor.token.img"] = formData["actor.img"];
      needs_update = true;
    } // Otherwise don't update image

    // Need to update if name changed
    if (this.actor.name != formData["actor.name"]) {
      needs_update = true;
    }

    // Do push down name changes
    formData["mm.ent.Name"] = formData["actor.name"];
    return needs_update;
  }

  /**
   * Implement the _updateObject method as required by the parent class spec
   * This defines how to update the subject of the form when the form is submitted
   * @private
   */
  async _updateObject(event: Event | JQuery.Event, formData: any, postpone_writeback: boolean = false): Promise<any> {
    // Fetch the curr data
    let ct = await this.getDataLazy();

    // Automatically propagate fields that should be set to multiple places
    let should_top_update = this._propagateMMData(formData);

    // Locally update our working data
    gentle_merge(ct, formData);

    // Update top level. Handles name + token changes, etc
    if (should_top_update) {
      await this.actor.update(ct.actor);
    }

    // And then do a mm level writeback, always
    if(!postpone_writeback) {
      await ct.mm.ent.writeback();
    }

    // Return form data with any modifications
    return formData;
  }

  /**
   * Prepare data for rendering the Actor sheet
   * The prepared data object contains both the actor data as well as additional sheet options
   */
  //@ts-ignore
  async getData(): Promise<LancerActorSheetData<T>> {
    const data = (await super.getData()) as LancerActorSheetData<T>; // Not fully populated yet!

    // Load mech meta stuff
    data.mm = await mm_wrap_actor(this.actor as LancerActor<T>);
    console.log(`${lp} Actor ctx: `, data.mm);
    this._currData = data;
    return data;
  }

  // Cached getdata
  private _currData: LancerActorSheetData<T> | null = null;
  async getDataLazy(): Promise<LancerActorSheetData<T>> {
    return this._currData ?? (await this.getData());
  }
}
