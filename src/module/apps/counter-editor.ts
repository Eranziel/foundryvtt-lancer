import type { CounterData } from "../models/bits/counter";
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
      classes: ["lancer", "counter-editor"],
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
      ui.notifications?.error(
        game.i18n.format("lancer.notifications.error.counterEditorInvalidNumericValue", { value: String(invalid) })
      );
      throw new Error(`${invalid} is not a valid numeric value`);
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
    return { name, min, max, value };
  }
}
