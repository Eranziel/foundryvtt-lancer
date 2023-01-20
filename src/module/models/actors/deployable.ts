import { template_heat, template_statuses, template_universal_actor } from "./shared";

import { LancerDataModel, UnpackContext } from "../shared";
import { PackedDeployableData } from "../../util/unpacking/packed-types";
import { SourceData } from "../../source-template";
import { unpackAction } from "../bits/action";
import { unpackBonus } from "../bits/bonus";
import { unpackCounter } from "../bits/counter";
import { unpackSynergy } from "../bits/synergy";
import { unpackTag } from "../bits/tag";
import { restrict_enum } from "../../helpers/commons";
import { DeployableType, EntryType } from "../../enums";
import { slugify } from "../../util/lid";

const fields: any = foundry.data.fields;

const deployable_schema = {
  armor: new fields.NumberField({ min: 0, integer: true, nullable: false, initial: 0 }),
  destroyed: new fields.BooleanField({ initial: false }),
  edef: new fields.NumberField({ min: 0, integer: true, nullable: false, initial: 8 }),
  evasion: new fields.NumberField({ min: 0, integer: true, nullable: false, initial: 5 }),
  notes: new fields.HTMLField(),

  // TODO: Fill out the rest

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

export function unpackDeployableData(data: PackedDeployableData): Partial<SourceData.Deployable> {
  return {
    actions: data.actions?.map(unpackAction),
    bonuses: data.bonuses?.map(unpackBonus),
    counters: data.counters?.map(unpackCounter),
    synergies: data.synergies?.map(unpackSynergy),
    tags: data.tags?.map(unpackTag),
    activation: data.activation,
    armor: data.armor,
    activations: 0,
    avail_mounted: undefined,
    avail_unmounted: undefined,
    burn: undefined,
    cost: data.cost,
    custom_counters: undefined,
    deactivation: data.deactivation,
    deployer: undefined,
    detail: data.detail,
    edef: data.edef,
    evasion: data.evasion,
    heat: undefined,
    hp: undefined,
    instances: data.instances,
    lid: undefined,
    max_heat: data.heatcap,
    max_hp: data.hp,
    overshield: undefined,
    recall: data.recall,
    redeploy: data.redeploy,
    size: data.size,
    speed: data.speed,
    type: restrict_enum(DeployableType, DeployableType.Deployable, data.type),
  };
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
