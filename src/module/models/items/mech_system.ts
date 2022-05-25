// @ts-nocheck

import { template_universal_item } from "./shared";
import { template_bascdt } from "./shared.ts";

const fields = foundry.data.fields;

export class MechSystemModel extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      cascading: new fields.BooleanField(),
      destroyed: new fields.BooleanField(),
      effect: new fields.HTMLField(),
      license: new fields.StringField(),
      source: new fields.StringField({ nullable: true }),
      license_level: new fields.NumberField({ nullable: false, initial: 0 }),
      sp: new fields.NumberField({ nullable: false, initial: 0 }),
      uses: new fields.NumberField({ nullable: false, initial: 0 }),
      description: new fields.HTMLField(),
      type: new fields.StringField(),
      ...template_universal_item(),
      ...template_bascdt(),
    };
  }

}