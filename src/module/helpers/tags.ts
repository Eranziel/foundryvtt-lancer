import { EntryType, TagInstance, TagTemplate } from "machine-mind";
import { array_path_edit, resolve_dotpath } from "./commons";
import type { LancerActorSheetData, LancerItemSheetData } from "../interfaces";
import { HANDLER_enable_mm_dropping, MMDragResolveCache } from "./dragdrop";
import { ref_params } from "./refs";
import { promptText } from "../apps/simple-prompt";


/**
 * Search for a tag template in lancer-data.
 * @param id The tag's lancer-data id string.
 * @returns The full tag data.
 */
/*
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
/*
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
/*
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
*/

/**
 * Handlebars partial to generate a list of tags for weapon/system previews.
 */
/*
export const compactTagList = `<div class="compact-tag-row">
  {{#each tags as |tag tkey|}}
  {{{compact-tag tag}}}
  {{/each}}
</div>`;
*/

// A small tag display containing just the label and value
export function compact_tag(tag_path: string, tag: TagInstance): string {
  // Format the {VAL} out of the name
  let formatted_name = tag.Tag.Name.replace("{VAL}", `${tag.Value ?? "?"}`);
  return `<div class="editable-tag-instance valid ref compact-tag flexrow" data-path="${tag_path}" ${ref_params(
    tag.Tag.as_ref()
  )}>
      <i class="mdi mdi-label i--s i--light"></i>
      <span style="margin: 3px;" >${formatted_name}</span>
    </div>`;
}

// The above, but on an array, filtering out hidden as appropriate
export function compact_tag_list(
  tag_array_path: string,
  tags: TagInstance[],
  allow_drop: boolean
): string {
  // Collect all of the tags, formatting them using `compact_tag`
  let processed_tags: string[] = [];
  for (let i = 0; i < tags.length; i++) {
    let tag = tags[i];
    if (!tag.Tag.Hidden) {
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
export function HANDLER_activate_tag_context_menus<
  T extends LancerActorSheetData<any> | LancerItemSheetData<any>
>(
  html: JQuery,
  // Retrieves the data that we will operate on
  data_getter: () => Promise<T> | T,
  commit_func: (data: T) => void | Promise<void>
) {
  // This option allows the user to remove the right-clicked tag
  let remove = {
    name: "Remove Tag",
    icon: '<i class="fas fa-fw fa-times"></i>',
    // condition: game.user.isGM,
    callback: async (html: JQuery) => {
      let cd = await data_getter();
      let tag_path = html[0].dataset.path ?? "";

      // Remove the tag from its array
      if(tag_path) {
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
      let tag_instance: TagInstance = resolve_dotpath(cd, tag_path);

      // Check existence
      if (!(tag_instance instanceof TagInstance)) return; // Stinky

      // Spawn the dialogue to edit
      let new_val = await promptText("Edit Tag", (tag_instance.Value ?? "").toString());

      if(new_val !== null) {
        // Set the tag value
        tag_instance.Value = new_val;

        // At last, commit
        return commit_func(cd);
      }
    },
  };

  // Finally, setup the context menu
  new ContextMenu(html, ".editable-tag-instance", [remove, set_value]);
}

// Renders a tag, with description and a delete button. Takes by path so it can properly splice the tag instance out
/*
export function chunky_tag(tag_path: string, helper: HelperOptions): string {
  let tag_instance = resolve_helper_dotpath(helper, tag_path) as TagInstance;
  return `<div class="tag flexrow">
    <div class="tag-label">
      <i class="med-icon fa fa-3x fa-tag" style="margin: 3px"></i>
    </div>
    <div class="flexcol">
      <span class="medium theme--main" style="grid-area: 1/2/2/3; text-align:left; padding-left: 0.5em; margin-top: 0.25em;"> ${tag_instance.Tag.Name} </span>
      <span class="effect-text" style="grid-area: 2/2/3/3">${tag_instance.Tag.Description}</textarea>
      <a class="fa fa-trash gen-control" data-action="splice" data-path="tag_path" style="grid-area: 2/3/3/4; margin-right: 11px; margin-top: -.8em; justify-self: right; align-self: self-start"></a>
    </div>
  </div>`;
}
*/

// Enables dropping of tags into open designated by .ref-list-append classed divs
// Explicitly designed to handle natives. Generates a tag instance corresponding to that native, with a default value of 1
// Follows conventional HANDLER design patterns
export function HANDLER_activate_tag_dropping<T>(
  resolver: MMDragResolveCache,
  html: JQuery,
  // Retrieves the data that we will operate on
  data_getter: () => Promise<T> | T,
  commit_func: (data: T) => void | Promise<void>
) {
  HANDLER_enable_mm_dropping(
    html.find(".tag-list-append"),
    resolver,
    (ent) => ent.Type == EntryType.TAG,
    async (tag_ent, dest, _evt) => {
      // Well, we got a drop!
      let path = dest[0].dataset.path!;
      if (path) {
        // Make an instance of the tag
        let tag_instance = new TagInstance(tag_ent.Registry, tag_ent.OpCtx, {
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
}
