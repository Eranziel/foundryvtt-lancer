
import { LancerDataModel } from "../shared";
import { template_universal_item, template_bascdt, template_destructible } from "./shared";

const fields: any = foundry.data.fields;

// @ts-ignore
export class MechSystemModel extends LancerDataModel {
  static defineSchema() {
    return {
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
      ...template_destructible()
    };
  }

}