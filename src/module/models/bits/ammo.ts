import {
  WeaponSizeChecklist,
  WeaponTypeChecklist,
  makeWeaponSizeChecklist,
  makeWeaponTypeChecklist,
} from "../../enums";
import { PackedAmmoData } from "../../util/unpacking/packed-types";
import { WeaponSizeChecklistField, WeaponTypeChecklistField } from "../shared";

const fields: any = foundry.data.fields;

export interface AmmoData {
  name: string;
  description: string;
  cost: number | null;
  allowed_types: WeaponTypeChecklist | null;
  allowed_sizes: WeaponSizeChecklist | null;
  restricted_types: WeaponTypeChecklist | null;
  restricted_sizes: WeaponSizeChecklist | null;
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
