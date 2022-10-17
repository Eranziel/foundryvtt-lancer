// @ts-nocheck
const fields = foundry.data.fields;

import { DamageTypeChecklist, RangeTypeChecklist, WeaponSizeChecklist, WeaponTypeChecklist } from "../../enums";
import { BONUS } from "../../util/mmigration/defaults";

// Make all fields required, force val to string, and use checklists
export interface BonusData {
  lid: string;
  val: string;
  damage_types: DamageTypeChecklist;
  range_types: RangeTypeChecklist;
  weapon_types: WeaponTypeChecklist;
  weapon_sizes: WeaponSizeChecklist;

  overwrite: boolean;
  replace: boolean;
}

export class BonusField extends fields.SchemaField {
  constructor(options = {}) {
    super(
      {
        lid: new StringField({ nullable: false }), // Don't really want an LID field here
        val: new StringField({ nullable: false }),
        locations: new fields.ArrayField(
          new fields.StringField({ choices: Object.values(SynergyLocations), initial: SynergyLocations.Any })
        ),
        detail: new fields.StringField({ nullable: false }),
        system_types: new fields.ArrayField(
          new fields.StringField({ choices: Object.values(SystemType), initial: SystemType.System })
        ),
        weapon_types: new fields.ArrayField(
          new fields.StringField({ choices: Object.values(WeaponType), initial: WeaponType.Rifle })
        ),
        weapon_sizes: new fields.ArrayField(
          new fields.StringField({ choices: Object.values(WeaponSize), initial: WeaponSize.Main })
        ),
      },
      options
    );
  }
}

// Just a more convenient constructor
export function GenerateBonus(
  lid: string,
  val: string | number,
  replace: boolean = false,
  overwrite: boolean = false
): BonusData {
  return {
    ...BONUS(),
    lid,
    val: "" + val,
    replace,
    overwrite,
  };
}
