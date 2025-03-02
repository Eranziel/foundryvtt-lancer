import { CounterField } from "../bits/counter";
import { ActionField } from "../bits/action";
import { SynergyField } from "../bits/synergy";
import { FakeBoundedNumberField, LIDField, UnpackContext } from "../shared";
import { TagData, TagField, unpackTag } from "../bits/tag";
import { BonusField } from "../bits/bonus";
import { PackedDeployableData, PackedTagData } from "../../util/unpacking/packed-types";
import { unpackDeployable } from "../actors/deployable";
import { DeployableType } from "../../enums";

const fields: any = foundry.data.fields;

export function template_universal_item() {
  return {
    lid: new LIDField(),
  };
}

export function template_destructible() {
  return {
    cascading: new fields.BooleanField(),
    destroyed: new fields.BooleanField(),
  };
}

export function template_uses() {
  return {
    uses: new FakeBoundedNumberField({ integer: true, nullable: false, initial: 0 }),
  };
}

export function template_bascdt() {
  return {
    bonuses: new fields.ArrayField(new BonusField()),
    actions: new fields.ArrayField(new ActionField()),
    synergies: new fields.ArrayField(new SynergyField()),
    counters: new fields.ArrayField(new CounterField()),
    deployables: new fields.ArrayField(new LIDField()),
    integrated: new fields.ArrayField(new LIDField()),
    tags: new fields.ArrayField(new TagField()),
  };
}

export function template_licensed() {
  return {
    manufacturer: new fields.StringField({ required: true, nullable: false, blank: false, initial: "GMS" }),
    license_level: new fields.NumberField({ integer: true, minimum: 0, maximum: 3 }),
    license: new fields.StringField({ required: true, nullable: false, blank: false, initial: "mf_unknown" }),
  };
}

export function migrateManufacturer(source: {
  id?: string;
  fallback_lid?: string;
  type?: string;
  reg_name?: string;
}): string {
  return source?.fallback_lid || "GMS";
}

export function addDeployableTags(
  packedDeployables: PackedDeployableData[] | undefined,
  packedTags: PackedTagData[] | undefined,
  context: UnpackContext
): { deployables?: string[]; tags?: TagData[] } {
  const deployableIds = packedDeployables?.map(d => unpackDeployable(d, context));
  const deployables = context.createdDeployables.filter(d => d.system.lid && deployableIds?.includes(d.system.lid));
  const tags = packedTags?.map(unpackTag);
  if (deployables?.length) {
    const depTypes = new Set(deployables.map(d => d.system.type));
    if (depTypes.has(DeployableType.Deployable)) tags?.push({ lid: "tg_deployable", val: "0" });
    if (depTypes.has(DeployableType.Drone)) tags?.push({ lid: "tg_drone", val: "0" });
    if (depTypes.has(DeployableType.Mine)) tags?.push({ lid: "tg_mine", val: "0" });
  }
  return { deployables: deployableIds, tags };
}
