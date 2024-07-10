import { EntryType } from "../enums";
import { LancerItemSheetData } from "../interfaces";
import { lookupDeployables, lookupLID } from "../util/lid";
import { LancerItemSheet } from "./item-sheet";

/**
 * Extend the generic Lancer item sheet
 * @extends {LancerItemSheet}
 */
export class LancerFrameSheet extends LancerItemSheet<EntryType.FRAME> {
  /**
   * @override
   * Extend and override the default options used by the generic Lancer item sheet
   */
  static get defaultOptions(): ItemSheet.Options {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 700,
      height: 750,
    });
  }

  // Handle the "delete" option of the mounts
  async _onChangeMount(event: any) {
    // Get the index
    const elt = $(event.currentTarget);
    const index = elt.prop("index");
    const value = elt.prop("value");
    if (value == "delete") {
      // If delete, then circumvent normal update to delete the mount
      event.stopPropagation();
      let data = await this.getData();

      // Splice it out
      let mounts = [...data.system.mounts];
      mounts.splice(index, 1);
      this.item.update({
        "system.mounts": mounts,
      });
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

    // Watch for select delete on mount
    html.find(".mount-selector").on("change", e => this._onChangeMount(e));
  }

  async getData(): Promise<LancerItemSheetData<EntryType.FRAME>> {
    let data = await super.getData();
    (data as any).coreDeployables = await lookupDeployables(data.system.core_system.deployables);
    return data;
  }
}
