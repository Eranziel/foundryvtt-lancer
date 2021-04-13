import { Bonus, DamageType, RangeType, WeaponSize, WeaponType } from "machine-mind";
import { gentle_merge, resolve_dotpath } from "../helpers/commons";

/**
 * A helper Dialog subclass for editing a bonus
 * @extends {Dialog}
 */
export class BonusEditDialog<O> extends Dialog {
  // The bonus we're editing
  bonus: Bonus;

  // Where it is
  bonus_path: string;

  constructor(
    target: O,
    bonus_path: string,
    dialogData: DialogData = {},
    options: ApplicationOptions = {}
  ) {
    super(dialogData, options);
    this.bonus_path = bonus_path;
    this.bonus = resolve_dotpath(target, bonus_path);
  }

  /* -------------------------------------------- */

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      template: "systems/lancer/templates/window/bonus.html",
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
      damage_types: Object.values(DamageType),
      range_types: Object.values(RangeType),
      weapon_types: Object.values(WeaponType),
      weapon_sizes: Object.values(WeaponSize),
      bonus: this.bonus,
      path: this.bonus_path,
    };
  }

  /* -------------------------------------------- */

  /**
   * A helper constructor function which displays the bonus editor and returns a Promise once it's
   * workflow has been resolved.
   * @param {Actor5e} actor
   * @return {Promise}
   */
  static async edit_bonus<T>(
    in_object: T,
    at_path: string,
    commit_callback: (v: T) => void | Promise<void>
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const dlg = new this(in_object, at_path, {
        title: "Edit bonus",
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
