
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
 * Prepares a tag's name, description, and value.
 * @param tag The tag to prepare.
 */
function prepareTag(tag: TagData): TagData {
  // Initialize if we need to
  if (tag === null) tag = {name: "", description: "", id: ""};

  // If we have a pre-defined tag, insert info. Otherwise, leave it as-is.
  if (tag["id"]) {
    // Look up values
    const tagdata = findTag(tag["id"]);
    tag["name"] = tagdata["name"];
    tag["description"] = tagdata["description"];

    let val: string | number = 0;
    if (tag.val) val = tag.val;
    else if (tagdata.val) val = tagdata.val;
    // If the tag has a value, insert it into the text.
    if (val !== 0) {
      tag["val"] = val;
      tag["name"] = tag["name"].replace("{VAL}", String(tag["val"]));
      tag["description"] = tag["description"].replace("{VAL}", String(tag["val"]));
    }
  } 
  return tag;
}

/**
 * Handlebars helper to generate compact read-only tag template.
 * @param tagShort an object containing the tag's ID and value.
 * @returns The html template for the tag.
 */
export function renderCompactTag(tag: TagData, key?: number): string {
  let template: string = "";
  tag = prepareTag(tag);

  // Don't render hidden tags
  if (tag["hidden"]) return template;

  // Generate the Handlebars partial. This will always be the read-only
  template = `<div class="compact-tag flexrow">
  <i class="mdi mdi-label i--s i--light"></i>
  <span style="margin: 3px;">${tag.name}</span>
  </div>`;

  return template;
}

/**
 * Handlebars partial to generate a list of tags for weapon/system previews.
 */
export const compactTagList = 
`<div class="compact-tag-row"">
  {{#each tags as |tag tkey|}}
  {{{compact-tag tag}}}
  {{/each}}
</div>`;

export function renderChunkyTag(tag: TagData, key: number): string {
  let template: string = "";
  tag = prepareTag(tag);

  // Don't render hidden tags
  if (tag["hidden"]) return template;

  // Editable partial
  template = `<div class="tag flexrow arrayed-item" data-key="${key}">
    <div class="tag-label">
      <i class="med-icon fa fa-3x fa-tag" style="margin: 3px"></i>
    </div>
    <div class="flexcol">
      <input type="String" name="data.tags.${key}.name" value="${tag.name}" data-dtype="String" class="lancer-invisible-input medium theme--main" style="grid-area: 1/2/2/3; text-align:left; padding-left: 0.5em; margin-top: 0.25em;"/>
      <textarea class="lancer-invisible-input effect-text" type="string" name="data.tags.${key}.description" data-dtype="String" style="grid-area: 2/2/3/3">${tag.description}</textarea>
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
export function renderFullTag(tag: TagData, key: number, data_prefix: string = "data.tags"): string {
  let template: string = "";
  tag = prepareTag(tag);

  // Don't render hidden tags
  if (tag["hidden"]) return template;

  // Editable partial
  template = `<div class="tag arrayed-item" data-key="${key}">
  <i class="mdi mdi-label i--l theme--main" style="grid-area: 1/1/3/2;"></i>
  <input type="String" name="${data_prefix}.${key}.name" value="${tag.name}" data-dtype="String" class="lancer-invisible-input medium theme--main" style="grid-area: 1/2/2/3; text-align:left; padding-left: 0.5em; margin-top: 0.25em;"/>
  <textarea class="lancer-invisible-input effect-text" type="string" name="${data_prefix}.${key}.description" data-dtype="String" style="grid-area: 2/2/3/3">${tag.description}</textarea>
  <a class="remove-button fa fa-trash clickable" data-action="delete" style="grid-area: 2/3/3/4; margin-right: 11px; margin-top: -.8em; justify-self: right; align-self: self-start"></a>
  </div>`;
  return template;
}
