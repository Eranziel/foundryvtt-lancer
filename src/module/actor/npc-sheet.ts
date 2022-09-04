import type { GenControlContext, LancerActorSheetData, LancerStatMacroData } from "../interfaces";
import { LANCER } from "../config";
import { LancerActorSheet } from "./lancer-actor-sheet";
import { prepareItemMacro, prepareStatMacro } from "../macros";
import { EntryType, Npc, NpcClass, NpcFeature, NpcTemplate } from "machine-mind";
import tippy from "tippy.js";
import { AnyMMItem, is_item_type, LancerItemType } from "../item/lancer-item";
import type { AnyMMActor } from "./lancer-actor";
import { mm_resort_item } from "../mm-util/helpers";
import { resolve_ref_element } from "../helpers/refs";
import { HANDLER_activate_general_controls } from "../helpers/commons";
const lp = LANCER.log_prefix;

/**
 * Extend the basic ActorSheet
 */
export class LancerNPCSheet extends LancerActorSheet<EntryType.NPC> {
  /**
   * Extend and override the default options used by the NPC Sheet
   */
  static get defaultOptions(): ActorSheet.Options {
    return mergeObject(super.defaultOptions, {
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

        const el = $(ev.currentTarget).closest(".item")[0] as HTMLElement;
        let id = this.token && !this.token.isLinked ? this.token.id! : this.actor.id!;
        prepareItemMacro(id, <string>el.getAttribute("data-id")).then();
      });

      // Stat rollers
      let statMacro = html.find(".roll-stat");
      statMacro.on("click", ev => {
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

        let id = this.token && !this.token.isLinked ? this.token.id! : this.actor.id!;
        console.log(`${lp} Rolling ${mData.title} check, bonus: ${mData.bonus}`);
        prepareStatMacro(id, this.getStatPath(ev)!);
      });

      // Trigger rollers
      this.activateTriggerListeners(html);

      // Tech rollers
      let techMacro = html.find(".roll-tech");
      techMacro.on("click", ev => {
        if (!ev.currentTarget) return; // No target, let other handlers take care of it.
        ev.stopPropagation();
        const techElement = $(ev.currentTarget).closest(".item")[0] as HTMLElement;
        let techId = techElement.getAttribute("data-id");
        let id = this.token && !this.token.isLinked ? this.token.id! : this.actor.id!;
        prepareItemMacro(id, techId!);
      });

      // Item/Macroable Dragging
      const haseMacroHandler = (e: DragEvent) => this._onDragMacroableStart(e);
      html
        .find('li[class*="item"]')
        .add('span[class*="item"]')
        .add('[class*="macroable"]')
        .each((_i: number, item: any) => {
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

  private _activateTooltips() {
    tippy('[data-context-menu="toggle"][data-field="Destroyed"]', {
      content: "Right Click to Destroy",
      delay: [300, 100],
    });
  }

  // So it can be overridden
  activate_general_controls(html: JQuery) {
    let getfunc = () => this.getDataLazy();
    let commitfunc = (_: any) => this._commitCurrMM();

    // Enable NPC class/template-deletion controls
    HANDLER_activate_general_controls(html, getfunc, commitfunc, handleClassDelete);
  }

  /* -------------------------------------------- */

  can_root_drop_entry(item: AnyMMItem | AnyMMActor): boolean {
    // Reject any non npc item
    if (!LANCER.npc_items.includes(item.Type as LancerItemType)) {
      return false;
    }

    // TODO: should the commented code be reinstated?
    // Reject any non-null, non-owned-by us item
    // let owner = mm_owner(item);
    // return !owner || owner == this.actor;
    return true;
  }

  // Take ownership of appropriate items. Already filtered by can_drop_entry
  async on_root_drop(
    base_drop: AnyMMItem | AnyMMActor,
    event: JQuery.DropEvent,
    _dest: JQuery<HTMLElement>
  ): Promise<void> {
    let sheet_data = await this.getDataLazy();
    let this_mm = sheet_data.mm;
    let ctx = this.getCtx();

    // Take posession
    let [drop, is_new] = await this.quick_own(base_drop);

    // Flag to know if we need to reset stats
    let needs_refresh = false;

    // Bring in base features from templates
    if (is_new && drop.Type == EntryType.NPC_TEMPLATE) {
      let this_inv = await this_mm.get_inventory();
      for (let feat of drop.BaseFeatures) {
        await feat.insinuate(this_inv, ctx);
      }
      needs_refresh = true;
    } else if (is_new && drop.Type == EntryType.NPC_CLASS) {
      // Bring in base features from classes, if we don't already have an active class
      let this_inv = await this_mm.get_inventory();

      // Need to pass this_mm through so we don't overwrite data on our
      // later update
      await this.actor.swapFrameImage(this_mm, this_mm.ActiveClass, drop);

      // But before we do that, destroy all old classes
      for (let clazz of this_mm.Classes) {
        // If we have a class, get rid of it
        await removeFeaturesFromNPC(this_mm, [...clazz.BaseFeatures, ...clazz.OptionalFeatures]);
        await clazz.destroy_entry();
      }

      for (let b of drop.BaseFeatures) {
        await b.insinuate(this_inv, ctx);
      }
      needs_refresh = true;
    } else if (drop.Type == EntryType.NPC_FEATURE) {
      // If new we need to update stats
      needs_refresh = is_new;
    }

    // If a new item was added, fill our hp, stress, and structure to match new maxes
    if (needs_refresh) {
      // Update this, to re-populate arrays etc to reflect new item
      await this_mm.repopulate_inventory();
      // Npc.recompute_bonuses() was removed in machine-mind v0.2.2
      // this_mm.recompute_bonuses();

      this_mm.CurrentHP = this_mm.MaxHP;
      this_mm.CurrentStress = this_mm.MaxStress;
      this_mm.CurrentStructure = this_mm.MaxStructure;
      await this_mm.writeback();
    }

    // We also may need to sort the item
    if (drop.Type == EntryType.NPC_FEATURE) {
      // Try to find a ref
      let nearest = $(event.target).closest(".valid.ref");
      if (nearest.length) {
        // ok, now try to resolve it
        let target = await resolve_ref_element(nearest[0], ctx);
        if (target && is_item_type(target.Type)) {
          mm_resort_item(drop, target as AnyMMItem);
        }
      }
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

// Removes class/features when a delete happens
function handleClassDelete(ctx: GenControlContext<LancerActorSheetData<EntryType.NPC>>) {
  let npc = ctx.data.mm;
  if (ctx.action == "delete") {
    if (ctx.path_target instanceof NpcClass || ctx.path_target instanceof NpcTemplate) {
      removeFeaturesFromNPC(npc, [...ctx.path_target.BaseFeatures, ...ctx.path_target.OptionalFeatures]);
    }
  }
}

export async function removeFeaturesFromNPC(npc: Npc, features: NpcFeature[]) {
  for (let predicate_feature of features) {
    for (let candidate_feature of npc.Features) {
      if (candidate_feature.LID == predicate_feature.LID) {
        await candidate_feature.destroy_entry();
      }
    }
  }
}
