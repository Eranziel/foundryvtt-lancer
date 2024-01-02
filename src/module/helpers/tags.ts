import type { HelperOptions } from "handlebars";
import { Tag, TagData } from "../models/bits/tag";
import { inc_if, resolve_helper_dotpath } from "./commons";

// A small tag display containing just the label and value
export function compact_tag(tag_path: string, tag: Tag): string {
  // Format the {VAL} out of the name
  let formatted_name = tag.name.replace("{VAL}", `${tag.val ?? "?"}`);
  return `<div class="editable-tag-instance compact-tag flexrow" data-path="${tag_path}">
      <i class="mdi mdi-label i--s i--light"></i>
      <span style="margin: 3px;" >${formatted_name}</span>
    </div>`;
}

// The above, but on an array, filtering out hidden as appropriate
export function compactTagListHBS(tag_array_path: string, options: HelperOptions): string {
  // Collect all of the tags, formatting them using `compact_tag`
  let tags = resolve_helper_dotpath<Tag[]>(options, tag_array_path) ?? [];
  return compactTagList(tags, tag_array_path, { editable: resolve_helper_dotpath(options, "editable", false, true) });
}

export function compactTagList(tags: Tag[], tag_array_path: string, options?: { editable?: boolean }) {
  let processed_tags: string[] = [];
  for (let i = 0; i < tags.length; i++) {
    let tag = tags[i];
    if (!tag.hidden) {
      // We want to show it!
      let affixed_path = `${tag_array_path}.${i}`;
      processed_tags.push(compact_tag(affixed_path, tag));
    }
  }

  // Combine into a row
  if (options?.editable) {
    return `<div class="compact-tag-row tag-list-append" data-path="${tag_array_path}">
      ${processed_tags.join("")}
    </div>`;
  } else if (processed_tags.length) {
    return `<div class="compact-tag-row">
      ${processed_tags.join("")}
    </div>`;
  } else {
    return "";
  }
}

// A card with tags in it, that allows editing if appropriate
export function itemEditTags(path: string, header: string, options: HelperOptions) {
  return `
  <div class="card full">
    <div class="lancer-header lancer-primary major">
      <span>${header}</span>
      ${inc_if(
        `<a class="gen-control fas fa-plus" data-action="append" data-path="${path}" data-action-value="(struct)tag"></a>`,
        resolve_helper_dotpath(options, "editable", false, true)
      )}
    </div>
    ${compactTagListHBS(path, options)}
  </div>`;
}
