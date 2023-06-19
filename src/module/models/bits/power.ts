import { PackedPowerData } from "../../util/unpacking/packed-types";

const fields: any = foundry.data.fields;

export interface PowerData {
  name: string;
  description: string;
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
        frequency: new fields.StringField({ required: false, nullable: true }),
        veteran: new fields.BooleanField(),
        master: new fields.BooleanField(),
        prerequisite: new fields.StringField({ required: false, nullable: true }),
      },
      options
    );
  }
}

export function unpackPower(data: PackedPowerData): PowerData {
  return {
    name: data.name,
    description: data.description,
    frequency: data.frequency || null,
    veteran: data.veteran || false,
    master: data.master || false,
    prerequisite: data.prerequisite || null,
  };
}
