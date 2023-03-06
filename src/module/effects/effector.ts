import { LancerActor } from "../actor/lancer-actor.js";
import { EntryType } from "../enums.js";
import { LancerItem } from "../item/lancer-item.js";
import { LancerActiveEffect } from "./lancer-active-effect.js";
import type { LancerActiveEffectConstructorData } from "./lancer-active-effect.js";

interface EffectsState {
  data: LancerActiveEffectConstructorData[];
  visible: boolean;
}

/**
 * A helper class purposed with managing active effects on a particular actor
 *
 */
export class EffectHelper {
  /**
   * Maps uuid -> list of associated effects managed by this effector
   */
  #expectedEffects: Map<string, EffectsState> = new Map();

  // Our current effect management task
  #currTask: Promise<any> | null = null;

  // If flagged as true, then an edit was made to managedEffects while currTask was running.
  // This signals to currTask that it needs to re-run
  #dirty = false;

  // If true, the helper is currently deleting an effect
  _deletingEffect = false;

  constructor(private readonly actor: LancerActor) {}

  // Set the expected effects for a given uuid
  // Kick off an update if update == true
  // If render, then the update will require redraw. Multiple accumulated renders
  setEphemeralEffects(
    uuid: string,
    data: LancerActiveEffectConstructorData[],
    update: boolean,
    visible: boolean = true
  ): void {
    this.#expectedEffects.set(uuid, { data, visible });
    if (update) {
      this.#trySynchronize();
    }
  }

  // Update our effects for the given item
  // Kick off an update if update == true
  setEphemeralEffectsFromItem(item: LancerItem, update: boolean, visible: boolean = true) {
    let uuid = item.uuid;
    let data = item._generatedEffectTracker.curr_value;
    this.setEphemeralEffects(uuid, data, update, visible);
  }

