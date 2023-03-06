import { HANDLER_activate_popout_text_editor, resolve_dotpath } from "../helpers/commons.js";
import { LancerItem } from "../item/lancer-item.js";
import type { ActionData } from "../models/bits/action.js";
/**
 * A helper Dialog subclass for editing an action
 * @extends {Dialog}
 */
export class ActionEditDialog extends FormApplication {
  // What to submit updates to
  target: LancerItem;

  // The bonus we're editing
  action: ActionData;

  // Where it is
  action_path: string;

  // Promise to signal completion of workflow
  resolve: () => any;

  constructor(
    target: LancerItem,
    action_path: string,
    options: Partial<FormApplication.Options> = {},
    resolve_func: () => any
  ) {
    super(
      {
        hasPerm: () => true,
      },
      options
    );

    this.target = target;
    this.action_path = action_path;
    this.action = resolve_dotpath(target, action_path) as ActionData;
    this.resolve = resolve_func;
  }

  /* -------------------------------------------- */

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      template: `systems/${game.system.id}/templates/window/action_editor.hbs`,
      width: 400,
      height: "auto" as const,
      classes: ["lancer"],
      submitOnChange: false,
      submitOnClose: false,
      closeOnSubmit: true,
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
    super.activateListeners(html); // Enable popout editors
    HANDLER_activate_popout_text_editor(html, this.target);
  }

  /** @override */
  async _updateObject(_event: unknown, form_data: Record<string, string | number | boolean>) {
    // Do the merge
    ui.notifications?.warn("TODO");
    console.log(form_data);
    // this.target.update({ [this.action_path]: form_data }).then(this.resolve);
  }

  /* -------------------------------------------- */

  /**
   * A helper constructor function which displays the action editor and returns a Promise once it's
   * workflow has been resolved.
   */
  static async edit_action<T>(
    document: LancerItem,
    path: string,
    _commit_callback: (v: T) => void | Promise<void>
  ): Promise<void> {
    return new Promise((resolve, _reject) => {
      const app = new this(
        document,
        path,
        {
          title: "Edit action",
        },
        resolve
      );
      app.render(true);
    });
  }
}

// Allows right clicking bonuses to edit them
export function activate_action_editor(html: JQuery, item: LancerItem) {
  let bonuses = html.find(".action-editor");
  bonuses.on("click", async event => {
    // Find the bonus
    let action_path = event.currentTarget.dataset.path;
    if (!action_path) return;
    return ActionEditDialog.edit_action(item, action_path, () => {}).catch(e => console.error("Dialog failed", e));
  });
}
