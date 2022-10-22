import { LancerActor } from "../actor/lancer-actor";
import { gentle_merge, resolve_dotpath } from "../helpers/commons";
import { LancerItem, LancerTALENT } from "../item/lancer-item";
import { CounterData } from "../models/bits/counter";

/**
 * A helper FormApplication subclass for editing a counter
 * @extends {FormApplication}
 */
export class CounterEditForm extends FormApplication {
  _updateObject(event: Event, formData?: object): Promise<unknown> {
    debugger;
    return new Promise(() => {});
  }
  // The counter we're editing
  counter: CounterData;
  target: LancerItem;

  // Where it is
  path: string;

  constructor(target: LancerItem, path: string, dialogData: Dialog.Data, options: Partial<Dialog.Options> = {}) {
    super(dialogData, options);
    this.path = path;
    this.target = target;
    this.counter = resolve_dotpath(target, path);
  }

  /* -------------------------------------------- */

  /** @override */
  static get defaultOptions(): FormApplication.Options {
    return {
      ...super.defaultOptions,
      template: `systems/${game.system.id}/templates/window/counter.hbs`,
      width: 400,
      title: "Counter Editing",
      height: "auto",
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

  activateListeners(html: JQuery<HTMLElement>): void {
    super.activateListeners(html);

    let elements = html.find("input");
    elements.on("change", async ev => {
      ev.stopPropagation();
      const input = ev.currentTarget as HTMLInputElement;

      let new_val = input.value;
      const num_val = input.valueAsNumber;

      // Pre-fixup value
      switch (input.name) {
        case "min":
        case "max":
        case "val":
          if (Number.isNaN(num_val)) {
            ui.notifications?.error(`${num_val} is not a valid numeric value`);
            return;
          }
        case "Name":
          new_val = new_val.trim();
          break;
      }

      // Begin building object
      let changes: Record<string, any> = {
        [`${this.path}.${input.name}`]: new_val,
      };

      // Fixup value if min or max has moved it
      switch (input.name) {
        case "min":
          if (this.counter.val < num_val) {
            changes[`${this.path}.val`] = num_val; // bound
          }
          break;
        case "max":
          if (this.counter.val > num_val) {
            changes[`${this.path}.val`] = num_val; // bound
          }
          break;
        case "val":
          if (this.counter.min > num_val) {
            changes[`${this.path}.val`] = this.counter.min; // bound
          } else if (this.counter.max && this.counter.max < num_val) {
            changes[`${this.path}.val`] = this.counter.max; // bound
          }
          break;
      }

      await this.target.update(changes);
      this.close();
    });
  }

  /* -------------------------------------------- */

  /**
   * A helper constructor function which displays the bonus editor and returns a Promise once it's
   * workflow has been resolved.
   * @param in_object
   * @param at_path
   * @param writeback_obj
   * @returns
   */
  static async edit_counter<T>(in_object: T, at_path: string, writeback_obj: LancerItem | LancerActor): Promise<void> {
    return;
    /* TODO - work out how we want to handle this in new paradigm. Also, use read_form
    return new Promise((resolve, _reject) => {
      const dlg = new this(in_object, at_path, {
        title: "Edit Counter",
        content: "",
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
                .each((_i, elt) => {
                  // Retrieve input info
                  let name = elt.name;
                  let val: boolean | string | number;
                  if (elt.type == "text") {
                    val = elt.value;
                  } else if (elt.type == "number") {
                    val = parseInt(elt.value);
                  } else if (elt.type == "checkbox") {
                    val = elt.checked;
                  } else {
                    return;
                  }

                  // Add to form
                  flat_data[at_path.concat(".").concat(name)] = val;
                });

              // Do the merge
              gentle_merge(in_object, flat_data);
              resolve(writeback_obj.update());
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
    });*/
  }
}
