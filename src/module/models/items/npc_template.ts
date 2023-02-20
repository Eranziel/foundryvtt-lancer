import { EntryType } from "../../enums";
import { SourceData } from "../../source-template";
import { PackedNpcClassData, PackedNpcTemplateData, PackedSkillData } from "../../util/unpacking/packed-types";
import { LancerDataModel, UnpackContext } from "../shared";
import { template_universal_item } from "./shared";

const fields: any = foundry.data.fields;

// @ts-ignore
export class NpcTemplateModel extends LancerDataModel {
  static defineSchema() {
    return {
      description: new fields.HTMLField(),
      detail: new fields.StringField(),
      family: new fields.StringField(),
      curr_rank: new fields.NumberField({ nullable: false, initial: 1, min: 1, max: 3 }),
      ...template_universal_item(),
    };
  }
}

// Converts an lcp bonus into our expected format
export function unpackNpcTemplate(
  data: PackedNpcTemplateData,
  context: UnpackContext
): {
  name: string;
  type: EntryType.NPC_TEMPLATE;
  system: DeepPartial<SourceData.NpcTemplate>;
} {
  return {
    name: data.name,
    type: EntryType.NPC_TEMPLATE,
    system: {
      lid: data.id,
      base_features: data.base_features,
      optional_features: data.optional_features,
    },
  };
}
