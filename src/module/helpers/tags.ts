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
export function compact_tag_list(tag_array_path: string, options: HelperOptions): string {
  // Collect all of the tags, formatting them using `compact_tag`
  let tags = resolve_helper_dotpath<Tag[]>(options, tag_array_path) ?? [];
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
  if (resolve_helper_dotpath(options, "editable", false, true)) {
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
    <div class="lancer-header major">
      <span>${header}</span>
      ${inc_if(
        `<a class="gen-control fas fa-plus" data-action="append" data-path="${path}" data-action-value="(struct)tag"></a>`,
        resolve_helper_dotpath(options, "editable", false, true)
      )}
    </div>
    ${compact_tag_list(path, options)}
  </div>`;
}

// Enables dropping of tags into open designated by .ref-list classed divs
// Explicitly designed to handle natives. Generates a tag instance corresponding to that native, with a default value of 1
// Follows conventional HANDLER design patterns
export function handleTagDropping<T>(
  html: JQuery,
  // Retrieves the data that we will operate on
  data_getter: () => Promise<T> | T,
  commit_func: (data: T) => void | Promise<void>
) {
  /* TODO
  HANDLER_enable_doc_dropping(
    html.find(".tag-list-append"),
    resolver,
    ent => ent.type == "Item" && ent.document.type == EntryType.TAG, // Ensure its a tag instance
    async (tag_ent, dest, _evt) => {
      // Well, we got a drop!
      let path = dest[0].dataset.path!;
      if (path) {
        // Make an instance of the tag
        let tag_instance = new Tag(tag_ent.Registry, tag_ent.OpCtx, {
          tag: (tag_ent as TagTemplate).as_ref(),
          val: 1,
        });
        await tag_instance.load_done();

        // Append it and re-commit
        let data = await data_getter();
        array_path_edit(data, path + "[-1]", tag_instance, "insert");
        await commit_func(data);
      }
    },
    (mode, _data, target) => {
      // Make it glow I guess
      if (mode == "enter") {
        $(target).addClass("highlight-can-drop");
      } else {
        $(target).removeClass("highlight-can-drop");
      }
    }
  );
  */
}
