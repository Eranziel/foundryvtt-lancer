import type { DeepPartial } from "fvtt-types/utils";
import { EntryType } from "../../enums";
import type { SourceData } from "../../source-template";
import type { BaseData } from "../../base-data";
import type { PackedMechSystemData } from "../../util/unpacking/packed-types";
import { unpackAction } from "../bits/action";
import { AmmoField, unpackAmmo } from "../bits/ammo";
import { unpackBonus } from "../bits/bonus";
import { unpackCounter } from "../bits/counter";
import { unpackSynergy } from "../bits/synergy";
import { LancerDataModel, type UnpackContext } from "../shared";
import {
  addDeployableTags,
  migrateManufacturer,
  template_bascdt,
  template_destructible,
  template_licensed,
  template_universal_item,
  template_uses,
} from "./shared";

import fields = foundry.data.fields;

const defineMechSystemModelSchema = () => {
  return {
    effect: new fields.HTMLField(),
    sp: new fields.NumberField({ nullable: false, initial: 0 }),
    description: new fields.HTMLField(),
    type: new fields.StringField(),
    ammo: new fields.ArrayField(new AmmoField()),
    ...template_universal_item(),
    ...template_bascdt(),
    ...template_destructible(),
    ...template_licensed(),
    ...template_uses(),
  };
};

type MechSystemModelSchema = ReturnType<typeof defineMechSystemModelSchema>;

export class MechSystemModel extends LancerDataModel<MechSystemModelSchema, Item.Implementation, BaseData.MechSystem> {
  static DEFAULT_ICON = "systems/lancer/assets/icons/mech_system.svg";
  static defineSchema() {
    return defineMechSystemModelSchema();
  }

  static migrateData(data: any) {
    if (data.source) {
      data.manufacturer = migrateManufacturer(data.source);
    }

    return super.migrateData(data);
  }
}

// Converts an lcp bonus into our expected format
export function unpackMechSystem(
  data: PackedMechSystemData,
  context: UnpackContext
): {
  name: string;
  type: EntryType.MECH_SYSTEM;
  system: DeepPartial<SourceData.MechSystem>;
} {
  const { deployables, tags } = addDeployableTags(data.deployables, data.tags, context);
  return {
    name: data.name,
    type: EntryType.MECH_SYSTEM,
    system: {
      lid: data.id,
      actions: data.actions?.map(unpackAction),
      bonuses: data.bonuses?.map(unpackBonus),
      cascading: undefined,
      counters: data.counters?.map(unpackCounter),
      deployables,
      description: data.description,
      destroyed: undefined,
      effect: data.effect,
      integrated: data.integrated,
      license: data.license_id || data.license,
      license_level: data.license_level,
      manufacturer: data.source,
      sp: data.sp,
      synergies: data.synergies?.map(unpackSynergy),
      tags,
      type: data.type,
      ammo: data.ammo?.map(unpackAmmo),
      uses: { value: 0, max: 0 },
    },
  };
}
