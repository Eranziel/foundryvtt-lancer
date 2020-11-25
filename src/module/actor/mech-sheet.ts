import { LancerMechActorData, LancerMechSheetData } from "../interfaces";
import { LANCER } from "../config";
import { LancerActorSheet } from "./lancer-actor-sheet";
import { FoundryReg } from "../mm-util/foundry-reg";
import { EntryType, OpCtx } from "machine-mind";
import { LancerActor } from "./lancer-actor";
import { LancerItem } from "../item/lancer-item";
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
    const base_data = super.getData();

    // Spool up state
    let reg = new FoundryReg();
    let ctx = new OpCtx();

    // Load pilot
    let mech = await reg.get_cat(EntryType.MECH).get_live(ctx, this.actor._id);
    console.log("Got mech");
    console.log(mech);
    if(!mech) {
      throw new Error("Registry failure");
    }
    const data: LancerMechSheetData = {
      ...base_data,
      ctx,
      reg,
      data: mech
    }
    console.log(`${lp} Mech data: `, data);
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
  async _onDrop(event: any): Promise<boolean> {
    let item: LancerItem<any> | null = await super._onDrop(event);

    //TODO Make this better
    console.log(this);
    const sheet_data = await this.getDataLazy();

    if (item) {
      if(LANCER.mech_items.includes(item.type as EntryType)){
        // Insinuate it hither
        // let weapon = await this.actor.createOwnedItem(duplicate(item.data));

        // Swap mech frame
        if (item.type === EntryType.FRAME) {
          // Remove old frame(s)
          /*
          for (let item of actor.items) {
            const i = (item as unknown) as LancerItem;
            if (i.type === EntryType.FRAME) {
              console.log(`${lp} Removing ${actor.name}'s old ${i.name} frame.`);
              await this.actor.deleteOwnedItem(i._id);
            }
          }
          */

        }
        // Handling mech-weapon -> mount mapping
        else if (item.type === EntryType.MECH_WEAPON) {
        }

        // TODO: handle all sorts of mech items
      }  else {
        ui.notifications.error(`Cannot add Item of type "${item.type}" to a Mech.`);
        return Promise.resolve(false);
      }
    }

    // Finally, fall back to super's behaviour if nothing else "handles" the drop (signalled by returning).
    // Don't hate the player, hate the imperative paradigm
    console.log(`${lp} Falling back on super._onDrop`);
    return super._onDrop(event);
  }

}