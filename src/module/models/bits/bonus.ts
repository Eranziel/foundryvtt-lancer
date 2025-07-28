import {
  type DamageTypeChecklist,
  makeWeaponSizeChecklist,
  makeWeaponTypeChecklist,
  type RangeTypeChecklist,
  type WeaponSizeChecklist,
  type WeaponTypeChecklist,
} from "../../enums";
import { BONUS } from "../../util/unpacking/defaults";
import type { PackedBonusData } from "../../util/unpacking/packed-types";
import {
  DamageTypeChecklistField,
  RangeTypeChecklistField,
  WeaponSizeChecklistField,
  WeaponTypeChecklistField,
} from "../shared";
import { Damage } from "./damage";
import { Range } from "./range";

import fields = foundry.data.fields;

const defineBonusFieldSchema = () => {
  return {
    lid: new fields.StringField({ nullable: false }), // Don't really want an LID field here
    val: new fields.StringField({ nullable: false }),
    overwrite: new fields.BooleanField(),
    replace: new fields.BooleanField(),
    damage_types: new DamageTypeChecklistField(),
    range_types: new RangeTypeChecklistField(),
    weapon_types: new WeaponTypeChecklistField(),
    weapon_sizes: new WeaponSizeChecklistField(),
  };
};

type BonusFieldSchema = ReturnType<typeof defineBonusFieldSchema>;

export type BonusData = fields.SchemaField.InitializedData<BonusFieldSchema>;

export class BonusField<Options extends fields.SchemaField.Options<BonusFieldSchema>> extends fields.SchemaField<
  BonusFieldSchema,
  Options
> {
  constructor(options?: Options) {
    super(defineBonusFieldSchema(), options);
  }
}

// Just a more convenient constructor
export function generateBonus(
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

// Converts an lcp bonus into our expected format
export function unpackBonus(data: PackedBonusData): BonusData {
  return {
    lid: data.id,
    val: data.val.toString(),
    damage_types: data.damage_types ? Damage.MakeChecklist(data.damage_types) : null,
    range_types: data.range_types ? Range.MakeChecklist(data.range_types) : null,
    weapon_sizes: data.weapon_sizes ? makeWeaponSizeChecklist(data.weapon_sizes) : null,
    weapon_types: data.weapon_types ? makeWeaponTypeChecklist(data.weapon_types) : null,
    overwrite: data.overwrite ?? false,
    replace: data.replace ?? false,
  };
}
