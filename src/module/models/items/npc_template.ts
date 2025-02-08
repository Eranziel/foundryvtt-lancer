import type { DeepPartial } from "@league-of-foundry-developers/foundry-vtt-types/src/types/utils.mjs";
import { EntryType } from "../../enums";
import { SourceData } from "../../source-template";
import { regRefToLid } from "../../util/migrations";
import { PackedNpcTemplateData } from "../../util/unpacking/packed-types";
import { LancerDataModel, LIDField, UnpackContext } from "../shared";
import { template_universal_item } from "./shared";

const fields = foundry.data.fields;

export class NpcTemplateModel extends LancerDataModel<DataSchema, Item> {
  static defineSchema() {
    return {
      description: new fields.HTMLField(),
      base_features: new fields.SetField(new LIDField()),
      optional_features: new fields.SetField(new LIDField()),
      ...template_universal_item(),
    };
  }

  static migrateData(data: any) {
    // Convert old regrefs
    data.base_features = data.base_features?.map((bf: string | object) => regRefToLid(bf)).filter((x: any) => x);
    data.optional_features = data.optional_features
      ?.map((of: string | object) => regRefToLid(of))
      .filter((x: any) => x);

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
      base_features: data.base_features as any,
      optional_features: data.optional_features as any,
    },
  };
}
