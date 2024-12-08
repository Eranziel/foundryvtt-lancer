import { LANCER } from "../config";
import { LancerActor, LancerMECH } from "../actor/lancer-actor";
import { EntryType } from "../enums";
import { ChangeWatchHelper } from "../util/misc";
import { LancerActiveEffect } from "./lancer-active-effect";
const lp = LANCER.log_prefix;

export interface InheritedEffectsState {
  from_uuid: string; // Who's giving it? We only inherit one at a time
  data: object[]; // The effect constructor data
  visible: boolean; // Whether creation/deletion/update of this effect should cause a render
}

/**
 * A helper class purposed with managing inherited ("ephemeral") active effects on a particular actor.
 * These effects never live on the DB, and are instead instantiated ad-hoc from the system.inherited_effects + item inherited effects
 *
 * Foundry doesn't have a way for actors to transfer effects impermanently to each other (and honestly, it really shouldn't!),
 * so we do it ourselves here. It's a little odd, but all in the name of minimizing DB operations.
 */
export class EffectHelper {
  /** Most actors can "passdown" effects to their descendants (deployed drones, etc).
   * Doing this passdown can be expensive - it's a lot of updates possibly!
   * This ChangeWatchHelper makes it so we only push down our ephemerals if we really need to
   */
  _passdownEffectTracker = new ChangeWatchHelper();

  // Track our parent actor
  constructor(private readonly actor: LancerActor) {}

  // Set the expected effects from a given uuid
  // Kick off an update if update == true
  // If render, then the update will require redraw.
  async setEphemeralEffects(source_uuid: string, data: [], visible: boolean = true) {
    let es: InheritedEffectsState = {
      from_uuid: source_uuid,
      data,
      visible,
    };
    return this.actor.update(
      {
        "system.inherited_effects": es,
      },
      {
        render: visible,
      }
    );
  }

  // Clear the expected effects for a given uuid
  // Kick off an update if update == true
  async clearEphemeralEffects() {
    let curr = this.actor.system.inherited_effects as InheritedEffectsState | null;
    if (curr) {
      await this.actor.update(
        {
          "system.-=inherited_effects": null,
        },
        {
          render: curr.visible,
        }
      );
    }
  }

  // Generate activeffects based on our system.ephemeral_effect state
  inheritedEffects(): LancerActiveEffect[] {
    let results: LancerActiveEffect[] = [];
    let inherited_effects = (this.actor as LancerMECH).system.inherited_effects;
    if (inherited_effects) {
      for (let effect of inherited_effects.data) {
        results.push(new LancerActiveEffect(effect, { parent: this.actor }));
      }
    }
    return results;
  }

  /**
   * Collect from our current effects (and pilot/mech innate effects) any that should be passed down to descendants.
   * as well as from any innate features (pilot grit, mech save target, etc)
   */
  collectPassdownEffects() {
    if (this.actor.is_deployable()) return [];

    // Start with all of them
    let effects = [...this.actor.allApplicableEffects()].map(e => e.toObject());

    // Remove all that we "consume" at this level. AKA only pass down unhandled effects
    effects = effects.filter(e => {
      switch (e.flags[game.system.id]?.target_type) {
        case EntryType.PILOT:
          return false; // Something targeting pilot will never get passed down, since who could possibly receive it?
        case EntryType.MECH:
          return this.actor.is_pilot(); // Only pilots can pass down to mechs
        case EntryType.NPC:
          return false; // Nothing can pass down to an npc
        case EntryType.DEPLOYABLE:
        case "only_deployable":
        case "only_drone":
          return true; // Can always pass down to a deployable, seeing as they don't get to execute this function
        case "mech_and_npc":
          return this.actor.is_pilot(); // Again, only makes sense to pass down if we are a pilot
        default:
          return false; // don't pass down by default
      }
    });

    return effects;
  }

