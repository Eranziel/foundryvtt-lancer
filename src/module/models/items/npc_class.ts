import { EntryType } from "../../enums";
import { SourceData } from "../../source-template";
import { PackedNpcClassData, PackedSkillData } from "../../util/unpacking/packed-types";
import { LancerDataModel, UnpackContext } from "../shared";
import { template_universal_item } from "./shared";

const fields: any = foundry.data.fields;

// @ts-ignore
export class NpcClassModel extends LancerDataModel {
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
      let x: number | number[] | number[][] = (data as any)[key] ?? [0];
      x = Array.isArray(x) ? x : [x];
      x = x.length == 0 ? [0] : x;
      let y = i >= x.length ? x[x.length - 1] : x[i];
      let z = Array.isArray(y) ? y[0] : y;
      return z;
    };
    stats.push({
      activations: giv("activations"),
      agility: giv("agility"),
      armor: giv("armor"),
      edef: giv("edef"),
      engineering: giv("engineering"),
      evade: giv("evade"),
      heatcap: giv("heatcap"),
      hp: giv("hp"),
      hull: giv("hull"),
      save: giv("save"),
      sensor: giv("sensor"),
      size: giv("size"),
      speed: giv("speed"),
      stress: giv("stress"),
      structure: giv("structure"),
      systems: giv("systems"),
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
