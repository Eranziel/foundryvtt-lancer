import { LancerItemSheet } from "./item-sheet";
import { handleContextMenus } from "../helpers/item";
import { EntryType } from "../enums";
import { LancerItem, LancerLICENSE } from "./lancer-item";
import { handleDocDropping } from "../helpers/dragdrop";
import { get_pack_id } from "../util/doc";

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
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 700,
      height: 750,
    });
  }

  async getData() {
    let data = await super.getData();

    // Build an unlocks array
    let unlocks: LancerItem[][] = [[]];

    // Find the assoc frame
    for (let et of [EntryType.FRAME, EntryType.MECH_SYSTEM, EntryType.MECH_WEAPON, EntryType.WEAPON_MOD]) {
      let pack = game.packs.get(get_pack_id(et));
      if (pack) {
        let index = await pack.getIndex();
        // @ts-expect-error
        let key = this.item.system.key;
        for (let [id, indexData] of index.entries()) {
          // @ts-expect-error
          let itemLicense = indexData.system.license as string | undefined;
          if (itemLicense !== key) continue;

          let doc = (await pack.getDocument(id)) as unknown as LancerItem;
          // @ts-expect-error
          let rank = doc.system.license_level as number;
          while (unlocks.length <= rank) {
            unlocks.push([]);
          }
          // Don't add duplicates
          if (unlocks[rank].some(i => i.id === doc.id)) continue;
          unlocks[rank].push(doc as LancerItem);
        }
      }
    }
    // Sort the items in the unlocks. Frames first, then alphabetical by name.
    for (let i = 0; i < unlocks.length; i++) {
      unlocks[i].sort((a, b) => {
        if (a.is_frame() && !b.is_frame()) return -1;
        if (!a.is_frame() && b.is_frame()) return 1;
        return a.name!.localeCompare(b.name!);
      });
    }

    // Put the unlocks array in. Don't bother meddling the type
    (data as any)["unlocks"] = unlocks;

    // Pass it along
    return data;
  }

  /**
   * @override
   */
  _activateContextListeners(html: JQuery) {
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
