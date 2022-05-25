
// @ts-nocheck

import { CounterField } from "../bits/counter";
import { DamageField } from "../bits/damage";
import { ActionField } from "../bits/action";
import { BoundedNumberField, LIDField } from "../shared";
const fields = foundry.data.fields;

export function template_universal_item() {
    return {
        lid: new LIDField()
    }
}

export function template_bascdt() {
  return {
    actions: new fields.ArrayField(new ActionField()),
    synergies: new BoundedNumberField({min: 0, max: 4, integer: true, nullable: false}),
    counters: new BoundedNumberField({min: 0, max: 4, integer: true, nullable: false}),
    deployables: new BoundedNumberField({min: 0, max: 4, integer: true, nullable: false}),
    integrated: new BoundedNumberField({min: 0, max: 4, integer: true, nullable: false}),
    tags: new BoundedNumberField({min: 0, max: 4, integer: true, nullable: false}),
  };
}