  // Clear the expected effects for a given uuid
  // Kick off an update if update == true
  clearEphemeralEffects(uuid: string, update: boolean, visible: boolean = true): void {
    this.#expectedEffects.set(uuid, {
      data: [],
      visible,
    }); // Don't actually delete it yet! That will occur in synchronize
    if (update) {
      this.#trySynchronize();
    }
  }

  // Attempts to set all of our effects to rights
  #trySynchronize(): void {
    if (this.#currTask) {
      this.#dirty = true;
    } else {
      this.#synchronize();
    }
  }

  // Make sure that all of our managedEffects match what they ought to be. Debounced by 100ms
  #synchronize() {
    this.#currTask = new Promise<void>(async (succ, rej) => {
      let done = false;
      while (!done) {
        // Sleep 100 ms
        await new Promise(s => setTimeout(s, 100));
        this.#dirty = false; // We're going

        // Build a mapping of current effects -> uuid
        let currOriginMap = new Map<string, LancerActiveEffect[]>();
        for (let eff of this.actor.effects.contents) {
          // @ts-expect-error
          let origin = eff.origin;
          let tmp = [] as LancerActiveEffect[];
          let arr = currOriginMap.get(origin) ?? (currOriginMap.set(origin, tmp), tmp);
          arr.push(eff as LancerActiveEffect);
        }

        // Reconcile everything we manage
        let toClear = [];
        for (let [uuid, evs] of this.#expectedEffects.entries()) {
          let currEffects = currOriginMap.get(uuid) ?? [];
          // Only touch ephemerals
          currEffects = currEffects.filter(e => e._typedFlags.lancer?.ephemeral === true);

          // If desired zero effects, then remove from expected effects. MUST occur before we await anything to avoid a race condition
          if (evs.data.length == 0) toClear.push(uuid);

          // Perform reconcile
          await this.#reconcileEffects(currEffects, evs);
        }

        // Reset dirty if necessary, otherwise exit loop
        if (this.#dirty) {
          this.#dirty = false;
        } else {
          done = true;
          this.#currTask = null;
        }
      }
      succ();
    });
  }

  async #reconcileEffects(currEffects: LancerActiveEffect[], desiredEffects: EffectsState) {
    // First, if presently have too many effects, prune it back
    if (currEffects.length > desiredEffects.data.length) {
      let toDelete = currEffects.slice(desiredEffects.data.length);
      this._deletingEffect = true;
      await this.actor._safeDeleteEmbedded("ActiveEffect", toDelete, { render: desiredEffects.visible });
      this._deletingEffect = false;
    }

    // Then, update existing effects in-place to match new desired data
    let inPlaceUpdates = foundry.utils.duplicate(desiredEffects.data.slice(0, currEffects.length));
    if (inPlaceUpdates.length) {
      inPlaceUpdates.forEach((ipu, index) => (ipu._id = currEffects[index].id)); // Tell them "I should update this existing effect"
      await this.actor.updateEmbeddedDocuments("ActiveEffect", inPlaceUpdates, { render: desiredEffects.visible });
    }

    // Finally, if our desired exceed what we could handle by editing existing, add any new effects as necessary
    if (currEffects.length < desiredEffects.data.length) {
      let toAdd = desiredEffects.data.slice(currEffects.length);
      // @ts-expect-error
      await this.actor.createEmbeddedDocuments("ActiveEffect", toAdd, { render: desiredEffects.visible });
    }
  }

  /**
   * Collect from our current effects (and pilot/mech innate effects) any that should be passed down to descendants.
   * as well as from any innate features (pilot grit, mech save target, etc)
   */
  collectPassdownEffects(): LancerActiveEffectConstructorData[] {
    if (this.actor.is_deployable()) return [];

    // Start with all of them
    let effects = this.actor.effects.map(e => e.toObject()) as unknown as LancerActiveEffectConstructorData[];

    // Remove all that we "consume" at this level. AKA only pass down unhandled effects
    effects = effects.filter(e => {
      switch (e.flags.lancer?.target_type) {
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
   * Utilizes passdown effect tracker to minimize how often we actually send it. As such, feel free to call it as often as you want
   * @param update Whether this operation can/should cause updates
   * @param force If update is also true, whether we should force effect re-creation
   * TODO: Minimally update???
   * Debounced
   */
  propagateEffects = foundry.utils.debounce(
    (cause_updates: boolean, force: boolean = false) => this.propagateEffectsInner(cause_updates, force),
    500
  );
  propagateEffectsInner(update: boolean, force: boolean = false) {
    if (!force && !this.actor._passdownEffectTracker.isDirty) {
      return;
    }
    const propagateTo = (target: LancerActor) => {
      console.debug(`Actor ${this.actor.name} propagating effects to ${target.name}`);
      // Add new from this pilot
      let changes: LancerActiveEffectConstructorData[] = foundry.utils.duplicate(
        this.actor._passdownEffectTracker.curr_value
      );
      changes.forEach(c => {
        c.flags.lancer ??= {};
        c.flags.lancer.deep_origin = c.origin;
        c.origin = this.actor.uuid;
      });
      target.effectHelper.setEphemeralEffects(this.actor.uuid, changes, update);
    };

    // Call this whenever update this actors stats in any meaningful way
    if (this.actor.is_pilot()) {
      // Only propagate if we have a satisfied two-way binding
      if (
        this.actor.system.active_mech?.status == "resolved" &&
        this.actor.system.active_mech.value.system.pilot?.id == this.actor.uuid
      ) {
        propagateTo(this.actor.system.active_mech.value);
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
        propagateTo(dep);
      }
    } else if (this.actor.is_npc()) {
      // Find our controlled deployables. Simpler here
      let ownedDeployables = game.actors!.filter(a => a.is_deployable() && a.system.owner?.value == this.actor);
      for (let dep of ownedDeployables) {
        propagateTo(dep);
      }
    }
  }

  // ########### Miscellaneous effect helper stuff that also lives here just to be in the same "namespace" so to speak #########

  /**
   * Wipes all Statuses and (unsourced) ActiveEffects from the Actor.
   *
   * This isn't really in the effectors purview per-say, but it tidies things up a bit
   */
  async removeAllStatuses() {
    let effects_to_delete = this.actor.effects.filter(e => e.sourceName === "None");
    await this.actor._safeDeleteEmbedded("ActiveEffect", effects_to_delete);
    let items_to_delete = this.actor.items.filter(i => i.is_status());
    await this.actor._safeDeleteEmbedded("Item", items_to_delete);
  }
  /**
   * Locates an ActiveEffect on the Actor by name and removes it if present.
   * @param effect String name of the ActiveEffect to remove.
   */
  async removeActiveEffect(effect: string) {
    const target_effect = this.findEffect(effect);
    target_effect?.delete();
  }

  findEffect(effect: string): LancerActiveEffect | null {
    // @ts-expect-error Should be fixed with v10 types
    return this.actor.effects.find(eff => eff.flags.core?.statusId?.endsWith(effect) ?? false) ?? null;
  }
}
