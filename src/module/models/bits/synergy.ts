
// @ts-nocheck
const fields = foundry.data.fields;

import { ISynergyData, Synergy, SystemType, WeaponSize, WeaponType } from "machine-mind";

export enum SynergyLocations {
Any ,
 ActiveEffects ,
 Rest ,
 Weapon ,
 System ,
 Move ,
 Boost ,
 Other ,
 Ram ,
 Grapple ,
 TechAttack ,
 Overcharge ,
 Skill_check ,
 Overwatch ,
 ImprovisedAttack ,
 Disengage ,
 Stabilize ,
 Tech ,
 Lock_on ,
 Hull ,
 Agility ,
 Systems ,
 Engineering
}

// A single <type, value> pairing for range. Mimics RegRangeData
export class SynergyField extends fields.SchemaField {
  constructor(options = {}) {
    super(
      {
        locations: new fields.ArrayField(new fields.StringField({choices: Object.values(SynergyLocations), initial: SynergyLocations.Any})),
        detail: new fields.StringField({ nullable: false }),
        system_types: new fields.ArrayField(new fields.StringField({choices: Object.values(SystemType), initial: SystemType.System})),
        weapon_types: new fields.ArrayField(new fields.StringField({choices: Object.values(WeaponType), initial: WeaponType.Rifle})),
        weapon_sizes: new fields.ArrayField(new fields.StringField({choices: Object.values(WeaponSize), initial: WeaponSize.Main})),
      },
      options
    );
  }

  /** @override */
  initialize(model, name, value: ISynergyData) {
    // Coerce to a range
    return new Range(value);
  }

  /** @override */
  _cast(value) {
    if( value instanceof Synergy ) { // Todo: don't use the Synergy class, its dumb
      return value.save();
    } else {
      return super._cast(value);
    }
  }
}
