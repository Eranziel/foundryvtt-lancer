import { PackedCounterData } from "../../util/unpacking/packed-types";
import { LIDField } from "../shared";

const fields: any = foundry.data.fields;

export interface CounterData {
  lid: string;
  name: string;
  min: number;
  max: number | null;
  default_value: number;
  value: number;
}

// A single <type, value> pairing for damage. mimics RegCounterData
export class CounterField extends fields.SchemaField {
  constructor(options = {}) {
    super(
      {
        lid: new LIDField(),
        name: new fields.StringField(),
        min: new fields.NumberField({ integer: true, nullable: false, initial: 0 }),
        max: new fields.NumberField({ integer: true, nullable: true, initial: 6 }),
        default_value: new fields.NumberField({ integer: true, nullable: false, initial: 0 }),
        value: new fields.NumberField({ integer: true, nullable: false, initial: 0 }),
      },
      options
    );
  }

  static migrateData(value: any) {
    value.value = value.value ?? value.val;
    super.migrateData(value);
  }

  static bound_val(value: CounterData, sub_val: number) {
    sub_val = Math.round(sub_val);
    sub_val = Math.max(sub_val, value.min);
    if (value.max !== null) sub_val = Math.min(sub_val, value.max);
    return sub_val;
  }

  /** @inheritdoc */
  clean(value: CounterData, data: any, options: any) {
    // Attempt to move our .val back in bounds
    value = super.clean(value, data, options);
    value.value = CounterField.bound_val(value, value.value || 0);
    value.default_value = CounterField.bound_val(value, value.default_value || 0);
    return value;
  }

  /** @override */
  _validateType(value: CounterData) {
    if (value.max !== null && value.max < value.min) throw new Error("max must be > min");
  }
}

// Converts an lcp counter entry into our expected format
export function unpackCounter(data: PackedCounterData): CounterData {
  let default_value = data.default_value ?? data.min ?? 0;
  return {
    default_value,
    value: default_value,
    lid: data.id,
    max: data.max ?? 6,
    min: data.min ?? 0,
    name: data.name,
  };
}
