import { LANCER } from "../config";
import { TagData, TagTemplateData } from "../models/bits/tag";
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
      classes: ["lancer", "tag-editor"],
      title: "Tag Editing",
      submitOnClose: false,
    };
  }

  getData() {
    let tc = game.settings.get(game.system.id, LANCER.setting_tag_config) as Record<string, TagTemplateData>;
    let lid_options: { [key: string]: string } = {};
    Object.entries(tc).forEach(tag => (lid_options[tag[1].name] = tag[0]));
    return {
      ...super.getData(),
      lid: super.getData().value.lid, // Compat thing for std-select
      lid_options,
    };
  }
}
