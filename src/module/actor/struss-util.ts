import { StabOptions1, StabOptions2 } from "../enums";
import { LancerActor } from "./lancer-actor";

/**
 * Helper methods for structure, stress, overheating, etc.
 */
export class StrussHelper {
  constructor(private readonly actor: LancerActor) {}

  /**
   * Stabilize this actor, given two choices that have already been made
   * @param o1  Choice 1, Cooling or Repairing
   * @param o2  Choice 2, Reloading, removing Burn, or clearing own or adjacent ally condition
   * @returns   Details to be printed to chat
   */
  async stabilize(o1: StabOptions1, o2: StabOptions2): Promise<void> {
    if (!this.actor.is_mech() && !this.actor.is_npc()) {
      ui.notifications!.warn(`A ${this.actor.type} can't be stabilized!`);
      return;
    }

    let changes: any = {};
    let item_changes: any = []; // TODO

    if (o1 === StabOptions1.Cool) {
      changes["system.heat.value"] = 0;
      this.actor.effectHelper.removeActiveEffect("exposed");
    } else if (o1 === StabOptions1.Repair) {
      // Allow NPCs here for the Self Repair feature from Veteran
      if (this.actor.is_mech() || this.actor.is_npc()) {
        if (this.actor.is_mech() && this.actor.system.repairs.value <= 0) {
          ui.notifications!.warn("No repairs remaining!");
          return;
        } else {
          changes["system.hp.value"] = this.actor.system.hp.max;
          if (this.actor.is_mech()) {
            changes["system.repairs.value"] = this.actor.system.repairs.value - 1;
          }
        }
      }
    } else {
      return;
    }
    switch (o2) {
      case StabOptions2.ClearBurn:
        changes["system.burn"] = 0;
        break;
      case StabOptions2.ClearOtherCond:
        // TODO: make a flow for clearing a condition on yourself?
        break;
      case StabOptions2.ClearOwnCond:
        // TODO: make a flow for clearing a condition on your target?
        break;
      case StabOptions2.Reload:
        item_changes = this.actor.loadoutHelper.reloadableItems();
        break;
      default:
        ui.notifications!.warn("Invalid Stabilize choice!");
        return;
    }

    await this.actor.update(changes);
    await this.actor.updateEmbeddedDocuments("Item", item_changes);
    return;
  }

  /**
   * Returns the current overcharge roll/text. Only applicable for mechs.
   */
  getOverchargeRoll(): string | null {
    // Function is only applicable to mechs.
    if (this.actor.is_npc()) {
      return "1d6"; // Some veterans can
    } else if (this.actor.is_mech()) {
      const oc_rolls = this.actor.system.overcharge_sequence;
      return oc_rolls[this.actor.system.overcharge];
    } else {
      return null;
    }
  }
}
