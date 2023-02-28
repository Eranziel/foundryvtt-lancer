import type { LancerItemSheetData } from "../interfaces";
import { LANCER } from "../config";
import type { LancerItem, LancerItemType } from "./lancer-item";
import {
  HANDLER_activate_general_controls,
  HANDLER_activate_popout_text_editor,
  resolve_dotpath,
} from "../helpers/commons";
import { HANDLER_activate_counter_listeners, HANDLER_activate_plus_minus_buttons } from "../helpers/item";
import {
  HANDLER_activate_ref_dragging,
  HANDLER_activate_ref_slot_dropping,
  HANDLER_add_doc_to_list_on_drop,
  click_evt_open_ref,
  HANDLER_activate_uses_editor,
} from "../helpers/refs";
import {
  HANDLER_activate_edit_bonus,
  HANDLER_activate_item_context_menus,
  HANDLER_activate_profile_context_menus,
} from "../helpers/item";
import { HANDLER_activate_tag_context_menus, HANDLER_activate_tag_dropping } from "../helpers/tags";
import { applyCollapseListeners, CollapseHandler, initializeCollapses } from "../helpers/collapse";
import { activate_action_editor } from "../apps/action-editor";
import { find_license_for } from "../util/doc";
import { lookupOwnedDeployables } from "../util/lid";
import { EntryType } from "../enums";
import { LancerDEPLOYABLE } from "../actor/lancer-actor";

const lp = LANCER.log_prefix;

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class LancerItemSheet<T extends LancerItemType> extends ItemSheet<ItemSheet.Options, LancerItemSheetData<T>> {
  constructor(document: LancerItem, options: ItemSheet.Options) {
    super(document, options);
    if (this.item.is_mech_weapon()) {
      // @ts-ignore IDK if this even does anything
      // TODO Figure out if this even does anything
      this.options.initial = `profile${this.item.system.selected_profile || 0}`;
    }
  }

  // Tracks collapse state between renders
  protected collapse_handler = new CollapseHandler();

  /**
   * @override
   * Extend and override the default options used by the Item Sheet
   */
  static get defaultOptions(): ItemSheet.Options {
    return mergeObject(super.defaultOptions, {
      classes: ["lancer", "sheet", "item"],
      width: 700,
      height: 700,
      tabs: [
        {
          navSelector: ".lancer-tabs",
          contentSelector: ".sheet-body",
          initial: "description",
        },
      ],
    });
  }

  /** @override */
  get template() {
    const path = `systems/${game.system.id}/templates/item`;
    return `${path}/${this.item.type}.hbs`;
  }

  /* -------------------------------------------- */

  /**
   * Private helper that applies context menus according to the editability of the sheet.
   * @param html {JQuery}    The prepared HTML object ready to be rendered into the DOM
   * @param data_getter      Reference to a function which can provide the sheet data
   * @param commit_func      Reference to a function which can commit/save data back to the document
   */
  _activate_context_listeners(html: JQuery) {
    // Enable custom context menu triggers. If the sheet is not editable, show only the "view" option.
    HANDLER_activate_item_context_menus(html, this.item, !this.options.editable);
  }

  /**
   * @override
   * Activate event listeners using the prepared sheet HTML
   * @param html {JQuery}   The prepared HTML object ready to be rendered into the DOM
   */
  activateListeners(html: JQuery) {
    super.activateListeners(html);

    // Enable collapse triggers.
    initializeCollapses(html);
    applyCollapseListeners(html);

    let getfunc = () => this.getData();
    let commitfunc = (_: any) => {
      ui.notifications?.error("DEPRECATED");
    };

    // Make refs clickable
    $(html).find(".ref.set.click-open").on("click", click_evt_open_ref);

    // Enable ref dragging
    HANDLER_activate_ref_dragging(html);

    this._activate_context_listeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) {
      return;
    }

    // Make +/- buttons work
    HANDLER_activate_plus_minus_buttons(html, this.item);

    // Make counter pips work
    HANDLER_activate_counter_listeners(html, this.item);

    // Enable hex use triggers.
    HANDLER_activate_uses_editor(html, this.item);

    // Allow dragging items into lists
    HANDLER_add_doc_to_list_on_drop(html, this.item);

    // Allow set things by drop. Mostly we use this for manufacturer/license dragging
    HANDLER_activate_ref_slot_dropping(html, this.item, null); // Don't restrict what can be dropped past type, and don't take ownership or whatever

    // Enable bonus editors
    HANDLER_activate_edit_bonus(html, this.item);

    // Enable tag editing
    HANDLER_activate_tag_context_menus(html, getfunc, commitfunc);

    // Enable profile editing
    HANDLER_activate_profile_context_menus(html, getfunc, commitfunc);

    // Enable popout editors
    HANDLER_activate_popout_text_editor(html, this.item);

    // Enable general controls, so items can be deleted and such
    HANDLER_activate_general_controls(html, this.item);

    // Enable tag dropping
    HANDLER_activate_tag_dropping(html, getfunc, commitfunc);

    // Enable action editors
    activate_action_editor(html, this.item);
  }

  /* -------------------------------------------- */

  _propagateMMData(formData: any): any {
    // Pushes relevant field data from the form to other appropriate locations,
    // (presently there aren't any but uhhh could be i guess. Just here to mirror actor-sheet)
    // Get the basics
    let new_top: any = {
      img: formData.img,
      name: formData.name,
    };

    return new_top;
  }
  /**
   * Implement the _updateObject method as required by the parent class spec
   * This defines how to update the subject of the form when the form is submitted
   * @private
   */
  async _updateObject(_event: Event | JQuery.Event, formData: any): Promise<any> {
    // Simple writeback
    await this.item.update(formData);
  }

  /**
   * Prepare data for rendering the frame sheet
   * The prepared data object contains both the actor data as well as additional sheet options
   */
  async getData(): Promise<LancerItemSheetData<T>> {
    const data = super.getData() as LancerItemSheetData<T>; // Not fully populated yet!
    // @ts-expect-error v10
    data.system = this.item.system; // Set our alias
    data.collapse = {};

    // Populate deployables depending on our context
    data.deployables = {};
    if (!this.item.pack && this.item.actor) {
      // Use those owned in the world
      data.deployables = lookupOwnedDeployables(this.item.actor);
    } else {
      // Use compendium. This is probably overkill but, who well
      let deps = (await game.packs.get(`world.${EntryType.DEPLOYABLE}`)?.getDocuments()) ?? [];
      // @ts-expect-error
      for (let d of deps as LancerDEPLOYABLE) {
        data.deployables[d.system.lid] = d;
      }
    }

    // Additionally we would like to find a matching license. Re-use ctx, try both a world and global reg, actor as well if it exists
    data.license = null;
    if (this.actor?.is_pilot() || this.actor?.is_mech()) {
      data.license = await find_license_for(this.item, this.actor!);
    } else {
      data.license = await find_license_for(this.item);
    }

    console.log(`${lp} Rendering with following item ctx: `, data);
    return data;
  }
}
