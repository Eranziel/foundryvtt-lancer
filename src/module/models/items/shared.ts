import { CounterField } from "../bits/counter";
import { ActionField } from "../bits/action";
import { LIDField, UUIDField } from "../shared";
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
    destroyed: new fields.BooleanField()
  };
}

export function template_bascdt() {
  return {
    actions: new fields.ArrayField(new ActionField()),
    // synergies: new fields.ArrayField
    counters: new fields.ArrayField(new CounterField()),
    deployables: new fields.ArrayField(new UUIDField()),
    integrated: new fields.ArrayField(new UUIDField()),
    tags: new fields.ArrayField(new TagField())
  };
}
