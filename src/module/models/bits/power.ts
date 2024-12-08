import { FullBoundedNum } from "../../source-template";
import { PackedBondPowerData } from "../../util/unpacking/packed-types";

const fields: any = foundry.data.fields;

export interface PowerData {
  name: string;
  description: string;
  unlocked: boolean;
  frequency: string | null;
  uses: FullBoundedNum | null;
  veteran: boolean;
  master: boolean;
  prerequisite: string | null;
}

export class PowerField extends fields.SchemaField {
  constructor(options = {}) {
    super(
      {
        name: new fields.StringField({ nullable: false }),
        description: new fields.StringField({ nullable: false }),
        unlocked: new fields.BooleanField(),
        frequency: new fields.StringField({ required: false, nullable: true }),
        uses: new fields.SchemaField(
          {
            min: new fields.NumberField({ integer: true, initial: 0 }),
            max: new fields.NumberField({ integer: true, initial: 0 }),
            value: new fields.NumberField({ integer: true, initial: 0 }),
          },
          { required: false, nullable: true }
        ),
        veteran: new fields.BooleanField(),
        master: new fields.BooleanField(),
        prerequisite: new fields.StringField({ required: false, nullable: true }),
      },
      options
    );
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
    fixed.uses = {
      min: fixed.uses.min ?? 0,
      max,
      value: fixed.uses.value ?? max,
    };
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
