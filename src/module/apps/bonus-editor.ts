import { LancerActor } from "../actor/lancer-actor";
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
import { LancerItem } from "../item/lancer-item";
import { BonusData } from "../models/bits/bonus";
import { Damage } from "../models/bits/damage";
import { Range } from "../models/bits/range";

/**
 * A helper Dialog subclass for editing a bonus
 * @extends {Dialog}
 */
export class BonusEditDialog extends FormApplication {
  // The document we're editing
  target: LancerActor | LancerItem;

  // The bonus we're editing
  bonus: BonusData;

  // Where it is
  bonus_path: string;

  // Promise to signal completion of workflow
  resolve: () => any;

  constructor(
    target: LancerActor | LancerItem,
    bonus_path: string,
    options: Partial<FormApplication.Options>,
    resolve_func: () => any
  ) {
    super(
      {
        hasPerm: () => true, // We give it a dummy object because we don't want it messing with our shit
      },
      options
    );
    this.target = target;
    this.bonus_path = bonus_path;
    this.bonus = resolve_dotpath(target, bonus_path) as BonusData;
    this.resolve = resolve_func;
  }

  /* -------------------------------------------- */

  /** @override */
  static get defaultOptions() {
    return {
      ...super.defaultOptions,
      template: `systems/${game.system.id}/templates/window/bonus.hbs`,
      width: 400,
      title: "Bonus Editing",
      height: "auto" as const,
      classes: ["lancer"],
      submitOnChange: false,
      submitOnClose: true,
      closeOnSubmit: true,
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
        val: this.bonus.damage_types?.[dt] ?? false,
      })),
      ranges: Object.values(RangeType).map(rt => ({
        key: rt,
        label: iconer.r(Range.IconFor(rt)),
        val: this.bonus.range_types?.[rt] ?? false,
      })),
      sizes: Object.values(WeaponSize).map(ws => ({
        key: ws,
        label: ws,
        val: this.bonus.weapon_sizes?.[ws] ?? false,
      })),
      types: Object.values(WeaponType).map(wt => ({
        key: wt,
        label: wt,
        val: this.bonus.weapon_types?.[wt] ?? false,
      })),
      bonus: this.bonus,
    };
  }

  /** @override */
  async _updateObject(_event: unknown, form_data: Record<string, string | number | boolean>) {
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
    return this.target.update({ [this.bonus_path]: new_bonus }).then(this.resolve);
  }

  /* -------------------------------------------- */

  /**
   * A helper constructor function which displays the bonus editor and returns a Promise once it's
   * workflow has been resolved.
   * @return {Promise}
   */
  static async edit_bonus(document: LancerActor | LancerItem, path: string): Promise<void> {
    return new Promise((resolve, _reject) => {
      const app = new this(document, path, {}, resolve);
      app.render(true);
    });
  }
}
