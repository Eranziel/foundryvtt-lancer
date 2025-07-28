import type { DeepPartial } from "fvtt-types/utils";
import { EntryType } from "../../enums";
import type { SourceData } from "../../source-template";
import type { BaseData } from "../../base-data";
import type { PackedPilotWeaponData } from "../../util/unpacking/packed-types";
import { unpackAction } from "../bits/action";
import { unpackBonus } from "../bits/bonus";
import { DamageField, unpackDamage } from "../bits/damage";
import { RangeField, unpackRange } from "../bits/range";
import { unpackSynergy } from "../bits/synergy";
import { LancerDataModel, type UnpackContext } from "../shared";
import { addDeployableTags, template_bascdt, template_universal_item, template_uses } from "./shared";

import fields = foundry.data.fields;

const definePilotWeaponModelSchema = () => {
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
};

type PilotWeaponModelSchema = ReturnType<typeof definePilotWeaponModelSchema>;

export class PilotWeaponModel extends LancerDataModel<
  PilotWeaponModelSchema,
  Item.Implementation,
  BaseData.PilotWeapon
> {
  static DEFAULT_ICON = "systems/lancer/assets/icons/role_artillery.svg";
  static defineSchema() {
    return definePilotWeaponModelSchema();
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
  const { deployables, tags } = addDeployableTags(data.deployables, data.tags, context);
  return {
    name: data.name,
    type: EntryType.PILOT_WEAPON,
    system: {
      actions: data.actions?.map(unpackAction) ?? [],
      bonuses: data.bonuses?.map(unpackBonus) ?? [],
      synergies: data.synergies?.map(unpackSynergy),
      counters: undefined,
      deployables: deployables ?? [],

      description: data.description,
      range: data.range.map(unpackRange),
      damage: data.damage.map(unpackDamage),
      effect: data.effect,
      loaded: undefined,

      lid: data.id,
      tags: tags ?? [],
    },
  };
}
