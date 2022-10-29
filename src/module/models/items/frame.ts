import { ActivationType, FrameEffectUse, MechType, MountType } from "../../enums";
import { ActionField } from "../bits/action";
import { BonusField } from "../bits/bonus";
import { CounterField } from "../bits/counter";
import { SynergyField } from "../bits/synergy";
import { TagField } from "../bits/tag";
import { LancerDataModel, ResolvedUUIDRefField } from "../shared";
import { template_universal_item, template_bascdt, template_destructible, template_licensed } from "./shared";

// @ts-ignore
const fields: any = foundry.data.fields;

export class FrameModel extends LancerDataModel<"FrameModel"> {
  static defineSchema() {
    return {
      description: new fields.HTMLField(),
      mechtype: new fields.ArrayField(new fields.StringField({ nullable: false, choices: Object.values(MechType) })),
      mounts: new fields.ArrayField(new fields.StringField({ nullable: false, choices: Object.values(MountType) })),
      stats: new fields.SchemaField({
        armor: new fields.NumberField({ integer: true, minimum: 0, initial: 0 }),
        edef: new fields.NumberField({ integer: true, minimum: 0, initial: 8 }),
        evasion: new fields.NumberField({ integer: true, minimum: 0, initial: 8 }),
        heatcap: new fields.NumberField({ integer: true, minimum: 0, initial: 5 }),
        hp: new fields.NumberField({ integer: true, minimum: 0, initial: 10 }),
        repcap: new fields.NumberField({ integer: true, minimum: 0, initial: 0 }),
        save: new fields.NumberField({ integer: true, minimum: 0, initial: 10 }),
        sensor_range: new fields.NumberField({ integer: true, minimum: 0, initial: 10 }),
        size: new fields.NumberField({ integer: true, minimum: 0, initial: 1 }),
        sp: new fields.NumberField({ integer: true, minimum: 0, initial: 0 }),
        speed: new fields.NumberField({ integer: true, minimum: 0, initial: 4 }),
        stress: new fields.NumberField({ integer: true, minimum: 0, initial: 4 }),
        structure: new fields.NumberField({ integer: true, minimum: 0, initial: 4 }),
        tech_attack: new fields.NumberField({ integer: true, initial: 0 }),
      }),
      traits: new fields.ArrayField(
        new fields.SchemaField({
          name: new fields.StringField(),
          description: new fields.HTMLField(),
          bonuses: new fields.ArrayField(new BonusField()),
          counters: new fields.ArrayField(new CounterField()),
          integrated: new fields.ArrayField(new ResolvedUUIDRefField()),
          deployables: new fields.ArrayField(new ResolvedUUIDRefField()),
          actions: new fields.ArrayField(new ActionField()),
          synergies: new fields.ArrayField(new SynergyField()),
          use: new fields.StringField({ nullable: false, choices: Object.values(FrameEffectUse) }),
        })
      ),
      core_system: new fields.SchemaField({
        name: new fields.StringField(),
        description: new fields.HTMLField(),
        activation: new fields.StringField({ nullable: false, choices: Object.values(ActivationType) }),
        deactivation: new fields.StringField({ nullable: true, choices: Object.values(ActivationType), initial: null }),
        use: new fields.StringField({ nullable: true, choices: Object.values(FrameEffectUse), initial: null }),

        active_name: new fields.StringField(),
        active_effect: new fields.HTMLField(),
        active_synergies: new fields.ArrayField(new SynergyField()),
        active_bonuses: new fields.ArrayField(new BonusField()),
        active_actions: new fields.ArrayField(new ActionField()),

        passive_name: new fields.StringField(),
        passive_effect: new fields.HTMLField(),
        passive_synergies: new fields.ArrayField(new SynergyField()),
        passive_bonuses: new fields.ArrayField(new BonusField()),
        passive_actions: new fields.ArrayField(new ActionField()),

        deployables: new fields.ArrayField(new ResolvedUUIDRefField()),
        counters: new fields.ArrayField(new CounterField()),
        integrated: new fields.ArrayField(new ResolvedUUIDRefField()),
        tags: new fields.ArrayField(new TagField()),
      }),
      ...template_universal_item(),
      ...template_licensed(),
    };
  }
}
