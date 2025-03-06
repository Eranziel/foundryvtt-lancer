import type { DeepPartial } from "@league-of-foundry-developers/foundry-vtt-types/src/types/utils.mjs";
import { EntryType } from "../../enums";
import { SourceData } from "../../source-template";
import { PackedPilotArmorData } from "../../util/unpacking/packed-types";
import { unpackAction } from "../bits/action";
import { unpackBonus } from "../bits/bonus";
import { unpackSynergy } from "../bits/synergy";
import { LancerDataModel, UnpackContext } from "../shared";
import { template_universal_item, template_bascdt, template_uses, addDeployableTags } from "./shared";

const fields = foundry.data.fields;

export class PilotArmorModel extends LancerDataModel<DataSchema, Item> {
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
  const { deployables, tags } = addDeployableTags(data.deployables, data.tags, context);
  return {
    name: data.name,
    type: EntryType.PILOT_ARMOR,
    system: {
      actions: data.actions?.map(unpackAction) ?? [],
      bonuses: data.bonuses?.map(unpackBonus) ?? [],
      synergies: data.synergies?.map(unpackSynergy),
      counters: undefined,
      deployables: deployables ?? [],
      description: data.description,
      lid: data.id,
      tags: tags ?? [],
    },
  };
}
