import { LancerMECH } from "../../actor/lancer-actor";
import { RangeType, RangeTypeChecklist } from "../../enums";
import { LancerMECH_WEAPON, LancerWEAPON_MOD } from "../../item/lancer-item";

// @ts-ignore
const fields: any = foundry.data.fields;

// Clone of RegRangeData
export interface RangeData {
  type: RangeType;
  val: string;
}

// Represents a single range for a weapon. Line 8, range 10, burst 2, etc. Blast will have a separate entry for its "normal" range and the range of the explosion
export class Range implements Required<RangeData> {
  type: RangeType;
  val: string;
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

  // Gives the bonus-included ranges for the given mech weapon
  public static CalcTotalRangeWithBonuses(
    weapon: LancerMECH_WEAPON,
    profile_index: number,
    mech: LancerMECH,
    mod?: LancerWEAPON_MOD
  ): Range[] {
    /* TODO 
    // Select the profile
    let profile = weapon.system.profiles[profile_index];

    // Cut down to bonuses that affect ranges
    let all_bonuses = mech.AllBonuses.concat(mod?.Bonuses ?? []).filter(x => x.LID === "range");

    // Start building our output
    const output: Range[] = [];
    const ctx = mech.Pilot ? Bonus.ContextFor(mech.Pilot) : {};

    // Combine the ranges
    let base_ranges = profile.BaseRange;
    if (mod) {
      base_ranges = Range.CombineLists(base_ranges, mod.AddedRange);
    }

    for (let base_range of base_ranges) {
      // Further narrow down to bonuses to this specific range/weapon combo
      let range_specific_bonuses = all_bonuses.filter(b => b.applies_to_weapon(weapon, profile, base_range));

      // Compute them vals
      let bonus_summary: BonusSummary<number>;
      let base_as_num = parseInt(base_range.Value);
      let fallback_base: string; //
      if (Number.isNaN(base_as_num)) {
        fallback_base = base_range.Value + " + ";
        bonus_summary = Bonus.Accumulate(0, range_specific_bonuses, ctx);
      } else {
        fallback_base = "";
        bonus_summary = Bonus.Accumulate(base_as_num, range_specific_bonuses, ctx);
      }

      // Push the augmented range
      let new_range = new Range({
        type: base_range.RangeType,
        val: fallback_base + bonus_summary.final_value,
      });
      new_range.Bonuses = bonus_summary.contributors.map(b => `+${b.value} :: ${b.bonus.Title}`); // TODO: make this format more cases, such as overwrites and replaces

      output.push(new_range);
    }
    return output;
    */
    return [];
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
  public static CombineLists(a: Range[], b: Range[]): Range[] {
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
  initialize(model: unknown, name: unknown, value: RangeData) {
    // Coerce to a range
    return new Range(value);
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
