import { Action, Damage } from 'machine-mind';
import { gentle_merge, resolve_dotpath } from '../helpers/commons';
/**
 * A helper Dialog subclass for editing a bonus
 * @extends {Dialog}
 */
 export class ActionEditDialog<O> extends Dialog {
    // The bonus we're editing
    action: Action;
  
    // Where it is
    action_path: string;
  
    constructor(
      target: O,
      action_path: string,
      dialogData: DialogData = {},
      options: ApplicationOptions = {}
    ) {
      super(dialogData, options);
      this.action_path = action_path;
      this.action = resolve_dotpath(target, action_path);
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    static get defaultOptions() {
      return mergeObject(super.defaultOptions, {
        template: "systems/lancer/templates/window/action_editor.hbs",
        width: 400,
        height: "auto",
        classes: ["lancer"],
      });
    }
  
    /** @override
     * Expose our data
     */
    getData(): any {
      return {
        ...super.getData(),
        bonus: this.action,
        path: this.action_path,
      };
    }
  
    /* -------------------------------------------- */
  
    /**
     * A helper constructor function which displays the bonus editor and returns a Promise once it's
     * workflow has been resolved.
     * @param in_object         Object we're within
     * @param at_path           Path object is located at
     * @param commit_callback   Callback func on commit
     * @returns                 Promise for completion
     */
    static async edit_action<T>(
      in_object: T,
      at_path: string,
      commit_callback: (v: T) => void | Promise<void>
    ): Promise<void> {
      return new Promise((resolve, reject) => {
        const dlg = new this(in_object, at_path, {
          title: "Edit Action",
          buttons: {
            confirm: {
              icon: '<i class="fas fa-save"></i>',
              label: "Save",
              callback: html => {
                // Idk how to get form data - FormData doesn't work :(
                // Just collect inputs manually
                let flat_data: any = {};
                $(html)
                  .find("input")
                  .each((index, elt) => {
                    // Retrieve input info
                    let name = elt.name;
                    let val: boolean | string;
                    if (elt.type == "text") {
                      val = elt.value;
                    } else if (elt.type == "checkbox") {
                      val = elt.checked;
                    } else {
                      return;
                    }
  
                    // Add to form
                    flat_data[name] = val;
                  });
  
                // Do the merge
                gentle_merge(in_object, flat_data);
                resolve(Promise.resolve(commit_callback(in_object)));
              },
            },
            cancel: {
              icon: '<i class="fas fa-times"></i>',
              label: "Cancel",
              callback: () => resolve(),
            },
          },
          default: "confirm",
          close: () => resolve(),
        });
        dlg.render(true);
      });
    }
  }
  

  // Allows right clicking bonuses to edit them
export function activate_action_editor<T>(
    html: JQuery,
    data_getter: () => Promise<T> | T,
    commit_func: (data: T) => void | Promise<void>
  ) {
    let bonuses = html.find(".action-editor");
    bonuses.on("click", async event => {
      // Find the bonus
      let action_path = event.currentTarget.dataset.path;
      if (!action_path) return;
      let data = await data_getter();
      return ActionEditDialog.edit_action(data, action_path, commit_func).catch(e =>
        console.error("Dialog failed", e)
      );
    });
  }