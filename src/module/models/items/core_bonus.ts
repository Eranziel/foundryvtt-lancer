import type { DeepPartial } from "fvtt-types/utils";
import { EntryType } from "../../enums";
import type { SourceData } from "../../source-template";
import type { PackedCoreBonusData } from "../../util/unpacking/packed-types";
import { unpackDeployable } from "../actors/deployable";
import { unpackAction } from "../bits/action";
import { unpackBonus } from "../bits/bonus";
import { unpackCounter } from "../bits/counter";
import { unpackSynergy } from "../bits/synergy";
import { LancerDataModel, type UnpackContext } from "../shared";
import { migrateManufacturer, template_bascdt, template_universal_item } from "./shared";
import type { BaseData } from "../../base-data";

import fields = foundry.data.fields;

const defineCoreBonusModelSchema = () => {
  return {
    description: new fields.StringField({ nullable: true }),
    effect: new fields.StringField(),
    mounted_effect: new fields.StringField(),
    manufacturer: new fields.StringField(),
    ...template_universal_item(),
    ...template_bascdt(),
  };
};

type CoreBonusModelSchema = ReturnType<typeof defineCoreBonusModelSchema>;

export class CoreBonusModel extends LancerDataModel<CoreBonusModelSchema, Item.Implementation, BaseData.CoreBonus> {
  static DEFAULT_ICON = "systems/lancer/assets/icons/core_bonus.svg";
  static defineSchema() {
    return defineCoreBonusModelSchema();
  }

  static migrateData(data: any) {
    if (data.source) {
      data.manufacturer = migrateManufacturer(data.source);
    }

    return super.migrateData(data);
  }
}

export function unpackCoreBonus(
  data: PackedCoreBonusData,
  context: UnpackContext
): {
  name: string;
  type: EntryType.CORE_BONUS;
  system: DeepPartial<SourceData.CoreBonus>;
} {
  return {
    name: data.name,
    type: EntryType.CORE_BONUS,
    system: {
      actions: data.actions?.map(unpackAction) ?? [],
      bonuses: data.bonuses?.map(unpackBonus) ?? [],
      counters: data.counters?.map(unpackCounter) ?? [],
      deployables: data.deployables?.map(d => unpackDeployable(d, context)) ?? [],
      description: data.description,
      effect: data.effect,
      integrated: data.integrated,
      lid: data.id,
      manufacturer: data.source,
      mounted_effect: data.mounted_effect,
      synergies: data.synergies?.map(unpackSynergy),
      tags: [],
    },
  };
}
