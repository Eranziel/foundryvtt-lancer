import { LancerItemSheet } from "./item-sheet";
import { handleContextMenus } from "../helpers/item";
import { EntryType } from "../enums";
import { LancerItem, LancerLICENSE } from "./lancer-item";
import { handleDocDropping } from "../helpers/dragdrop";

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
        let index = await pack.getIndex();
        // @ts-expect-error
        let key = this.item.system.key;
        for (let [id, index_data] of index.entries()) {
          // @ts-expect-error
          let item_license = index_data.system.license as string | undefined;
          if (item_license?.startsWith("mf")) item_license = item_license.slice(3).toUpperCase();
          if (item_license != key) continue;

          let doc = await pack.getDocument(id);
          // @ts-expect-error
          let rank = doc.system.license_level as number;
          while (unlocks.length <= rank) {
            unlocks.push([]);
          }
          unlocks[rank].push(doc as LancerItem);
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
    handleContextMenus(html, this.item, true);
  }

  /**
   * @override
   * Activate event listeners using the prepared sheet HTML
   * @param html {JQuery}   The prepared HTML object ready to be rendered into the DOM
   */
  activateListeners(html: JQuery) {
    super.activateListeners(html);

    // If an item is dropped on it, set its license & manufacturer to match the license
    handleDocDropping(html, (doc, dest, evt) => {
      if (doc.type == "Item") {
        doc.document.update({
          system: {
            // @ts-expect-error
            license: this.item.system.key,
            // @ts-expect-error
            manufacturer: this.item.system.manufacturer,
          },
        });
      }
    });

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // TODO: Add refresh button
  }
}
