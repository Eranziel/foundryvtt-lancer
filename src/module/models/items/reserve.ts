import type { DeepPartial } from "@league-of-foundry-developers/foundry-vtt-types/src/types/utils.mjs";
import { EntryType, ReserveType } from "../../enums";
import { restrict_enum } from "../../helpers/commons";
import { SourceData } from "../../source-template";
import { PackedReserveData } from "../../util/unpacking/packed-types";
import { unpackDeployable } from "../actors/deployable";
import { unpackAction } from "../bits/action";
import { unpackBonus } from "../bits/bonus";
import { unpackCounter } from "../bits/counter";
import { unpackSynergy } from "../bits/synergy";
import { LancerDataModel, UnpackContext } from "../shared";
import { template_bascdt, template_universal_item } from "./shared";

const fields = foundry.data.fields;

export class ReserveModel extends LancerDataModel<DataSchema, Item> {
  static defineSchema() {
    return {
      consumable: new fields.BooleanField(),
      label: new fields.StringField(),
      // resource_name, resource_note, and resource_cost are in the lancer-data spec but not used currently
      // resource_name: new fields.StringField(),
      // resource_note: new fields.StringField(),
      // resource_cost: new fields.StringField(),
      // type: new fields.StringField({ choices: Object.values(ReserveType), initial: ReserveType.Tactical }),
      type: new fields.StringField({ initial: ReserveType.Tactical }), // ^ Strictness here isn't really super useful
      used: new fields.BooleanField(),
      description: new fields.HTMLField(),
      ...template_universal_item(),
      ...template_bascdt(),
    };
  }
}

// Converts an lcp bonus into our expected format
export function unpackReserve(
  data: PackedReserveData,
  context: UnpackContext
): {
  name: string;
  type: EntryType.RESERVE;
  system: DeepPartial<SourceData.Reserve>;
} {
  return {
    name: data.name ?? data.label ?? "Unnamed Reserve",
    type: EntryType.RESERVE,
    system: {
      lid: data.id,
      description: data.description,
      actions: data.actions?.map(unpackAction),
      bonuses: data.bonuses?.map(unpackBonus),
      consumable: data.consumable,
      counters: data.counters?.map(unpackCounter),
      deployables: data.deployables?.map(d => unpackDeployable(d, context)),
      integrated: data.integrated,
      label: data.label,
      // These three attributes are in the lancer-data spec, but seem to be unused.
      // resource_cost: data.resource_cost,
      // resource_name: data.resource_name,
      // resource_note: data.resource_note,
      synergies: data.synergies?.map(unpackSynergy),
      tags: undefined,
      type: restrict_enum(ReserveType, ReserveType.Tactical, data.type),
      used: data.used,
    },
  };
}
