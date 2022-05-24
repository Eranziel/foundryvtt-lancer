// @ts-nocheck
const fields = foundry.data.fields;

import { RegCounterData } from "machine-mind";
import { LIDField } from "../shared";

// A single <type, value> pairing for damage. Mimics RegCounterData
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

  /** @override */
  initialize(model, name, value: RegCounterData) {
    // Coerce to a range
    return new Counter(value);
  }

  /** @override */
  _cast(value) {
    if( value instanceof Counter ) {
      return value.save();
    } else {
      return super._cast(value);
    }
  }
}
