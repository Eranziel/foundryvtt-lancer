import { GenControlContext, LancerStatMacroData } from "../interfaces";
import { LANCER } from "../config";
import { LancerActorSheet, removeFeaturesFromNPC } from "./lancer-actor-sheet";
import { prepareItemMacro } from "../macros";
import { EntryType, LiveEntryTypes, Npc, NpcClass, NpcFeature, OpCtx, RegNpcData } from "machine-mind";
import { ResolvedNativeDrop } from "../helpers/dragdrop";
import { mm_wrap_item } from "../mm-util/helpers";
import tippy from "tippy.js";
const lp = LANCER.log_prefix;

/**
 * Extend the basic ActorSheet
 */
export class LancerNPCSheet extends LancerActorSheet<EntryType.NPC> {
  /**
   * Extend and override the default options used by the NPC Sheet
   * @returns {Object}
   */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["lancer", "sheet", "actor", "npc"],
      template: "systems/lancer/templates/actor/npc.hbs",
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
    // @ts-ignore .8
    if (this.actor.isOwner) {
      // Macros that can be handled via the generic item interface
      let itemMacros = html.find(".item-macro");
      itemMacros.on("click", (ev: any) => {
        ev.stopPropagation(); // Avoids triggering parent event handlers

        const el = $(ev.currentTarget).closest(".item")[0] as HTMLElement;

        prepareItemMacro(this.actor._id, <string>el.getAttribute("data-id")).then();
      });

      // Stat rollers
      let statMacro = html.find(".roll-stat");
      statMacro.on("click", (ev: Event) => {
        if (!ev.currentTarget) return; // No target, let other handlers take care of it.
        ev.stopPropagation(); // Avoids triggering parent event handlers

        // Find the stat input to get the stat's key to pass to the macro function
        const statInput: HTMLInputElement = $(ev.currentTarget)
          .closest(".stat-container")
          .find(".lancer-stat")[0] as HTMLInputElement;
        let tSplit = statInput.name.split(".");
        let mData: LancerStatMacroData = {
          title: tSplit[tSplit.length - 1].toUpperCase(),
          bonus: statInput.value,
        };

        console.log(`${lp} Rolling ${mData.title} check, bonus: ${mData.bonus}`);
        game.lancer.prepareStatMacro(this.actor._id, this.getStatPath(ev)!);
      });

      // Trigger rollers
      this.activateTriggerListeners(html);

      // Tech rollers
      let techMacro = html.find(".roll-tech");
      techMacro.on("click", (ev: Event) => {
        if (!ev.currentTarget) return; // No target, let other handlers take care of it.
        ev.stopPropagation();
        const techElement = $(ev.currentTarget).closest(".item")[0] as HTMLElement;
        let techId = techElement.getAttribute("data-id");
        game.lancer.prepareItemMacro(this.actor._id, techId!);
      });

      // Item/Macroable Dragging
      const haseMacroHandler = (e: DragEvent) => this._onDragMacroableStart(e);
      html
        .find('li[class*="item"]')
        .add('span[class*="item"]')
        .add('[class*="macroable"]')
        .each((i: number, item: any) => {
          if (item.classList.contains("inventory-header")) return;
          if (item.classList.contains("roll-stat")) item.addEventListener("dragstart", haseMacroHandler, false);
          if (item.classList.contains("item"))
            item.addEventListener("dragstart", (ev: DragEvent) => this._onDragStart(ev), false);
          item.setAttribute("draggable", "true");
        });
    }

    this._activateTooltips();
  }

  _onDragMacroableStart(event: DragEvent) {
    // For roll-stat macros
    event.stopPropagation(); // Avoids triggering parent event handlers
    let statInput = getStatInput(event);
    if (!statInput) return ui.notifications.error("Error finding stat input for macro.");

    let tSplit = statInput.id.split(".");
    let data = {
      title: tSplit[tSplit.length - 1].toUpperCase(),
      dataPath: statInput.id,
      type: "actor",
      actorId: this.actor._id,
    };

    event.dataTransfer?.setData("text/plain", JSON.stringify(data));
  }

  private _activateTooltips() {
    tippy('[data-context-menu="toggle"][data-field="Destroyed"]', {
      content: "Right Click to Destroy",
      delay: [300, 100],
    });
  }

  /* -------------------------------------------- */

  async _onDrop(event: any): Promise<any> {
    let drop: ResolvedNativeDrop | null = await super._onDrop(event);
    if (drop?.type != "Item") {
      return null; // Bail.
    }

    const sheet_data = await this.getDataLazy();
    const this_mm = sheet_data.mm;
    const item = drop.entity;

    if (!LANCER.npc_items.includes(item.type)) {
      ui.notifications.error(`Cannot add Item of type "${item.type}" to an NPC.`);
      return null;
    }

    // Make the context for the item. TODO: Make use existing
    const item_mm: LiveEntryTypes<EntryType> = await mm_wrap_item(item, new OpCtx());

    // Always add the item to the pilot inventory, now that we know it is a valid pilot posession
    // Make a new ctx to hold the item and a post-item-add copy of our mech
    let new_ctx = new OpCtx();
    let this_inv = await this_mm.get_inventory();

    // If it's a class and we already have one, we need to swap--otherwise, easy to add
    if (item_mm.Type == EntryType.NPC_CLASS) {
      if(this_mm.ActiveClass){
        // If we have a class, get rid of it
        removeFeaturesFromNPC(this_mm,this_mm.ActiveClass.BaseFeatures);
        this_mm.ActiveClass.destroy_entry();
        for (let i = 0; i < this_mm.Classes.length; i++) {
          this_mm.Classes[i].destroy_entry();          
        }
      }
      // Should now always be good to add the base features
      for (let b of item_mm.BaseFeatures) {
        await b.insinuate(this_inv, new_ctx);
      }
    }

    // Insinuate after cleaning up the old class if necessary, and do other processing
    let new_live_item = await item_mm.insinuate(this_inv, new_ctx);

    // Go ahead and bring in base features from templates if it's that
    if (new_live_item.Type == EntryType.NPC_TEMPLATE) {
      for (let b of new_live_item.BaseFeatures) {
        await b.insinuate(this_inv, new_ctx);
      }
    }

    // Update this, to re-populate arrays etc to reflect new item
    let new_live_this = (await this_mm.refreshed(new_ctx))!;

    // Fill our hp, stress, and structure to match new maxes
    new_live_this.CurrentHP = new_live_this.MaxHP;
    new_live_this.CurrentStress = new_live_this.MaxStress;
    new_live_this.CurrentStructure = new_live_this.MaxStructure;
    await new_live_this.writeback();
  }
}

function getStatInput(event: Event): HTMLInputElement | HTMLDataElement | null {
  if (!event.currentTarget) return null;
  // Find the stat input to get the stat's key to pass to the macro function
  return $(event.currentTarget).closest(".stat-container").find(".lancer-stat")[0] as
    | HTMLInputElement
    | HTMLDataElement;
}
