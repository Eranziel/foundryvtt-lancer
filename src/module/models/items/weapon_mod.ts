import { EntryType, makeWeaponSizeChecklist, makeWeaponTypeChecklist } from "../../enums.js";
import type { SourceData } from "../../source-template.js";
import type { PackedWeaponModData } from "../../util/unpacking/packed-types.js";
import { unpackDeployable } from "../actors/deployable.js";
import { unpackAction } from "../bits/action.js";
import { unpackBonus } from "../bits/bonus.js";
import { unpackCounter } from "../bits/counter.js";
import { DamageField, unpackDamage } from "../bits/damage.js";
import { RangeField, unpackRange } from "../bits/range.js";
import { unpackSynergy } from "../bits/synergy.js";
import { TagField, unpackTag } from "../bits/tag.js";
import { LancerDataModel, WeaponSizeChecklistField, WeaponTypeChecklistField } from "../shared.js";
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
export class WeaponModModel extends LancerDataModel {
  static defineSchema() {
    return {
      added_tags: new fields.ArrayField(new TagField()),
      added_damage: new fields.ArrayField(new DamageField()),
      added_range: new fields.ArrayField(new RangeField()),
      effect: new fields.HTMLField(),
      description: new fields.HTMLField(),
      sp: new fields.NumberField({ nullable: false, initial: 0 }),
      allowed_types: new WeaponTypeChecklistField(),
      allowed_sizes: new WeaponSizeChecklistField(),
      ...template_universal_item(),
      ...template_bascdt(),
      ...template_destructible(),
      ...template_licensed(),
      ...template_uses(),
    };
  }
}

// Converts an lcp bonus into our expected format
export function unpackWeaponMod(
  data: PackedWeaponModData,
  context: UnpackContext
): {
  name: string;
  type: EntryType.WEAPON_MOD;
  system: DeepPartial<SourceData.WeaponMod>;
} {
  return {
    name: data.name,
    type: EntryType.WEAPON_MOD,
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
      uses: 0,
      added_damage: data.added_damage?.map(unpackDamage),
      added_range: data.added_range?.map(unpackRange),
      added_tags: data.added_tags?.map(unpackTag),
      allowed_sizes: makeWeaponSizeChecklist(data.allowed_sizes ?? []),
      allowed_types: makeWeaponTypeChecklist(data.allowed_types ?? []),
    },
  };
}
