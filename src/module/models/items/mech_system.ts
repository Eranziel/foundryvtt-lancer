import { EntryType } from "../../enums.js";
import type { SourceData } from "../../source-template.js";
import type { PackedMechSystemData } from "../../util/unpacking/packed-types.js";
import { unpackDeployable } from "../actors/deployable.js";
import { unpackAction } from "../bits/action.js";
import { unpackBonus } from "../bits/bonus.js";
import { unpackCounter } from "../bits/counter.js";
import { unpackSynergy } from "../bits/synergy.js";
import { unpackTag } from "../bits/tag.js";
import { LancerDataModel } from "../shared.js";
import type { UnpackContext } from "../shared.js";
import {
  template_universal_item,
  template_bascdt,
  template_destructible,
  template_licensed,
  template_uses,
} from "./shared.js";

const fields: any = foundry.data.fields;

// @ts-ignore
export class MechSystemModel extends LancerDataModel {
  static defineSchema() {
    return {
      effect: new fields.HTMLField(),
      sp: new fields.NumberField({ nullable: false, initial: 0 }),
      description: new fields.HTMLField(),
      type: new fields.StringField(),
      ...template_universal_item(),
      ...template_bascdt(),
      ...template_destructible(),
      ...template_licensed(),
      ...template_uses(),
    };
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
      license: data.license_id ?? data.license,
      license_level: data.license_level,
      manufacturer: data.source,
      sp: data.sp,
      synergies: data.synergies?.map(unpackSynergy),
      tags: data.tags?.map(unpackTag),
      type: data.type,
      uses: 0,
    },
  };
}
