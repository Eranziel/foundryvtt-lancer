import { EntryType } from "../../enums.js";
import type { SourceData } from "../../source-template.js";
import type { PackedPilotArmorData } from "../../util/unpacking/packed-types.js";
import { unpackDeployable } from "../actors/deployable.js";
import { unpackAction } from "../bits/action.js";
import { unpackBonus } from "../bits/bonus.js";
import { unpackSynergy } from "../bits/synergy.js";
import { LancerDataModel } from "../shared.js";
import type { UnpackContext } from "../shared.js";
import { template_universal_item, template_bascdt, template_uses } from "./shared.js";

const fields: any = foundry.data.fields;

// @ts-ignore
export class PilotArmorModel extends LancerDataModel {
  static defineSchema() {
    return {
      description: new fields.StringField({ nullable: true }),
      ...template_universal_item(),
      ...template_uses(),
      ...template_bascdt(),
    };
  }
}

export function unpackPilotArmor(
  data: PackedPilotArmorData,
  context: UnpackContext
): {
  name: string;
  type: EntryType.PILOT_ARMOR;
  system: DeepPartial<SourceData.PilotArmor>;
} {
  return {
    name: data.name,
    type: EntryType.PILOT_ARMOR,
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
