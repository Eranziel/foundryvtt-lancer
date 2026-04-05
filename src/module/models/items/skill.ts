import type { DeepPartial } from "fvtt-types/utils";
import { EntryType } from "../../enums";
import type { SourceData } from "../../source-template";
import type { BaseData } from "../../base-data";
import type { PackedSkillData } from "../../util/unpacking/packed-types";
import { LancerDataModel, type UnpackContext } from "../shared";
import { template_universal_item } from "./shared";

import fields = foundry.data.fields;

const defineSkillModelSchema = () => {
  return {
    description: new fields.HTMLField(),
    detail: new fields.StringField(),
    curr_rank: new fields.NumberField({ nullable: false, initial: 1, min: 1, max: 3 }),
    ...template_universal_item(),
  };
};

type SkillModelSchema = ReturnType<typeof defineSkillModelSchema>;

export class SkillModel extends LancerDataModel<SkillModelSchema, Item.Implementation, BaseData.Skill> {
  static DEFAULT_ICON = "systems/lancer/assets/icons/skill.svg";
  static defineSchema() {
    return defineSkillModelSchema();
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
