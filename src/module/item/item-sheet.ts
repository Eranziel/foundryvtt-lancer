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

    // Add or Remove options
    // Yes, theoretically this could be abstracted out to one function. You do it then.
    html.find(".tags-container").on("click", ".clickable", this._onClickTagControl.bind(this));
    html.find(".effects-container").on("click", ".clickable", this._onClickEffectControl.bind(this));
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
    const tags = this.object.data.data.tags;
    const form = this.form;

    // Add new attribute
    if ( action === "create" ) {
      tags.push()
      await this._onSubmit(event);
    }

    // Remove existing attribute
    else if ( action === "delete" ) {
      const li = a.closest(".tag");
      li.parentElement.removeChild(li);
      await this._onSubmit(event);
    }
  }

  async _onClickTagControl(event) {
    event.preventDefault();
    const a = $(event.currentTarget);
    const action = a.data("action");
    const tags = duplicate(this.object.data.data.tags);

    console.log("_onClickTraitControl()", action, tags);
    if (action === "create") {
      // add tag
      // I can't figure out a better way to prevent collisions
      // Feel free to come up with something better
      const keys = Object.keys(tags);
      var newIndex = 0;
      if (keys.length > 0) {
        newIndex = Math.max.apply(Math, keys) + 1;
      }
      tags[newIndex] = null;
      await this.object.update({ "data.tags": tags });
      await this._onSubmit(event);
    } else if (action === "delete") {
      // delete tag
      const parent = a.parents(".tag");
      const id = parent.data("key");
      delete tags[id];
      tags["-=" + id] = null;
      this.object.update({ "data.tags": tags });
    }
  }

  async _onClickEffectControl(event) {
    event.preventDefault();
    const a = $(event.currentTarget);
    const action = a.data("action");
    const effect = duplicate(this.object.data.data.effect);

    console.log("_onClickTraitControl()", action, effect);
    if (action === "create") {
      // add tag
      // I can't figure out a better way to prevent collisions
      // Feel free to come up with something better
      const keys = Object.keys(effect);
      var newIndex = 0;
      if (keys.length > 0) {
        newIndex = Math.max.apply(Math, keys) + 1;
      }
      effect[newIndex] = null;
      await this.object.update({ "data.effect": effect });
      await this._onSubmit(event);
    } else if (action === "delete") {
      // delete tag
      const parent = a.parents(".effect");
      const id = parent.data("key");
      delete effect[id];
      effect["-=" + id] = null;
      this.object.update({ "data.effect": effect });
    }
  }

  /* -------------------------------------------- */

  /** @override */
  _updateObject(event, formData) {

    // Handle the free-form attributes list
    // const formTags = expandObject(formData).data.tags || {};
    // const tags = Object.values(formAttrs).reduce((obj, v) => {
    //  let k = v["key"].trim();
    //  if ( /[\s\.]/.test(k) )  return ui.notifications.error("ERROR");
    // delete v["key"];
    //  obj[k] = v;
    //  return obj;
    //}, {});
    
    // Remove tags which are no longer used
    //for ( let k of Object.keys(this.object.data.data.tags) ) {
    //  if ( !tags.hasOwnProperty(k) ) tags[`-=${k}`] = null;
    //}

    // Re-combine formData
    //formData = Object.entries(formData).filter(e => !e[0].startsWith("data.tags")).reduce((obj, e) => {
    //  obj[e[0]] = e[1];
    //  return obj;
    //}, {_id: this.object._id, "data.tags": tags});

    // Update the Item
    return this.object.update(formData);
  }
}
