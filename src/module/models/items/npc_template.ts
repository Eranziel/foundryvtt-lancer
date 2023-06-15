import { EntryType } from "../../enums";
import { regRefToLid } from "../../util/migrations";
import { SourceData } from "../../source-template";
import { PackedNpcClassData, PackedNpcTemplateData, PackedSkillData } from "../../util/unpacking/packed-types";
import { LancerDataModel, LIDField, UnpackContext } from "../shared";
import { template_universal_item } from "./shared";

const fields: any = foundry.data.fields;

export class NpcTemplateModel extends LancerDataModel<"NpcTemplateModel"> {
  static defineSchema() {
    return {
      description: new fields.HTMLField(),
      base_features: new fields.ArrayField(new LIDField()),
      optional_features: new fields.ArrayField(new LIDField()),
      ...template_universal_item(),
    };
  }

  static migrateData(data: any) {
    // Convert old regrefs
    data.base_features = data.base_features?.map((bf: string | object) => regRefToLid(bf)).filter((x: any) => x);
    data.optional_features = data.optional_features
      ?.map((of: string | object) => regRefToLid(of))
      .filter((x: any) => x);

    // @ts-expect-error
    return super.migrateData(data);
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
      description: data.description,
      base_features: data.base_features,
      optional_features: data.optional_features,
    },
  };
}
