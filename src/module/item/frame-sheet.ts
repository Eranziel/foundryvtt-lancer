import { EntryType } from "machine-mind";
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

  /**
   * @override
   * Tag controls event handler
   * @param event The click event
   */
  async _onCreateFrameTrait(event: any) {
    event.preventDefault();

    console.log("Self in onCreate: ", this);

    // Pretty simple, sis
    let data = await this.getDataLazy();
    // Make it
    let new_trait = await data.mm.reg.create_live(EntryType.FRAME_TRAIT, data.mm.ctx);
    // Add it
    data.mm.ent.Traits.push(new_trait);
    // Write it
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

    // Add a frame trait, when they ask to
    let add_trait = html.find("#add_trait");
    add_trait.on("click", (e) => this._onCreateFrameTrait(e));
  }

  /**
   * Implement the _updateObject method as required by the parent class spec
   * This defines how to update the subject of the form when the form is submitted
   * @private
   */
  async _updateObject(event: Event | JQuery.Event, formData: any): Promise<any> {
    // Update the item
    console.log("Writing back...");
    mergeObject(this._currData, formData, {inplace: true});
    console.log(formData);
    console.log(this._currData);
    return this._currData?.mm.ent.writeback();
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
    console.log(`Mech ctx: `, data.mm);
    this._currData = data;
    return data;
  }

  // Cached getdata
  private _currData: LancerItemSheetData<EntryType.FRAME> | null = null;
  private async getDataLazy(): Promise<LancerItemSheetData<EntryType.FRAME>> {
    return this._currData ?? (await this.getData());
  }
}
