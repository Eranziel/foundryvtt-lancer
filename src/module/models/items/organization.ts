import { EntryType, OrgType } from "../../enums";
import { SourceData } from "../../source-template";
import { PackedOrganizationData } from "../../util/unpacking/packed-types";
import { LancerDataModel, UnpackContext } from "../shared";
import { template_universal_item } from "./shared";

const fields: any = foundry.data.fields;

// @ts-ignore
export class OrganizationModel extends LancerDataModel {
  static defineSchema() {
    return {
      description: new fields.HTMLField(),
      actions: new fields.StringField(),
      efficiency: new fields.NumberField({ integer: true, initial: 0, minimum: 0, maximum: 6 }),
      influence: new fields.NumberField({ integer: true, initial: 0, minimum: 0, maximum: 6 }),
      purpose: new fields.StringField({ initial: OrgType.Military }),
      ...template_universal_item(),
    };
  }
}

// Converts an lcp bonus into our expected format
export function unpackOrganization(
  data: PackedOrganizationData,
  context: UnpackContext
): {
  name: string;
  type: EntryType.ORGANIZATION;
  system: DeepPartial<SourceData.Organization>;
} {
  return {
    name: data.name ?? "Unnamed Organization",
    type: EntryType.ORGANIZATION,
    system: {
      lid: data.lid, // TODO: uuid generator?
      description: data.description,
      actions: data.actions,
      purpose: data.purpose ?? OrgType.Military,
      efficiency: data.efficiency ?? 0,
      influence: data.influence ?? 0,
    },
  };
}
