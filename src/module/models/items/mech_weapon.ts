import { WeaponSize, WeaponType } from "../../enums";
import { ActionField } from "../bits/action";
import { BonusField } from "../bits/bonus";
import { CounterField } from "../bits/counter";
import { DamageField } from "../bits/damage";
import { RangeField } from "../bits/range";
import { SynergyField } from "../bits/synergy";
import { TagField } from "../bits/tag";
import { LancerDataModel, ResolvedUUIDRefField } from "../shared";
import { template_universal_item, template_bascdt, template_destructible, template_licensed } from "./shared";

const fields: any = foundry.data.fields;

// @ts-ignore
export class MechWeaponModel extends LancerDataModel {
  static defineSchema() {
    return {
      deployables: new fields.ArrayField(new ResolvedUUIDRefField()),
      integrated: new fields.ArrayField(new ResolvedUUIDRefField()),
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
      size: new fields.StringField({ choices: Object.values(WeaponSize), initial: WeaponSize.Main }),
      no_core_bonuses: new fields.BooleanField(),
      no_mods: new fields.BooleanField(),
      no_bonuses: new fields.BooleanField(),
      no_synergies: new fields.BooleanField(),
      no_attack: new fields.BooleanField(),
      ...template_universal_item(),
      ...template_destructible(),
      ...template_licensed(),
    };
  }
}
