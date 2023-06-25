import { TagData } from "../models/bits/tag";
import { TargetedEditForm } from "./targeted-form-editor";

/**
 * A helper FormApplication subclass for editing a tag
 * @extends {FormApplication}
 */
export class TagEditForm extends TargetedEditForm<TagData> {
  /** @override */
  static get defaultOptions() {
    return {
      ...super.defaultOptions,
      template: `systems/${game.system.id}/templates/window/tag.hbs`,
      title: "Tag Editing",
    };
  }
}
