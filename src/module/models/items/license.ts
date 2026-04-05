import type { DeepPartial } from "fvtt-types/utils";
import { EntryType } from "../../enums";
import type { SourceData } from "../../source-template";
import type { BaseData } from "../../base-data";
import { LancerDataModel, type UnpackContext } from "../shared";
import { template_universal_item } from "./shared";

import fields = foundry.data.fields;

const defineLicenseModelSchema = () => {
  return {
    key: new fields.StringField(),
    manufacturer: new fields.StringField(),
    curr_rank: new fields.NumberField({ nullable: false, initial: 1, min: 1, max: 3 }),
    ...template_universal_item(),
  };
};

type LicenseModelSchema = ReturnType<typeof defineLicenseModelSchema>;

export class LicenseModel extends LancerDataModel<LicenseModelSchema, Item.Implementation, BaseData.License> {
  static DEFAULT_ICON = "systems/lancer/assets/icons/license.svg";
  static defineSchema() {
    return defineLicenseModelSchema();
  }

  static migrateData(data: any) {
    if (typeof data.manufacturer == "object") {
      data.manufacturer = data.manufacturer.fallback_lid;
    }
    if (data.rank) data.curr_rank = data.rank;

    return super.migrateData(data);
  }
}

// Converts an lcp bonus into our expected format
export function unpackLicense(
  name: string,
  key: string,
  manufacturer: string,
  _context: UnpackContext
): {
  name: string;
  type: EntryType.LICENSE;
  system: DeepPartial<SourceData.License>;
} {
  return {
    name,
    type: EntryType.LICENSE,
    system: {
      lid: `lic_${key}`,
      key,
      manufacturer,
    },
  };
}
