import type { DeepPartial } from "@league-of-foundry-developers/foundry-vtt-types/src/types/utils.mjs";
import { EntryType } from "../../enums";
import { SourceData } from "../../source-template";
import { PackedBondData } from "../../util/unpacking/packed-types";
import { PowerField, unpackPower } from "../bits/power";
import { BondQuestionField } from "../bits/question";
import { LancerDataModel } from "../shared";
import { template_universal_item } from "./shared";

const fields = foundry.data.fields;

export class BondModel extends LancerDataModel<DataSchema, Item> {
  static defineSchema() {
    return {
      major_ideals: new fields.ArrayField(new fields.StringField()),
      minor_ideals: new fields.ArrayField(new fields.StringField()),
      // @ts-expect-error
      questions: new fields.ArrayField(new BondQuestionField()),
      // @ts-expect-error
      powers: new fields.ArrayField(new PowerField()),
      ...template_universal_item(),
    };
  }
}

export function unpackBond(data: PackedBondData): {
  name: string;
  type: EntryType.BOND;
  system: DeepPartial<SourceData.Bond>;
} {
  const powers = data.powers.map(p => unpackPower(p));
  return {
    name: data.name,
    type: EntryType.BOND,
    system: {
      lid: data.id,
      major_ideals: data.major_ideals,
      minor_ideals: data.minor_ideals,
      questions: data.questions,
      powers,
    },
  };
}
