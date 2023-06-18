import { EntryType } from "../../enums";
import { SourceData } from "../../source-template";
import { PackedBondData } from "../../util/unpacking/packed-types";
import { PowerField } from "../bits/power";
import { BondQuestionField } from "../bits/question";
import { LancerDataModel } from "../shared";
import { template_universal_item } from "./shared";

const fields: any = foundry.data.fields;

// TODO: add fields for in-play tracking of ideal fulfillment and power usage
export class BondModel extends LancerDataModel<"BondModel"> {
  static defineSchema() {
    return {
      name: new fields.StringField(),
      major_ideals: new fields.ArrayField(new fields.StringField()),
      minor_ideals: new fields.ArrayField(new fields.StringField()),
      questions: new fields.ArrayField(new BondQuestionField()),
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
  return {
    name: data.name,
    type: EntryType.BOND,
    system: {
      major_ideals: data.major_ideals,
      minor_ideals: data.minor_ideals,
      questions: data.questions,
      powers: data.powers,
    },
  };
}
