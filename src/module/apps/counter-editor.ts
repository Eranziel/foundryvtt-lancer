import { delegate } from "tippy.js";
import { LancerActor } from "../actor/lancer-actor";
import { read_form, resolve_dotpath } from "../helpers/commons";
import { LancerItem, LancerTALENT } from "../item/lancer-item";
import { CounterData } from "../models/bits/counter";

/**
 * A helper FormApplication subclass for editing a counter
 * @extends {FormApplication}
 */
export class CounterEditForm extends FormApplication {
  // The counter we're editing
  counter: CounterData;

  // The item we're editing it on
  target: LancerItem | LancerActor;

  // Where it is
  counter_path: string;

  // Promise to signal completion of workflow
  resolve: () => any;

  constructor(
    target: LancerItem | LancerActor,
    counter_path: string,
    options: Partial<FormApplication.Options> = {},
    resolve_Func: () => any
  ) {
    super(
      {
        hasPerm: () => true,
      },
      options
    );
    this.target = target;
    this.counter_path = counter_path;
    this.counter = resolve_dotpath(target, counter_path) as CounterData;
    this.resolve = resolve_Func;
  }

  /* -------------------------------------------- */

  /** @override */
  static get defaultOptions() {
    return {
      ...super.defaultOptions,
      template: `systems/${game.system.id}/templates/window/counter.hbs`,
      width: 400,
      title: "Counter Editing",
      height: "auto" as const,
      classes: ["lancer"],
      submitOnChange: false,
      submitOnClose: true,
      closeOnSubmit: true,
    };
  }

  /** @override
   * Expose our data
   */
  getData(): any {
    return {
      ...super.getData(),
      counter: this.counter,
    };
  }

  /** @override */
  async _updateObject(_event: unknown, form_data: Record<string, string | number | boolean>) {
    let name = form_data.name as string;
    let min = form_data.min as number;
    let max = form_data.max as number;
    let val = form_data.val as number;

    // Pre-fixup/check value
    let invalid = [min, max, val].find(x => Number.isNaN(x));
    if (invalid != null) {
      ui.notifications?.error(`${invalid} is not a valid numeric value`);
      return;
    }
    name = name.trim();

    // Fixup value if min or max has moved it
    if (max < min) {
      max = min;
    }
    if (val < min) {
      val = min;
    }
    if (val > max) {
      val = max;
    }

    // Submit changes
    let changes = {
      [`${this.counter_path}.name`]: name,
      [`${this.counter_path}.min`]: min,
      [`${this.counter_path}.max`]: max,
      [`${this.counter_path}.val`]: val,
    };
    return this.target.update(changes).then(this.resolve);
  }

  /* -------------------------------------------- */

  /**
   * A helper constructor function which displays the bonus editor and returns a Promise once it's
   * workflow has been resolved.
   * @param doc Document to edit
   * @param path Where on the document the counter lies
   * @returns
   */
  static async edit_counter<T>(doc: LancerItem | LancerActor, path: string): Promise<void> {
    return new Promise((resolve, _reject) => {
      const app = new this(doc, path, {}, resolve);
      app.render(true);
    });
  }
}
