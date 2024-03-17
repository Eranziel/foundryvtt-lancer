import { ActivationType, EntryType, FrameEffectUse, MechType, MountType } from "../../enums";
import { restrict_enum } from "../../helpers/commons";
import { SourceData } from "../../source-template";
import { PackedFrameData } from "../../util/unpacking/packed-types";
import { unpackDeployable } from "../actors/deployable";
import { ActionField, unpackAction } from "../bits/action";
import { BonusField, unpackBonus } from "../bits/bonus";
import { CounterField, unpackCounter } from "../bits/counter";
import { SynergyField, unpackSynergy } from "../bits/synergy";
import { TagField, unpackTag } from "../bits/tag";
import { LancerDataModel, LIDField, UnpackContext } from "../shared";
import { template_universal_item, template_licensed } from "./shared";
import { frameToPath } from "../../actor/retrograde-map";

// @ts-ignore
const fields: any = foundry.data.fields;

const frame_schema = {
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
    size: new fields.NumberField({ integer: false, minimum: 0.5, initial: 1 }),
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
      integrated: new fields.ArrayField(new LIDField()),
      deployables: new fields.ArrayField(new LIDField()),
      actions: new fields.ArrayField(new ActionField()),
      synergies: new fields.ArrayField(new SynergyField()),
      // use: new fields.StringField({ nullable: false, choices: Object.values(FrameEffectUse), initial: FrameEffectUse.Unknown, }),
      use: new fields.StringField({ nullable: true, initial: null }), // ^ Core data does not adhere to this schema
    })
  ),
  core_system: new fields.SchemaField({
    name: new fields.StringField(),
    description: new fields.HTMLField(),
    activation: new fields.StringField({ nullable: false, choices: Object.values(ActivationType) }),
    deactivation: new fields.StringField({ nullable: true, choices: Object.values(ActivationType), initial: null }),
    // use: new fields.StringField({ nullable: true, choices: Object.values(FrameEffectUse), initial: null }),
    use: new fields.StringField({ nullable: true, initial: null }), // ^ Core data does not adhere to this schema

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

    deployables: new fields.ArrayField(new LIDField()),
    counters: new fields.ArrayField(new CounterField()),
    integrated: new fields.ArrayField(new LIDField()),
    tags: new fields.ArrayField(new TagField()),
  }),
  ...template_universal_item(),
  ...template_licensed(),
};

export class FrameModel extends LancerDataModel<"FrameModel"> {
  static defineSchema() {
    return frame_schema;
  }
}

export function unpackFrame(
  data: PackedFrameData,
  context: UnpackContext
): {
  name: string;
  type: EntryType.FRAME;
  img: string | undefined;
  system: DeepPartial<SourceData.Frame>;
} {
  let cs = data.core_system;
  const frameImg = frameToPath(data.name);
  return {
    name: data.name,
    type: EntryType.FRAME,
    img: frameImg ?? undefined,
    system: {
      core_system: {
        activation: cs.activation,
        active_actions: cs.active_actions?.map(unpackAction),
        active_bonuses: cs.active_bonuses?.map(unpackBonus),
        active_effect: cs.active_effect,
        active_name: cs.active_name,
        active_synergies: cs.active_synergies?.map(unpackSynergy),
        counters: cs.counters?.map(unpackCounter),
        deactivation: cs.deactivation,
        deployables: cs.deployables?.map(d => unpackDeployable(d, context)),
        description: cs.description,
        integrated: cs.integrated,
        name: cs.name,
        passive_actions: cs.passive_actions?.map(unpackAction),
        passive_bonuses: cs.passive_bonuses?.map(unpackBonus),
        passive_effect: cs.passive_effect,
        passive_name: cs.passive_name,
        passive_synergies: cs.passive_synergies?.map(unpackSynergy),
        tags: cs.tags?.map(unpackTag),
        use: restrict_enum(FrameEffectUse, FrameEffectUse.Unknown, cs.use),
      },
      description: data.description,
      license: data.license_id || data.id,
      license_level: data.license_level ?? 2,
      lid: data.id,
      manufacturer: data.source,
      mechtype: data.mechtype?.map(mt => restrict_enum(MechType, MechType.Striker, mt)),
      mounts: data.mounts,
      stats: data.stats,
      traits: data.traits?.map(t => ({
        actions: t.actions?.map(unpackAction),
        bonuses: t.bonuses?.map(unpackBonus),
        counters: t.counters?.map(unpackCounter),
        deployables: t.deployables?.map(d => unpackDeployable(d, context)),
        description: t.description,
        integrated: t.integrated,
        name: t.name,
        synergies: t.synergies?.map(unpackSynergy),
        use: restrict_enum(FrameEffectUse, FrameEffectUse.Unknown, t.use),
      })),
    },
  };
}
