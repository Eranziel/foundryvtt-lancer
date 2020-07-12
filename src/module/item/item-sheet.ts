import { LancerSkillSheetData } from '../interfaces';

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class LancerItemSheet extends ItemSheet {

  /**
   * @override
   * Extend and override the default options used by the Item Sheet
   * @returns {Object}
   */
	static get defaultOptions() {
	  return mergeObject(super.defaultOptions, {
			classes: ["lancer", "sheet", "item"],
			width: 520,
			height: 480,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description"}]
		});
  }

  /** @override */
  get template() {
    const path = "systems/lancer/templates/item";
    return `${path}/${this.item.data.type}.html`;
  }


  /* -------------------------------------------- */

  /**
   * @override
   * Prepare data for rendering the Item sheet
   * The prepared data object contains both the item data as well as additional sheet options
   */
  getData() {
    const data: ItemSheetData = super.getData();
    // data.dtypes = ["String", "Number", "Boolean"];
    // for ( let attr of Object.values(data.data.attributes) ) {
    //   attr.isCheckbox = attr.dtype === "Boolean";
    // }
    console.log('LANCER | Item sheet data: ', data);
    return data;
  }

  /* -------------------------------------------- */

  /** @override */
  setPosition(options={}) {
    const position = super.setPosition(options);
    // const sheetBody = (this.element as HTMLDivElement).find(".sheet-body");
    // const bodyHeight = position.height - 192;
    // sheetBody.css("height", bodyHeight);
    return position;
  }

  /* -------------------------------------------- */

  /**
   * @override
   * Activate event listeners using the prepared sheet HTML
   * @param html {HTML}   The prepared HTML object ready to be rendered into the DOM
   */
	activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Add or Remove options
    // Yes, theoretically this could be abstracted out to one function. You do it then.
    html.find(".arrayed-item-container").on("click", ".clickable", this._onClickArrayControl.bind(this));
    html.find(".arrayed-item-container").on("change", ".delete-selector", this._onSelectDelete.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Listen for events on a selector to remove the referenced item
   * @param event    The originating event
   * @private
   */
  async _onSelectDelete(event) {
    const s = $(event.currentTarget);
    if(s.val() === "delete") {
      event.preventDefault();
      const itemString = s.data("item");
      var itemArr = duplicate(this["object"]["data"]["data"][itemString]);
      const parent = s.parents(".arrayed-item");
      const id = parent.data("key");

      delete itemArr[id];
      itemArr["-=" + id] = null;
      console.log(itemArr);
      await parent.remove();
      await this.object.update({ "data.mounts" : itemArr });

    }

  }

  /**
   * Listen for click events on an attribute control to modify the composition of attributes in the sheet
   * @param {MouseEvent} event    The originating left click event
   * @private
   */
  async _onClickArrayControl(event) {
    event.preventDefault();
    const a = $(event.currentTarget);
    const action = a.data("action");
    const itemString = a.parents(".arrayed-item-container").data("item");
    console.log(itemString)
    var itemArr = duplicate(getValue(this,("object.data.data." + itemString)));
    const dataRef = "data." + itemString;

    console.log("_onClickArrayControl()", action, itemArr, itemString);
    if (action === "create") {
      // I can't figure out a better way to prevent collisions
      // Feel free to come up with something better
      const keys = Object.keys(itemArr);
      var newIndex = 0;
      if (keys.length > 0) {
        newIndex = Math.max.apply(Math, keys) + 1;
      }
      itemArr[newIndex] = null;
      await this.object.update({ [dataRef] : itemArr});
    } else if (action === "delete") {
      // delete tag
      const parent = a.parents(".arrayed-item");
      const id = parent.data("key");
      
      // Since we're doing weird things with arrays, let's just split as needed
      if (Array.isArray(itemArr)) {
        // This is for arrays: 
        itemArr.splice(id,1);
      } else {
        // For dict
        delete itemArr[id];
        itemArr["-=" + id] = null;

        // So the question now becomes: why do all my arrays become dicts of objects?
      }

      this.object.update({ [dataRef] : itemArr });
    }
  }

  /* -------------------------------------------- */

  /** @override */
  _updateObject(event, formData) {
    console.log("LANCER | Item sheet form data: ", formData);

    // Update the Item
    return this.object.update(formData);
  }
}

// Helper function to get arbitrarily deep array references
function getValue(object, path) {
    return path.
        replace(/\[/g, '.').
        replace(/\]/g, '').
        split('.').
        reduce((o, k) => (o || {})[k], object);
}