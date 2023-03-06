import { EntryType, ReserveType } from "../../enums.js";
import { restrict_enum } from "../../helpers/commons.js";
import { dataTransfer } from "../../helpers/slidinghud/is-dragging.js";
import type { SourceData } from "../../source-template.js";
import type { PackedReserveData } from "../../util/unpacking/packed-types.js";
import { unpackDeployable } from "../actors/deployable.js";
import { unpackAction } from "../bits/action.js";
import { unpackBonus } from "../bits/bonus.js";
import { unpackCounter } from "../bits/counter.js";
import { unpackSynergy } from "../bits/synergy.js";
import { LancerDataModel } from "../shared.js";
import type { UnpackContext } from "../shared.js";
import { template_bascdt, template_universal_item } from "./shared.js";

const fields: any = foundry.data.fields;

// @ts-ignore
export class ReserveModel extends LancerDataModel {
  static defineSchema() {
    return {
      consumable: new fields.BooleanField(),
      label: new fields.StringField(),
      resource_name: new fields.StringField(),
      resource_note: new fields.StringField(),
      resource_cost: new fields.StringField(),
      type: new fields.StringField({ choices: Object.values(ReserveType), initial: ReserveType.Tactical }),
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
      resource_cost: data.resource_cost,
      resource_name: data.resource_name,
      resource_note: data.resource_note,
      synergies: data.synergies?.map(unpackSynergy),
      tags: undefined,
      type: restrict_enum(ReserveType, ReserveType.Tactical, data.type),
      used: data.used,
    },
  };
}
