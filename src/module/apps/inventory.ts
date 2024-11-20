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
  buttons: Record<string, DialogButton>;
  categories: FilledCategory[];
}

/**
 * A helper Dialog subclass for editing an actors inventories
 * @extends {Dialog}
 */
export class InventoryDialog extends Dialog {
  constructor(readonly actor: LancerActor, dialogData: DialogData, options: Partial<DialogOptions> = {}) {
    super(dialogData, options);
    this.actor = actor;
  }

  /* -------------------------------------------- */

  /** @override */
  static get defaultOptions(): DialogOptions {
    return foundry.utils.mergeObject(super.defaultOptions, {
      // @ts-ignore Infinite loop?
      template: `systems/${game.system.id}/templates/window/inventory.hbs`,
      width: 600,
      height: "auto",
      classes: ["lancer", "inventory-editor"],
    }) as any;
  }

  async getData(): Promise<object> {
    // Fill out our categories
    return {
      ...(await super.getData()),
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
          // @ts-ignore Items collection is typed as any?
          items: actor.items.filter(i => i.is_frame()),
        },
        {
          label: "Weapons",
          // @ts-ignore Items collection is typed as any?
          items: actor.items.filter(i => i.is_mech_weapon()),
        },
        {
          label: "Systems",
          // @ts-ignore Items collection is typed as any?
          items: actor.items.filter(i => i.is_mech_system()),
        },
        {
          label: "Mods",
          // @ts-ignore Items collection is typed as any?
          items: actor.items.filter(i => i.is_weapon_mod()),
        },
        {
          label: "Statuses",
          // @ts-ignore Items collection is typed as any?
          items: actor.items.filter(i => i.is_status()),
        },
      ];
    } else if (actor.is_pilot()) {
      cats = [
        {
          label: "Weapons",
          // @ts-ignore Items collection is typed as any?
          items: actor.items.filter(i => i.is_pilot_weapon()),
        },
        {
          label: "Armor",
          // @ts-ignore Items collection is typed as any?
          items: actor.items.filter(i => i.is_pilot_armor()),
        },
        {
          label: "Gear",
          // @ts-ignore Items collection is typed as any?
          items: actor.items.filter(i => i.is_pilot_gear()),
        },
        {
          label: "Talents",
          // @ts-ignore Items collection is typed as any?
          items: actor.items.filter(i => i.is_talent()),
        },
        {
          label: "Skills",
          // @ts-ignore Items collection is typed as any?
          items: actor.items.filter(i => i.is_skill()),
        },
        {
          label: "Licenses",
          // @ts-ignore Items collection is typed as any?
          items: actor.items.filter(i => i.is_license()),
        },
        {
          label: "Core Bonuses",
          // @ts-ignore Items collection is typed as any?
          items: actor.items.filter(i => i.is_core_bonus()),
        },
        {
          label: "Reserves",
          // @ts-ignore Items collection is typed as any?
          items: actor.items.filter(i => i.is_reserve()),
        },
        {
          label: "Organizations",
          // @ts-ignore Items collection is typed as any?
          items: actor.items.filter(i => i.is_organization()),
        },
        {
          label: "Statuses",
          // @ts-ignore Items collection is typed as any?
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
