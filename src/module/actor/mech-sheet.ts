import { LancerMechActorData, LancerMechSheetData } from "../interfaces";
import { LANCER } from "../config";
import { LancerActorSheet } from "./lancer-actor-sheet";
import { FoundryReg } from "../mm-util/foundry-reg";
import { EntryType, OpCtx, quick_mm_ref } from "machine-mind";
import { LancerActor, LancerMech } from "./lancer-actor";
import { LancerItem } from "../item/lancer-item";
import { MMEntityContext, mm_wrap_actor, mm_wrap_item } from "../mm-util/helpers";
const lp = LANCER.log_prefix;

/**
 * Extend the basic ActorSheet
 */
export class LancerMechSheet extends LancerActorSheet {
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
      classes: ["lancer", "sheet", "actor", "npc"],
      template: "systems/lancer/templates/actor/mech.html",
      width: 800,
      height: 800,
    });
  }

  /* -------------------------------------------- */

  /**
   * @override
   * Activate event listeners using the prepared sheet HTML
   * @param html {HTMLElement}   The prepared HTML object ready to be rendered into the DOM
   */
  activateListeners(html: any) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Add or Remove options
    // Yes, theoretically this could be abstracted out to one function. You do it then.
  }

  /* -------------------------------------------- */

  /**
   * Prepare data for rendering the Actor sheet
   * The prepared data object contains both the actor data as well as additional sheet options
   */
  //@ts-ignore
  async getData(): Promise<LancerMechSheetData> {
    const data = super.getData() as LancerMechSheetData; // Not fully populated yet!

    // Load pilot
    data.mm = await mm_wrap_actor(this.actor as LancerMech);
    console.log(`${lp} Mech ctx: `, data.mm);
    this._currData = data;
    return data;
  }

  private _currData: LancerMechSheetData | null = null;
  private async getDataLazy(): Promise<LancerMechSheetData> {
    return this._currData ?? (await this.getData());
  }



  /**
   * Implement the _updateObject method as required by the parent class spec
   * This defines how to update the subject of the form when the form is submitted
   * @private
   */
  _updateObject(event: Event | JQuery.Event, formData: any): Promise<any> {
    // Copy the new name to the prototype token.
    formData["token.name"] = formData["name"];

    formData = this._updateTokenImage(formData);

    // Update the Actor
    return this.object.update(formData);
  }


  // Let people add stuff to the mech
  async _onDrop(event: any): Promise<any> {
    let item: LancerItem<any> | null = await super._onDrop(event);
    if(!item) {
      return null; // Bail. Wouldn't want any children to deal with this either.
    }

    const sheet_data = await this.getDataLazy();
    const this_mm = sheet_data.mm

    // Behaviour differs based on if we get this as a machine-mind item or not
    if (LANCER.mm_compat_item_types.includes(item.type)) {
      // Check if we can even do anything with it first
      if(!LANCER.mech_items.includes(item.type)) {
        ui.notifications.error(`Cannot add Item of type "${item.type}" to a Mech.`);
        return Promise.resolve(false);
      }

      // Make the context for the item
      const item_mm: MMEntityContext<EntryType> = await mm_wrap_item(item);

      // Always (?) add the item to the mech. (counterpoint - should we check for duplicates first??). 
      // Make a new ctx to hold the item and a post-item-add copy of our mech
      let new_ctx = new OpCtx();
      let new_live_item = await item_mm.live_item.insinuate(this_mm.reg, new_ctx);
      let new_live_this = (await this_mm.live_item.refreshed(new_ctx))!;

      // Now, do sensible things with it
      if (new_live_item.Type === EntryType.FRAME) {
        // If frame, auto swap with prior frame
        new_live_this.Loadout.Frame = new_live_item;
      } else if (new_live_item.Type === EntryType.MECH_WEAPON) {
        // If frame, weapon, put it in an available slot
        new_live_this.Loadout.equip_weapon(new_live_item);
      } else if (new_live_item.Type === EntryType.MECH_SYSTEM) {
        new_live_this.Loadout.equip_system(new_live_item);
      }
      // Most other things (frame traits, core systems, weapon mods) aren't directly equipped to the mech and should be handled in their own sheet / their own subcomponents

      // Writeback when done. Even if nothing explicitly changed, probably good to trigger a redraw (unless this is double-tapping? idk)
      await new_live_this.writeback();

      // TODO: handle all sorts of mech items
    } else {
      console.error("We don't yet handle non MM items. MaybeTODO???");
    }

    // Always return the item if we haven't failed for some reason
    return item;
  }

}