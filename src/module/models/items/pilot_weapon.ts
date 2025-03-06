import type { DeepPartial } from "@league-of-foundry-developers/foundry-vtt-types/src/types/utils.mjs";
import { EntryType } from "../../enums";
import { SourceData } from "../../source-template";
import { PackedPilotWeaponData } from "../../util/unpacking/packed-types";
import { unpackAction } from "../bits/action";
import { unpackBonus } from "../bits/bonus";
import { DamageField, unpackDamage } from "../bits/damage";
import { RangeField, unpackRange } from "../bits/range";
import { unpackSynergy } from "../bits/synergy";
import { LancerDataModel, UnpackContext } from "../shared";
import { addDeployableTags, template_bascdt, template_universal_item, template_uses } from "./shared";

const fields = foundry.data.fields;

export class PilotWeaponModel extends LancerDataModel<DataSchema, Item> {
  static defineSchema() {
    return {
      description: new fields.StringField({ nullable: true }),
      // @ts-expect-error
      range: new fields.ArrayField(new RangeField()),
      // @ts-expect-error
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
