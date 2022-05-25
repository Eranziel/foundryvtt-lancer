import { RegCounterData } from "machine-mind";
import { LIDField } from "../shared";

// @ts-ignore
const fields: any = foundry.data.fields;

// A single <type, value> pairing for damage. mimics RegCounterData
export class CounterField extends fields.SchemaField {
  constructor(options = {}) {
    super(
      {
          lid: new LIDField(),
          name: new fields.StringField(),
          min: new fields.NumberField(),
          max: new fields.NumberField({required: false, nullable: true}),
          default_value: new fields.NumberField(),
          val: new fields.NumberField(),
      },
      options
    );
  }

  bound_val(value: RegCounterData, sub_val: number) {
    sub_val = Math.round(sub_val);
    sub_val = Math.max(sub_val, value.min);
    if ( value.max !== null ) sub_val = Math.min(sub_val, value.max);
    return sub_val;
  }

  /** @inheritdoc */
  clean(value: RegCounterData, data: any, options: any) {
    // Attempt to move our .val back in bounds
    value = super.clean(value, data, options);
    value.val = this.bound_val(value, value.val || 0);
    value.default_value = this.bound_val(value, value.default_value || 0);
    return value;
  }

  /** @override */
  _validateType(value: RegCounterData) {
    if ( value.max !== null && (value.max < value.min) ) throw new Error("max must be > min");
  }
}
