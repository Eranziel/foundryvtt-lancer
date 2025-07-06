import type { PackedCounterData } from "../../util/unpacking/packed-types";
import { LIDField } from "../shared";

import fields = foundry.data.fields;

export type CounterData = fields.SchemaField.InitializedData<CounterFieldSchema>;

const defineCounterFieldSchema = () => {
  return {
    lid: new LIDField(),
    name: new fields.StringField(),
    min: new fields.NumberField({ integer: true, nullable: false, initial: 0 }),
    max: new fields.NumberField({ integer: true, nullable: true, initial: 6 }),
    default_value: new fields.NumberField({ integer: true, nullable: false, initial: 0 }),
    value: new fields.NumberField({ integer: true, nullable: false, initial: 0 }),
  };
};

type CounterFieldSchema = ReturnType<typeof defineCounterFieldSchema>;

// A single <type, value> pairing for damage. mimics RegCounterData
export class CounterField<Options extends fields.SchemaField.Options<CounterFieldSchema>> extends fields.SchemaField<
  CounterFieldSchema,
  Options
> {
  constructor(options?: Options) {
    super(defineCounterFieldSchema(), options);
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
  clean(value: fields.SchemaField.AssignmentData<CounterFieldSchema>, options: any) {
    // Attempt to move our .val back in bounds
    const cleaned = super.clean(value, options);
    if (cleaned == null) {
      return cleaned;
    }

    cleaned.initialized = CounterField.bound_val(cleaned, cleaned.initialized || 0);
    cleaned.default_value = CounterField.bound_val(cleaned, cleaned.default_value || 0);
    return cleaned;
  }

  /** @override */
  _validateType(value: CounterData) {
    if (value.max != null && value.min != null && value.max < value.min) throw new Error("max must be > min");
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
