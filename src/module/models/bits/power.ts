import { PackedBondPowerData } from "../../util/unpacking/packed-types";

const fields: any = foundry.data.fields;

export interface PowerData {
  name: string;
  description: string;
  unlocked: boolean;
  frequency: string | null;
  veteran: boolean;
  master: boolean;
  prerequisite: string | null;
}

export class PowerField extends fields.SchemaField {
  constructor(options = {}) {
    super(
      {
        name: new fields.StringField({ nullable: false }),
        description: new fields.StringField({ nullable: false }),
        unlocked: new fields.BooleanField(),
        frequency: new fields.StringField({ required: false, nullable: true }),
        veteran: new fields.BooleanField(),
        master: new fields.BooleanField(),
        prerequisite: new fields.StringField({ required: false, nullable: true }),
      },
      options
    );
  }
}

export function unpackPower(data: PackedBondPowerData): PowerData {
  return {
    name: data.name,
    description: data.description,
    unlocked: false,
    frequency: data.frequency || null,
    veteran: data.veteran || false,
    master: data.master || false,
    prerequisite: data.prerequisite || null,
  };
}
