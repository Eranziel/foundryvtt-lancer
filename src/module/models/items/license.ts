import { EntryType } from "../../enums";
import { SourceData } from "../../source-template";
import { LancerDataModel, UnpackContext } from "../shared";
import { template_universal_item } from "./shared";

const fields: any = foundry.data.fields;

// @ts-ignore
export class LicenseModel extends LancerDataModel {
  static defineSchema() {
    return {
      key: new fields.StringField(),
      manufacturer: new fields.StringField(),
      curr_rank: new fields.NumberField({ nullable: false, initial: 1, min: 1, max: 3 }),
      ...template_universal_item(),
    };
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
      lid: key.replace("mf", "lic"),
      key,
      manufacturer,
    },
  };
}
