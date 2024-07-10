import { LancerActor } from "../actor/lancer-actor";
import { resolveDotpath } from "../helpers/commons";
import { LancerItem } from "../item/lancer-item";

/**
 * A helper Dialog subclass for editing html descriptions, which will automatically fixup html written to it (so the user doesn't just nuke themselves)
 * @extends {Dialog}
 */
export class HTMLEditDialog extends FormApplication {
  // The document we're editing
  target: LancerActor | LancerItem;

  // The current val of the string we're editing
  text: string;

  // Where this string is within the target
  text_path: string;

  // Promise to signal completion of workflow
  resolve: () => any;

  constructor(target: LancerActor | LancerItem, text_path: string, options: any, resolve_func: () => any) {
    super(
      {
        hasPerm: () => true, // We give it a dummy object because we don't want it messing with our shit
      },
      options
    );
    this.target = target;
    this.text_path = text_path;
    this.text = resolveDotpath(target, text_path) as string;
    this.resolve = resolve_func;
  }

  /* -------------------------------------------- */

  /** @override */
  static get defaultOptions(): FormApplication.Options {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: `systems/${game.system.id}/templates/window/html_editor.hbs`,
      width: 650,
      height: "auto" as const,
      resizable: true,
      classes: ["lancer", "lancer-text-editor"],
      submitOnChange: false,
      submitOnClose: true,
      closeOnSubmit: true,
    });
  }

  /** @override
   * Expose our data
   */
  getData(): any {
    let new_data = {
      text: this.text,
    };
    return foundry.utils.mergeObject(super.getData(), new_data);
  }

  /** @override */
  async _updateObject(_event: unknown, formData: { text: string }) {
    let new_text = formData["text"];

    // We trust tox to have handles html correction
    // let doc = document.createElement('div');
    // doc.innerHTML = new_text;
    // new_text = doc.innerHTML; // Will have had all tags etc closed

    // Do the merge
    this.target.update({ [this.text_path]: new_text }).then(this.resolve);
  }

  /** @override
   * Want to resolve promise before closing
   */
  close(options: FormApplication.CloseOptions): any {
    this.resolve();
    return super.close(options);
  }

  /* -------------------------------------------- */

  /**
   * A helper constructor function which displays the text edit dialog and returns a Promise once it's
   * workflow has been resolved.
   * @return {Promise}
   */
  static async edit_text(in_object: LancerActor | LancerItem, at_path: string): Promise<void> {
    return new Promise((resolve, _reject) => {
      const dlg = new this(
        in_object,
        at_path,
        {
          title: "Edit Text",
        },
        resolve
      );
      dlg.render(true);
    });
  }
}