  /**
   * Sends appropriate active effects to "children".
   * Utilizes delta tracker + debounce to minimize how often we actually send it. As such, feel free to call it as often as you want
   * @param force If we should do it even if not dirty. Useful for when new deployables dropped etc
   * Debounced
   */
  propagateEffects = foundry.utils.debounce((force: boolean) => this.propagateEffectsInner(force), 500);
  async propagateEffectsInner(force: boolean) {
    // Only do if force or dirty
    if (!(force || this._passdownEffectTracker.isDirty)) {
      return;
    }

    // Define our actual logic for passing down effects
    const propagateTo = async (target: LancerActor) => {
      console.debug(`Actor ${this.actor.name} propagating effects to ${target.name}`);
      // Add new from this pilot
      let changes = foundry.utils.duplicate(this._passdownEffectTracker.curr_value);
      // @ts-expect-error
      changes.forEach(c => {
        c.flags[game.system.id] ??= {};
        c.flags[game.system.id].deep_origin = c.origin;
        c.origin = this.actor.uuid;
      });
      await target.effectHelper.setEphemeralEffects(this.actor.uuid, changes);
    };

    // Pilots try to propagate to their mech
    if (this.actor.is_pilot()) {
      // Only propagate if we have a satisfied two-way binding
      if (
        this.actor.system.active_mech?.status == "resolved" &&
        this.actor.system.active_mech.value.system.pilot?.id == this.actor.uuid
      ) {
        await propagateTo(this.actor.system.active_mech.value);
      }
    }

    // Propagate effects from owner upon creation. Pilots don't do this - their mechs will, instead
    else if (this.actor.is_mech()) {
      let pilot = this.actor.system.pilot?.value ?? null;
      // Find our controlled deployables
      let ownedDeployables = game.actors!.filter(
        a =>
          a.is_deployable() &&
          a.system.owner !== null &&
          (a.system.owner.value == this.actor || a.system.owner.value == pilot)
      );
      for (let dep of ownedDeployables) {
        await propagateTo(dep); // TODO - look for active tokens instead?
      }
    } else if (this.actor.is_npc()) {
      // Find our controlled deployables. Simpler here
      let ownedDeployables = game.actors!.filter(a => a.is_deployable() && a.system.owner?.value == this.actor);
      for (let dep of ownedDeployables) {
        await propagateTo(dep); // TODO - look for active tokens instead?
      }
    }
  }

  // ########### Miscellaneous effect helper stuff that also lives here just to be in the same "namespace" so to speak #########

  /**
   * Wipes all Statuses and (non ephemeral) ActiveEffects from the Actor.
   *
   * This isn't really in the effectors purview per-say, but it tidies things up a bit
   */
  async removeAllStatuses() {
    let effects_to_delete = this.actor.effects.filter(e => e.sourceName === "None");
    await this.actor._safeDeleteDescendant("ActiveEffect", effects_to_delete);
    let items_to_delete = this.actor.items.filter(i => i.is_status());
    await this.actor._safeDeleteDescendant("Item", items_to_delete);
  }
  /**
   * Locates an ActiveEffect on the Actor by name and removes it if present.
   * @param effect String name of the ActiveEffect to remove.
   */
  async removeActiveEffect(effect: string) {
    const target_effect = this.findEffect(effect);
    target_effect?.delete();
  }

  /**
   * Locates ActiveEffects on the Actor by names provided and removes them if present.
   * @param effects Array of String names of the ActiveEffects to remove.
   */
  async removeActiveEffects(effects: string[]) {
    const target_effects = effects.map(e => this.findEffect(e));
    if (!target_effects || !target_effects.some(e => !!e)) return;
    this.actor.deleteEmbeddedDocuments(
      "ActiveEffect",
      target_effects.map(e => e?.id || "")
    );
  }

  findEffect(effect: string): LancerActiveEffect | null {
    // @ts-expect-error Should be fixed with v11 types
    return this.actor.effects.find(eff => eff.statuses.some((name: string) => name.includes(effect)));
  }
}
