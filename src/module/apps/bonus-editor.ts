import {
  DamageType,
  DamageTypeChecklist,
  RangeType,
  RangeTypeChecklist,
  WeaponSize,
  WeaponSizeChecklist,
  WeaponType,
  WeaponTypeChecklist,
} from "../enums";
import { IconFactory, resolve_dotpath } from "../helpers/commons";
import { BonusData } from "../models/bits/bonus";
import { Damage } from "../models/bits/damage";
import { Range } from "../models/bits/range";
import { TargetedEditForm } from "./targeted-form-editor";

/**
 * A helper Dialog subclass for editing a bonus
 * @extends {Dialog}
 */
export class BonusEditDialog extends TargetedEditForm<BonusData> {
  /** @override */
  static get defaultOptions() {
    return {
      ...super.defaultOptions,
      template: `systems/${game.system.id}/templates/window/bonus.hbs`,
      title: "Bonus Editing",
    };
  }

  /** @override
   * Expose our data
   */
  getData(): any {
    let iconer = new IconFactory({
      size: "m",
    });

    return {
      ...super.getData(),
      damages: Object.values(DamageType).map(dt => ({
        key: dt,
        label: iconer.r(Damage.IconFor(dt)),
        val: this.value.damage_types?.[dt] ?? false,
      })),
      ranges: Object.values(RangeType).map(rt => ({
        key: rt,
        label: iconer.r(Range.IconFor(rt)),
        val: this.value.range_types?.[rt] ?? false,
      })),
      sizes: Object.values(WeaponSize).map(ws => ({
        key: ws,
        label: ws,
        val: this.value.weapon_sizes?.[ws] ?? false,
      })),
      types: Object.values(WeaponType).map(wt => ({
        key: wt,
        label: wt,
        val: this.value.weapon_types?.[wt] ?? false,
      })),
    };
  }

  /** @override */
  fixupForm(form_data: Record<string, string | number | boolean>): Record<string, string | number | boolean> {
    let new_bonus: BonusData = {
      lid: form_data.lid as string,
      val: form_data.val as string,
      overwrite: form_data.overwrite as boolean,
      replace: form_data.replace as boolean,
      damage_types: {} as DamageTypeChecklist,
      range_types: {} as RangeTypeChecklist,
      weapon_sizes: {} as WeaponSizeChecklist,
      weapon_types: {} as WeaponTypeChecklist,
    };

    // Populate checkboxes
    new_bonus.damage_types = {} as DamageTypeChecklist;
    for (let dt of Object.values(DamageType)) {
      new_bonus.damage_types[dt] = form_data[dt] as boolean;
    }
    new_bonus.range_types = {} as RangeTypeChecklist;
    for (let rt of Object.values(RangeType)) {
      new_bonus.range_types[rt] = form_data[rt] as boolean;
    }
    new_bonus.weapon_types = {} as WeaponTypeChecklist;
    for (let wt of Object.values(WeaponType)) {
      new_bonus.weapon_types[wt] = form_data[wt] as boolean;
    }
    new_bonus.weapon_sizes = {} as WeaponSizeChecklist;
    for (let ws of Object.values(WeaponSize)) {
      new_bonus.weapon_sizes[ws] = form_data[ws] as boolean;
    }

    // Submit changes
    return new_bonus as any;
  }
}
