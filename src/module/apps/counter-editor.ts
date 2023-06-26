import { CounterData } from "../models/bits/counter";
import { TargetedEditForm } from "./targeted-form-editor";

/**
 * A helper FormApplication subclass for editing a counter
 * @extends {FormApplication}
 */
export class CounterEditForm extends TargetedEditForm<CounterData> {
  /* -------------------------------------------- */

  /** @override */
  static get defaultOptions() {
    return {
      ...super.defaultOptions,
      template: `systems/${game.system.id}/templates/window/counter.hbs`,
      title: "Counter Editing",
    };
  }

  /** @override */
  fixupForm(form_data: Record<string, string | number | boolean>): Record<string, string | number | boolean> {
    let name = form_data.name as string;
    let min = form_data.min as number;
    let max = form_data.max as number;
    let value = form_data.value as number;

    // Pre-fixup/check value
    let invalid = [min, max, value].find(x => Number.isNaN(x));
    if (invalid !== undefined) {
      let message = `${invalid} is not a valid numeric value`;
      ui.notifications?.error(message);
      throw new Error(message);
    }
    name = name.trim();

    // Fixup value if min or max has moved it
    if (max < min) {
      max = min;
    }
    if (value < min) {
      value = min;
    }
    if (value > max) {
      value = max;
    }

    // Submit changes
    return { name, min, max, val };
  }
}
