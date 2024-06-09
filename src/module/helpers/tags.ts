import type { HelperOptions } from "handlebars";
import { Tag } from "../models/bits/tag";
import { inc_if, resolveHelperDotpath } from "./commons";
import tippy from "tippy.js";
import { TagEditForm } from "../apps/tag-editor";
import { LancerItem } from "../item/lancer-item";

export function attachTagTooltips(html: JQuery) {
  html.find(".compact-tag").each((_, el) => {
    tippy(el, {
      placement: "top",
      theme: "lancer-large",
    });
  });
}

export function handleTagEditButtons(html: JQuery, doc: LancerItem) {
  const elements = html.find(".tag-edit-button");
  elements.on("click", ev => {
    ev.stopPropagation();
    const path = ev.currentTarget?.dataset.path;
    if (!path) {
      ui.notifications!.error("Tag edit button missing data-path attribute");
      return;
    }
    TagEditForm.edit(doc, path);
  });
}

// A small tag display containing just the label and value
export function compactTag(tagPath: string, tag: Tag, editable: boolean = true): string {
  return tagView(tagPath, tag, true, editable);
}

// A card with the tag name and description
export function largeTag(tagPath: string, tag: Tag, editable: boolean = true): string {
  return tagView(tagPath, tag, false, editable);
}

function tagView(tagPath: string, tag: Tag, compact: boolean = true, editable: boolean = true): string {
  // Format the {VAL} out of the name
  let interpolatedName = tag.name.replace("{VAL}", `${tag.val ?? "?"}`);
  let interpolatedDescription = tag.description.replace("{VAL}", `${tag.val ?? "?"}`) ?? "";
  return `<div
    class="${editable ? "editable-tag-instance" : ""} ${compact ? "compact-tag flexrow" : "large-tag"}"
    ${editable ? `data-path="${tagPath}"` : ""}
    ${compact ? `data-tippy-content="${interpolatedDescription}"` : ""}
  >
    ${
      compact
        ? `
    <i class="mdi mdi-label i--s i--light"></i>
    <span style="margin: 3px;" >${interpolatedName}</span>`
        : `
    <div class="tag-header flexrow">
      <i class="mdi mdi-label i--s i--light"></i>
      <span style="margin: 3px;" >${interpolatedName}</span>
      ${
        editable
          ? `
      <div class="tag-controls">
        <a class="tag-edit-button fas fa-edit" data-path="${tagPath}"></a>
        <a class="gen-control fas fa-trash" data-action="splice" data-path="${tagPath}"></a>
      </div>`
          : ""
      }
    </div>
    <div class="tag-description">${interpolatedDescription}</div>`
    }
  </div>`;
}

// The above, but on an array, filtering out hidden as appropriate
export function compactTagListHBS(tagArrayPath: string, options: HelperOptions): string {
  // Collect all of the tags, formatting them using `compact_tag`
  let tags = options.hash["tags"] ?? resolveHelperDotpath<Tag[]>(options, tagArrayPath) ?? [];
  return compactTagList(tags, tagArrayPath, { editable: resolveHelperDotpath(options, "editable", false, true) });
}

// The above, but on an array, filtering out hidden as appropriate
export function largeTagListHBS(tagArrayPath: string, options: HelperOptions): string {
  // Collect all of the tags, formatting them using `compact_tag`
  let tags = options.hash["tags"] ?? resolveHelperDotpath<Tag[]>(options, tagArrayPath) ?? [];
  return largeTagList(tags, tagArrayPath, { editable: resolveHelperDotpath(options, "editable", false, true) });
}

export function compactTagList(tags: Tag[], tagArrayPath: string, options?: { editable?: boolean }) {
  return tagList(tags, tagArrayPath, { compact: true, ...options });
}

export function largeTagList(tags: Tag[], tagArrayPath: string, options?: { editable?: boolean }) {
  return tagList(tags, tagArrayPath, { compact: false, ...options });
}

function tagList(tags: Tag[], tagArrayPath: string, options?: { compact?: boolean; editable?: boolean }) {
  const compact = options?.compact ?? true;
  let processedTags: string[] = [];
  for (let i = 0; i < tags.length; i++) {
    let tag = tags[i];
    if (!tag.hidden) {
      // We want to show it!
      let affixedPath = `${tagArrayPath}.${i}`;
      processedTags.push(
        compact ? compactTag(affixedPath, tag, options?.editable) : largeTag(affixedPath, tag, options?.editable)
      );
    }
  }

  // Combine into a row
  if (options?.editable) {
    return `<div class="${compact ? "compact" : "large"}-tag-row tag-list-append" data-path="${tagArrayPath}">
      ${processedTags.join("")}
    </div>`;
  } else if (processedTags.length) {
    return `<div class="${compact ? "compact" : "large"}-tag-row">
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
    ${largeTagListHBS(path, options)}
  </div>`;
}
