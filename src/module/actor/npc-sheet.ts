import type { GenControlContext, LancerActorSheetData, LancerStatMacroData } from "../interfaces";
import { LANCER } from "../config";
import { LancerActorSheet } from "./lancer-actor-sheet";
import { prepareItemMacro, prepareStatMacro } from "../macros";
import { EntryType } from "machine-mind";
import tippy from "tippy.js";
import { LancerItem, is_item_type, LancerItemType, LancerNPC_FEATURE } from "../item/lancer-item";
import { insinuate, resort_item } from "../util/doc";
import { HANDLER_activate_general_controls } from "../helpers/commons";
import { LancerActor, LancerNPC } from "./lancer-actor";
import { DropHandlerFunc, ResolvedDropData } from "../helpers/dragdrop";
import { SystemDataType } from "../new-template";
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
    let getfunc = () => this.getData();
    let commitfunc = (_: any) => this._commitCurrMM();

    // Enable NPC class/template-deletion controls
    HANDLER_activate_general_controls(html, getfunc, commitfunc, handleClassDelete);
  }

  /* -------------------------------------------- */

  can_root_drop_entry(drop: ResolvedDropData): boolean {
    // Reject any non npc item
    return drop.type == "Item" && LANCER.npc_items.includes(drop.document.type);
  }

  // Take ownership of appropriate items. Already filtered by can_drop_entry
  async on_root_drop(
    base_drop: ResolvedDropData,
    event: JQuery.DropEvent,
    _dest: JQuery<HTMLElement>
  ): Promise<void> {
    // Type guard
    if(!this.actor.is_npc()) return;

    // Take posession
    let [drop, is_new] = await this.quick_own_drop(base_drop);

    // Flag to know if we need to reset stats
    let needs_refresh = false;

    // Bring in base features from templates
    if (is_new && drop.type == "Item") {
      let doc = drop.document;

      // Mark replaced classes for deletion
      let delete_targets = [];
      if (doc.is_npc_class() && this.actor.data.data.class) {
        // If we have a class, get rid of it
        let class_data = this.actor.data.data.class.data.data as SystemDataType<EntryType.NPC_CLASS>;
        let class_features = findMatchingFeaturesInNpc(this.actor, [...class_data.base_features, ...class_data.optional_features]);
        delete_targets.push(...class_features.map(f => f.id));
      }

      // And add all new features
      if(doc.is_npc_template() || doc.is_npc_class()) {
        for (let feat of doc.data.data.base_features) {
          await insinuate([], this.actor as LancerNPC);
        }
        needs_refresh = true;
      }
      if(doc.is_npc_class()) {
        await this.actor.swapFrameImage(this.actor, this.actor.data.data.class, doc);
      }
    }

    // We also may need to sort the item
    // TODO
    /*
    if (drop.Type == EntryType.NPC_FEATURE) {
      // Try to find a ref
      let nearest = $(event.target).closest(".valid.ref");
      if (nearest.length) {
        // ok, now try to resolve it
        let target = await resolve_ref_element(nearest[0], ctx);
        if (target && is_item_type(target.Type)) {
          mm_resort_item(drop, target as LancerItem);
        }
      }
    }
    */
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
  if (ctx.action == "delete") {
    let pt = ctx.path_target;
    if (pt instanceof LancerItem && (pt.is_npc_template() || pt.is_npc_class())) {
      let matches = findMatchingFeaturesInNpc(ctx.data.actor, [...pt.base_features, ...pt.optional_features]);
      ctx.data.actor.deleteEmbeddedDocuments("Item", matches.map(m => m.id).filter(x=>x) as string[]);
    }
  }
}

// Given a list of npc features, return the corresponding entries on the provided npc
export function findMatchingFeaturesInNpc(npc: LancerNPC, features: LancerNPC_FEATURE[]): LancerNPC_FEATURE[] {
  if(!npc.is_npc()) return [];
  let result = [];
  for (let predicate_feature of features) {
    for (let candidate_feature of npc.data.data.features) {
      if (candidate_feature.data.data.lid == predicate_feature.data.data.lid) {
        result.push(candidate_feature); 
      }
    }
  }
  return result;
}
