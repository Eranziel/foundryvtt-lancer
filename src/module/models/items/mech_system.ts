import type { DeepPartial } from "@league-of-foundry-developers/foundry-vtt-types/src/types/utils.mjs";
import { EntryType } from "../../enums";
import { SourceData } from "../../source-template";
import { PackedMechSystemData } from "../../util/unpacking/packed-types";
import { unpackDeployable } from "../actors/deployable";
import { unpackAction } from "../bits/action";
import { AmmoField, unpackAmmo } from "../bits/ammo";
import { unpackBonus } from "../bits/bonus";
import { unpackCounter } from "../bits/counter";
import { unpackSynergy } from "../bits/synergy";
import { unpackTag } from "../bits/tag";
import { LancerDataModel, UnpackContext } from "../shared";
import {
  migrateManufacturer,
  template_bascdt,
  template_destructible,
  template_licensed,
  template_universal_item,
  template_uses,
} from "./shared";

const fields: any = foundry.data.fields;

// @ts-expect-error LancerDataModel needs to be redone
export class MechSystemModel extends LancerDataModel<"MechSystemModel"> {
  static defineSchema() {
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
  return {
    name: data.name,
    type: EntryType.MECH_SYSTEM,
    system: {
      lid: data.id,
      actions: data.actions?.map(unpackAction),
      bonuses: data.bonuses?.map(unpackBonus),
      cascading: undefined,
      counters: data.counters?.map(unpackCounter),
      deployables: data.deployables?.map(d => unpackDeployable(d, context)),
      description: data.description,
      destroyed: undefined,
      effect: data.effect,
      integrated: data.integrated,
      license: data.license_id || data.license,
      license_level: data.license_level,
      manufacturer: data.source,
      sp: data.sp,
      synergies: data.synergies?.map(unpackSynergy),
      tags: data.tags?.map(unpackTag),
      type: data.type,
      ammo: data.ammo?.map(unpackAmmo),
      uses: { value: 0, max: 0 },
    },
  };
}
