import { EntryType } from "../../enums";
import { SourceData } from "../../source-template";
import { LancerDataModel, UnpackContext } from "../shared";
import { template_universal_item } from "./shared";

const fields: any = foundry.data.fields;

// @ts-ignore
export class LicenseModel extends LancerDataModel<"LicenseModel"> {
  static defineSchema() {
    return {
      key: new fields.StringField(),
      manufacturer: new fields.StringField(),
      curr_rank: new fields.NumberField({ nullable: false, initial: 1, min: 1, max: 3 }),
      ...template_universal_item(),
    };
  }

  static migrateData(data: any) {
    if (typeof data.manufacturer == "object") {
      data.manufacturer = data.manufacturer.fallback_lid;
    }
    if (data.rank) data.curr_rank = data.rank;

    // @ts-expect-error v11
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
