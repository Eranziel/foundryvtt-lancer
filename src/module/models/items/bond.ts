import type { DeepPartial } from "@league-of-foundry-developers/foundry-vtt-types/src/types/utils.mjs";
import { EntryType } from "../../enums";
import { SourceData } from "../../source-template";
import { PackedBondData } from "../../util/unpacking/packed-types";
import { unpackPower } from "../bits/power";
import { LancerDataModel } from "../shared";
import { template_universal_item } from "./shared";

const fields = foundry.data.fields;

function bond_schema() {
  return {
    major_ideals: new fields.ArrayField(new fields.StringField()),
    minor_ideals: new fields.ArrayField(new fields.StringField()),
    questions: new fields.ArrayField(
      new fields.SchemaField({
        question: new fields.StringField({ nullable: false }),
        options: new fields.ArrayField(new fields.StringField({ nullable: false })),
      })
    ),
    powers: new fields.ArrayField(
      new fields.SchemaField({
        name: new fields.StringField({ nullable: false }),
        description: new fields.StringField({ nullable: false }),
        unlocked: new fields.BooleanField(),
        frequency: new fields.StringField({ required: false, nullable: true }),
        uses: new fields.SchemaField(
          {
            min: new fields.NumberField({ integer: true, initial: 0 }),
            max: new fields.NumberField({ integer: true, initial: 0 }),
            value: new fields.NumberField({ integer: true, initial: 0 }),
          },
          { required: false, nullable: true }
        ),
        veteran: new fields.BooleanField(),
        master: new fields.BooleanField(),
        prerequisite: new fields.StringField({ required: false, nullable: true }),
      })
    ),
    ...template_universal_item(),
  };
}

type BondSchema = ReturnType<typeof bond_schema> & DataSchema;

export class BondModel extends LancerDataModel<BondSchema, Item> {
  static defineSchema() {
    return bond_schema();
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
