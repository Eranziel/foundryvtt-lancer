import type { FullBoundedNum } from "../../source-template";
import type { PackedBondPowerData } from "../../util/unpacking/packed-types";

import fields = foundry.data.fields;

const definePowerFieldSchema = () => {
  return {
    name: new fields.StringField({ nullable: false }),
    description: new fields.StringField({ nullable: false }),
    unlocked: new fields.BooleanField(),
    frequency: new fields.StringField({ required: false, nullable: true }),
    uses: new fields.SchemaField(
      {
        min: new fields.NumberField({ integer: true, initial: 0, nullable: false }),
        max: new fields.NumberField({ integer: true, initial: 0, nullable: false }),
        value: new fields.NumberField({ integer: true, initial: 0, nullable: false }),
      },
      { required: false, nullable: true }
    ),
    veteran: new fields.BooleanField(),
    master: new fields.BooleanField(),
    prerequisite: new fields.StringField({ required: false, nullable: true }),
  };
};

type PowerFieldSchema = ReturnType<typeof definePowerFieldSchema>;

export type PowerData = fields.SchemaField.InitializedData<PowerFieldSchema>;

export class PowerField<Options extends fields.SchemaField.Options<PowerFieldSchema>> extends fields.SchemaField<
  PowerFieldSchema,
  Options
> {
  constructor(options?: Options) {
    super(definePowerFieldSchema(), options);
  }
}

export function parsePowerUses(frequency: string | null | undefined): FullBoundedNum | null {
  if (!frequency) return null;
  const parts = frequency.split("/");
  if (parts.length !== 2) return null;
  try {
    return {
      min: 0,
      max: parseInt(parts[0]),
      value: parseInt(parts[0]),
    };
  } catch (e) {
    return null;
  }
}

/**
 * Ensures that a power's "uses" field matches the frequency. If frequency is defined and uses is not, uses will be initialized.
 * If uses is already defined, its max will be set according to frequency.
 * @param power The power to work on
 * @returns The power with "uses" populated properly
 */
export function fixupPowerUses(power: PowerData): PowerData {
  let fixed: PowerData = { ...power };
  if (!power.frequency) {
    fixed.uses = null;
    return fixed;
  }
  const parts = power.frequency.split("/");
  if (parts.length !== 2) {
    fixed.uses = null;
    return fixed;
  }
  if (!power.uses) fixed.uses = parsePowerUses(power.frequency);
  if (!fixed.uses) return fixed;
  try {
    const max = parseInt(parts[0]);
    fixed.uses = { ...fixed.uses, max };
  } catch (e) {}
  return fixed;
}

export function unpackPower(data: PackedBondPowerData): PowerData {
  return {
    name: data.name,
    description: data.description,
    unlocked: false,
    frequency: data.frequency || null,
    uses: parsePowerUses(data.frequency),
    veteran: data.veteran || false,
    master: data.master || false,
    prerequisite: data.prerequisite || null,
  };
}
