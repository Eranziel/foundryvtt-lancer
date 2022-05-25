// @ts-nocheck

import { ActionsField } from "../bits/action";
import { template_bascdt } from "./shared.ts";

class MyItemModel extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      stats: // ...
    };
  }
}

const fields = foundry.data.fields;

export class MechSystemModel extends foundry.abstract.DataModel {
  static defineSchema() {
    const key = new fields.StringField({ required: true, blank: false, nullable: false, label: 'Key' });
    const value = new fields.NumberField({ required: true, nullable: false, label: 'Val' });
    const keyValuePairDataSchema = { key, value };
    const keyValuePairSchemaField = new fields.SchemaField(keyValuePairDataSchema);

    return {
      cascading: new fields.BooleanField(),
      destroyed: new fields.BooleanField(),
      effect: new fields.HTMLField(),
      license: new fields.StringField({ trim: 
      ...template_bascdt(),
      ...template_bascdt(),
    };
  }

}