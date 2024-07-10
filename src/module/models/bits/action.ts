import { ActivationType, ActivePeriod } from "../../enums";
import { PackedActionData } from "../../util/unpacking/packed-types";
import { LIDField } from "../shared";
import { DamageData, DamageField, unpackDamage } from "./damage";
import { RangeData, RangeField, unpackRange } from "./range";

// @ts-ignore
const fields: any = foundry.data.fields;

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
  tech_attack: boolean;
  // hide_active: boolean;
  // confirm: string[];
  // available_mounted: boolean;
  heat_cost: number;
  synergy_locations: string[];
  damage: DamageData[];
  range: RangeData[];
  // log: string;
  // ignore_used: boolean;
}

/**
 * A subclass of StringField which deals with frequency data.
 */
class FrequencyField extends fields.StringField {
  /** @inheritdoc */
  static get _defaults() {
    return foundry.utils.mergeObject(super._defaults, {
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

    let match = freq.match(/(\d)+\s*\/\s*(.*)/);
    if (!match) {
      throw new Error(
        `Frequency must be of a format alike "X / [${Object.values(ActivePeriod).join(
          " | "
        )}]. Illegal option: "${freq}"`
      );
    }
    let uses = Number.parseInt(match[1]);
    let interval = match[2] as ActivePeriod;
    // Force capitalize interval first char
    interval = (interval[0].toUpperCase() + interval.substring(1)) as ActivePeriod;
    if (!Object.keys(ActivePeriod).includes(interval)) {
      throw new Error(
        `Frequency interval must one of [${Object.values(ActivePeriod).join(" | ")}]. Illegal option: "${interval}"`
      );
    } else if (uses < 1) {
      throw new Error(`Frequency use count must be a positive integer. Illegal option: ${uses}`);
    } else {
      return { uses, interval };
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
        tech_attack: new fields.BooleanField(),
        // confirm: new fields.StringField(),
        // available_mounted: new fields.BooleanField(),
        heat_cost: new fields.NumberField({ min: 0, integer: true, nullable: false }),
        // TODO: synergy_locations: make em more fancy or somethin
        synergy_locations: new fields.ArrayField(new fields.StringField()),
        damage: new fields.ArrayField(new DamageField()),
        range: new fields.ArrayField(new RangeField()),
        // ignore_used?
        // log: new fields.StringField(),
      },
      options
    );
  }
}

// Converts an lcp action into our expected format
export function unpackAction(data: PackedActionData): ActionData {
  let activation = repairActivationType(data.activation ?? ActivationType.Quick);
  return {
    activation,
    cost: data.cost ?? 0,
    damage: data.damage?.map(unpackDamage) ?? [],
    detail: data.detail ?? "",
    frequency: data.frequency ?? "",
    heat_cost: data.heat_cost ?? 0,
    init: data.init ?? "",
    lid: data.id ?? "",
    mech: data.mech ?? true,
    name: data.name ?? "Action",
    pilot: data.pilot ?? false,
    range: data.range?.map(unpackRange) ?? [],
    synergy_locations: data.synergy_locations ?? [],
    terse: data.terse ?? "",
    trigger: data.trigger ?? "",
    tech_attack: data.tech_attack ?? false,
  };
}

export function repairActivationType(activation: string): ActivationType {
  for (const value of Object.values(ActivationType)) {
    if (value === activation) {
      return value;
    }
  }
  // It didn't match a standard action type string, so try some common alternates
  if (activation.toLowerCase() === "full action") {
    return ActivationType.Full;
  } else if (activation.toLowerCase() === "quick action") {
    return ActivationType.Quick;
  } else if (activation.toLowerCase() === "free action") {
    return ActivationType.Free;
  }
  // Still couldn't match an action type, so default to quick.
  return ActivationType.Quick;
}
