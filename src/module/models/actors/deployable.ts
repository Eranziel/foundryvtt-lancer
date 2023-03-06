import { template_heat, template_statuses, template_universal_actor } from "./shared.js";

import { LancerDataModel, SyncUUIDRefField } from "../shared.js";
import type { UnpackContext } from "../shared.js";
import type { PackedDeployableData } from "../../util/unpacking/packed-types.js";
import type { SourceData } from "../../source-template.js";
import { ActionField, unpackAction } from "../bits/action.js";
import { unpackBonus } from "../bits/bonus.js";
import { CounterField, unpackCounter } from "../bits/counter.js";
import { SynergyField, unpackSynergy } from "../bits/synergy.js";
import { TagField, unpackTag } from "../bits/tag.js";
import { restrict_enum } from "../../helpers/commons.js";
import { ActivationType, DeployableType, EntryType } from "../../enums.js";
import { slugify } from "../../util/lid.js";

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
    save: new fields.NumberField({ min: 0, integer: true, nullable: false, initial: 10 }),
    size: new fields.NumberField({ min: 0.5, integer: false, nullable: false, initial: 0.5 }),
    speed: new fields.NumberField({ min: 0, integer: true, nullable: false, initial: 0 }),
  }),
  cost: new fields.NumberField({ min: 0, integer: true, nullable: false, initial: 1 }),
  instances: new fields.NumberField({ min: 1, integer: true, nullable: false, initial: 1 }),
  deactivation: new fields.StringField({ choices: Object.values(ActivationType), initial: ActivationType.Quick }),
  detail: new fields.HTMLField(),
  recall: new fields.StringField({ choices: Object.values(ActivationType), initial: ActivationType.Quick }),
  redeploy: new fields.StringField({ choices: Object.values(ActivationType), initial: ActivationType.Quick }),

  type: new fields.StringField({ choices: Object.values(DeployableType), initial: DeployableType.Deployable }),
  avail_mounted: new fields.BooleanField({ initial: true }),
  avail_unmounted: new fields.BooleanField({ initial: false }),
  deployer: new SyncUUIDRefField({ allowed_types: [EntryType.MECH, EntryType.PILOT, EntryType.NPC] }),
  owner: new SyncUUIDRefField({ allowed_types: [EntryType.MECH, EntryType.PILOT, EntryType.NPC] }),
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
}

export function unpackDeployableData(data: PackedDeployableData): DeepPartial<SourceData.Deployable> {
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
      hp: data.hp,
      save: data.save,
      size: data.size,
      speed: data.speed,
    },
    activations: 0,
    avail_mounted: undefined,
    avail_unmounted: undefined,
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

  // For some drones.... its the best we can do
  if (typeof data.hp == "string") {
    rv.stats.hp = 5;
    rv.detail = (rv.detail ?? "") + `<br>Base Max HP = ${data.hp}`;
  }

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
