import type { DeepPartial } from "@league-of-foundry-developers/foundry-vtt-types/src/types/utils.mjs";
import { EntryType } from "../../enums";
import { SourceData } from "../../source-template";
import { PackedCoreBonusData } from "../../util/unpacking/packed-types";
import { unpackDeployable } from "../actors/deployable";
import { unpackAction } from "../bits/action";
import { unpackBonus } from "../bits/bonus";
import { unpackCounter } from "../bits/counter";
import { unpackSynergy } from "../bits/synergy";
import { LancerDataModel, UnpackContext } from "../shared";
import { migrateManufacturer, template_bascdt, template_universal_item } from "./shared";

const fields = foundry.data.fields;

export class CoreBonusModel extends LancerDataModel<DataSchema, Item> {
  static defineSchema() {
    return {
      description: new fields.StringField({ nullable: true }),
      effect: new fields.StringField(),
      mounted_effect: new fields.StringField(),
      manufacturer: new fields.StringField(),
      ...template_universal_item(),
      ...template_bascdt(),
    };
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
