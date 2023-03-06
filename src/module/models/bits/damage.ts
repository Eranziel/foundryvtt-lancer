import { DamageType } from "../../enums.js";
import type { DamageTypeChecklist } from "../../enums.js";
import type { PackedDamageData } from "../../util/unpacking/packed-types.js";

// @ts-ignore
const fields: any = foundry.data.fields;

// Clone of RegDamageData
export interface DamageData {
  type: DamageType;
  val: string;
}

// "Hydrated" DamageData
export class Damage implements Readonly<DamageData> {
  type: DamageType;
  val: string;
  constructor(data: DamageData) {
    this.type = data.type;
    this.val = data.val;
  }

  save(): DamageData {
    return {
      type: this.type,
      val: this.val,
    };
  }

  copy(): Damage {
    return new Damage(this.save());
  }

  // Methods / getters / Various formatting options
  get icon(): string {
    return Damage.IconFor(this.type);
  }

  get text(): string {
    return `${this.val} ${this.type} Damage`;
  }

  get discord_emoji(): string {
    return Damage.DiscordEmojiFor(this.type);
  }

  get color(): string {
    return Damage.ColorFor(this.type);
  }

  // Returns the css font icon corresponding to the provided damage type
  public static IconFor(dt: DamageType): string {
    return `cci-${dt.toLowerCase()}`;
  }

  public static DiscordEmojiFor(dt: DamageType): string {
    return `:cc_damage_${dt.toLowerCase()}:`;
  }

  // Returns the css color name corresponding to the provided damage type
  public static ColorFor(dt: DamageType): string {
    return `damage--${dt.toLowerCase()}`;
  }

  // Convert a damage type array to a checklist. If no damage types provided, assume all
  public static MakeChecklist(damages: DamageType[]): DamageTypeChecklist {
    let override = damages.length == 0;
    return {
      Burn: override || damages.includes(DamageType.Burn),
      Energy: override || damages.includes(DamageType.Energy),
      Explosive: override || damages.includes(DamageType.Explosive),
      Heat: override || damages.includes(DamageType.Heat),
      Kinetic: override || damages.includes(DamageType.Kinetic),
      Variable: override || damages.includes(DamageType.Variable),
    };
  }

  // Undo the above conversion
  public static FlattenChecklist(damages: DamageTypeChecklist): DamageType[] {
    return Object.keys(damages).filter(d => damages[d as keyof DamageTypeChecklist]) as DamageType[];
  }

  // Combine two arrays of damage. Does not edit originals
  public static CombineLists(a: Damage[], b: Damage[]): Damage[] {
    // Make a copy of a.
    let result = a.map(d => d.copy());

    // For each b, try to find a matching a and add them together
    for (let db of b) {
      // Get a match on
      let to_be_modified = result.find(result_d => result_d.type == db.type);
      if (to_be_modified) {
        // We found existing damage of that type. Sum on the new stuff
        to_be_modified.val += ` + ${db.val}`;
      } else {
        // Did not already have that damage type. Add it
        result.push(db.copy());
      }
    }
    return result;
  }
}

// Maps DamageData to a damage class
export class DamageField extends fields.SchemaField {
  constructor(options = {}) {
    super(
      {
        type: new fields.StringField({ choices: Object.values(DamageType), initial: DamageType.Kinetic }),
        val: new fields.StringField({ initial: "1d6", nullable: false, required: true, trim: true }),
      },
      options
    );
  }

  /** @override */
  initialize(value: DamageData, model: unknown) {
    // Coerce to a range
    return new Damage(value);
  }

  /** @override */
  _cast(value: any) {
    if (value instanceof Damage) {
      return value.save();
    } else {
      return super._cast(value);
    }
  }
}

// Converts an lcp damage entry into our expected format
export function unpackDamage(data: PackedDamageData): DamageData {
  let type = data.type?.capitalize() as DamageType; // can only help, really
  return {
    type,
    val: data.val?.toString() ?? "1",
  };
}
