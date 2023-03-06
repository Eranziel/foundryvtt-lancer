import { EntryType } from "../../enums.js";
import type { SourceData } from "../../source-template.js";
import type { PackedPilotGearData } from "../../util/unpacking/packed-types.js";
import { unpackDeployable } from "../actors/deployable.js";
import { unpackAction } from "../bits/action.js";
import { unpackBonus } from "../bits/bonus.js";
import { unpackSynergy } from "../bits/synergy.js";
import { LancerDataModel } from "../shared.js";
import type { UnpackContext } from "../shared.js";
import { template_universal_item, template_bascdt, template_uses } from "./shared.js";

const fields: any = foundry.data.fields;

// @ts-ignore
export class PilotGearModel extends LancerDataModel {
  static defineSchema() {
    return {
      description: new fields.StringField({ nullable: true }),
      ...template_universal_item(),
      ...template_uses(),
      ...template_bascdt(),
    };
  }
}

export function unpackPilotGear(
  data: PackedPilotGearData,
  context: UnpackContext
): {
  name: string;
  type: EntryType.PILOT_GEAR;
  system: DeepPartial<SourceData.PilotGear>;
} {
  return {
    name: data.name,
    type: EntryType.PILOT_GEAR,
    system: {
      actions: data.actions?.map(unpackAction) ?? [],
      bonuses: data.bonuses?.map(unpackBonus) ?? [],
      synergies: data.synergies?.map(unpackSynergy),
      counters: undefined,
      deployables: data.deployables?.map(d => unpackDeployable(d, context)) ?? [],
      description: data.description,
      lid: data.id,
      tags: [],
    },
  };
}
