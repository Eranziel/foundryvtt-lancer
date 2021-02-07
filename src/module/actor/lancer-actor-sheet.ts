import { LANCER } from "../config";
import { HANDLER_activate_general_controls,  gentle_merge, is_ref, resolve_dotpath, safe_json_parse, HANDLER_activate_popout_text_editor } from "../helpers/commons";
import { enable_native_dropping_mm_wrap, enable_simple_ref_dragging, enable_simple_ref_dropping, NativeDrop, ResolvedNativeDrop, resolve_native_drop } from "../helpers/dragdrop";
import { HANDLER_activate_ref_dragging, HANDLER_activate_ref_drop_clearing, HANDLER_activate_ref_drop_setting, HANDLER_openRefOnClick } from "../helpers/refs";
import { LancerActorSheetData, LancerStatMacroData } from "../interfaces";
import { LancerActor, LancerActorType } from "./lancer-actor";
const lp = LANCER.log_prefix;

/**
 * Extend the basic ActorSheet
 */
export class LancerActorSheet<T extends LancerActorType> extends ActorSheet {

  /* -------------------------------------------- */
  /**
   * @override
   * Activate event listeners using the prepared sheet HTML
   * @param html {HTMLElement}   The prepared HTML object ready to be rendered into the DOM
   */
  activateListeners(html: JQuery) {
    super.activateListeners(html);

    // Make refs clickable to open the item
    $(html).find(".ref.valid").on("click", HANDLER_openRefOnClick);

    // Enable ref dragging
    HANDLER_activate_ref_dragging(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Make +/- buttons work
    this._activatePlusMinusButtons(html);

    let getfunc = () => this.getDataLazy();
    let commitfunc = (_: any) => this._commitCurrMM();

    // Make refs droppable
    HANDLER_activate_ref_drop_setting(html, getfunc, commitfunc);
    HANDLER_activate_ref_drop_clearing(html, getfunc, commitfunc);

    // Enable native ref drag handlers
    this._activateNativeRefDropBoxes(html);

    // Enable general controls, so items can be deleted and such
    HANDLER_activate_general_controls(html, getfunc, commitfunc);

    // Enable popout editors
    HANDLER_activate_popout_text_editor(html, getfunc, commitfunc);
  }

  _activatePlusMinusButtons(html: any) {
    // Customized increment/decrement arrows. Same as in actor
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
  }

  // Enables functionality for converting native foundry drags to be handled by ref drop slots
  // This is primarily useful for dropping actors onto sheets
  _activateNativeRefDropBoxes(html: JQuery) {
    enable_native_dropping_mm_wrap(
      html.find(".native-refdrop"),
      async (item, dest, evt) => {
        // Now, as far as whether it should really have any effect, that depends on the type
        let path = dest[0].dataset.path!;
        console.log("Native drop box handling");
        if(path) {
          let data = await this.getDataLazy();
          gentle_merge(data, { [path]: item.ent });
          await this._commitCurrMM();
        }
      },
      [], // We only accept if data-type set
      (data, dest) => {
        // We have no idea if we should truly be able to drop here,
        // as doing so tends to require type resolution (an async op that we can't really afford to do here). 
        // But, so long as we have an ID and type, we should be able to resolve
        let pdata = safe_json_parse(data) as NativeDrop;
        console.log("Native drop hovering");
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
   * Converts the data from a DragEvent event into an Item (or actor/journal/whatever) to add to the Actor.
   * This method does not modify the actor. Sub-classes must override _onDrop to
   * call super._onDrop and handle the resulting resolved drop
   * @param event {any}  The DragEvent.
   * @return The Item or null. Sub-classes must handle adding the Item to the Actor,
   *   and any other associated work.
   */
  async _onDrop(event: any): Promise<ResolvedNativeDrop> {
    event.preventDefault();

    // Only proceed if user is owner or GM.
    if (!this.actor.owner && !game.user.isGM) {
      ui.notifications.warn(
        `LANCER, you shouldn't try to modify ${this.actor.name}'s loadout. Access Denied.`
      );
      return null;
    }

    // Resolve the drop and delegate to children
    let raw_drop_data = event.dataTransfer.getData("text/plain") ?? "";
    let native_drop = await resolve_native_drop(raw_drop_data);
    return native_drop;
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

  _propagateMMData(formData: any): boolean {
    // Pushes relevant field data down from the "actor" data block to the "mm.ent" data block
    // Also meant to encapsulate all of the behavior of _updateTokenImage
    // Returns true if any of these top level fields require updating (i.e. do we need to .update({img: ___, token: __, etc}))
    let token: any = this.actor.data["token"];
    let needs_update = false;

    // Set the prototype token image if the prototype token isn't initialized
    if (!token) {
      formData["token.img"] = formData["img"];
      formData["token.name"] = formData["name"];
      needs_update = true;
    }

    // Update token image if it matches the old actor image - keep in sync
    // Ditto for name
    else {
      if (this.actor.data.img === token["img"] && this.actor.img !== formData["img"]) {
        formData["token.img"] = formData["img"];
        needs_update = true;
      } // Otherwise don't update token
      if (this.actor.data.name === token["name"] && this.actor.name !== formData["name"]) {
        formData["token.name"] = formData["name"];
        needs_update = true;
      }
    }

    // Need to update if name changed
    if (this.actor.name != formData["name"]) {
      needs_update = true;
    }

    // Numeric selects are annoying
    if("npctier" in formData) {
      formData["mm.ent.Tier"] = Number.parseInt(formData["npctier"]) || 1;
    }

    // Do push down name changes
    formData["mm.ent.Name"] = formData["name"];
    return needs_update;
  }

  /**
   * Implement the _updateObject method as required by the parent class spec
   * This defines how to update the subject of the form when the form is submitted
   * @private
   */
  async _updateObject(event: Event | JQuery.Event, formData: any): Promise<any> {
    // Fetch the curr data
    let ct = await this.getDataLazy();

    // Automatically propagate fields that should be set to multiple places, and determine if we need to update anything besides mm ent
    let need_top_update = this._propagateMMData(formData);

    // Do a separate update depending on mm data
    if (need_top_update) {
      let top_update = {} as any;
      for(let key of Object.keys(formData)) {
        if(!key.includes("mm.ent")) {
          top_update[key] = formData[key];
        }
      }
      // await this.actor.update(top_update, {});
      await this.actor.update(top_update);
    } else {
      gentle_merge(ct, formData);
      await this._commitCurrMM();
    }
  }

  /**
   * Prepare data for rendering the Actor sheet
   * The prepared data object contains both the actor data as well as additional sheet options
   */
  // @ts-ignore Foundry-pc-types does not properly acknowledge that sheet `getData` functions can be/are asynchronous
  async getData(): Promise<LancerActorSheetData<T>> {
    const data = super.getData() as LancerActorSheetData<T>; // Not fully populated yet!

    // Drag up the mm context (when ready) to a top level entry in the sheet data
    data.mm = await (this.actor.data as LancerActor<T>["data"]).data.derived.mmec_promise;
    console.log(`${lp} Rendering with following actor ctx: `, data);
    this._currData = data;
    return data;
  }

  // Cached getdata
  protected _currData: LancerActorSheetData<T> | null = null;
  async getDataLazy(): Promise<LancerActorSheetData<T>> {
    return this._currData ?? (await this.getData());
  }

  // Write back our currently cached _currData, then refresh this sheet
  // Useful for when we want to do non form-based alterations
  async _commitCurrMM() {
    console.log("Committing ", this._currData);
    let cd = this._currData;
    this._currData = null;
    await cd?.mm.ent.writeback() ?? null;

    // Compendium entries don't re-draw appropriately
    if(this.actor.compendium) {
      this.render();
    }
  }
}