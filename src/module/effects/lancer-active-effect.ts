import { ActiveEffectDataConstructorData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/activeEffectData";
import { EffectChangeData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/effectChangeData";
import { DamageTypeChecklist, RangeTypeChecklist, WeaponSizeChecklist, WeaponTypeChecklist } from "machine-mind";
import { LancerActor } from "../actor/lancer-actor";
import { LancerItem } from "../item/lancer-item";

// Chassis = mech or standard npc
export type LancerEffectTarget = "pilot" | "chassis" | "deployable";

export interface LancerActiveEffectFlags {
  // If specified, then this is a bonus that is meant to cascade and only affect the specified type
  // Note that "mech" also applies to standard npcs
  target_type?: LancerEffectTarget;
  // If true, this effect will only be applied in a special preliminary effect round
  preliminary?: boolean;
  // The actor (uuid) this was copied from, if applicable
  cascade_origin?: string | null;
  // If applicable, the restrictions on this effect wrt. what weapons are affected
  restrictions?: {
    damage?: DamageTypeChecklist;
    range?: RangeTypeChecklist;
    weapon_size?: WeaponSizeChecklist;
    weapon_type?: WeaponTypeChecklist;
  };
}

export interface LancerActiveEffectConstructorData extends ActiveEffectDataConstructorData {
  flags: Record<string, unknown> & LancerActiveEffectFlags;
}

export class LancerActiveEffect extends ActiveEffect {
  /* --------------------------------------------- */

  /** @inheritdoc */
  apply(actor: LancerActor, change: EffectChangeData) {
    if (!this.shouldApply(actor)) return null;

    // if ( change.key.startsWith("flags.dnd5e.") ) change = this._prepareFlagChange(actor, change);

    return super.apply(actor, change);
  }

  /* --------------------------------------------- */

  get #typedFlags(): LancerActiveEffectFlags {
    return this.data.flags as any;
  }

  /**
   * Determine whether this Active Effect is suppressed or not.
   *
   * If a weapon is supplied, then the effect will ONLY apply if this is a restricted effect
   * tied to that weapon
   *
   * TODO: Narrow type on weapon to actual LancerMechWeapon
   */
  shouldApply(actor: LancerActor, weapon?: LancerItem) {
    let tf = this.#typedFlags;

    // Check preliminary both ways
    if (actor._preliminary && !tf.preliminary) return false;
    if (!actor._preliminary && tf.preliminary) return false;

    // Check it's not just passing through
    if (this.isPassthrough(actor)) return false;

    // Never apply if a weapon type restriction exists and its not a weapon, or if
    // is a weapon and no type restriction exists
    if (this.isRestricted()) {
      // Restricted? Unless the weapon checks out, ignore
      if (!weapon) return false;
      if (!this.restrictionsApply(weapon)) return false;
    } else if (weapon) {
      // Weapon but not restricted? Already been applied normally, ignore
      return false;
    }

    return true;
  }

  /**
   * Determine whether this Active Effect is present only to be passed to descendants
   */
  isPassthrough(actor: LancerActor): boolean {
    // Check right actor type
    let tf = this.#typedFlags;
    if (tf.target_type === "pilot" && !actor.is_pilot()) return false;
    if (tf.target_type === "deployable" && !actor.is_deployable()) return false;
    if (tf.target_type === "chassis" && !(actor.is_mech() || actor.is_npc())) return false;
    return true;
  }

  /**
   * Determine whether this Active Effect is a restricted weapon type
   */
  isRestricted(): boolean {
    let r = this.#typedFlags.restrictions;
    if (r && (r.damage || r.range || r.weapon_size || r.weapon_type)) return true;
    return false;
  }

  /**
   * Determine whether this Active Effect applies to the given weapon
   */
  restrictionsApply(weapon: LancerItem): boolean {
    if (!weapon.is_mech_weapon()) return false;
    let sel_prof = weapon.system.active_profile;
    let r = this.#typedFlags.restrictions;
    if (!r) return false;

    // Now start checking
    if (r.weapon_size && !r.weapon_size[weapon.system.size]) return false;
    if (r.weapon_type && !r.weapon_type[sel_prof.type]) return false;
    if (r.damage && !sel_prof.damage.some(d => r!.damage![d.type])) return false;
    if (r.range && !sel_prof.range.some(d => r!.range![d.type])) return false;

    // Passed the test
    return true;
  }

  /* --------------------------------------------- */

  /**
   * Manage Active Effect instances through the Actor Sheet via effect control buttons
   */
  static async onManageActiveEffect(event: MouseEvent, owner: LancerActor | LancerItem) {
    event.preventDefault();
    /*
    const a = event.currentTarget;
    const li = a.closest("li");
    const effect = li.dataset.effectId ? owner.effects.get(li.dataset.effectId) : null;
    switch (a.dataset.action) {
      case "create":
        return owner.createEmbeddedDocuments("ActiveEffect", [
          {
            label: game.i18n.localize("DND5E.EffectNew"),
            icon: "icons/svg/aura.svg",
            origin: owner.uuid,
            "duration.rounds": li.dataset.effectType === "temporary" ? 1 : undefined,
            
          },
        ]);
      case "edit":
        return effect.sheet.render(true);
      case "delete":
        return effect.delete();
      case "toggle":
        return effect.update({ disabled: !effect.data.disabled });
    }
    */
  }

  /* --------------------------------------------- */

  /**
   * Prepare the data structure for Active Effects which are currently applied to an Actor or Item.
   */
  static prepareActiveEffectCategories(actor: LancerActor, effects: LancerActiveEffect[]) {
    // Define effect header categories
    const categories = {
      passive: {
        type: "passive",
        // label: game.i18n.localize("DND5E.EffectTemporary"),
        label: "Enabled",
        effects: [] as LancerActiveEffect[],
      },
      inherited: {
        type: "inherited",
        label: "Inherited",
        effects: [] as LancerActiveEffect[],
      },
      disabled: {
        type: "disabled",
        label: "Disabled",
        effects: [] as LancerActiveEffect[],
      },
      passthrough: {
        type: "passthrough",
        label: game.i18n.localize("DND5E.EffectUnavailable"),
        effects: [] as LancerActiveEffect[],
        info: [game.i18n.localize("DND5E.EffectUnavailableInfo")],
      },
    };

    // Iterate over active effects, classifying them into categories
    for (let e of effects) {
      // e._getSourceName(); // Trigger a lookup for the source name
      if (e.isPassthrough(actor)) categories.passthrough.effects.push(e);
      else if (e.data.disabled) categories.disabled.effects.push(e);
      else if (e.#typedFlags.cascade_origin) categories.inherited.effects.push(e);
      else categories.passive.effects.push(e);
    }

    // categories.suppressed.hidden = !categories.suppressed.effects.length;
    return categories;
  }
}

// To support our effect passdown
export const AE_MODE_SET_JSON = 11;
export const AE_MODE_APPEND_JSON = 12;
Hooks.on(
  "applyActiveEffect",
  function (actor: LancerActor, change: EffectChangeData, current: any, _delta: any, _changes: any) {
    if (change.mode == AE_MODE_SET_JSON || change.mode == AE_MODE_APPEND_JSON) {
      try {
        let parsed_delta = JSON.parse(change.value);
        // Ok, now set it to wherever it was labeled
        if (change.mode == AE_MODE_SET_JSON) {
          foundry.utils.setProperty(actor.data, change.key, parsed_delta);
        } else if (change.mode == AE_MODE_APPEND_JSON) {
          foundry.utils.getProperty(actor.data, change.key).push(parsed_delta);
        }
      } catch (e) {
        // Nothing to do really, except log it
        console.warn(`Data transfer active effect corrupted, ${change.value}`);
      }
    }
  }
);
