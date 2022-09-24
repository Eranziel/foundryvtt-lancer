import { Mech } from "machine-mind";
import type { LancerActor, AnyMMActor } from "../actor/lancer-actor";
import { HANDLER_activate_general_controls } from "../helpers/commons";
import {
  HANDLER_activate_native_ref_dragging,
  HANDLER_activate_ref_dragging,
  HANDLER_activate_ref_clicking,
} from "../helpers/refs";
import { HANDLER_activate_item_context_menus } from "../helpers/item";

interface FilledCategory {
  label: string;
  items: any[];
}

export interface InventoryDialogData {
  content: string;
  buttons: Record<string, Dialog.Button>;
  categories: FilledCategory[];
}

/**
 * A helper Dialog subclass for editing an actors inventories
 * @extends {Dialog}
 */
export class InventoryDialog extends Dialog {
  constructor(readonly actor: LancerActor, dialogData: Dialog.Data, options: Partial<Dialog.Options> = {}) {
    super(dialogData, options);
    this.actor = actor;
  }

  /* -------------------------------------------- */

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      template: `systems/${game.system.id}/templates/window/inventory.hbs`,
      width: 600,
      height: "auto",
      classes: ["lancer"],
    });
  }

  /** @override
   * Expose our data. Note that everything should be ready by now
   */
  // @ts-ignore Dialog is apparently cut off from async in league types
  async getData(): Promise<InventoryDialogData> {
    // Fill out our categories
    // @ts-expect-error Should be fixed with v10 types
    let mm = await this.actor.system.derived.mm_promise;
    return {
      ...super.getData(),
      categories: this.populate_categories(mm), // this.populate_categories()
    };
  }

  /** @inheritdoc */
  render(force: any, options = {}) {
    // Register the active Application with the referenced Documents, to get updates
    this.actor.apps[this.appId] = this;
    return super.render(force, options);
  }

  async close(options: FormApplication.CloseOptions = {}) {
    delete this.actor.apps[this.appId];
    return super.close(options);
  }

  // Get the appropriate cats for the given mm actor
  populate_categories(mm: AnyMMActor): FilledCategory[] {
    // Decide categories based on type
    let cats: FilledCategory[] = [];
    if (mm instanceof Mech) {
      cats = [
        {
          label: "Frames",
          items: mm.OwnedFrames,
        },
        {
          label: "Weapons",
          items: mm.OwnedMechWeapons,
        },
        {
          label: "Systems",
          items: mm.OwnedSystems,
        },
        {
          label: "Mods",
          items: mm.OwnedWeaponMods,
        },
        {
          label: "Statuses",
          items: mm.StatusesAndConditions,
          // path: "mm.StatusesAndConditions"
        },
      ];
    } else {
      console.warn("Cannot yet show inventory for " + mm.Type);
    }
    return cats;
  }

  /**
   * @override
   * Activate event listeners using the prepared sheet HTML
   * @param html {HTMLElement}   The prepared HTML object ready to be rendered into the DOM
   */
  activateListeners(html: JQuery<HTMLElement>) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    let getfunc = () => this.getData();
    let commitfunc = (_: any) => {};

    // Enable general controls, so items can be deleted and such
    // TODO: This is going to probably cause an error every time it runs.
    HANDLER_activate_general_controls(html, <any>getfunc, commitfunc);

    // Enable ref dragging
    HANDLER_activate_ref_dragging(html);
    HANDLER_activate_native_ref_dragging(html);

    HANDLER_activate_item_context_menus(html, getfunc, commitfunc);

    // Make refs clickable to open the item
    $(html).find(".ref.valid.clickable-ref").on("click", HANDLER_activate_ref_clicking);
  }

  static async show_inventory(actor: LancerActor): Promise<void> {
    return new Promise((resolve, _reject) => {
      const dlg = new this(actor, {
        title: `${actor.name}'s inventory`,
        content: "",
        buttons: {},
        close: () => resolve(),
        default: "",
      }); // Register the active Application with the referenced Documents
      dlg.render(true);
    });
  }
}
