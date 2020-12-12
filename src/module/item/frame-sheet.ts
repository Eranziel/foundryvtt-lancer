import { EntryType, FrameTrait } from "machine-mind";
import { defaults } from "machine-mind/dist/funcs";
import { LancerItemSheetData } from "../interfaces";
import { mm_wrap_item } from "../mm-util/helpers";
import { LancerItemSheet } from "./item-sheet";
import { LancerFrame, LancerItem } from "./lancer-item";

/**
 * Extend the generic Lancer item sheet
 * @extends {LancerItemSheet}
 */
export class LancerFrameSheet extends LancerItemSheet {
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

  async _onCreateFrameTrait(event: any) {
    event.preventDefault();

    // Pretty simple, sis
    let data = await this.getDataLazy();
    let mm = data.mm;
    let trait = await new FrameTrait(mm.reg, mm.ctx, defaults.FRAME_TRAIT()).ready();
    mm.ent.Traits.push(trait);
    await mm.ent.writeback();
  }

  async _onDeleteFrameTrait(event: any) {
    event.preventDefault();

    // Get the index
    const elt = $(event.currentTarget);
    const index = elt.prop("index");

    let data = await this.getDataLazy();
    // Splice it out
    let traits = [...data.mm.ent.Traits];
    traits.splice(index, 1);
    data.mm.ent.Traits = traits;

    await data.mm.ent.writeback();
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
  }

  /**
   * Implement the _updateObject method as required by the parent class spec
   * This defines how to update the subject of the form when the form is submitted
   * @private
   */
  async _updateObject(event: Event | JQuery.Event, formData: any): Promise<any> {
    // Update the item
    console.log("Writing back...");
    mergeObject(this._currData, formData, { inplace: true });
    console.log(formData);
    console.log(this._currData);
    // return this._currData?.mm.ent.writeback();
  }

  /**
   * Prepare data for rendering the frame sheet
   * The prepared data object contains both the actor data as well as additional sheet options
   */
  //@ts-ignore
  async getData(): Promise<LancerItemSheetData<EntryType.FRAME>> {
    const data = super.getData() as LancerItemSheetData<EntryType.FRAME>; // Not fully populated yet!

    // Load pilot
    data.mm = await mm_wrap_item(this.item as LancerFrame);
    this._currData = data;
    return data;
  }

  // Cached getdata
  private _currData: LancerItemSheetData<EntryType.FRAME> | null = null;
  private async getDataLazy(): Promise<LancerItemSheetData<EntryType.FRAME>> {
    return this._currData ?? (await this.getData());
  }
}
