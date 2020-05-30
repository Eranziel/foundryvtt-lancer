import { LancerSkillSheetData } from '../interfaces';

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class LancerItemSheet extends ItemSheet {

  /**
   * @override
   * Extend and override the default options used by the Pilot Sheet
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
    const data : LancerSkillSheetData = super.getData() as LancerSkillSheetData;
    // data.dtypes = ["String", "Number", "Boolean"];
    // for ( let attr of Object.values(data.data.attributes) ) {
    //   attr.isCheckbox = attr.dtype === "Boolean";
    // }
    console.log(data);
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

    // Add or Remove Attribute
    // html.find(".attributes").on("click", ".attribute-control", this._onClickAttributeControl.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Listen for click events on an attribute control to modify the composition of attributes in the sheet
   * @param {MouseEvent} event    The originating left click event
   * @private
   */
  // TODO: unused currently
  async _onClickAttributeControl(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const action = a.dataset.action;
    const attrs = this.object.data.data.attributes;
    const form = this.form;

    // Add new attribute
    if ( action === "create" ) {
      const nk = Object.keys(attrs).length + 1;
      let newKey = document.createElement("div");
      newKey.innerHTML = `<input type="text" name="data.attributes.attr${nk}.key" value="attr${nk}"/>`;
      newKey = newKey.children[0] as HTMLDivElement;
      form.appendChild(newKey);
      await this._onSubmit(event);
    }

    // Remove existing attribute
    else if ( action === "delete" ) {
      const li = a.closest(".attribute");
      li.parentElement.removeChild(li);
      await this._onSubmit(event);
    }
  }

  /* -------------------------------------------- */

  /** @override */
  _updateObject(event, formData) {

    // Handle the free-form attributes list
    // const formAttrs = expandObject(formData).data.attributes || {};
    // const attributes = Object.values(formAttrs).reduce((obj, v) => {
    //   let k = v["key"].trim();
    //   if ( /[\s\.]/.test(k) )  return ui.notifications.error("Attribute keys may not contain spaces or periods");
    //   delete v["key"];
    //   obj[k] = v;
    //   return obj;
    // }, {});
    
    // // Remove attributes which are no longer used
    // for ( let k of Object.keys(this.object.data.data.attributes) ) {
    //   if ( !attributes.hasOwnProperty(k) ) attributes[`-=${k}`] = null;
    // }

    // // Re-combine formData
    // formData = Object.entries(formData).filter(e => !e[0].startsWith("data.attributes")).reduce((obj, e) => {
    //   obj[e[0]] = e[1];
    //   return obj;
    // }, {_id: this.object._id, "data.attributes": attributes});

    // Update the Item
    return this.object.update(formData);
  }
}
