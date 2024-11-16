import type { DeepPartial } from "@league-of-foundry-developers/foundry-vtt-types/src/types/utils.mjs";
import { EntryType } from "../../enums";
import { SourceData } from "../../source-template";
import { PackedBondData } from "../../util/unpacking/packed-types";
import { PowerField, unpackPower } from "../bits/power";
import { BondQuestionField } from "../bits/question";
import { LancerDataModel } from "../shared";
import { template_universal_item } from "./shared";

const fields: any = foundry.data.fields;

// @ts-expect-error LancerDataModel needs to be redone
export class BondModel extends LancerDataModel<"BondModel"> {
  static defineSchema() {
    return {
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
