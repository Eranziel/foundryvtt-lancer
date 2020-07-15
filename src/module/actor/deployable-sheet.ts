import { LancerDeployableSheetData } from '../interfaces';
import { LancerItem } from '../item/lancer-item';
import { LancerActor } from './lancer-actor';

const entryPrompt = "//:AWAIT_ENTRY>";

/**
 * Extend the basic ActorSheet
 */
export class LancerDeployableSheet extends ActorSheet {
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
      classes: ["lancer", "sheet", "actor", "npc"],
      template: "systems/lancer/templates/actor/deployable.html",
      width: 800,
      height: 800
    });
  }

  /* -------------------------------------------- */


  /**
   * @override
   * Activate event listeners using the prepared sheet HTML
   * @param html {HTML}   The prepared HTML object ready to be rendered into the DOM
   */
  activateListeners(html) {
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
  getData(): LancerDeployableSheetData {
    const data: LancerDeployableSheetData = super.getData() as LancerDeployableSheetData;


    // Populate name if blank (new Actor)
    if (data.data.name === "") {
      data.data.name = data.actor.name;
    }

    console.log("LANCER | Deployable data: ");
    console.log(data);
    return data;
  }

  /**
   * Implement the _updateObject method as required by the parent class spec
   * This defines how to update the subject of the form when the form is submitted
   * @private
   */
  _updateObject(event: Event | JQuery.Event, formData: any): Promise<any> {
    console.log(formData);

    let token: any = this.actor.token;
    // Set the prototype token image if the prototype token isn't initialized
    if (!this.actor.token) {
      this.actor.update({ "token.img": formData.img })
    }
    // Update token image if it matches the old actor image
    else if ((this.actor.img == token.img)
      && (this.actor.img != formData.img)) {
      this.actor.update({ "token.img": formData.img });
    }

    // Update the Actor
    return this.object.update(formData);
  }
}

