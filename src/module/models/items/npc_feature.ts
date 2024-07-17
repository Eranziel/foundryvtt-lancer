import { EntryType, NpcFeatureType, NpcTechType } from "../../enums";
import { restrict_enum } from "../../helpers/commons";
import { convertNpcStats } from "../../util/migrations";
import { SourceData, SourceTemplates } from "../../source-template";
import {
  PackedNpcReactionData,
  PackedNpcSystemData,
  PackedNpcTechData,
  PackedNpcTraitData,
  PackedNpcWeaponData,
} from "../../util/unpacking/packed-types";
import { DamageData, DamageField, unpackDamage } from "../bits/damage";
import { RangeField, unpackRange } from "../bits/range";
import { TagField, unpackTag } from "../bits/tag";
import { ControlledLengthArrayField, LancerDataModel, NpcStatBlockField, UnpackContext } from "../shared";
import { template_destructible, template_universal_item, template_uses } from "./shared";

const fields: any = foundry.data.fields;

export class NpcFeatureModel extends LancerDataModel<"NpcFeatureModel"> {
  static defineSchema() {
    return {
      effect: new fields.HTMLField(),
      bonus: new NpcStatBlockField({ nullable: true }),
      override: new NpcStatBlockField({ nullable: true }),
      tags: new fields.ArrayField(new TagField()),
      type: new fields.StringField({ choices: Object.values(NpcFeatureType), initial: NpcFeatureType.Trait }),

      charged: new fields.BooleanField(),
      loaded: new fields.BooleanField(),

      tier_override: new fields.NumberField({ integer: true, min: 0, max: 3 }),

      // Weapon
      weapon_type: new fields.StringField(),
      damage: new fields.ArrayField(new fields.ArrayField(new DamageField())),
      range: new fields.ArrayField(new RangeField()),
      on_hit: new fields.HTMLField(),
      accuracy: new ControlledLengthArrayField(new fields.NumberField({ integer: true, initial: 0 }), { length: 3 }),
      attack_bonus: new ControlledLengthArrayField(new fields.NumberField({ integer: true, initial: 0 }), {
        length: 3,
      }),

      // Trait - N/A

      // Reaction
      trigger: new fields.StringField(),

      // System - N/A

      // Tech - mostly covered by weapon
      tech_type: new fields.StringField({ choices: Object.values(NpcTechType), initial: NpcTechType.Quick }),
      tech_attack: new fields.BooleanField({ nullable: true, initial: null }),

      // Origin data - track where it came from
      origin: new fields.SchemaField({
        type: new fields.StringField(),
        name: new fields.StringField(),
        base: new fields.BooleanField(),
      }),

      // Templates
      ...template_destructible(),
      ...template_uses(),
      ...template_universal_item(),
    };
  }

  static migrateData(data: any) {
    // Fix stats
    if (typeof data.bonus == "object" && !Array.isArray(data.bonus)) {
      data.bonus = convertNpcStats(data.bonus)[0];
    }
    if (typeof data.override == "object" && !Array.isArray(data.override)) {
      data.override = convertNpcStats(data.override)[0];
    }
    // Non-tech features should not have tech_attack
    if (data.type && data.type !== NpcFeatureType.Tech) {
      data.tech_attack = false;
    } else if (data.tech_attack === null) {
      // Populate tech_attack if missing
      data.tech_attack = !!data.attack_bonus || !!data.accuracy;
    }

    // @ts-expect-error
    return super.migrateData(data);
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
      tags: (data.tags || []).map(unpackTag),
      type: data.type,

      origin: data.origin,

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
    bs.tech_attack = !!data.attack_bonus || !!data.accuracy;
  } else if (data.type == NpcFeatureType.Weapon) {
    let bs = base.system as Partial<SourceTemplates.NPC.WeaponData>;
    bs.accuracy = data.accuracy ?? [];
    bs.attack_bonus = data.attack_bonus ?? [];
    bs.weapon_type = data.weapon_type;
    bs.on_hit = data.on_hit;

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
