import { CounterField } from "../bits/counter";
import { ActionField } from "../bits/action";
import { SynergyField } from "../bits/synergy";
import { LIDField, ResolvedUUIDRefField } from "../shared";
import { TagField } from "../bits/tag";

//@ts-ignore
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

export function template_bascdt() {
  return {
    actions: new fields.ArrayField(new ActionField()),
    synergies: new fields.ArrayField(new SynergyField()),
    counters: new fields.ArrayField(new CounterField()),
    deployables: new fields.ArrayField(new ResolvedUUIDRefField()),
    integrated: new fields.ArrayField(new ResolvedUUIDRefField()),
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
