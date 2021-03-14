import { gentle_merge, resolve_dotpath } from "../helpers/commons";

/**
 * A helper Dialog subclass for editing html descriptions, which will automatically fixup html written to it (so the user doesn't just nuke themselves)
 * @extends {Dialog}
 */
export class HTMLEditDialog<O> extends FormApplication {
  // The object we're editing
  target: O;

  // The current val of the string we're editing
  text: string;

  // Where this string is
  text_path: string;

  // How we commit our changes
  commit_callback: (_: any) => void | Promise<void>;

  // Promise to signal completion of workflow
  resolve: () => any;

  constructor(
    target: O,
    text_path: string,
    options: any,
    commit_func: (_: any) => void | Promise<void>,
    resolve_func: () => any
  ) {
    super(
      {
        hasPerm: () => true, // We give it a dummy object because we don't want it messing with our shit
      },
      options
    );
    this.target = target;
    this.text_path = text_path;
    this.text = resolve_dotpath(target, text_path);
    this.commit_callback = commit_func;
    this.resolve = resolve_func;
  }

  /* -------------------------------------------- */

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      template: "systems/lancer/templates/window/html_editor.html",
      width: 650,
      height: "auto",
      resizable: true,
      classes: ["lancer"],
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
    return mergeObject(super.getData(), new_data);
  }

  /** @override */
  async _updateObject(event: any, formData: any) {
    let new_text: string = formData["text"];

    // We trust tox to have handles html correction
    // let doc = document.createElement('div');
    // doc.innerHTML = new_text;
    // new_text = doc.innerHTML; // Will have had all tags etc closed

    // Do the merge
    gentle_merge(this.target, { [this.text_path]: new_text });
    await Promise.resolve(this.commit_callback(this.target));
    this.resolve();
  }

  /** @override
   * Want to resolve promise before closing
   */
  //@ts-ignore Types don't account for the options
  close(options: any): any {
    this.resolve();
    //@ts-ignore Types don't account for the options
    return super.close(options);
  }

  /* -------------------------------------------- */

  /**
   * A helper constructor function which displays the text edit dialog and returns a Promise once it's
   * workflow has been resolved.
   * @return {Promise}
   */
  static async edit_text<T>(
    in_object: T,
    at_path: string,
    commit_callback: (v: T) => void | Promise<void>
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const dlg = new this(
        in_object,
        at_path,
        {
          title: "Edit Text",
        },
        commit_callback,
        resolve
      );
      dlg.render(true);
    });
  }
}
