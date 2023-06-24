import { LancerItemSheet } from "./item-sheet";
import { handleItemContextMenus } from "../helpers/item";
import { LancerItemSheetData } from "../interfaces";
import { EntryType } from "../enums";
import { LancerItem, LancerLICENSE } from "./lancer-item";

/**
 * Extend the generic Lancer item sheet
 * @extends {LancerItemSheet}
 */
export class LancerLicenseSheet extends LancerItemSheet<EntryType.LICENSE> {
  /**
   * @override
   * Extend and override the default options used by the generic Lancer item sheet
   */
  static get defaultOptions(): ItemSheet.Options {
    return mergeObject(super.defaultOptions, {
      width: 700,
      height: 750,
    });
  }

  async getData() {
    let data = await super.getData();
    let license = this.item as LancerLICENSE;

    // Build an unlocks array

    // let ranks = Array.from(scan.ByLevel.keys()).sort();
    let unlocks: LancerItem[][] = [[]];

    // Find the assoc frame
    for (let et of [EntryType.FRAME, EntryType.MECH_SYSTEM, EntryType.MECH_WEAPON, EntryType.WEAPON_MOD]) {
      let pack = game.packs.get(`world.${et}`);
      if (pack) {
        let docs = (await pack.getDocuments({ system: { license: license.system.key } })) as any;
        for (let d of docs as LancerItem[]) {
          let rank = (d as any).system.license_level as number;
          while (unlocks.length <= rank) {
            unlocks.push([]);
          }
          unlocks[rank].push(d);
        }
      }
    }
    console.log(unlocks);

    // Put the unlocks array in. Don't bother meddling the type
    (data as any)["unlocks"] = unlocks;

    // Pass it along
    return data;
  }

  /**
   * @override
   */
  _activate_context_listeners(html: JQuery) {
    // Enable custom context menu triggers with only the "view" option.
    handleItemContextMenus(html, this.item, true);
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

    // TODO: Add refresh button
  }
}
