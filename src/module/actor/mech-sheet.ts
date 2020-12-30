import { LANCER } from "../config";
import { LancerActorSheet } from "./lancer-actor-sheet";
import { EntryType, funcs, OpCtx, RegRef } from "machine-mind";
import { LancerItem } from "../item/lancer-item";
import { MMEntityContext, mm_wrap_actor, mm_wrap_item } from "../mm-util/helpers";

/**
 * Extend the basic ActorSheet
 */
export class LancerMechSheet extends LancerActorSheet<EntryType.MECH> {
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


    // Overcharge
    html.find("#overcharge-button").on("click", (ev: JQuery.ClickEvent) => {
      this._onClickOvercharge(ev);
    });


  }
  /* -------------------------------------------- */

  // Baseline drop behavior. Let people add stuff to the mech
  async _onDrop(event: any): Promise<any> {
    console.log("Old on drop");
    let item: LancerItem<any> | null = await super._onDrop(event);
    if (!item) {
      return null; // Bail. Wouldn't want any children to deal with this either.
    }

    const sheet_data = await this.getDataLazy();
    const this_mm = sheet_data.mm;

    // Behaviour differs based on if we get this as a machine-mind item or not
    if (LANCER.mm_compat_item_types.includes(item.type)) {
      // Check if we can even do anything with it first
      if (!LANCER.mech_items.includes(item.type)) {
        ui.notifications.error(`Cannot add Item of type "${item.type}" to a Mech.`);
        return null;
      }

      // Make the context for the item
      const item_mm: MMEntityContext<EntryType> = await mm_wrap_item(item);

      // Always add the item to the mech, now that we know it is a valid mech posession
      // Make a new ctx to hold the item and a post-item-add copy of our mech
      let new_ctx = new OpCtx();
      let new_live_item = await item_mm.ent.insinuate(this_mm.reg, new_ctx);

      // Update this, to re-populate arrays etc to reflect new item
      let new_live_this = (await this_mm.ent.refreshed(new_ctx))!;

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
      // Most other things (weapon mods) aren't directly equipped to the mech and should be handled in their own sheet / their own subcomponents. We've already taken posession, and do nothing more

      // Writeback when done. Even if nothing explicitly changed, probably good to trigger a redraw (unless this is double-tapping? idk)
      await new_live_this.writeback();
    } else {
      console.error("We don't yet handle non MM items. MaybeTODO???");
    }

    // Always return the item if we haven't failed for some reason
    return item;
  }  
  
  /**
   * Handles the overcharge button being clicked
   */
  async _onClickOvercharge(event: JQuery.ClickEvent) {
    let data = await this.getDataLazy();
    let old = data.mm.ent.CurrentOvercharge;

    // TODO: Actually do overcharge heat rolls
    console.log("Overcharge", old+1);
    data.mm.ent.CurrentOvercharge = old + 1;
    await data.mm.ent.writeback();
    this.render();
  }
}
