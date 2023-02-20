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
import { TagField, unpackTag } from "../bits/tag";
import { LancerDataModel, LIDField, UnpackContext } from "../shared";
import {
  template_universal_item,
  template_bascdt,
  template_destructible,
  template_licensed,
  template_uses,
} from "./shared";

const fields: any = foundry.data.fields;

// @ts-ignore
export class MechWeaponModel extends LancerDataModel {
  static defineSchema() {
    return {
      deployables: new fields.ArrayField(new LIDField()),
      integrated: new fields.ArrayField(new LIDField()),
      sp: new fields.NumberField({ nullable: false, initial: 0 }),
      profiles: new fields.ArrayField(
        new fields.SchemaField({
          name: new fields.StringField(),
          type: new fields.StringField({ choices: Object.values(WeaponType), initial: WeaponType.Rifle }),
          damage: new fields.ArrayField(new DamageField()),
          range: new fields.ArrayField(new RangeField()),
          tags: new fields.ArrayField(new TagField()),
          description: new fields.StringField(),
          effect: new fields.StringField(),
          on_attack: new fields.StringField(),
          on_hit: new fields.StringField(),
          on_crit: new fields.StringField(),
          cost: new fields.NumberField({ nullable: false, initial: 0 }),
          skirmishable: new fields.BooleanField(),
          barrageable: new fields.BooleanField(),
          actions: new fields.ArrayField(new ActionField()),
          bonuses: new fields.ArrayField(new BonusField()),
          synergies: new fields.ArrayField(new SynergyField()),
          counters: new fields.ArrayField(new CounterField()),
        })
      ),
      loaded: new fields.BooleanField(),
      selected_profile: new fields.NumberField({ nullable: false, initial: 0 }),
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

  // These can live at parent or profile level - extract them first
  let parent_deployables = data.deployables?.map(d => unpackDeployable(d, context)) ?? [];
  let parent_integrated = data.integrated ?? [];
  let parent_tags = data.tags?.map(unpackTag) ?? [];

  // Then unpack profiles, using the entire structure as a pseudo-profile if no specific profiles are given
  let has_profiles = (data.profiles?.length ?? 0) > 0;
  for (let prof of has_profiles ? data.profiles : [data]) {
    // Unpack sub components iff not substituted in from parent
    let prof_deployables = has_profiles ? prof.deployables?.map(d => unpackDeployable(d, context)) ?? [] : [];
    let prof_integrated = has_profiles ? prof.deployables?.map(d => unpackDeployable(d, context)) ?? [] : [];

    // Then just store them at parent level
    parent_deployables.push(...prof_deployables);
    parent_integrated.push(...prof_integrated);

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
    let tags = has_profiles ? [...parent_tags, ...(prof.tags?.map(unpackTag) ?? [])] : parent_tags;
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
      deployables: data.deployables?.map(d => unpackDeployable(d, context)),
      destroyed: undefined,
      integrated: data.integrated,
      license: data.license_id ?? data.license,
      license_level: data.license_level,
      lid: data.id,
      loaded: undefined,
      manufacturer: data.source,
      no_attack: data.no_attack,
      no_bonuses: data.no_bonus,
      no_core_bonuses: data.no_core_bonus,
      no_mods: data.no_mods,
      no_synergies: data.no_synergy,
      profiles,
      selected_profile: 0,
      size: data.mount,
      sp: data.sp,
      uses: 0,
    },
  };
}
