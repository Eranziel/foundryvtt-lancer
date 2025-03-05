import type { DeepPartial } from "@league-of-foundry-developers/foundry-vtt-types/src/types/utils.mjs";
import { EntryType, makeWeaponSizeChecklist, makeWeaponTypeChecklist } from "../../enums";
import { SourceData } from "../../source-template";
import { PackedWeaponModData } from "../../util/unpacking/packed-types";
import { unpackAction } from "../bits/action";
import { unpackBonus } from "../bits/bonus";
import { unpackCounter } from "../bits/counter";
import { DamageField, unpackDamage } from "../bits/damage";
import { RangeField, unpackRange } from "../bits/range";
import { unpackSynergy } from "../bits/synergy";
import { TagField, unpackTag } from "../bits/tag";
import { LancerDataModel, UnpackContext, WeaponSizeChecklistField, WeaponTypeChecklistField } from "../shared";
import {
  addDeployableTags,
  migrateManufacturer,
  template_bascdt,
  template_destructible,
  template_licensed,
  template_universal_item,
  template_uses,
} from "./shared";

const fields = foundry.data.fields;

export class WeaponModModel extends LancerDataModel<DataSchema, Item> {
  static defineSchema() {
    return {
      // @ts-expect-error
      added_tags: new fields.ArrayField(new TagField()),
      // @ts-expect-error
      added_damage: new fields.ArrayField(new DamageField()),
      // @ts-expect-error
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

  static migrateData(data: any) {
    if (data.source) {
      data.manufacturer = migrateManufacturer(data.source);
    }
    return super.migrateData(data);
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
  const { deployables, tags } = addDeployableTags(data.deployables, data.tags, context);
  return {
    name: data.name,
    type: EntryType.WEAPON_MOD,
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
      uses: { value: 0, max: 0 },
      added_damage: data.added_damage?.map(unpackDamage),
      added_range: data.added_range?.map(unpackRange),
      added_tags: data.added_tags?.map(unpackTag),
      allowed_sizes: makeWeaponSizeChecklist(data.allowed_sizes ?? []),
      allowed_types: makeWeaponTypeChecklist(data.allowed_types ?? []),
    },
  };
}
