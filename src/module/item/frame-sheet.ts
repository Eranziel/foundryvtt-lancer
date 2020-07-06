import { LancerItemSheet } from "./item-sheet";

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
   * Prepare data for rendering the Item sheet
   * The prepared data object contains both the item data as well as additional sheet options
   */
  getData() {
    const data: ItemSheetData = super.getData();
    
    // TODO: frame size

    console.log(data);
    return data;
  }

}