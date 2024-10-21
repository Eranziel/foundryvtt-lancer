import type { LancerActor } from "../actor/lancer-actor";
import { handleGenControls } from "../helpers/commons";
import { handleRefDragging, click_evt_open_ref } from "../helpers/refs";
import { handleContextMenus } from "../helpers/item";
import { applyCollapseListeners, initializeCollapses } from "../helpers/collapse";

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
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: `systems/${game.system.id}/templates/window/inventory.hbs`,
      width: 600,
      height: "auto",
      classes: ["lancer", "inventory-editor"],
    });
  }

  // @ts-expect-error Dialog is apparently cut off from async in league types
  async getData(): Promise<InventoryDialogData> {
    // Fill out our categories
    return {
      ...super.getData(),
      categories: this.populate_categories(this.actor),
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

  // Get the appropriate cats for the given actor
  populate_categories(actor: LancerActor): FilledCategory[] {
    // Decide categories based on type
    let cats: FilledCategory[] = [];
    if (actor.is_mech()) {
      cats = [
        {
          label: "Frames",
          items: actor.items.filter(i => i.is_frame()),
        },
        {
          label: "Weapons",
          items: actor.items.filter(i => i.is_mech_weapon()),
        },
        {
          label: "Systems",
          items: actor.items.filter(i => i.is_mech_system()),
        },
        {
          label: "Mods",
          items: actor.items.filter(i => i.is_weapon_mod()),
        },
        {
          label: "Statuses",
          items: actor.items.filter(i => i.is_status()),
        },
      ];
    } else if (actor.is_pilot()) {
      cats = [
        {
          label: "Weapons",
          items: actor.items.filter(i => i.is_pilot_weapon()),
        },
        {
          label: "Armor",
          items: actor.items.filter(i => i.is_pilot_armor()),
        },
        {
          label: "Gear",
          items: actor.items.filter(i => i.is_pilot_gear()),
        },
        {
          label: "Talents",
          items: actor.items.filter(i => i.is_talent()),
        },
        {
          label: "Skills",
          items: actor.items.filter(i => i.is_skill()),
        },
        {
          label: "Licenses",
          items: actor.items.filter(i => i.is_license()),
        },
        {
          label: "Core Bonuses",
          items: actor.items.filter(i => i.is_core_bonus()),
        },
        {
          label: "Reserves",
          items: actor.items.filter(i => i.is_reserve()),
        },
        {
          label: "Organizations",
          items: actor.items.filter(i => i.is_organization()),
        },
        {
          label: "Statuses",
          items: actor.items.filter(i => i.is_status()),
        },
      ];
    } else {
      console.warn("Cannot yet show inventory for " + actor.type);
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

    initializeCollapses(html);
    applyCollapseListeners(html);

    // Everything below here is only needed if the sheet is editable
    let getfunc = () => this.getData();
    let commitfunc = (_: any) => {};

    // Enable general controls, so items can be deleted and such
    handleGenControls(html, this.actor);

    // Enable ref dragging
    handleRefDragging(html);

    handleContextMenus(html, this.actor);

    // Make refs clickable to open the item
    $(html).find(".ref.set.click-open").on("click", click_evt_open_ref);
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
