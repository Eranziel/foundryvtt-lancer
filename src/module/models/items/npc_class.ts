import { EntryType } from "../../enums";
import type { SourceData } from "../../source-template";
import type { PackedNpcClassData } from "../../util/unpacking/packed-types";
import { LancerDataModel, LIDField } from "../shared";
import type { UnpackContext } from "../shared";
import { template_universal_item } from "./shared";

const fields: any = foundry.data.fields;

// @ts-ignore
export class NpcClassModel extends LancerDataModel {
  static defineSchema() {
    return {
      role: new fields.StringField(),
      flavor: new fields.HTMLField(),
      tactics: new fields.HTMLField(),
      base_features: new fields.ArrayField(new LIDField()),
      optional_features: new fields.ArrayField(new LIDField()),
      base_stats: new fields.ArrayField(new fields.ObjectField()),
      ...template_universal_item(),
    };
  }
}

// Converts an lcp bonus into our expected format
export function unpackNpcClass(
  data: PackedNpcClassData,
  context: UnpackContext
): {
  name: string;
  type: EntryType.NPC_CLASS;
  system: DeepPartial<SourceData.NpcClass>;
} {
  let stats: SourceData.NpcClass["base_stats"] = [];
  for (let i = 0; i < 3; i++) {
    const giv = (key: string) => {
      let x: number | number[] | number[][] = (data.stats as any)[key] ?? [0];
      x = Array.isArray(x) ? x : [x];
      x = x.length == 0 ? [0] : x;
      let y = i >= x.length ? x[x.length - 1] : x[i];
      let z = Array.isArray(y) ? y[0] : y;
      return z;
    };
    stats.push({
      activations: giv("activations"),
      agi: giv("agility"),
      armor: giv("armor"),
      edef: giv("edef"),
      eng: giv("engineering"),
      evasion: giv("evade"),
      heatcap: giv("heatcap"),
      hp: giv("hp"),
      hull: giv("hull"),
      save: giv("save"),
      sensor_range: giv("sensor"),
      size: giv("size"),
      speed: giv("speed"),
      stress: giv("stress"),
      structure: giv("structure"),
      sys: giv("systems"),
    });
  }

  return {
    name: data.name,
    type: EntryType.NPC_CLASS,
    system: {
      lid: data.id,
      role: data.role,
      flavor: data.info.flavor,
      tactics: data.info.tactics,
      base_features: data.base_features,
      optional_features: data.optional_features,
      base_stats: stats,
    },
  };
}
