import type { LancerItemSheetData } from "../interfaces";
import { LANCER } from "../config";
import type { LancerItem, LancerItemType } from "./lancer-item";
import {
  HANDLER_activate_general_controls,
  gentle_merge,
  HANDLER_activate_popout_text_editor,
} from "../helpers/commons";
import {
  HANDLER_activate_native_ref_dragging,
  HANDLER_activate_ref_dragging,
  HANDLER_activate_ref_drop_clearing,
  HANDLER_activate_ref_drop_setting,
  HANDLER_add_ref_to_list_on_drop,
  HANDLER_openRefOnClick,
} from "../helpers/refs";
import { OpCtx } from "machine-mind";
import { HANDLER_activate_edit_bonus } from "../helpers/item";
import { HANDLER_activate_tag_context_menus, HANDLER_activate_tag_dropping } from "../helpers/tags";
import { CollapseHandler } from "../helpers/collapse";
import { activate_action_editor } from "../apps/action-editor";
import type { FoundryFlagData } from "../mm-util/foundry-reg";
import { find_license_for } from "../mm-util/helpers";
import { MMDragResolveCache } from "../helpers/dragdrop";

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
      this.options.initial = `profile${this.item.data.data.selected_profile || 0}`;
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
    const path = "systems/lancer/templates/item";
    return `${path}/${this.item.data.type}.hbs`;
  }

  /* -------------------------------------------- */

  /** @override */
  // setPosition(options = {}) {
  // const sheetBody = (this.element as HTMLDivElement).find(".sheet-body");
  // const bodyHeight = position.height - 192;
  // sheetBody.css("height", bodyHeight);
  // return super.setPosition(options);
  // }

  /* -------------------------------------------- */

  /**
   * @override
   * Activate event listeners using the prepared sheet HTML
   * @param html {JQuery}   The prepared HTML object ready to be rendered into the DOM
   */
  activateListeners(html: JQuery) {
    super.activateListeners(html);

    // Make refs clickable
    $(html).find(".ref.valid").on("click", HANDLER_openRefOnClick);

    // Enable ref dragging
    HANDLER_activate_ref_dragging(html);
    HANDLER_activate_native_ref_dragging(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) {
      console.log("Not editable!"); // TODO: remove
      return;
    }

    // Customized increment/decrement arrows. Same as in actor. TODO: Standardize??
    const mod_handler = (delta: number) => (ev: JQuery.ClickEvent<HTMLElement, unknown, HTMLElement, HTMLElement>) => {
      if (!ev.currentTarget) return; // No target, let other handlers take care of it.
      const button = $(ev.currentTarget);
      const input = button.siblings("input");
      const curr = Number.parseInt(input.prop("value"));
      if (!isNaN(curr)) {
        input.prop("value", curr + delta);
      }
      this.submit({});
    };

    // Behavior is identical, just +1 or -1 depending on button
    let decr = html.find('button[class*="mod-minus-button"]');
    decr.on("click", mod_handler(-1));
    let incr = html.find('button[class*="mod-plus-button"]');
    incr.on("click", mod_handler(+1));

    let getfunc = () => this.getDataLazy();
    let commitfunc = (_: any) => this._commitCurrMM();

    // Grab pre-existing ctx if available
    let ctx = this.getCtx() || new OpCtx();
    let resolver = new MMDragResolveCache(ctx);

    // Allow dragging items into lists
    HANDLER_add_ref_to_list_on_drop(resolver, html, getfunc, commitfunc);

    // Allow set things by drop. Mostly we use this for manufacturer/license dragging
    HANDLER_activate_ref_drop_setting(resolver, html, null, null, getfunc, commitfunc); // Don't restrict what can be dropped past type, and don't take ownership or whatever
    HANDLER_activate_ref_drop_clearing(html, getfunc, commitfunc);

    // Enable bonus editors
    HANDLER_activate_edit_bonus(html, getfunc, commitfunc);

    // Enable tag editing
    HANDLER_activate_tag_context_menus(html, getfunc, commitfunc);

    // Enable popout editors
    HANDLER_activate_popout_text_editor(html, getfunc, commitfunc);

    // Enable general controls, so items can be deleted and such
    HANDLER_activate_general_controls(html, getfunc, commitfunc);

    // Enable tag dropping
    HANDLER_activate_tag_dropping(resolver, html, getfunc, commitfunc);

    // Enable action editors
    activate_action_editor(html, getfunc, commitfunc);
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
    // Fetch data, modify, and writeback
    let ct = await this.getDataLazy();

    // Automatically propagates chanages that should affect multiple things.
    let new_top = this._propagateMMData(formData);

    // No need for the complicated actor logic since no token weirdness to account for
    gentle_merge(ct, formData);
    mergeObject((ct.mm.Flags as FoundryFlagData<any>).top_level_data, new_top);
    await this._commitCurrMM();
  }

  /**
   * Prepare data for rendering the frame sheet
   * The prepared data object contains both the actor data as well as additional sheet options
   */
  async getData(): Promise<LancerItemSheetData<T>> {
    // If a compendium, wait 50ms to avoid most race conflicts. TODO: Remove this when foundry fixes compendium editing to not be so awful
    // if (this.item.compendium) {
    // this.object = await new Promise(s => setTimeout(s, 50))
    // .then(() => get_pack(this.item.type))
    // .then(p => p.getEntity(this.item.id));
    // }
    const data = super.getData() as LancerItemSheetData<T>; // Not fully populated yet!

    // Wait for preparations to complete
    let tmp_dat = this.item.data;
    // @ts-ignore T doesn't narrow this.item.data
    data.mm = await tmp_dat.data.derived.mm_promise;

    // Additionally we would like to find a matching license. Re-use ctx, try both a world and global reg, actor as well if it exists
    data.license = null;
    if (this.actor?.is_pilot() || this.actor?.is_mech()) {
      data.license = await find_license_for(data.mm, this.actor!);
    } else {
      data.license = await find_license_for(data.mm);
    }

    console.log(`${lp} Rendering with following item ctx: `, data);
    this._currData = data;
    return data;
  }

  // Cached getdata
  private _currData: LancerItemSheetData<T> | null = null;
  async getDataLazy(): Promise<LancerItemSheetData<T>> {
    return this._currData ?? (await this.getData());
  }

  // Write back our currently cached _currData, then refresh this sheet
  // Useful for when we want to do non form-based alterations
  async _commitCurrMM() {
    console.log("Committing");
    let cd = this._currData;
    this._currData = null;
    (await cd?.mm.writeback()) ?? null;

    // Compendium entries don't re-draw appropriately
    if (this.item.compendium) {
      this.render();
    }
  }

  // Get the ctx that our actor + its items reside in. If an unowned item we'll just yield null
  getCtx(): OpCtx | null {
    let ctx = this.item.data.data.derived.mm?.OpCtx;
    return ctx ?? null;
  }
}
