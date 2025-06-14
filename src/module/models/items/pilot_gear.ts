import type { DeepPartial } from "fvtt-types/utils";
import { EntryType } from "../../enums";
import type { SourceData } from "../../source-template";
import type { PackedPilotGearData } from "../../util/unpacking/packed-types";
import { unpackAction } from "../bits/action";
import { unpackBonus } from "../bits/bonus";
import { unpackSynergy } from "../bits/synergy";
import { LancerDataModel, type UnpackContext } from "../shared";
import { template_universal_item, template_bascdt, template_uses, addDeployableTags } from "./shared";

const fields = foundry.data.fields;

export class PilotGearModel extends LancerDataModel<foundry.data.fields.DataSchema, Item.Implementation> {
  static DEFAULT_ICON = "systems/lancer/assets/icons/generic_item.svg";
  static defineSchema() {
    return {
      description: new fields.StringField({ nullable: true }),
      effect: new fields.StringField(),
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
  const { deployables, tags } = addDeployableTags(data.deployables, data.tags, context);
  return {
    name: data.name,
    type: EntryType.PILOT_GEAR,
    system: {
      actions: data.actions?.map(unpackAction) ?? [],
      bonuses: data.bonuses?.map(unpackBonus) ?? [],
      synergies: data.synergies?.map(unpackSynergy),
      counters: undefined,
      deployables: deployables ?? [],
      description: data.description,
      effect: data.effect,
      lid: data.id,
      tags: tags ?? [],
    },
  };
}
