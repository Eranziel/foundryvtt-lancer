import type { LancerItemSheetData } from "../interfaces";
import { LANCER } from "../config";
import type { LancerItem, LancerItemType } from "./lancer-item";
import { handleGenControls, handlePopoutTextEditor } from "../helpers/commons";
import { handleCounterInteraction, handleInputPlusMinusButtons } from "../helpers/item";
import {
  handleRefDragging,
  handleRefSlotDropping,
  handleDocListDropping,
  click_evt_open_ref,
  handleUsesInteraction,
  handleLIDListDropping,
} from "../helpers/refs";
import { handleContextMenus } from "../helpers/item";
import { applyCollapseListeners, CollapseHandler, initializeCollapses } from "../helpers/collapse";
import { ActionEditDialog } from "../apps/action-editor";
import { find_license_for, get_pack_id } from "../util/doc";
import { lookupOwnedDeployables } from "../util/lid";
import { EffectType, EntryType, StatusConditionType } from "../enums";
import { LancerDEPLOYABLE } from "../actor/lancer-actor";
import { BonusEditDialog } from "../apps/bonus-editor";
import { OrgType } from "../enums";
import { handleTagEditButtons } from "../helpers/tags";

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
      this.options.initial = `profile${this.item.system.selected_profile_index}`;
    }
  }

  // Tracks collapse state between renders
  protected collapse_handler = new CollapseHandler();

  /**
   * @override
   * Extend and override the default options used by the Item Sheet
   */
  static get defaultOptions(): ItemSheet.Options {
    return foundry.utils.mergeObject(super.defaultOptions, {
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
  _activateContextListeners(html: JQuery) {
    // Enable custom context menu triggers. If the sheet is not editable, show only the "view" option.
    handleContextMenus(html, this.item, !this.options.editable);
    // Enable tag edit buttons
    handleTagEditButtons(html, this.item);
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
    handleRefDragging(html);

    this._activateContextListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) {
      return;
    }

    // Make +/- buttons work
    handleInputPlusMinusButtons(html, this.item);

    // Make counter pips work
    handleCounterInteraction(html, this.item);

    // Enable hex use triggers.
    handleUsesInteraction(html, this.item);

    // Allow dragging items into lists
    handleDocListDropping(html, this.item);
    handleLIDListDropping(html, this.item);

    // Allow set things by drop. Mostly we use this for manufacturer/license dragging
    handleRefSlotDropping(html, this.item, null); // Don't restrict what can be dropped past type, and don't take ownership or whatever

    // Enable our subform editors editors
    BonusEditDialog.handle(html, ".editable.bonus", this.item);
    ActionEditDialog.handle(html, ".action-editor", this.item);

    // Enable popout editors
    handlePopoutTextEditor(html, this.item);

    // Enable general controls, so items can be deleted and such
    handleGenControls(html, this.item);
  }

  /* -------------------------------------------- */

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
      let deps =
        (await game.packs.get(get_pack_id(EntryType.DEPLOYABLE))?.getDocuments({ type: EntryType.DEPLOYABLE })) ?? [];
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

    if (this.item.is_organization()) {
      // console.log(OrgType);
      data.org_types = OrgType;
    }

    if (this.item.is_status()) {
      data.status_types = StatusConditionType;
      if (!data.system.lid) {
        data.system.lid = `status-${data.document.id}`;
      }
    }

    console.log(`${lp} Rendering with following item ctx: `, data);
    return data;
  }
}
