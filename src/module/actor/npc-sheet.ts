import type { GenControlContext } from "../interfaces";
import { LANCER } from "../config";
import { LancerActorSheet } from "./lancer-actor-sheet";
import { prepareItemMacro, prepareStatMacro } from "../macros";
import tippy from "tippy.js";
import { LancerItem } from "../item/lancer-item";
import type { LancerNPC_FEATURE } from "../item/lancer-item";
import { insinuate } from "../util/doc";
import type { LancerNPC } from "./lancer-actor";
import type { ResolvedDropData } from "../helpers/dragdrop";
import { EntryType } from "../enums";
import { lookupLID } from "../util/lid";
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

        const el = $(ev.currentTarget).closest("[data-uuid]")[0] as HTMLElement;
        prepareItemMacro(el.dataset.uuid!, {
          display: true,
        });
      });

      // Tech rollers
      let techMacro = html.find(".roll-tech");
      techMacro.on("click", ev => {
        if (!ev.currentTarget) return; // No target, let other handlers take care of it.
        ev.stopPropagation();
        const techElement = $(ev.currentTarget).closest("[data-uuid]")[0] as HTMLElement;
        let techId = techElement.dataset.uuid;
        prepareItemMacro(techId!);
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
    let old_class = this.actor.system.class;

    // Take posession
    let [drop, is_new] = await this.quickOwnDrop(base_drop);

    // Flag to know if we need to reset stats
    let needs_refresh = false;

    // Bring in base features from templates
    if (is_new && drop.type == "Item") {
      let doc = drop.document;

      // Mark replaced classes for deletion
      if (this.actor.is_npc() && doc.is_npc_class() && old_class) {
        // But before we do that, destroy all old classes
        // If we have a class, get rid of it
        let class_features = findMatchingFeaturesInNpc(this.actor, [
          ...old_class.system.base_features,
          ...old_class.system.optional_features,
        ]);
        await this.actor._safeDeleteEmbedded("Item", [old_class, ...class_features]);
      }

      // And add all new features
      if (doc.is_npc_template() || doc.is_npc_class()) {
        let baseFeatures = (await Promise.all(
          doc.system.base_features.map(lid => lookupLID(lid, EntryType.NPC_FEATURE))
        )) as LancerItem[];
        await insinuate(
          baseFeatures.filter(x => x),
          this.actor as LancerNPC
        );
        needs_refresh = true;
      }
      if (doc.is_npc_class()) {
        await this.actor.swapFrameImage(doc);
      }
    }

    // If a new item was added, fill our hp, stress, and structure to match new maxes
    if (needs_refresh) {
      // Update this, to re-populate arrays etc to reflect new item
      await this.actor.update({
        "system.hp": this.actor.system.hp.max,
        "system.stress": this.actor.system.stress.max,
        "system.structure": this.actor.system.structure.max,
      });
    }

    // We also may need to sort the item
    // TODO
    /*
    if (drop.Type == EntryType.NPC_FEATURE) {
      // Try to find a ref
      let nearest = $(event.target).closest(".set.ref");
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

// Removes class/features when a delete of class/template happens
/** @override */
function _generalControlsPostHook(ctx: GenControlContext) {
  if (ctx.action == "delete") {
    let pt = ctx.path_target as LancerItem;
    if (pt instanceof LancerItem && (pt.is_npc_template() || pt.is_npc_class())) {
      let matches = findMatchingFeaturesInNpc(ctx.target_document as LancerNPC, [
        ...pt.system.base_features,
        ...pt.system.optional_features,
      ]);
      ctx.target_document.deleteEmbeddedDocuments("Item", matches.map(m => m.id).filter(x => x) as string[]);
    }
  }
}

// Given a list of npc features, return the corresponding entries on the provided npc
export function findMatchingFeaturesInNpc(npc: LancerNPC, feature_ids: string[]): LancerNPC_FEATURE[] {
  if (!npc.is_npc()) return [];
  let result = [];
  for (let predicate_lid of feature_ids) {
    for (let candidate_feature of npc.itemTypes.npc_feature as LancerNPC_FEATURE[]) {
      if (candidate_feature.system.lid == predicate_lid) {
        result.push(candidate_feature);
      }
    }
  }
  return result;
}
