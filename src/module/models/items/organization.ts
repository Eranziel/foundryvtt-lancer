import type { DeepPartial } from "fvtt-types/utils";
import { EntryType, OrgType } from "../../enums";
import type { SourceData } from "../../source-template";
import type { PackedOrganizationData } from "../../util/unpacking/packed-types";
import { LancerDataModel, type UnpackContext } from "../shared";
import { template_universal_item } from "./shared";

import fields = foundry.data.fields;

const defineOrganizationModelSchema = () => {
  return {
    description: new fields.HTMLField(),
    actions: new fields.StringField(),
    efficiency: new fields.NumberField({ integer: true, initial: 0, minimum: 0, maximum: 6 }),
    influence: new fields.NumberField({ integer: true, initial: 0, minimum: 0, maximum: 6 }),
    purpose: new fields.StringField({ initial: OrgType.Military }),
    ...template_universal_item(),
  };
};

type OrganizationModelSchema = ReturnType<typeof defineOrganizationModelSchema>;

export class OrganizationModel extends LancerDataModel<OrganizationModelSchema, Item.Implementation> {
  static DEFAULT_ICON = "systems/lancer/assets/icons/encounter.svg";
  static defineSchema() {
    return defineOrganizationModelSchema();
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
