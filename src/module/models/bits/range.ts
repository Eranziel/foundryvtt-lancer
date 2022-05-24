// @ts-nocheck
const fields = foundry.data.fields;

import { RangeType, Range, RegRangeData } from "machine-mind";
import { EnumField } from "../shared";

// A single <type, value> pairing for range. Mimics RegRangeData
export class RangeField extends fields.SchemaField {
  constructor(options = {}) {
    super(
      {
        type: new EnumField(Object.values(RangeType), { initial: RangeType.Range }),
        val: new fields.StringField({ initial: "5" }),
      },
      options
    );
  }

  /** @override */
  initialize(model, name, value: RegRangeData) {
    // Coerce to a range
    return new Range(value);
  }

  /** @override */
  _cast(value) {
    if( value instanceof Range ) {
      return value.save();
    } else {
      return super._cast(value);
    }
  }
}
