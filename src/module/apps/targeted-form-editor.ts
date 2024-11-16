import { LancerActor } from "../actor/lancer-actor";
import { drilldownDocument, resolveDotpath } from "../helpers/commons";
import { LancerItem } from "../item/lancer-item";

/**
 * A helper FormApplication subclass for editing a particular
 * @extends {FormApplication}
 */
export class TargetedEditForm<T> extends FormApplication {
  // The T we're editing
  value: T;

  // Where it is
  value_path: string;

  // The item we're editing it on
  target: LancerItem | LancerActor;

  // Promise to signal completion of workflow
  resolve: () => any;

  constructor(
    target: LancerItem | LancerActor,
    value_path: string,
    options: Partial<FormApplicationOptions> = {},
    resolve_func: () => any
  ) {
    super(
      {
        hasPerm: () => true,
      },
      options
    );
    this.target = target;
    this.value_path = value_path;
    this.value = resolveDotpath(target, value_path) as T;
    this.resolve = resolve_func;
  }

  /**
   * @override
   * Activate event listeners using the prepared sheet HTML
   * @param html {HTMLElement}   The prepared HTML object ready to be rendered into the DOM
   */
  activateListeners(html: JQuery<HTMLElement>) {
    super.activateListeners(html); // Enable popout editors
    // handlePopoutTextEditor(html, this.target); // TODO HANDLE THIS
  }

  // Enables summoning of this form
  static handle(html: JQuery, selector: string, root_doc: LancerItem | LancerActor) {
    html.find(selector).on("click", async evt => {
      evt.stopPropagation();
      const elt = evt.currentTarget;
      const path = elt.dataset.path;
      if (path) {
        let dd = drilldownDocument(root_doc, path);
        return this.edit(dd.sub_doc, dd.sub_path);
      }
    });
  }

  /* -------------------------------------------- */

  // Override this to set child
  /** @override */
  static get defaultOptions() {
    return {
      ...super.defaultOptions,
      width: 400,
      height: "auto" as const,
      classes: ["lancer", "targeted-form-editor"],
      submitOnChange: false,
      submitOnClose: true,
      closeOnSubmit: true,
      // title and template should be provided by child
    };
  }

  // Override this to add any auxillary data
  /** @override
   * Expose our data
   */
  getData(): any {
    return {
      ...super.getData(),
      value: this.value,
      path: this.value_path,
    };
  }

  // Override this - this should return the object that should be updated at path
  fixupForm(form_data: Record<string, string | number | boolean>): Record<string, string | number | boolean> {
    return form_data;
  }

  /** @override */
  async _updateObject(event: SubmitEvent, form_data: Record<string, string | number | boolean>) {
    // If cancel button, then do not save
    if (event.submitter?.dataset.button == "cancel") return;

    // Do basic fixup
    form_data = this.fixupForm(form_data);

    // Prepend every value with value_path
    let new_result = {} as Record<string, string | number | boolean>;
    for (let [k, v] of Object.entries(form_data)) {
      new_result[`${this.value_path}.${k}`] = v;
    }

    // Submit changes
    return this.target.update(new_result).then(this.resolve);
  }

  /* -------------------------------------------- */

  /**
   * A helper constructor function which displays the bonus editor and returns a Promise once it's
   * workflow has been resolved.
   * @param doc Document to edit
   * @param path Where on the document the tag lies
   * @returns
   */
  static async edit(doc: LancerItem | LancerActor, path: string): Promise<void> {
    return new Promise((resolve, _reject) => {
      const app = new this(doc, path, {}, resolve);
      app.render(true);
    });
  }
}
