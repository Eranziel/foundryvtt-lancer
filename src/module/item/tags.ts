
import data from 'lancer-data';
import { TagData, TagDataShort } from '../interfaces';

/**
 * Search for a tag in lancer-data.
 * @param id The tag's lancer-data id string.
 * @returns The full tag data.
 */
function findTag(id: string): TagData {
  const tags = data.tags;
	// Find the tag id in lancer-data
  for(let i = 0; i < tags.length; i++) {
    const t = tags[i];
    if (t.id === id) {
      return t;
    }
  }
  return null;
}

/**
 * Handlebars helper to generate compact tag template.
 * @param tagShort an object containing the tag's ID and value.
 * @returns The html template for the tag.
 */
export function renderCompactTag(tagShort: TagDataShort): string {
  let template: string = "";
  let tag: TagData = findTag(tagShort.id);
  
  if (tag) {
    // Don't render hidden tags
    if (tag.hidden) return template;

    // Put the value in the tag string
    let tagString: string = tag.name;
    if (tagShort.val) {
      tagString = tagString.replace("{VAL}", String(tagShort.val));
    }
    // Generate the Handlebars partial
    template = `<div class="compact-tag flexrow">
    <i class="mdi mdi-label i--s i--light"></i>
    <span style="margin: 3px;">${tagString}</span>
    </div>`;
  }
  return template;
}

export function renderChunkyTag(tagShort: TagDataShort): string {
  let template: string = "";
  let tag: TagData = findTag(tagShort.id);
  
  if (tag) {
    // Don't render hidden tags
    if (tag.hidden) return template;

    // Put the value in the tag string
    let tagString: string = tag.name;
    let tagDescription: string = tag.description;
    if (tagShort.val) {
      tagString = tagString.replace("{VAL}", String(tagShort.val));
      tagDescription = tagDescription.replace("{VAL}", String(tagShort.val));
    }
    // Generate the Handlebars partial
    template = `<div class="tag flexrow">
      <div class="tag-label">
        <i class="med-icon fa fa-3x fa-tag" style="margin: 3px"></i>
      </div>
      <div class="flexcol">
        <div class="remove-wrapper">
          <span class="major" style="margin: 3px;">${tagString}</span>
          <span>${tagDescription}</span>
        </div>
      </div>
    </div>`;
  }
}
  
/**
 * Handlebars helper to generate verbose tag template.
 * @param tagShort an object containing the tag's ID and value.
 * @returns The html template for the tag.
 */
export function renderFullTag(tagShort: TagDataShort): string {
  let template: string = "";
  let tag: TagData = findTag(tagShort.id);

  if (tag) {
    // Don't render hidden tags
    if (tag.hidden) return template;

    // Put the value in the tag string
    let tagName: string = tag.name;
    let tagDesc: string = tag.description;
    if (tagShort.val) {
      tagName = tagName.replace("{VAL}", String(tagShort.val));
      tagDesc = tagDesc.replace("{VAL}", String(tagShort.val));
    }
    // Generate the Handlebars partial
    template = `<div class="tag">
    <i class="mdi mdi-label i--l theme--main" style="grid-area: 1/1/3/2;"></i>
    <div class="medium theme--main" style="grid-area: 1/2/2/3; text-align:left; padding-left: 0.5em;">${tagName}</div>
    <div class="effect-text" style="grid-area: 2/2/3/3">${tagDesc}</div>
    <a class="remove-button fa fa-trash clickable" style="grid-area: 2/3/3/4; margin-right: 11px; margin-top: 2px"></a>
    </div>`;
  }
  return template;
}
