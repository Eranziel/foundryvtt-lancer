import { EntryType } from "../../enums";
import { SourceData } from "../../source-template";
import { PackedPilotWeaponData } from "../../util/unpacking/packed-types";
import { unpackDeployable } from "../actors/deployable";
import { unpackAction } from "../bits/action";
import { unpackBonus } from "../bits/bonus";
import { DamageField, unpackDamage } from "../bits/damage";
import { RangeField, unpackRange } from "../bits/range";
import { unpackSynergy } from "../bits/synergy";
import { unpackTag } from "../bits/tag";
import { LancerDataModel, UnpackContext } from "../shared";
import { template_universal_item, template_bascdt, template_uses } from "./shared";

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
      tags: (data.tags ?? []).map(unpackTag),
    },
  };
}
