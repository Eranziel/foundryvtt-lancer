import { LancerItemSheet } from "./item-sheet";

/**
 * Extend the generic Lancer item sheet
 * @extends {LancerItemSheet}
 */
export class LancerNPCClassSheet extends LancerItemSheet {
  /**
   * @override
   * Extend and override the default options used by the generic Lancer item sheet
   * @returns {Object}
   */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      width: 900,
      height: 750,
    });
  }
}
