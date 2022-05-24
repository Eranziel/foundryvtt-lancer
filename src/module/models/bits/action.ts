// @ts-nocheck
const fields = foundry.data.fields;

import { ActivationType, RegActionData, Action } from "machine-mind";
import { EnumField, LIDField } from "../shared";
import { DamageField } from "./damage";
import { RangeField } from "./range";

// A single <type, value> pairing for damage. Mimics RegActionData
export class ActionField extends fields.SchemaField {
  constructor(options = {}) {
    super(
      {
        lid: new LIDField(),
        activation: new EnumField(Object.values(ActivationType)),
        cost: new fields.NumberField({ min: 0, integer: true }),
        name: new fields.StringField(),
        init: new fields.HTMLField(),
        trigger: new fields.HTMLField(),
        terse: new fields.HTMLField(),
        detail: new fields.HTMLField(),
        pilot: new fields.BooleanField(),
        mech: new fields.BooleanField(),
        confirm: new fields.StringField(),
        available_mounted: new fields.BooleanField(),
        heat_cost: new fields.NumberField({ min: 0, integer: true }),
        // todo: synergy_locations: 
        damage: new fields.ArrayField(new DamageField()),
        range: new fields.ArrayField(new RangeField()),
        // ignore_used?
        log: new fields.StringField()
      },
      options
    );
  }

  /** @override */
  initialize(model, name, value: RegActionData) {
    // Coerce to a range
    return new Action(value);
  }

  /** @override */
  _cast(value) {
    if( value instanceof Action ) {
      return value.save();
    } else {
      return super._cast(value);
    }
  }
}
