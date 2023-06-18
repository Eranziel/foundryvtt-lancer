const fields: any = foundry.data.fields;

export interface PowerData {
  lid: string;
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
        lid: new fields.LIDField({ nullable: false }),
        name: new fields.StringField({ nullable: false }),
        description: new fields.StringField({ nullable: false }),
        frequency: new fields.StringField({ required: false, nullable: true }),
        veteran: new fields.BooleanField({ nullable: false }),
        master: new fields.BooleanField({ nullable: false }),
        prerequisite: new fields.StringField({ required: false, nullable: true }),
      },
      options
    );
  }
}

export function unpackPower(data: any): PowerData {
  return {
    lid: data.lid,
    name: data.name,
    description: data.description,
    frequency: data.frequency,
    veteran: data.veteran,
    master: data.master,
    prerequisite: data.prerequisite,
  };
}
