import {
  type WeaponSizeChecklist,
  type WeaponTypeChecklist,
  makeWeaponSizeChecklist,
  makeWeaponTypeChecklist,
} from "../../enums";
import type { PackedAmmoData } from "../../util/unpacking/packed-types";
import { WeaponSizeChecklistField, WeaponTypeChecklistField } from "../shared";

import fields = foundry.data.fields;

const defineAmmoFieldSchema = () => {
  return {
    name: new fields.StringField({ nullable: false }),
    description: new fields.StringField({ nullable: false }),
    cost: new fields.NumberField({ nullable: true }),
    allowed_types: new WeaponTypeChecklistField(),
    allowed_sizes: new WeaponSizeChecklistField(),
    restricted_types: new WeaponTypeChecklistField(),
    restricted_sizes: new WeaponSizeChecklistField(),
  };
};

type AmmoFieldSchema = ReturnType<typeof defineAmmoFieldSchema>;

export type AmmoData = fields.SchemaField.InitializedData<AmmoFieldSchema>;

export class AmmoField<
  Options extends fields.SchemaField.Options<AmmoFieldSchema> = fields.SchemaField.DefaultOptions,
> extends fields.SchemaField<AmmoFieldSchema, Options> {
  constructor(options?: Options) {
    super(defineAmmoFieldSchema(), options);
  }
}

export function unpackAmmo(data: PackedAmmoData): AmmoData {
  return {
    name: data.name,
    description: data.description,
    cost: data.cost ?? null,
    allowed_types: data.allowed_types ? makeWeaponTypeChecklist(data.allowed_types) : null,
    allowed_sizes: data.allowed_sizes ? makeWeaponSizeChecklist(data.allowed_sizes) : null,
    restricted_types: data.restricted_types ? makeWeaponTypeChecklist(data.restricted_types) : null,
    restricted_sizes: data.restricted_sizes ? makeWeaponSizeChecklist(data.restricted_sizes) : null,
  };
}
