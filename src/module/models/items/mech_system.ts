import { LancerDataModel } from "../shared";
import { template_universal_item, template_bascdt, template_destructible, template_licensed } from "./shared";

const fields: any = foundry.data.fields;

// @ts-ignore
export class MechSystemModel extends LancerDataModel {
  static defineSchema() {
    return {
      effect: new fields.HTMLField(),
      sp: new fields.NumberField({ nullable: false, initial: 0 }),
      uses: new fields.NumberField({ nullable: false, initial: 0 }),
      description: new fields.HTMLField(),
      type: new fields.StringField(),
      ...template_universal_item(),
      ...template_bascdt(),
      ...template_destructible(),
      ...template_licensed(),
    };
  }
}
