import { EntryType, FrameTrait, MountType } from "machine-mind";
import { funcs } from "machine-mind";
import { LancerItemSheet } from "./item-sheet";

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
    let trait = await new FrameTrait(mm.reg, mm.ctx, funcs.defaults.FRAME_TRAIT()).ready();
    mm.ent.Traits.push(trait);
    await mm.ent.writeback();
    this.render();
  }

  // Delete a frame trait when the trashcan is pressed
  async _onDeleteFrameTrait(event: any) {
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

  // Make a mount trait when the button is pressed
  async _onCreateMount(event: any) {
    // Just push on a main
    let data = await this.getDataLazy();
    data.mm.ent.Mounts.push(MountType.Main);
    return data.mm.ent.writeback();
  }

  // Handle the "delete" option of the mounts
  async _onChangeMount(event: any) {
    // Get the index
    const elt = $(event.currentTarget);
    const index = elt.prop("index");
    const value = elt.prop("value");
    if (value == "delete") {
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

      // But do need to refresh
      this.render();
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

    // Add controls
    html.find("#add-trait-button").on("click", e => this._onCreateFrameTrait(e));
    html.find("#add-mount-button").on("click", e => this._onCreateMount(e));

    // Watch for select delete on mount
    html.find(".mount-selector").on("change", e => this._onChangeMount(e));
  }
}
