import { TagInstance, typed_lancer_data } from "machine-mind";
import { TagData } from "../interfaces";

const TAGS = typed_lancer_data.tags;

/**
 * Search for a tag template in lancer-data.
 * @param id The tag's lancer-data id string.
 * @returns The full tag data.
 */
function findTag(id: string): TagData | null {
  // Only check if we actually got something.
  if (id) {
    // Find the tag id in lancer-data
    for (let i = 0; i < TAGS.length; i++) {
      const t = TAGS[i];
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
function prepareTag(tag: TagData | null): TagData {
  // Initialize if we need to
  const default_tag = { name: "", description: "", id: "", brew: "n/a", counters: [] };
  tag = tag || default_tag;

  // If we have a pre-defined tag, insert info. Otherwise, leave it as-is.
  if (tag["id"]) {
    // Look up values
    const tagdata = findTag(tag["id"]);
    if (tagdata) {
      tag["name"] = tagdata["name"];
      tag["description"] = tagdata["description"];

      let val: string | number = 0;
      if (tag.val) {
        val = tag.val;
      } else if (tagdata.val) {
        val = tagdata.val;
      }
      // If the tag has a value, insert it into the text.
      if (val !== 0) {
        tag["val"] = val;
        tag["name"] = tag["name"].replace("{VAL}", String(tag["val"]));
        tag["description"] = tag["description"].replace("{VAL}", String(tag["val"]));
      }
    } else {
      tag = default_tag;
    }
  }
  return tag;
}

/**
 * Handlebars helper to generate compact read-only tag template.
 * @param tag {TagData | null} an object containing the tag's ID and value.
 * @returns {string} The html template for the tag.
 */
export function renderCompactTag(tag: TagData | null): string {
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
export const compactTagList = `<div class="compact-tag-row">
  {{#each tags as |tag tkey|}}
  {{{compact-tag tag}}}
  {{/each}}
</div>`;

// An MM version of the above partial
export function compact_tag_list(tags: TagInstance[]): string {
  let filtered_tags = tags.filter(t => !t.Tag.IsHidden);
  let processed_tags = filtered_tags.map(t => `
    <div class="compact-tag flexrow">
      <i class="mdi mdi-label i--s i--light"></i>
      <span style="margin: 3px;">${t.Tag.Name.replace("{VAL}", (""+t.Value ?? "?"))}</span>
    </div>`);

  return `<div class="compact-tag-row">
    ${processed_tags.join("")}
  </div>`;
}

export function renderChunkyTag(tag: TagData | null, key: number): string {
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
      <input name="data.tags.${key}.name" value="${tag.name}" data-dtype="String" class="lancer-invisible-input medium theme--main" style="grid-area: 1/2/2/3; text-align:left; padding-left: 0.5em; margin-top: 0.25em;"/>
      <textarea class="lancer-invisible-input effect-text" name="data.tags.${key}.description" data-dtype="String" style="grid-area: 2/2/3/3">${tag.description}</textarea>
      <a class="remove-button fa fa-trash clickable" data-action="delete" style="grid-area: 2/3/3/4; margin-right: 11px; margin-top: -.8em; justify-self: right; align-self: self-start"></a>
    </div>
  </div>`;
  return template;
}

/**
 * Handlebars helper to generate verbose tag template.
 * @returns The html template for the tag.
 * @param tag {TagData | null} The tag's data.
 * @param key {number} The value of the tag's data-key in the DOM.
 * @param data_prefix {string} The path to the tag's data in the data model.
 * @returns {string} The html template for the tag.
 */
export function renderFullTag(
  tag: TagData | null,
  key: number,
  data_prefix: string = "data.tags"
): string {
  let template: string = "";
  tag = prepareTag(tag);

  // Don't render hidden tags
  if (tag["hidden"]) return template;

  // Editable partial
  template = `<div class="tag arrayed-item" data-key="${key}">
  <i class="mdi mdi-label i--l theme--main" style="grid-area: 1/1/3/2;"></i>
  <input name="${data_prefix}.${key}.id" value="${tag.id}" data-dtype="String" style="display:none"/>
  <input name="${data_prefix}.${key}.val" value="${tag.val}" data-dtype="String" style="display:none"/>
  <input name="${data_prefix}.${key}.name" value="${tag.name}" data-dtype="String" class="lancer-invisible-input medium theme--main" style="grid-area: 1/2/2/3; text-align:left; padding-left: 0.5em; margin-top: 0.25em;"/>
  <textarea class="lancer-invisible-input effect-text" name="${data_prefix}.${key}.description" data-dtype="String" style="grid-area: 2/2/3/3">${tag.description}</textarea>
  <a class="remove-button fa fa-trash clickable" data-action="delete" style="grid-area: 2/3/3/4; margin-right: 11px; margin-top: -.8em; justify-self: right; align-self: self-start"></a>
  </div>`;
  return template;
}
