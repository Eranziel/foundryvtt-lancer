
import data from 'lancer-data';
import { TagData, TagDataShort } from '../interfaces';

/**
 * Search for a tag in lancer-data.
 * @param id The tag's lancer-data id string.
 * @returns The full tag data.
 */
function findTag(id: string): TagData {
  // Only check if we actually got something.
  if(id) {
    const tags = data.tags;
  	// Find the tag id in lancer-data
    for(let i = 0; i < tags.length; i++) {
      const t = tags[i];
      if (t.id === id) {
        return t;
      }
    }
  }
  return null;
}

/**
 * Handlebars helper to generate compact read-only tag template.
 * @param tagShort an object containing the tag's ID and value.
 * @returns The html template for the tag.
 */
export function renderCompactTag(tag: TagData, key: number): string {
  let template: string = "";

  // Initialize if we need to
  if (tag == null) tag = {name: "", description: "", id: ""};

  // Don't render hidden tags
  if (tag["hidden"]) return template;

  // If we have a pre-defined tag, insert info. Otherwise, leave it as-is.
  if (tag["id"]) {
    // Look up values
    tag = findTag(tag["id"]);
  } 

  // Put the value in the tag string
  let tagName: string = tag["name"];
  let tagDesc: string = tag["description"];

  if (tag["val"]) {
    tagName = tagName.replace("{VAL}", String(tag["val"]));
    tagDesc = tagDesc.replace("{VAL}", String(tag["val"]));
  }

  // Generate the Handlebars partial. This will always be the read-only
  template = `<div class="compact-tag flexrow">
  <i class="mdi mdi-label i--s i--light"></i>
  <span style="margin: 3px;">${tagName}</span>
  </div>`;

  return template;
}

export function renderChunkyTag(tag: TagData, key: number): string {
  let template: string = "";

  // Initialize if we need to
  if (tag == null) tag = {name: "", description: "", id: ""};

  // Don't render hidden tags
  if (tag["hidden"]) return template;

  // If we have a pre-defined tag, insert info. Otherwise, leave it as-is.
  if (tag["id"]) {
    // Look up values
    tag = findTag(tag["id"]);

    // Put the value in the tag string
    let tagName: string = tag["name"];
    let tagDesc: string = tag["description"];

    if (tag["val"]) {
      tagName = tagName.replace("{VAL}", String(tag["val"]));
      tagDesc = tagDesc.replace("{VAL}", String(tag["val"]));
    }

    // Generate the Handlebars partial
    template = `<div class="tag flexrow arrayed-item" data-key="${key}">
      <div class="tag-label">
        <i class="med-icon fa fa-3x fa-tag" style="margin: 3px"></i>
      </div>
      <div class="flexcol">
          <span class="major" style="margin: 3px;">${tagName}</span>
          <span>${tagDesc}</span>
          <a class="remove-button fa fa-trash clickable" data-action="delete" style="grid-area: 2/3/3/4; margin-right: 11px; margin-top: -.8em; justify-self: right; align-self: self-start"></a>
      </div>
    </div>`;
  }

  // Editable partial
  template = `<div class="tag flexrow arrayed-item" data-key="${key}">
      <div class="tag-label">
        <i class="med-icon fa fa-3x fa-tag" style="margin: 3px"></i>
      </div>
      <div class="flexcol">
            <input type="String" name="data.tags.${key}.name" value="${tag["name"]}" data-dtype="String" class="lancer-invisible-input medium theme--main" style="grid-area: 1/2/2/3; text-align:left; padding-left: 0.5em; margin-top: 0.25em;"/>
          <textarea class="lancer-invisible-input effect-text" type="string" name="data.tags.${key}.description" data-dtype="String" style="grid-area: 2/2/3/3">${tag["description"]}</textarea>
          <a class="remove-button fa fa-trash clickable" data-action="delete" style="grid-area: 2/3/3/4; margin-right: 11px; margin-top: -.8em; justify-self: right; align-self: self-start"></a>
      </div>
    </div>`;

          

  return template;
}
  
/**
 * Handlebars helper to generate verbose tag template.
 * @param tagShort an object containing the tag's ID and value.
 * @returns The html template for the tag.
 */
export function renderFullTag(tag: TagData, key: number): string {

  let template: string = "";

  // Initialize if we need to
  if (tag == null) tag = {name: "", description: "", id: ""};

  // Don't render hidden tags
  if (tag["hidden"]) return template;

  // If we have a pre-defined tag, insert info. Otherwise, leave it as-is.
  if (tag["id"]) {
    // Look up values
    tag = findTag(tag["id"]);

    // Put the value in the tag string
    let tagName: string = tag["name"];
    let tagDesc: string = tag["description"];

    if (tag["val"]) {
      tagName = tagName.replace("{VAL}", String(tag["val"]));
      tagDesc = tagDesc.replace("{VAL}", String(tag["val"]));
    }

    // Read-only partial
    template = `<div class="tag arrayed-item" data-key="${key}">
    <i class="mdi mdi-label i--l theme--main" style="grid-area: 1/1/3/2;"></i>
    <div class="medium theme--main" style="grid-area: 1/2/2/3; text-align:left; padding-left: 0.5em; margin-top: 0.25em;">${tagName}</div>
    <div class="effect-text" style="grid-area: 2/2/3/3">${tagDesc}</div>
    <a class="remove-button fa fa-trash clickable" data-action="delete" style="grid-area: 2/3/3/4; margin-right: 11px; margin-top: -.8em; justify-self: right; align-self: self-start"></a>
    </div>`;
    return template;
  } 

  // Editable partial
  template = `<div class="tag arrayed-item" data-key="${key}">
            <i class="mdi mdi-label i--l theme--main" style="grid-area: 1/1/3/2;"></i>
            <input type="String" name="data.tags.${key}.name" value="${tag["name"]}" data-dtype="String" class="lancer-invisible-input medium theme--main" style="grid-area: 1/2/2/3; text-align:left; padding-left: 0.5em; margin-top: 0.25em;"/>
          <textarea class="lancer-invisible-input effect-text" type="string" name="data.tags.${key}.description" data-dtype="String" style="grid-area: 2/2/3/3">${tag["description"]}</textarea>
            <a class="remove-button fa fa-trash clickable" data-action="delete" style="grid-area: 2/3/3/4; margin-right: 11px; margin-top: -.8em; justify-self: right; align-self: self-start"></a>
          </div>`;

          

  return template;
}
