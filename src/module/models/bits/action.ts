// @ts-nocheck
const fields = foundry.data.fields;

import { ActivePeriod } from "machine-mind/dist/classes/Action";
import { LIDField } from "../shared";
import { DamageField } from "./damage";
import { RangeField } from "./range";

// Lightly trimmed
export interface ActionData {
  lid: string;
  name: string;
  activation: ActivationType;
  cost: number;
  frequency: string;
  init: string;
  trigger: string;
  terse: string;
  detail: string;
  pilot: boolean;
  mech: boolean;
  // hide_active: boolean;
  confirm: string[];
  available_mounted: boolean;
  heat_cost: number;
  synergy_locations: string[];
  damage: RegDamageData[];
  range: RegRangeData[];
  log: string;
  // ignore_used: boolean;
}

/**
 * A subclass of StringField which deals with frequency data.
 */
class FrequencyField extends fields.StringField {
  /** @inheritdoc */
  static get _defaults() {
    return mergeObject(super._defaults, {
      required: true,
      blank: false,
      nullable: true,
      initial: null,
      readonly: true,
      validationError: "is not a properly formatted frequency",
    });
  }

  /** @override */
  _validateType(value: unknown) {
    if (typeof value == "string") {
      FrequencyField.ParseField(value);
    } else if (value != null) {
      throw new Error();
    }
  }

  static ParseField(freq: string): { uses: number; interval: ActivePeriod } | { interval: "Unlimited" } {
    freq = freq.trim();
    if (freq == "Unlimited") {
      return { interval: "Unlimited" };
    }

    try {
      let [_, uses, interval] = freq.match("(d)+s*/s*(.*)");
      if (![Object.keys(ActivePeriod)].includes(interval)) {
        throw new Error(
          `Frequency interval must one of [${Object.values(ActivePeriod).join(" | ")}]. Illegal option: ${interval}`
        );
      } else if (uses < 1) {
        throw new Error(`Frequency use count must be a positive integer. Illegal option: ${uses}`);
      } else {
        return { uses, interval };
      }
    } catch (e: TypeError) {
      throw new Error(`Frequency must be of a format alike "X / [${Object.values(ActivePeriod).join(" | ")}]`);
    }
  }
}

// Action field is frequent, but not exactly deserving of a custom class like damage or range. It still needs a custom field (frequency)
export class ActionField extends fields.SchemaField {
  constructor(options = {}) {
    super(
      {
        lid: new LIDField(),
        name: new fields.StringField(),
        activation: new fields.StringField({ choices: Object.values(ActivationType), initial: ActivationType.Quick }),
        cost: new fields.NumberField({ min: 0, integer: true, nullable: false }),
        frequency: new FrequencyField(),
        init: new fields.HTMLField(),
        trigger: new fields.HTMLField(),
        terse: new fields.HTMLField(),
        detail: new fields.HTMLField(),
        pilot: new fields.BooleanField(),
        mech: new fields.BooleanField(),
        confirm: new fields.StringField(),
        available_mounted: new fields.BooleanField(),
        heat_cost: new fields.NumberField({ min: 0, integer: true, nullable: false }),
        // TODO: synergy_locations: make em more fancy or somethin
        synergy_locations: new fields.ArrayField(new fields.StringField()),
        damage: new fields.ArrayField(new DamageField()),
        range: new fields.ArrayField(new RangeField()),
        // ignore_used?
        log: new fields.StringField(),
      },
      options
    );
  }
}
