import { LANCER } from "../config";
import { LancerActorSheet } from "./lancer-actor-sheet";
import { ResolvedDropData } from "../helpers/dragdrop";
import { EntryType } from "../enums";
const lp = LANCER.log_prefix;

/**
 * Extend the basic ActorSheet
 */
export class LancerNPCSheet extends LancerActorSheet<EntryType.NPC> {
  /**
   * Extend and override the default options used by the NPC Sheet
   */
  static get defaultOptions(): ActorSheet.Options {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["lancer", "sheet", "actor", "npc"],
      template: `systems/${game.system.id}/templates/actor/npc.hbs`,
      width: 800,
      height: 800,
      tabs: [
        {
          navSelector: ".lancer-tabs",
          contentSelector: ".sheet-body",
          initial: "mech",
        },
      ],
    });
  }

  /* -------------------------------------------- */

  /**
   * Activate event listeners using the prepared sheet HTML
   * @param html {HTMLElement}   The prepared HTML object ready to be rendered into the DOM
   */
  activateListeners(html: JQuery) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Macro triggers
    if (this.actor.isOwner) {
      // Macros that can be handled via the generic item interface
      let itemMacros = html.find(".item-macro");
      itemMacros.on("click", (ev: any) => {
        ev.stopPropagation(); // Avoids triggering parent event handlers

        const el = $(ev.currentTarget).closest("[data-uuid]")[0] as HTMLElement;
        // prepareItemMacro(el.dataset.uuid!, {
        //   display: true,
        // });
      });

      // Tech rollers
      let techMacro = html.find(".roll-tech");
      techMacro.on("click", ev => {
        if (!ev.currentTarget) return; // No target, let other handlers take care of it.
        ev.stopPropagation();
        const techElement = $(ev.currentTarget).closest("[data-uuid]")[0] as HTMLElement;
        let techId = techElement.dataset.uuid;
        // prepareItemMacro(techId!);
      });

      // Item/Macroable Dragging
      html
        .find('li[class*="item"]')
        .add('span[class*="item"]')
        .each((_i: number, item: any) => {
          if (item.classList.contains("inventory-header")) return;
          if (item.classList.contains("roll-stat"))
            item.addEventListener("dragstart", this._onDragMacroableStart, false);
          if (item.classList.contains("item"))
            item.addEventListener("dragstart", (ev: DragEvent) => this._onDragStart(ev), false);
          item.setAttribute("draggable", "true");
        });
    }
  }

  _onDragMacroableStart(event: DragEvent) {
    // For roll-stat macros
    event.stopPropagation(); // Avoids triggering parent event handlers
    let statInput = getStatInput(event);
    if (!statInput) return ui.notifications!.error("Error finding stat input for macro.");

    let tSplit = statInput.id.split(".");
    let data = {
      title: tSplit[tSplit.length - 1].toUpperCase(),
      dataPath: statInput.id,
      type: "actor",
      actorId: this.actor.id,
    };

    event.dataTransfer?.setData("text/plain", JSON.stringify(data));
  }

  /* -------------------------------------------- */

  canRootDrop(item: ResolvedDropData): boolean {
    // Reject any non npc item
    return (
      item.type == "Item" &&
      (item.document.is_npc_class() || item.document.is_npc_feature() || item.document.is_npc_template())
    );
  }

  // Take ownership of appropriate items. Already filtered by can_drop_entry
  async onRootDrop(base_drop: ResolvedDropData, event: JQuery.DropEvent, _dest: JQuery<HTMLElement>): Promise<void> {
    // Type guard
    if (!this.actor.is_npc()) return;

    // Take posession
    let [drop, is_new] = await this.quickOwnDrop(base_drop);

    // Flag to know if we need to reset stats
    let needs_refresh =
      is_new && drop.type == "Item" && (drop.document.is_npc_class() || drop.document.is_npc_template());

    // Bring in base features from templates
    if (is_new && drop.type == "Item") {
      let doc = drop.document;

      if (doc.is_npc_class()) {
        await this.actor.swapFrameImage(doc);
        await this.actor.updateTokenSize(doc);
      }
    }

    // If a new item was added, fill our hp, stress, and structure to match new maxes
    if (needs_refresh) {
      // Update this, to re-populate arrays etc to reflect new item
      await this.actor.update({
        "system.hp.value": this.actor.system.hp.max,
        "system.stress.value": this.actor.system.stress.max,
        "system.structure.value": this.actor.system.structure.max,
      });
    }

    // If this isn't a new item and it's an NPC feature, we need to update the sorting
    if (this.isEditable && !is_new && drop.type === "Item" && drop.document.is_npc_feature()) {
      // @ts-expect-error v11 types
      this._onSortItem(event, drop.document.toObject());
    }
  }
}

function getStatInput(event: Event): HTMLInputElement | HTMLDataElement | null {
  if (!event.currentTarget) return null;
  // Find the stat input to get the stat's key to pass to the macro function
  return $(event.currentTarget).closest(".stat-container").find(".lancer-stat")[0] as
    | HTMLInputElement
    | HTMLDataElement;
}
