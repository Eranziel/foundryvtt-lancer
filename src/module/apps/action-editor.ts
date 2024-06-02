import { ActionData } from "../models/bits/action";
import { TargetedEditForm } from "./targeted-form-editor";
/**
 * A helper Dialog subclass for editing an action
 * @extends {Dialog}
 */
export class ActionEditDialog extends TargetedEditForm<ActionData> {
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      template: `systems/${game.system.id}/templates/window/action_editor.hbs`,
      title: "Action Editing",
      classes: ["lancer", "action-editor"],
    });
  }
}
