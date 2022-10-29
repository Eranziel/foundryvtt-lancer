import { DamageTypeChecklist, RangeTypeChecklist, WeaponSizeChecklist, WeaponTypeChecklist } from "../../enums";
import { BONUS } from "../../util/mmigration/defaults";
import {
  DamageTypeChecklistField,
  RangeTypeChecklistField,
  WeaponSizeChecklistField,
  WeaponTypeChecklistField,
} from "../shared";

// @ts-ignore
const fields: any = foundry.data.fields;

// Make all fields required, force val to string, and use checklists
export interface BonusData {
  lid: string;
  val: string;
  damage_types: DamageTypeChecklist;
  range_types: RangeTypeChecklist;
  weapon_types: WeaponTypeChecklist;
  weapon_sizes: WeaponSizeChecklist;

  overwrite: boolean;
  replace: boolean;
}

export class BonusField extends fields.SchemaField {
  constructor(options = {}) {
    super(
      {
        lid: new fields.StringField({ nullable: false }), // Don't really want an LID field here
        val: new fields.StringField({ nullable: false }),
        overwrite: new fields.BooleanField(),
        replace: new fields.BooleanField(),
        damage_types: new DamageTypeChecklistField(),
        range_types: new RangeTypeChecklistField(),
        weapon_types: new WeaponTypeChecklistField(),
        weapon_sizes: new WeaponSizeChecklistField(),
      },
      options
    );
  }
}

// Just a more convenient constructor
export function GenerateBonus(
  lid: string,
  val: string | number,
  replace: boolean = false,
  overwrite: boolean = false
): BonusData {
  return {
    ...BONUS(),
    lid,
    val: "" + val,
    replace,
    overwrite,
  };
}
