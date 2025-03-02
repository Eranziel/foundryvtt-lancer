import type { DeepPartial } from "@league-of-foundry-developers/foundry-vtt-types/src/types/utils.mjs";
import { EntryType, WeaponSize, WeaponType } from "../../enums";
import { restrict_enum } from "../../helpers/commons";
import { SourceData } from "../../source-template";
import { PackedMechWeaponData } from "../../util/unpacking/packed-types";
import { unpackDeployable } from "../actors/deployable";
import { ActionField, unpackAction } from "../bits/action";
import { BonusField, unpackBonus } from "../bits/bonus";
import { CounterField, unpackCounter } from "../bits/counter";
import { DamageField, unpackDamage } from "../bits/damage";
import { RangeField, unpackRange } from "../bits/range";
import { SynergyField, unpackSynergy } from "../bits/synergy";
import { TagData, TagField, unpackTag } from "../bits/tag";
import { ControlledLengthArrayField, LIDField, LancerDataModel, UnpackContext } from "../shared";
import {
  addDeployableTags,
  migrateManufacturer,
  template_destructible,
  template_licensed,
  template_universal_item,
  template_uses,
} from "./shared";

const fields = foundry.data.fields;

export class MechWeaponModel extends LancerDataModel<DataSchema, Item> {
  static defineSchema() {
    return {
      deployables: new fields.ArrayField(new LIDField()),
      integrated: new fields.ArrayField(new LIDField()),
      sp: new fields.NumberField({ nullable: false, initial: 0 }),
      // @ts-expect-error
      actions: new fields.ArrayField(new ActionField()),
      profiles: new ControlledLengthArrayField(
        new fields.SchemaField({
          name: new fields.StringField({ initial: "Base Profile" }),
          type: new fields.StringField({ choices: Object.values(WeaponType), initial: WeaponType.Rifle }),
          // @ts-expect-error
          damage: new fields.ArrayField(new DamageField()),
          // @ts-expect-error
          range: new fields.ArrayField(new RangeField()),
          // @ts-expect-error
          tags: new fields.ArrayField(new TagField()),
          description: new fields.StringField(),
          effect: new fields.StringField(),
          on_attack: new fields.StringField(),
          on_hit: new fields.StringField(),
          on_crit: new fields.StringField(),
          cost: new fields.NumberField({ nullable: false, initial: 0 }),
          skirmishable: new fields.BooleanField(),
          barrageable: new fields.BooleanField(),
          // @ts-expect-error
          actions: new fields.ArrayField(new ActionField()),
          // @ts-expect-error
          bonuses: new fields.ArrayField(new BonusField()),
          // @ts-expect-error
          synergies: new fields.ArrayField(new SynergyField()),
          // @ts-expect-error
          counters: new fields.ArrayField(new CounterField()),
        }),
        { length: 1, overflow: true }
      ),
      loaded: new fields.BooleanField(),
      selected_profile_index: new fields.NumberField({ nullable: false, initial: 0 }),
      size: new fields.StringField({
        choices: Object.values(WeaponSize).concat("Ship-class" as unknown as WeaponSize),
        initial: WeaponSize.Main,
      }),
      no_core_bonuses: new fields.BooleanField(),
      no_mods: new fields.BooleanField(),
      no_bonuses: new fields.BooleanField(),
      no_synergies: new fields.BooleanField(),
      no_attack: new fields.BooleanField(),
      ...template_universal_item(),
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

export function unpackMechWeapon(
  data: PackedMechWeaponData,
  context: UnpackContext
): {
  name: string;
  type: EntryType.MECH_WEAPON;
  system: DeepPartial<SourceData.MechWeapon>;
} {
  let profiles: Array<Partial<SourceData.MechWeapon["profiles"][0]>> = [];

  let { deployables: parentDeployables, tags: parentTags } = addDeployableTags(data.deployables, data.tags, context);
  // These can live at parent or profile level - extract them first
  parentDeployables = parentDeployables ?? [];
  parentTags = parentTags ?? [];
  let parentIntegrated = data.integrated ?? [];

  // Then unpack profiles, using the entire structure as a pseudo-profile if no specific profiles are given
  let hasProfiles = (data.profiles?.length ?? 0) > 0;
  for (let prof of hasProfiles ? data.profiles : [data]) {
    // Unpack sub components iff not substituted in from parent
    let profileDeployables: string[] = [];
    let profileTags: TagData[] = [];
    if (hasProfiles) {
      const { deployables: newDeployables, tags: newTags } = addDeployableTags(prof.deployables, prof.tags, context);

      profileDeployables = newDeployables ?? [];
      profileTags = newTags ?? [];
    }

    // Then just store them at parent level
    parentDeployables.push(...profileDeployables);
    parentIntegrated.push(...(prof.integrated ?? []));

    // Barrageable have a weird interaction.
    let barrageable: boolean;
    let skirmishable: boolean;
    if (prof.barrage == undefined && prof.skirmish == undefined) {
      // Neither set. Go with defaults
      barrageable = true;
      skirmishable = data.mount != WeaponSize.Superheavy;
    } else if (prof.barrage == undefined) {
      // Only skirmish set. We assume barrage to be false, in this case. (should we? the data spec is unclear)
      skirmishable = prof.skirmish!;
      barrageable = false;
    } else if (prof.skirmish == undefined) {
      // Only barrage set. We assume skirmish to be false, in this case.
      skirmishable = false;
      barrageable = prof.barrage!;
    } else {
      skirmishable = prof.skirmish!;
      barrageable = prof.barrage!;
    }

    // The rest is left to the profile
    let tags = hasProfiles ? [...parentTags, ...profileTags] : parentTags;
    profiles.push({
      damage: prof.damage?.filter(d => d.val != "N/A").map(unpackDamage),
      range: prof.range?.filter(d => d.val != "N/A").map(unpackRange),
      tags,
      effect: prof.effect,
      on_attack: prof.on_attack,
      on_crit: prof.on_crit,
      on_hit: prof.on_hit,
      cost: prof.cost ?? 1,
      barrageable,
      skirmishable,
      actions: prof.actions?.map(unpackAction),
      bonuses: prof.bonuses?.map(unpackBonus),
      counters: prof.counters?.map(unpackCounter),
      description: prof.description ?? data.description,
      name: prof.name ?? `${data.name} :: ${data.profiles?.length ?? 0 + 1}`,
      synergies: prof.synergies?.map(unpackSynergy),
      type: restrict_enum(WeaponType, WeaponType.Rifle, prof.type ?? data.type),
    });
  }

  return {
    name: data.name,
    type: EntryType.MECH_WEAPON,
    system: {
      cascading: undefined,
      deployables: parentDeployables,
      destroyed: undefined,
      integrated: data.integrated,
      license: data.license_id || data.license,
      license_level: data.license_level,
      lid: data.id,
      loaded: undefined,
      manufacturer: data.source,
      no_attack: data.no_attack,
      no_bonuses: data.no_bonus,
      no_core_bonuses: data.no_core_bonus,
      no_mods: data.no_mods,
      no_synergies: data.no_synergy,
      actions: data.actions?.map(unpackAction) || [],
      profiles: profiles as any,
      selected_profile_index: 0,
      size: data.mount,
      sp: data.sp,
      uses: { value: 0, max: 0 },
    },
  };
}
