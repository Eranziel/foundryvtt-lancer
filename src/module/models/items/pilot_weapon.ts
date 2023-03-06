import { EntryType } from "../../enums.js";
import type { SourceData } from "../../source-template.js";
import type { PackedPilotWeaponData } from "../../util/unpacking/packed-types.js";
import { unpackDeployable } from "../actors/deployable.js";
import { unpackAction } from "../bits/action.js";
import { unpackBonus } from "../bits/bonus.js";
import { DamageField, unpackDamage } from "../bits/damage.js";
import { RangeField, unpackRange } from "../bits/range.js";
import { unpackSynergy } from "../bits/synergy.js";
import { LancerDataModel } from "../shared.js";
import type { UnpackContext } from "../shared.js";
import { template_universal_item, template_bascdt, template_uses } from "./shared.js";

const fields: any = foundry.data.fields;

// @ts-ignore
export class PilotWeaponModel extends LancerDataModel {
  static defineSchema() {
    return {
      description: new fields.StringField({ nullable: true }),
      range: new fields.ArrayField(new RangeField()),
      damage: new fields.ArrayField(new DamageField()),
      effect: new fields.StringField(),
      loaded: new fields.BooleanField(),

      ...template_universal_item(),
      ...template_uses(),
      ...template_bascdt(),
    };
  }
}

export function unpackPilotWeapon(
  data: PackedPilotWeaponData,
  context: UnpackContext
): {
  name: string;
  type: EntryType.PILOT_WEAPON;
  system: DeepPartial<SourceData.PilotWeapon>;
} {
  return {
    name: data.name,
    type: EntryType.PILOT_WEAPON,
    system: {
      actions: data.actions?.map(unpackAction) ?? [],
      bonuses: data.bonuses?.map(unpackBonus) ?? [],
      synergies: data.synergies?.map(unpackSynergy),
      counters: undefined,
      deployables: data.deployables?.map(d => unpackDeployable(d, context)) ?? [],

      description: data.description,
      range: data.range.map(unpackRange),
      damage: data.damage.map(unpackDamage),
      effect: data.effect,
      loaded: undefined,

      lid: data.id,
      tags: [],
    },
  };
}
