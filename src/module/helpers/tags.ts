import type { LancerActorSheetData, LancerItemSheetData } from "../interfaces";
import { DragFetcherCache, HANDLER_enable_doc_dropping } from "./dragdrop";
import { Tag } from "../models/bits/tag";

// A small tag display containing just the label and value
export function compact_tag(tag_path: string, tag: Tag): string {
  // Format the {VAL} out of the name
  let formatted_name = tag.name.replace("{VAL}", `${tag.val ?? "?"}`);
  return `<div class="editable-tag-instance valid ref compact-tag flexrow" data-path="${tag_path}">
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

// Allows user to remove tags or edit their value via right click
export function HANDLER_activate_tag_context_menus<T extends LancerActorSheetData<any> | LancerItemSheetData<any>>(
  html: JQuery,
  // Retrieves the data that we will operate on
  data_getter: () => Promise<T> | T,
  commit_func: (data: T) => void | Promise<void>
) {
  /* TODO
  // This option allows the user to remove the right-clicked tag
  let remove = {
    name: "Remove Tag",
    icon: '<i class="fas fa-fw fa-times"></i>',
    // condition: game.user.isGM,
    callback: async (html: JQuery) => {
      let cd = await data_getter();
      let tag_path = html[0].dataset.path ?? "";

      // Remove the tag from its array
      if (tag_path) {
        array_path_edit(cd, tag_path, null, "delete");

        // Then commit
        return commit_func(cd);
      }
    },
  };

  // This option pops up a small dialogue that lets the user set the tag instance's value
  let set_value = {
    name: "Edit Value",
    icon: '<i class="fas fa-fw fa-edit"></i>',
    classes: "lancer dialog",
    // condition: game.user.isGM,
    callback: async (html: JQuery) => {
      let cd = await data_getter();
      let tag_path = html[0].dataset.path ?? "";

      // Get the tag
      let tag_instance: Tag = resolve_dotpath(cd, tag_path);

      // Check existence
      if (!(tag_instance instanceof Tag)) return; // Stinky

      // Spawn the dialogue to edit
      let new_val = await promptText("Edit Tag", (tag_instance.Value ?? "").toString());

      if (new_val !== null) {
        // Set the tag value
        tag_instance.Value = new_val;

        // At last, commit
        return commit_func(cd);
      }
    },
  };

  // Finally, setup the context menu
  new ContextMenu(html, ".editable-tag-instance", [remove, set_value]);
  */
}

// Enables dropping of tags into open designated by .ref-list-append classed divs
// Explicitly designed to handle natives. Generates a tag instance corresponding to that native, with a default value of 1
// Follows conventional HANDLER design patterns
export function HANDLER_activate_tag_dropping<T>(
  resolver: DragFetcherCache,
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
