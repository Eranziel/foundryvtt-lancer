// @ts-nocheck
const fields = foundry.data.fields;

// Clone of RegDamageData
export interface DamageData {
  type: DamageType;
  val: string;
}

export class Damage implements Readonly<DamageData> {
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

  // Methods / getters / Various formatting options
  get icon(): string {
    return Damage.icon_for(this.DamageType);
  }

  get text(): string {
    return `${this.Value} ${this.DamageType} Damage`;
  }

  get discord_emoji(): string {
    return Damage.discord_emoji_for(this.DamageType);
  }

  get color(): string {
    return Damage.color_for(this.DamageType);
  }

  // Returns the discord emoji corresponding to the provided damage type
  public static unpack(dat: PackedDamageData): DamageData {
    return {
      type: dat.type,
      val: "" + dat.val,
    };
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
    return Object.keys(damages).filter(d => damages[d]) as DamageType[];
  }

  // Combine two arrays of damage. Does not edit originals
  public static CombineLists(a: Damage[], b: Damage[]): Damage[] {
    // Make a copy of a.
    let result = a.map(d => d.copy());

    // For each b, try to find a matching a and add them together
    for (let db of b) {
      // Get a match on
      let to_be_modified = result.find(result_d => result_d.DamageType == db.DamageType);
      if (to_be_modified) {
        // We found existing damage of that type. Sum on the new stuff
        to_be_modified.Value += ` + ${db.Value}`;
      } else {
        // Did not already have that damage type. Add it
        result.push(db.copy());
      }
    }
    return result;
  }
}

// A single <type, value> pairing for damage. Mimics RegDamageData
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
  initialize(model, name, value: RegDamageData) {
    // Coerce to a range
    return new Damage(value);
  }

  /** @override */
  _cast(value) {
    if (value instanceof Damage) {
      return value.save();
    } else {
      return super._cast(value);
    }
  }
}
