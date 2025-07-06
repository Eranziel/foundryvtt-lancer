import type { DeepPartial } from "fvtt-types/utils";
import { EntryType } from "../../enums";
import type { SourceData } from "../../source-template";
import type { PackedPilotArmorData } from "../../util/unpacking/packed-types";
import { unpackAction } from "../bits/action";
import { unpackBonus } from "../bits/bonus";
import { unpackSynergy } from "../bits/synergy";
import { LancerDataModel, type UnpackContext } from "../shared";
import { template_universal_item, template_bascdt, template_uses, addDeployableTags } from "./shared";

import fields = foundry.data.fields;

const definePilotArmorModelSchema = () => {
  return {
    description: new fields.StringField({ nullable: true }),
    effect: new fields.StringField(),
    ...template_universal_item(),
    ...template_uses(),
    ...template_bascdt(),
  };
};

type PilotArmorModelSchema = ReturnType<typeof definePilotArmorModelSchema>;

export class PilotArmorModel extends LancerDataModel<PilotArmorModelSchema, Item.Implementation> {
  static DEFAULT_ICON = "systems/lancer/assets/icons/role_tank.svg";
  static defineSchema() {
    return definePilotArmorModelSchema();
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
      effect: data.effect,
      lid: data.id,
      tags: tags ?? [],
    },
  };
}
