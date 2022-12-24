import { PackedCoreBonusData } from "../../util/mmigration/packed-types";
import { LancerDataModel } from "../shared";
import { template_universal_item, template_bascdt, template_destructible, template_licensed } from "./shared";

const fields: any = foundry.data.fields;

// @ts-ignore
export class CoreBonusModel extends LancerDataModel {
  static defineSchema() {
    return {
      description: new fields.StringField({ nullable: true }),
      effect: new fields.StringField(),
      mounted_effect: new fields.StringField(),
      manufacturer: new fields.StringField(),
      ...template_universal_item(),
      ...template_bascdt(),
    };
  }
}

export function unpackCoreBonus(data: PackedCoreBonusData) {}
