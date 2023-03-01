import { LancerActor } from "../actor/lancer-actor";
import { read_form, resolve_dotpath } from "../helpers/commons";
import { LancerItem } from "../item/lancer-item";
import type { CounterData } from "../models/bits/counter";

/**
 * A helper FormApplication subclass for editing a counter
 * @extends {FormApplication}
 */
export class CounterEditForm extends Dialog {
  // The counter we're editing
  counter: CounterData;

  // The item we're editing it on
  target: LancerItem | LancerActor;

  // Where it is
  path: string;

  constructor(
    target: LancerItem | LancerActor,
    path: string,
    dialogData: Dialog.Data,
    options: Partial<Dialog.Options> = {}
  ) {
    super(dialogData, options);
    this.path = path;
    this.target = target;
    this.counter = resolve_dotpath(target, path) as CounterData;
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

  async commitFields(form: HTMLFormElement): Promise<void> {
    let form_data = read_form(form);
    let name = form_data.name as string;
    let min = form_data.min as number;
    let max = form_data.max as number;
    let val = form_data.val as number;

    // Pre-fixup/check value
    let invalid = [min, max, val].find(x => Number.isNaN(x));
    if (invalid !== null) {
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
    let changes: Record<string, any> = {
      [`${this.path}.name`]: name,
      [`${this.path}.min`]: min,
      [`${this.path}.max`]: max,
      [`${this.path}.val`]: val,
    };
    await this.target.update(changes);
    this.close();
  }

  /* -------------------------------------------- */

  /**
   * A helper constructor function which displays the bonus editor and returns a Promise once it's
   * workflow has been resolved.
   * @param doc
   * @param path
   * @param writeback_obj
   * @returns
   */
  static async edit_counter<T>(doc: LancerItem | LancerActor, path: string): Promise<void> {
    return new Promise((resolve, _reject) => {
      const dlg: CounterEditForm = new this(doc, path, {
        title: "Edit Counter",
        content: "",
        buttons: {
          confirm: {
            icon: '<i class="fas fa-save"></i>',
            label: "Save",
            callback: html => dlg.commitFields($(html).find("form")[0]),
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
            callback: () => resolve(),
          },
        },
        default: "confirm",
        close: html => dlg.commitFields($(html).find("form")[0]),
      });
      dlg.render(true);
    });
  }
}
