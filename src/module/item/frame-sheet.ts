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
   * Tag controls event handler
   * @param event The click event
   */
  async _onClickTagControl(event: any) {
    event.preventDefault();
    const a = $(event.currentTarget);
    const action = a.data("action");
    console.log(this);
    const tags = duplicate(this.object.data.data.core_system.tags);

    console.log("_onClickTagControl()", action, tags);
    if (action === "create") {
      // add tag
      // I can't figure out a better way to prevent collisions
      // Feel free to come up with something better
      // const keys = Object.keys(tags);
      // var newIndex = 0;
      // if (keys.length > 0) {
      //   newIndex = Math.max.apply(Math, keys) + 1;
      // }
      // tags[newIndex] = null;
      // Default new tags to quick action... is there a better solution?
      tags.push({ id: "tg_quick_action" });
      await this.object.update({ "data.core_system.tags": tags }, {});
      await this._onSubmit(event);
    } else if (action === "delete") {
      // delete tag
      const parent = a.parents(".tag");
      const id = parent.data("key");
      delete tags[id];
      tags["-=" + id] = null;
      this.object.update({ "data.core_system.tags": tags }, {});
    }
  }

  /**
   * @override
   * Prepare data for rendering the Item sheet
   * The prepared data object contains both the item data as well as additional sheet options
   */
  getData() {
    const data: ItemSheetData = super.getData();

    // TODO: frame size

    // TODO: find integrated weapon
    return data;
  }
}
