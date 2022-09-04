import type { Action, RegEntry } from "machine-mind";
import {
  gentle_merge,
  HANDLER_activate_general_controls,
  HANDLER_activate_popout_text_editor,
  resolve_dotpath,
} from "../helpers/commons";
import { HANDLER_intercept_form_changes } from "../helpers/refs";
/**
 * A helper Dialog subclass for editing a bonus
 * @extends {Dialog}
 */
// TODO: Narrow O a little bit here
export class ActionEditDialog<O> extends Dialog {
  // The bonus we're editing
  action: Action;

  // Where it is
  action_path: string;

  // Who it's going back to
  origin_item: RegEntry<any>;

  constructor(target: O, action_path: string, dialogData: Dialog.Data, options: Partial<Dialog.Options> = {}) {
    super(dialogData, options);

    //@ts-ignore I don't want to mess around with the generic typing but this is fine
    this.origin_item = target.mm;
    this.action_path = action_path;
    this.action = resolve_dotpath(target, action_path);
  }

  /* -------------------------------------------- */

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      template: `systems/${game.system.id}/templates/window/action_editor.hbs`,
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
      action: this.action,
      path: this.action_path,
    };
  }

  /**
   * @override
   * Activate event listeners using the prepared sheet HTML
   * @param html {HTMLElement}   The prepared HTML object ready to be rendered into the DOM
   */
  activateListeners(html: JQuery<HTMLElement>) {
    super.activateListeners(html);
    // Everything below here is only needed if the sheet is editable

    let getfunc = () => this.getData();
    let commitfunc = (_: any) => this._commitCurrMM();

    // Enable general controls, so items can be deleted and such
    HANDLER_activate_general_controls(html, getfunc, commitfunc);

    // Item-referencing inputs
    HANDLER_intercept_form_changes(html, getfunc);

    // Enable popout editors
    HANDLER_activate_popout_text_editor(html, getfunc, commitfunc);
  }

  async _commitCurrMM() {
    await this.origin_item.writeback();
    this.render();
  }

  /**
   * Handle a left-mouse click on one of the dialog choice buttons
   * @param {MouseEvent} event    The left-mouse click event
   * @private
   */
  _onClickButton(event: MouseEvent) {
    //@ts-ignore League types have the wrong event type again
    const id = event.currentTarget.dataset.button;
    // Just pass through our button id
    this.submit(id);
  }

  /**
   * Submit the Dialog by selecting one of its buttons
   * @private
   */
  // @ts-ignore This is definitely busted, but it will have to be fixed later
  async submit(id: string) {
    let button = this.data.buttons[id];
    if (button) {
      try {
        if (button.callback) button.callback(this.element);
        this.close();
      } catch (err) {
        ui.notifications!.error(`${err}`);
        if (err instanceof Error) {
          throw err;
        } else {
          throw new Error(`${err}`);
        }
      }
    } else if (id === "confirm") {
      let flat_data: any = {};
      $(this.element)
        .find("input")
        .each((_i, elt) => {
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

      $(this.element)
        .find("select")
        .each((_i, elt: HTMLSelectElement) => {
          // Retrieve input info
          let name = elt.name;
          let val = elt.selectedOptions[0].value;

          // Add to form
          flat_data[name] = val;
        });

      // Do the merge
      gentle_merge(this, flat_data);
      this.close();
      await this._commitCurrMM();
    }
  }

  /* -------------------------------------------- */

  /**
   * A helper constructor function which displays the action editor and returns a Promise once it's
   * workflow has been resolved.
   * @param in_object         Object we're within
   * @param at_path           Path object is located at
   * @param commit_callback   Callback func on commit
   * @returns                 Promise for completion
   */
  static async edit_action<T>(
    in_object: T,
    at_path: string,
    _commit_callback: (v: T) => void | Promise<void>
  ): Promise<void> {
    return new Promise((resolve, _reject) => {
      const dlg = new this(in_object, at_path, {
        title: "Edit Action",
        content: "",
        // All the buttons config isn't actually controlled here
        buttons: {
          cancel: {
            label: "Cancel",
          },
        },
        default: "Save",
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
    return ActionEditDialog.edit_action(data, action_path, commit_func).catch(e => console.error("Dialog failed", e));
  });
}
