import { EntryType } from "../../enums";
import { regRefToLid, convertNpcStats } from "../../util/migrations";
import { SourceData } from "../../source-template";
import { PackedNpcClassData } from "../../util/unpacking/packed-types";
import { ControlledLengthArrayField, LancerDataModel, LIDField, NpcStatBlockField, UnpackContext } from "../shared";
import { template_universal_item } from "./shared";
import { frameToPath } from "../../actor/retrograde-map";

const fields: any = foundry.data.fields;

export class NpcClassModel extends LancerDataModel<"NpcClassModel"> {
  static defineSchema() {
    return {
      role: new fields.StringField(),
      flavor: new fields.HTMLField(),
      tactics: new fields.HTMLField(),
      base_features: new fields.ArrayField(new LIDField()),
      optional_features: new fields.ArrayField(new LIDField()),
      base_stats: new ControlledLengthArrayField(new NpcStatBlockField({ nullable: false }), { length: 3 }),
      ...template_universal_item(),
    };
  }

  static migrateData(data: any) {
    data.flavor ??= data.info?.flavor;
    data.tactics ??= data.info?.tactics;

    // Convert old regrefs
    data.base_features = data.base_features?.map((bf: string | object) => regRefToLid(bf)).filter((x: any) => x);
    data.optional_features = data.optional_features
      ?.map((of: string | object) => regRefToLid(of))
      .filter((x: any) => x);

    // Invert stats
    if (typeof data.base_stats == "object" && !Array.isArray(data.base_stats)) {
      data.base_stats = convertNpcStats(data.base_stats);
    }
    if (data.base_stats) {
      // Ensure sizes are reasonable values
      for (let i = 0; i < data.base_stats.length; i++) {
        if (data.base_stats[i].size !== undefined) {
          // Size of 1 and higher must be integer values
          if (data.base_stats[i].size >= 1.0) {
            data.base_stats[i].size = Math.floor(data.base_stats[i].size);
          } else {
            // Sizes below 1 must be 1/2
            data.base_stats[i].size = 0.5;
          }
        }
      }
    }

    // @ts-expect-error
    return super.migrateData(data);
  }
}

// Converts an lcp bonus into our expected format
export function unpackNpcClass(
  data: PackedNpcClassData,
  context: UnpackContext
): {
  name: string;
  type: EntryType.NPC_CLASS;
  img: string | undefined;
  system: DeepPartial<SourceData.NpcClass>;
} {
  const frameImg = frameToPath(data.name);
  return {
    name: data.name,
    type: EntryType.NPC_CLASS,
    img: frameImg ?? undefined,
    system: {
      lid: data.id,
      role: data.role,
      flavor: data.info.flavor,
      tactics: data.info.tactics,
      base_features: data.base_features,
      optional_features: data.optional_features,
      base_stats: convertNpcStats(data.stats),
    },
  };
}
