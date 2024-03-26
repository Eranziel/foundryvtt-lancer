import { template_heat, template_statuses, template_universal_actor } from "./shared";

import { LancerDataModel, SyncUUIDRefField, UnpackContext } from "../shared";
import { PackedDeployableData } from "../../util/unpacking/packed-types";
import { SourceData } from "../../source-template";
import { ActionField, unpackAction } from "../bits/action";
import { unpackBonus } from "../bits/bonus";
import { CounterField, unpackCounter } from "../bits/counter";
import { SynergyField, unpackSynergy } from "../bits/synergy";
import { TagField, unpackTag } from "../bits/tag";
import { restrict_enum } from "../../helpers/commons";
import { ActivationType, DeployableType, EntryType } from "../../enums";
import { slugify } from "../../util/lid";

const fields: any = foundry.data.fields;

const deployable_schema = {
  actions: new fields.ArrayField(new ActionField()),
  // bonuses: new fields.ArrayField(new BonusField()),
  counters: new fields.ArrayField(new CounterField()),
  synergies: new fields.ArrayField(new SynergyField()),
  tags: new fields.ArrayField(new TagField()),
  activation: new fields.StringField({ choices: Object.values(ActivationType), initial: ActivationType.Quick }),
  stats: new fields.SchemaField({
    armor: new fields.NumberField({ min: 0, integer: true, nullable: false, initial: 0 }),
    edef: new fields.NumberField({ min: 0, integer: true, nullable: false, initial: 10 }),
    evasion: new fields.NumberField({ min: 0, integer: true, nullable: false, initial: 10 }),
    heatcap: new fields.NumberField({ min: 1, integer: true, nullable: false, initial: 5 }),
    hp: new fields.NumberField({ min: 1, integer: true, nullable: false, initial: 5 }),
    grit_hp: new fields.BooleanField({ initial: false }),
    save: new fields.NumberField({ min: 0, integer: true, nullable: false, initial: 10 }),
    size: new fields.NumberField({ min: 0.5, integer: false, nullable: false, initial: 0.5 }),
    speed: new fields.NumberField({ min: 0, integer: true, nullable: false, initial: 0 }),
  }),
  cost: new fields.NumberField({ min: 0, integer: true, nullable: false, initial: 1 }),
  instances: new fields.NumberField({ min: 1, integer: true, nullable: false, initial: 1 }),
  deactivation: new fields.StringField({ choices: Object.values(ActivationType), initial: null, nullable: true }),
  detail: new fields.HTMLField(),
  recall: new fields.StringField({ choices: Object.values(ActivationType), initial: null, nullable: true }),
  redeploy: new fields.StringField({ choices: Object.values(ActivationType), initial: null, nullable: true }),

  type: new fields.StringField({ choices: Object.values(DeployableType), initial: DeployableType.Deployable }),
  avail_mounted: new fields.BooleanField({ initial: true }),
  avail_unmounted: new fields.BooleanField({ initial: false }),
  deployer: new SyncUUIDRefField("Actor", { allowed_types: [EntryType.MECH, EntryType.PILOT, EntryType.NPC] }),
  owner: new SyncUUIDRefField("Actor", { allowed_types: [EntryType.MECH, EntryType.PILOT, EntryType.NPC] }),
  // destroyed: new fields.BooleanField({ initial: false }),
  // notes: new fields.HTMLField(),

  // destroyed: new fields.BooleanField({ initial: false }),
  ...template_universal_actor(),
  ...template_heat(),
  ...template_statuses(),
};

type DeployableSchema = typeof deployable_schema;
export class DeployableModel extends LancerDataModel<"DeployableModel"> {
  static defineSchema(): DeployableSchema {
    return deployable_schema;
  }

  static migrateData(data: any) {
    if (typeof data.hp == "string") {
      let dv = decompose_hp(data.hp);
      data.hp.value = dv.hp;
      data.stats ??= {};
      data.stats.hp ??= dv.hp;
      data.stats.grit_hp ??= dv.grit_hp;
    }

    if (data.type && data.type[0] == data.type[0].toLowerCase()) {
      data.type = restrict_enum(DeployableType, DeployableType.Deployable, data.type);
    }

    // @ts-expect-error v11
    return super.migrateData(data);
  }
}

// Handles deployables with grit hp
function decompose_hp(raw_hp: unknown): { hp: number; grit_hp?: boolean } {
  if (typeof raw_hp == "string") {
    let m = raw_hp.match(/\d+/);
    return {
      hp: m ? parseInt(m[0]) : 5,
      grit_hp: raw_hp.includes("grit"),
    };
  } else if (typeof raw_hp == "number") {
    return { hp: raw_hp };
  } else {
    return {
      hp: 5,
      grit_hp: false,
    };
  }
}

export function unpackDeployableData(data: PackedDeployableData): DeepPartial<SourceData.Deployable> {
  let dh = decompose_hp(data.hp);
  let rv = {
    actions: data.actions?.map(unpackAction),
    bonuses: data.bonuses?.map(unpackBonus),
    counters: data.counters?.map(unpackCounter),
    synergies: data.synergies?.map(unpackSynergy),
    tags: data.tags?.map(unpackTag),
    activation: data.activation,
    stats: {
      armor: data.armor,
      edef: data.edef,
      evasion: data.evasion,
      heatcap: data.heatcap,
      hp: dh.hp,
      grit_hp: dh.grit_hp ?? false,
      save: data.save,
      size: data.size,
      speed: data.speed,
    },
    activations: 0,
    avail_mounted: undefined,
    avail_unmounted: undefined,
    hp: { min: 0, max: dh.hp, value: dh.hp },
    burn: undefined,
    cost: data.cost,
    custom_counters: undefined,
    deactivation: data.deactivation,
    deployer: undefined,
    detail: data.detail,
    instances: data.instances,
    lid: undefined,
    overshield: undefined,
    recall: data.recall,
    redeploy: data.redeploy,
    type: restrict_enum(DeployableType, DeployableType.Deployable, data.type),
  };

  return rv;
}

// When we unpack a deployable, we generate for it a slugified name
export function unpackDeployable(data: PackedDeployableData, context: UnpackContext): string {
  let lid = "dep_" + slugify(data.name);
  let unpacked = unpackDeployableData(data);
  unpacked.lid = lid;
  context.createdDeployables.push({
    name: data.name,
    system: unpacked,
    type: EntryType.DEPLOYABLE,
  });
  return lid;
}
