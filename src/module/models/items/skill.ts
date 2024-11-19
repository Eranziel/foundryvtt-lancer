import type { DeepPartial } from "@league-of-foundry-developers/foundry-vtt-types/src/types/utils.mjs";
import { EntryType } from "../../enums";
import { SourceData } from "../../source-template";
import { PackedSkillData } from "../../util/unpacking/packed-types";
import { LancerDataModel, UnpackContext } from "../shared";
import { template_universal_item } from "./shared";

const fields = foundry.data.fields;

export class SkillModel extends LancerDataModel<DataSchema, Item> {
  static defineSchema() {
    return {
      description: new fields.HTMLField(),
      detail: new fields.StringField(),
      curr_rank: new fields.NumberField({ nullable: false, initial: 1, min: 1, max: 3 }),
      ...template_universal_item(),
    };
  }

  static migrateData(data: any) {
    if (data.rank) {
      data.curr_rank = data.rank;
    }

    return super.migrateData(data);
  }
}

// Converts an lcp bonus into our expected format
export function unpackSkill(
  data: PackedSkillData,
  context: UnpackContext
): {
  name: string;
  type: EntryType.SKILL;
  system: DeepPartial<SourceData.Skill>;
} {
  return {
    name: data.name,
    type: EntryType.SKILL,
    system: {
      lid: data.id,
      curr_rank: 1,
      description: data.description,
      detail: data.detail,
    },
  };
}
