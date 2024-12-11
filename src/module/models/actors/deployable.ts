import { template_heat, template_statuses, template_universal_actor } from "./shared";

import type { DeepPartial } from "@league-of-foundry-developers/foundry-vtt-types/src/types/utils.mjs";
import { ActivationType, DeployableType, EntryType } from "../../enums";
import { restrict_enum } from "../../helpers/commons";
import { SourceData } from "../../source-template";
import { slugify } from "../../util/lid";
import { fixCCFormula } from "../../util/misc";
import { PackedDeployableData } from "../../util/unpacking/packed-types";
import { ActionField, unpackAction } from "../bits/action";
import { unpackBonus } from "../bits/bonus";
import { CounterField, unpackCounter } from "../bits/counter";
import { SynergyField, unpackSynergy } from "../bits/synergy";
import { TagField, unpackTag } from "../bits/tag";
import { LancerDataModel, SyncUUIDRefField, UnpackContext } from "../shared";

const fields = foundry.data.fields;

const deployable_schema = {
  // @ts-expect-error
  actions: new fields.ArrayField(new ActionField()),
  // bonuses: new fields.ArrayField(new BonusField()),
  // @ts-expect-error
  counters: new fields.ArrayField(new CounterField()),
  // @ts-expect-error
  synergies: new fields.ArrayField(new SynergyField()),
  // @ts-expect-error
  tags: new fields.ArrayField(new TagField()),
  activation: new fields.StringField({ choices: Object.values(ActivationType), initial: ActivationType.Quick }),
  stats: new fields.SchemaField({
    armor: new fields.NumberField({ min: 0, integer: true, nullable: false, initial: 0 }),
    edef: new fields.NumberField({ min: 0, integer: true, nullable: false, initial: 10 }),
    evasion: new fields.NumberField({ min: 0, integer: true, nullable: false, initial: 10 }),
    heatcap: new fields.NumberField({ min: 0, integer: true, nullable: false, initial: 0 }),
    hp: new fields.StringField({ initial: "5" }),
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
export class DeployableModel extends LancerDataModel<DataSchema, Actor> {
  static defineSchema(): DeployableSchema {
    return deployable_schema;
  }

  static migrateData(data: any) {
    if (data.type && data.type[0] == data.type[0].toLowerCase()) {
      data.type = restrict_enum(DeployableType, DeployableType.Deployable, data.type);
    }
    if (!data.stats) {
      // v1.X had the config values in the base level of the system data object. 2.0 keeps them in
      // a `stats` object.
      data.stats = {
        armor: data.armor || 0,
        edef: data.edef || 8,
        evasion: data.evasion || 5,
        heatcap: data.heatcap || 0,
        hp: fixCCFormula(data.max_hp?.toString() || "5"),
        save: data.save || 10,
        size: data.size || 0.5,
        speed: data.speed || 0,
      };
    }
    if (data.hp && typeof data.hp == "string") {
      data.stats.hp = fixCCFormula(data.hp);
      // Having a string data.hp instead of object will cause an error later in
      // data preparation, so we need to delete it. It will get populated
      // correctly later.
      delete data.hp;
    }
    if (data.stats?.size !== undefined) {
      // Sizes of 1 and up must be integer values
      if (data.stats?.size >= 1.0) {
        data.stats.size = Math.floor(data.stats.size);
      } else {
        // If size is less than 1, it must be 1/2.
        data.stats.size = 0.5;
      }
    }

    return super.migrateData(data);
  }
}

export function unpackDeployableData(data: PackedDeployableData): DeepPartial<SourceData.Deployable> {
  let max_hp = Number.parseInt(data.hp?.toString() || "5") || 5;
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
      hp: fixCCFormula(data.hp?.toString() || "5"),
      save: data.save,
      size: data.size,
      speed: data.speed,
    },
    activations: 0,
    avail_mounted: undefined,
    avail_unmounted: undefined,
    hp: { min: 0, max: max_hp, value: max_hp },
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
