import { LancerActorSheet } from "./lancer-actor-sheet";
import { LancerActor } from "./lancer-actor";
import { LancerItem } from "../item/lancer-item";
import { ResolvedDropData } from "../helpers/dragdrop";
import { EntryType } from "../enums";

/**
 * Extend the basic ActorSheet
 */
export class LancerDeployableSheet extends LancerActorSheet<EntryType.DEPLOYABLE> {
  /**
   * Extend and override the default options used by the NPC Sheet
   */
  static get defaultOptions(): ActorSheet.Options {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["lancer", "sheet", "actor", "deployable"],
      template: `systems/${game.system.id}/templates/actor/deployable.hbs`,
      width: 800,
      height: 800,
      tabs: [
        {
          navSelector: ".lancer-tabs",
          contentSelector: ".sheet-body",
          initial: "status",
        },
      ],
    });
  }

  // Need to allow this stuff for setting deployable
  canRootDrop(item: ResolvedDropData): boolean {
    // Accept actors
    return item.type == "Actor" && [EntryType.PILOT, EntryType.MECH, EntryType.NPC].includes(item.document.type);
  }

  async onRootDrop(
    drop: ResolvedDropData,
    _event: JQuery.DropEvent<any, any, any, any>,
    _dest: JQuery<HTMLElement>
  ): Promise<void> {
    if (drop.type == "Actor" && drop.document != this.actor) {
      this.actor.update({ "system.owner": drop.document.uuid });
    }
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
}
