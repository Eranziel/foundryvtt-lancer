import type { LancerActorSheetData, LancerItemSheetData } from "../interfaces";
import { Tag } from "../models/bits/tag";

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
export function compact_tag_list(tag_array_path: string, tags: Tag[], allow_drop: boolean): string {
  // Collect all of the tags, formatting them using `compact_tag`
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
  if (allow_drop) {
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
