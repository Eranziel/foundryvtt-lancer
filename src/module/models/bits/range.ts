import { LancerMECH } from "../../actor/lancer-actor";
import { RangeType, RangeTypeChecklist } from "../../enums";
import { restrict_enum } from "../../helpers/commons";
import { LancerMECH_WEAPON, LancerWEAPON_MOD } from "../../item/lancer-item";
import { PackedRangeData } from "../../util/unpacking/packed-types";

const fields: any = foundry.data.fields;

// Clone of RegRangeData
export interface RangeData {
  type: RangeType;
  val: number;
}

// Represents a single range for a weapon. Line 8, range 10, burst 2, etc. Blast will have a separate entry for its "normal" range and the range of the explosion
export class Range implements Required<RangeData> {
  type: RangeType;
  val: number;
  constructor(data: RangeData) {
    this.type = data.type;
    this.val = data.val;
  }

  save(): RangeData {
    return {
      type: this.type,
      val: this.val,
    };
  }

  copy(): Range {
    return new Range(this.save());
  }

  // A simple text output. Perhaps unnecessary - kept from compcon
  public get formatted(): string {
    // if (this.bonuses) return `${this.RangeType} ${this.Value} (+${this.Bonuses})`;
    return `${this.type} ${this.val}`;
  }

  public get icon(): string {
    return Range.IconFor(this.type);
  }

  public get discord_emoji(): string {
    return Range.DiscordEmojiFor(this.type);
  }

  // Returns the discord emoji corresponding to the provided range type
  public static DiscordEmojiFor(rt: RangeType): string {
    switch (rt) {
      case RangeType.Range:
      case RangeType.Threat:
      case RangeType.Thrown:
        return `:cc_${rt.toLowerCase()}:`;
    }
    return `:cc_aoe_${rt.toLowerCase()}:`;
  }

  public static IconFor(rt: RangeType): string {
    return `cci-${rt.toLowerCase()}`;
  }

  // Convert a range type array to a checklist. If no range types provided, assume all
  public static MakeChecklist(ranges: RangeType[]): RangeTypeChecklist {
    let override = ranges.length == 0;
    return {
      Blast: override || ranges.includes(RangeType.Blast),
      Burst: override || ranges.includes(RangeType.Burst),
      Cone: override || ranges.includes(RangeType.Cone),
      Line: override || ranges.includes(RangeType.Line),
      Range: override || ranges.includes(RangeType.Range),
      Thrown: override || ranges.includes(RangeType.Thrown),
      Threat: override || ranges.includes(RangeType.Threat),
    };
  }

  // Undo the above conversion
  public static FlattenChecklist(ranges: RangeTypeChecklist): RangeType[] {
    return Object.keys(ranges).filter(r => ranges[r as keyof RangeTypeChecklist]) as RangeType[];
  }

  // Combine two arrays of damage. Does not edit originals
  public static CombineLists(base: Range[], additions: Range[]): Range[] {
    // Make a copy of a.
    let result = base.map(d => d.copy());

    // For each b, try to find a matching a and add them together
    for (let added_range of additions) {
      // Get a match on
      let to_be_modified = result.find(result_d => result_d.type == added_range.type);
      if (to_be_modified) {
        // We found existing range of that type. Sum on the new stuff
        to_be_modified.val += added_range.val;
      } else {
        // Did not already have that damage type. Add it
        result.push(added_range.copy());
      }
    }
    return result;
  }
}

// Maps RangeData to a Range class
export class RangeField extends fields.SchemaField {
  constructor(options = {}) {
    super(
      {
        type: new fields.StringField({ choices: Object.values(RangeType), initial: RangeType.Range }),
        val: new fields.NumberField({ min: 0, integer: true, initial: 1, nullable: false }),
      },
      options
    );
  }

  /** @override */
  initialize(value: RangeData, model: unknown) {
    // Coerce to a range
    return new Range(value);
  }

  migrateSource(sourceData: any, fieldData: any) {
    if (typeof fieldData.val == "string") {
      fieldData.val = parseInt(fieldData.val) || 1;
    }
    if (fieldData.type) {
      fieldData.type = restrict_enum(RangeType, RangeType.Range, fieldData.type);
    }

    return super.migrateSource(sourceData, fieldData);
  }

  /** @override */
  _cast(value: any) {
    if (value instanceof Range) {
      return value.save();
    } else {
      return super._cast(value);
    }
  }
}

// Converts an lcp range into our expected format
export function unpackRange(data: PackedRangeData): RangeData {
  let type = data.type?.capitalize() as RangeType; // can only help, really
  return {
    type: type ?? RangeType.Range,
    val: Number.parseInt(data.val?.toString() ?? "0") || 0,
  };
}
