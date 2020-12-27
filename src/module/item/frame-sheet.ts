import { EntryType, FrameTrait } from "machine-mind";
import { defaults } from "machine-mind/dist/funcs";
import { LancerItemSheetData } from "../interfaces";
import { gentle_merge } from "../helpers/commons";
import { mm_wrap_item } from "../mm-util/helpers";
import { LancerItemSheet } from "./item-sheet";
import { LancerFrame, LancerItem } from "./lancer-item";

/**
 * Extend the generic Lancer item sheet
 * @extends {LancerItemSheet}
 */
export class LancerFrameSheet extends LancerItemSheet<EntryType.FRAME> {
  /**
   * @override
   * Extend and override the default options used by the generic Lancer item sheet
   * @returns {Object}
   */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      width: 700,
      height: 750,
    });
  }

  // Make a frame trait when the button is pressed
  async _onCreateFrameTrait(event: any) {
    event.preventDefault();

    // Pretty simple, sis
    let data = await this.getDataLazy();
    let mm = data.mm;
    let trait = await new FrameTrait(mm.reg, mm.ctx, defaults.FRAME_TRAIT()).ready();
    mm.ent.Traits.push(trait);
    await mm.ent.writeback();
    this.render();
  }

  // Delete a frame trait when the trashcan is pressed
  async _onDeleteFrameTrait(event: any) {
    event.preventDefault();

    // Get the index
    const elt = event.currentTarget;
    const index = elt.dataset.index;

    let data = await this.getDataLazy();
    // Splice it out
    let traits = [...data.mm.ent.Traits];
    traits.splice(index, 1);
    data.mm.ent.Traits = traits;

    await data.mm.ent.writeback();
    this.render();
  }

  // Handle the "delete" option of the mounts
  async _onChangeMount(event: any) {
    event.preventDefault();

    // Get the index
    const elt = $(event.currentTarget);
    const index = elt.prop("index");
    const value = elt.prop("value");
    if(value == "delete") {
      // If delete, then delete
      let data = await this.getDataLazy();

      // Splice it out
      let mounts = [...data.mm.ent.Mounts];
      mounts.splice(index, 1);
      data.mm.ent.Mounts = mounts;

      // Save it
      await data.mm.ent.writeback();

      // No need to submit
      event.stopPropagation();
    }
  }

  /**
   * @override
   * Activate event listeners using the prepared sheet HTML
   * @param html {JQuery}   The prepared HTML object ready to be rendered into the DOM
   */
  activateListeners(html: JQuery) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Frame trait controls
    let traits = html.find("#frame-traits");
    traits.find(".add-button").on("click", e => this._onCreateFrameTrait(e));
    traits.find(".remove-button").on("click", e => this._onDeleteFrameTrait(e));

    let mounts = html.find("#mounts");
    mounts.find("select").on("change", e => this._onChangeMount(e));
  }
  

}
