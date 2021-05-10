import { LancerItemSheetData } from "../interfaces";
import { LANCER } from "../config";
import { LancerItem, LancerItemType } from "./lancer-item";
import {
  HANDLER_activate_general_controls,
  gentle_merge,
  resolve_dotpath,
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
import { EntryType, Skill, SkillFamily } from "machine-mind";
import { get_pack } from "../mm-util/db_abstractions";
import { HANDLER_activate_edit_bonus } from "../helpers/item";
import { HANDLER_activate_tag_context_menus, HANDLER_activate_tag_dropping } from "../helpers/tags";
import { CollapseHandler } from "../helpers/collapse";
import { activate_action_editor } from "../apps/action-editor";

const lp = LANCER.log_prefix;

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class LancerItemSheet<T extends LancerItemType> extends ItemSheet {
  // Tracks collapse state between renders
  private collapse_handler = new CollapseHandler();

  /**
   * @override
   * Extend and override the default options used by the Item Sheet
   * @returns {Object}
   */
  static get defaultOptions() {
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

  constructor(...args: any) {
    super(...args);
    if (this.item.type == EntryType.MECH_WEAPON) {
      this.options.initial = `profile${this.item.data.data.selected_profile || 0}`;
    }
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
    const mod_handler = (delta: number) => (ev: Event) => {
      if (!ev.currentTarget) return; // No target, let other handlers take care of it.
      const button = $(ev.currentTarget as HTMLElement);
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
    // Allow dragging items into lists
    HANDLER_add_ref_to_list_on_drop(html, getfunc, commitfunc);

    // Allow set things by drop. Mostly we use this for manufacturer/license dragging
    HANDLER_activate_ref_drop_setting(html, getfunc, commitfunc);
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
    HANDLER_activate_tag_dropping(html, getfunc, commitfunc);

    // Enable action editors
    activate_action_editor(html, getfunc, commitfunc);
  }

  /* -------------------------------------------- */

  // Helper function for making fields effectively target multiple attributes
  _propagateMMData(formData: any) {
    // Pushes relevant field data down from the "item" data block to the "mm" data block
    // Returns true if any of these top level fields require updating (i.e. do we need to .update({img: ___, name: __, etc}))
    formData["mm.Name"] = formData["name"];

    return this.item.img != formData["img"] || this.item.name != formData["name"];
  }

  /**
   * Implement the _updateObject method as required by the parent class spec
   * This defines how to update the subject of the form when the form is submitted
   * @private
   */
  async _updateObject(event: Event | JQuery.Event, formData: any): Promise<any> {
    // Fetch data, modify, and writeback
    let ct = await this.getDataLazy();

    let need_top_update = this._propagateMMData(formData);

    // Do a separate update depending on mm data
    if (need_top_update) {
      let top_update = {} as any;
      for (let key of Object.keys(formData)) {
        if (!key.includes("mm")) {
          top_update[key] = formData[key];
        }
      }
      await this.item.update(top_update, {});
    } else {
      gentle_merge(ct, formData);
      await this._commitCurrMM();
    }
  }

  /**
   * Prepare data for rendering the frame sheet
   * The prepared data object contains both the actor data as well as additional sheet options
   */
  //@ts-ignore Foundry-pc-types does not properly acknowledge that sheet `getData` functions can be/are asynchronous
  async getData(): Promise<LancerItemSheetData<T>> {
    // If a compendium, wait 50ms to avoid most race conflicts. TODO: Remove this when foundry fixes compendium editing to not be so awful
    if (this.item.compendium) {
      this.object = await new Promise(s => setTimeout(s, 50))
        //@ts-ignore
        .then(() => get_pack(this.item.type))
        .then(p => p.getEntity(this.item.id));
    }
    const data = super.getData() as LancerItemSheetData<T>; // Not fully populated yet!

    // Wait for preparations to complete
    let tmp_dat = this.item.data as LancerItem<T>["data"]; // For typing convenience
    data.mm = await tmp_dat.data.derived.mm_promise;
    let lic_ref = tmp_dat.data.derived.license;
    data.license = lic_ref ? await data.mm.Registry.resolve(data.mm.OpCtx, lic_ref) : null;

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
}
