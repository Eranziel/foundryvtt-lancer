import { EntryType } from "../../enums";
import { SourceData } from "../../source-template";
import { PackedNpcClassData, PackedNpcTemplateData, PackedSkillData } from "../../util/unpacking/packed-types";
import { LancerDataModel, LIDField, UnpackContext } from "../shared";
import { template_universal_item } from "./shared";

const fields: any = foundry.data.fields;

// @ts-ignore
export class NpcTemplateModel extends LancerDataModel {
  static defineSchema() {
    return {
      description: new fields.HTMLField(),
      base_features: new fields.ArrayField(new LIDField()),
      optional_features: new fields.ArrayField(new LIDField()),
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
  console.log(data);
  return {
    name: data.name,
    type: EntryType.NPC_TEMPLATE,
    system: {
      lid: data.id,
      description: data.description,
      base_features: data.base_features,
      optional_features: data.optional_features,
    },
  };
}
