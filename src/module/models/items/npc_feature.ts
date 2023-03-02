import { EntryType, NpcFeatureType, NpcTechType } from "../../enums";
import { restrict_enum } from "../../helpers/commons";
import type { SourceData, SourceTemplates } from "../../source-template";
import type {
  PackedNpcReactionData,
  PackedNpcSystemData,
  PackedNpcTechData,
  PackedNpcTraitData,
  PackedNpcWeaponData,
} from "../../util/unpacking/packed-types";
import { DamageField, unpackDamage } from "../bits/damage";
import type { DamageData } from "../bits/damage";
import { RangeField, unpackRange } from "../bits/range";
import { TagField, unpackTag } from "../bits/tag";
import { LancerDataModel } from "../shared";
import type { UnpackContext } from "../shared";
import { template_destructible, template_universal_item, template_uses } from "./shared";

const fields: any = foundry.data.fields;

// @ts-ignore
export class NpcFeatureModel extends LancerDataModel {
  static defineSchema() {
    return {
      effect: new fields.HTMLField(),
      bonus: new fields.ObjectField(),
      override: new fields.ObjectField(),
      tags: new fields.ArrayField(new TagField()),
      type: new fields.StringField({ choices: Object.values(NpcFeatureType), initial: NpcFeatureType.Trait }),

      charged: new fields.BooleanField(),
      loaded: new fields.BooleanField(),

      tier_override: new fields.NumberField({ integer: true, min: 0, max: 3 }),

      // Weapon
      weapon_type: new fields.StringField(),
      damage: new fields.ArrayField(new fields.ArrayField(new DamageField())),
      range: new fields.ArrayField(new RangeField()),
      on_hit: new fields.StringField(),
      accuracy: new fields.ArrayField(new fields.NumberField({ integer: true })),
      attack_bonus: new fields.ArrayField(new fields.NumberField({ integer: true })),

      // Trait - N/A

      // Reaction
      trigger: new fields.StringField(),

      // System - N/A

      // Tech - mostly covered by weapon
      tech_type: new fields.StringField({ choices: Object.values(NpcTechType), initial: NpcTechType.Quick }),

      // Origin data - track where it came from
      origin: new fields.SchemaField({
        type: new fields.StringField(),
        name: new fields.StringField(),
      }),

      // Templates
      ...template_destructible(),
      ...template_uses(),
      ...template_universal_item(),
    };
  }
}

// Converts an lcp bonus into our expected format
export function unpackNpcFeature(
  data: PackedNpcReactionData | PackedNpcSystemData | PackedNpcTechData | PackedNpcTraitData | PackedNpcWeaponData,
  context: UnpackContext
): {
  name: string;
  type: EntryType.NPC_FEATURE;
  system: DeepPartial<SourceData.NpcFeature>;
} {
  let base = {
    name: data.name,
    type: EntryType.NPC_FEATURE as const,
    system: {
      lid: data.id,
      effect: data.effect,
      bonus: data.bonus,
      override: data.override,
      tags: data.tags.map(unpackTag),
      type: data.type,

      charged: undefined,
      uses: undefined,
      loaded: undefined,
      destroyed: undefined,

      tier_override: 0,
    },
  };

  // Then do our specific features - if they aren't needed they won't be used!
  if (data.type == NpcFeatureType.Reaction) {
    let bs = base.system as Partial<SourceTemplates.NPC.ReactionData>;
    bs.trigger = data.trigger;
  } else if (data.type == NpcFeatureType.System) {
  } else if (data.type == NpcFeatureType.Trait) {
  } else if (data.type == NpcFeatureType.Tech) {
    let bs = base.system as Partial<SourceTemplates.NPC.TechData>;
    bs.tech_type = restrict_enum(NpcTechType, NpcTechType.Quick, data.tech_type);
    bs.accuracy = data.accuracy ?? [];
    bs.attack_bonus = data.attack_bonus ?? [];
  } else if (data.type == NpcFeatureType.Weapon) {
    let bs = base.system as Partial<SourceTemplates.NPC.WeaponData>;
    bs.accuracy = data.accuracy ?? [];
    bs.attack_bonus = data.attack_bonus ?? [];
    bs.weapon_type = data.weapon_type;

    // Build out damage
    bs.damage = [];
    let i = 0;
    let done = false;
    while (!done) {
      done = true;
      let sub_damage: DamageData[] = [];
      for (let d of data.damage) {
        if (d.damage.length > i) {
          sub_damage.push(
            unpackDamage({
              type: d.type as any,
              val: d.damage[i],
            })
          );
          done = false;
        }
      }
      if (!done) bs.damage.push(sub_damage);
      i += 1;
    }

    // Build out range
    bs.range = data.range.map(unpackRange);
  }

  return base;
}
