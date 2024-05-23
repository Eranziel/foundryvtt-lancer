import type { HelperOptions } from "handlebars";
import { Tag } from "../models/bits/tag";
import { inc_if, resolveHelperDotpath } from "./commons";

// A small tag display containing just the label and value
export function compactTag(tagPath: string, tag: Tag, editable: boolean = true): string {
  // Format the {VAL} out of the name
  let formattedName = tag.name.replace("{VAL}", `${tag.val ?? "?"}`);
  return `<div class="${editable ? "editable-tag-instance" : ""} compact-tag flexrow" ${
    editable ? `data-path="${tagPath}"` : ""
  }>
      <i class="mdi mdi-label i--s i--light"></i>
      <span style="margin: 3px;" >${formattedName}</span>
    </div>`;
}

// The above, but on an array, filtering out hidden as appropriate
export function compactTagListHBS(tagArrayPath: string, options: HelperOptions): string {
  // Collect all of the tags, formatting them using `compact_tag`
  let tags = options.hash["tags"] ?? resolveHelperDotpath<Tag[]>(options, tagArrayPath) ?? [];
  return compactTagList(tags, tagArrayPath, { editable: resolveHelperDotpath(options, "editable", false, true) });
}

export function compactTagList(tags: Tag[], tagArrayPath: string, options?: { editable?: boolean }) {
  let processedTags: string[] = [];
  for (let i = 0; i < tags.length; i++) {
    let tag = tags[i];
    if (!tag.hidden) {
      // We want to show it!
      let affixedPath = `${tagArrayPath}.${i}`;
      processedTags.push(compactTag(affixedPath, tag, options?.editable));
    }
  }

  // Combine into a row
  if (options?.editable) {
    return `<div class="compact-tag-row tag-list-append" data-path="${tagArrayPath}">
      ${processedTags.join("")}
    </div>`;
  } else if (processedTags.length) {
    return `<div class="compact-tag-row">
      ${processedTags.join("")}
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
        resolveHelperDotpath(options, "editable", false, true)
      )}
    </div>
    ${compactTagListHBS(path, options)}
  </div>`;
}
