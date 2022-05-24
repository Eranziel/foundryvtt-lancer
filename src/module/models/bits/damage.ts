// @ts-nocheck
const fields = foundry.data.fields;

import { RegDamageData, DamageType, Damage } from "machine-mind";
import { EnumField } from "../shared";

// A single <type, value> pairing for damage. Mimics RegDamageData
export class DamageField extends fields.SchemaField {
  constructor(options = {}) {
    super(
      {
        type: new EnumField(Object.values(DamageType), { initial: DamageType.Kinetic }),
        val: new fields.StringField({ initial: "1d6" }),
      },
      options
    );
  }

  /** @override */
  initialize(model, name, value: RegDamageData) {
    // Coerce to a range
    return new Damage(value);
  }

  /** @override */
  _cast(value) {
    if( value instanceof Damage ) {
      return value.save();
    } else {
      return super._cast(value);
    }
  }
}
