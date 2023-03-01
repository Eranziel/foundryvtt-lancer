import { StabOptions1, StabOptions2 } from "../enums";
import { encodeMacroData, renderMacroTemplate } from "../macros";
import type { SystemData } from "../system-template";
import { LancerActor } from "./lancer-actor";

/**
 * Helper methods for structure, stress, overheating, etc.
 */
export class StrussHelper {
  constructor(private readonly actor: LancerActor) {}
  /**
   * Performs overheat
   * If automation is enabled, this is called automatically by prepareOverheatMacro
   */
  async overheat(reroll_data?: { stress: number }): Promise<void> {
    // Assert that we're on a mech or NPC
    if (!this.actor.is_mech() && !this.actor.is_npc()) {
      ui.notifications!.warn("Can only overheat NPCs and Mechs");
      return;
    }
    if (!reroll_data) {
      if (this.actor.system.heat.value > this.actor.system.heat.max && this.actor.system.stress.value > 0) {
        // https://discord.com/channels/426286410496999425/760966283545673730/789297842228297748
        await this.actor.update({
          "system.stress": this.actor.system.stress.value - 1,
          "system.heat": this.actor.system.heat.value - this.actor.system.heat.max,
        });
      } else if (this.actor.system.heat.value <= this.actor.system.heat.max) {
        return;
      }
    }

    await this.rollOverHeatTable(reroll_data);
  }

  async rollOverHeatTable(reroll_data?: { stress: number }): Promise<void> {
    if (!this.actor.is_mech() && !this.actor.is_npc()) return;
    // Table of descriptions
    function stressTableD(roll: number, remStress: number, maxStress: number) {
      switch (roll) {
        // Used for multiple ones
        case 0:
          if (maxStress > 1)
            return "The reactor goes critical – your mech suffers a reactor meltdown at the end of your next turn.";
          else if (maxStress <= 1) return "Your mech becomes @Compendium[world.status.EXPOSED].";
        case 1:
          switch (remStress) {
            case 2:
              // Choosing not to auto-roll the checks to keep the suspense up
              return "Roll an ENGINEERING check. On a success, your mech is @Compendium[world.status.EXPOSED]; on a failure, it suffers a reactor meltdown after 1d6 of your turns (rolled by the GM). A reactor meltdown can be prevented by retrying the ENGINEERING check as a full action.";
            case 1:
              return "Your mech suffers a reactor meltdown at the end of your next turn.";
            default:
              return "Your mech becomes @Compendium[world.status.EXPOSED].";
          }
        case 2:
        case 3:
        case 4:
          return "The power plant becomes unstable, beginning to eject jets of plasma. Your mech becomes @Compendium[world.status.EXPOSED], taking double kinetic, explosive and energy damage until the status is cleared.";
        case 5:
        case 6:
          return "Your mech’s cooling systems manage to contain the increasing heat; however, your mech becomes @Compendium[world.status.IMPAIRED] until the end of your next turn.";
      }
    }

    // Table of titles
    let stressTableT = [
      "Irreversible Meltdown",
      "Meltdown",
      "Destabilized Power Plant",
      "Destabilized Power Plant",
      "Destabilized Power Plant",
      "Emergency Shunt",
      "Emergency Shunt",
    ];

    if ((reroll_data?.stress ?? this.actor.system.stress.value) >= this.actor.system.stress.max) {
      ui.notifications!.info("The mech is at full Stress, no overheating check to roll.");
      return;
    }
    let remStress = reroll_data?.stress ?? this.actor.system.stress.value;
    let templateData = {};

    // If we're already at 0 just kill em
    if (remStress > 0) {
      let damage = this.actor.system.stress.max - remStress;
      let roll = await new Roll(`${damage}d6kl1`).evaluate({ async: true });
      let result = roll.total;
      if (result === undefined) return;

      let tt = await roll.getTooltip();
      let title = stressTableT[result];
      let text = stressTableD(result, remStress, this.actor.system.stress.max);
      let total = result.toString();

      let secondaryRoll = "";

      // Critical
      let one_count = (roll.terms as Die[])[0].results.filter(v => v.result === 1).length;
      if (one_count > 1) {
        text = stressTableD(result, 1, this.actor.system.stress.max);
        title = stressTableT[0];
        total = "Multiple Ones";
      } else {
        if (result === 1 && remStress === 2) {
          let macroData = encodeMacroData({
            title: "Engineering",
            fn: "prepareStatMacro",
            args: [this.actor.uuid, "system.eng"],
          });

          secondaryRoll = `<button class="chat-button chat-macro-button" data-macro="${macroData}"><i class="fas fa-dice-d20"></i> Engineering</button>`;
        }
      }
      templateData = {
        val: remStress,
        max: this.actor.system.stress.max,
        tt: tt,
        title: title,
        total: total,
        text: text,
        roll: roll,
        secondaryRoll: secondaryRoll,
        rerollMacroData: encodeMacroData({
          title: "Overheating",
          fn: "prepareOverheatMacro",
          args: [this.actor.uuid!, { stress: remStress }],
        }),
      };
    } else {
      // You ded
      let title = stressTableT[0];
      let text = stressTableD(0, 0, this.actor.system.stress.max);
      templateData = {
        val: this.actor.system.stress.value,
        max: this.actor.system.stress.max,
        title: title,
        text: text,
      };
    }
    const template = `systems/${game.system.id}/templates/chat/overheat-card.hbs`;
    return renderMacroTemplate(this.actor, template, templateData);
  }

  /**
   * Performs structure on the mech
   * If automation is enabled, this is called automatically by prepareStructureMacro
   */
  async structure(reroll_data?: { structure: number }) {
    // Assert that we're on a mech or NPC
    if (!this.actor.is_mech() && !this.actor.is_npc()) {
      ui.notifications!.warn("Can only structure NPCs and Mechs");
      return;
    }

    if (!reroll_data) {
      let hp = this.actor.system.hp;
      let structure = this.actor.system.structure;
      if (hp.value < 1 && structure.value > 0) {
        await this.actor.update({
          "system.structure": structure.value - 1,
          "system.hp": hp.value + hp.max,
        });
      } else {
        return;
      }
    }

    await this.rollStructureTable(reroll_data);
  }

  async rollStructureTable(reroll_data?: { structure: number }): Promise<void> {
    if (!this.actor.is_mech() && !this.actor.is_npc()) {
      ui.notifications!.warn("Only npcs and mechs can roll structure.");
      return;
    }

    // Table of descriptions
    function structTableD(roll: number, remStruct: number) {
      switch (roll) {
        // Used for multiple ones
        case 0:
          return "Your mech is damaged beyond repair – it is destroyed. You may still exit it as normal.";
        case 1:
          switch (remStruct) {
            case 2:
              return "Roll a HULL check. On a success, your mech is @Compendium[world.status.STUNNED] until the end of your next turn. On a failure, your mech is destroyed.";
            case 1:
              return "Your mech is destroyed.";
            default:
              return "Your mech is @Compendium[world.status.STUNNED] until the end of your next turn.";
          }
        case 2:
        case 3:
        case 4:
          return "Parts of your mech are torn off by the damage. Roll 1d6. On a 1–3, all weapons on one mount of your choice are destroyed; on a 4–6, a system of your choice is destroyed. LIMITED systems and weapons that are out of charges are not valid choices. If there are no valid choices remaining, it becomes the other result. If there are no valid systems or weapons remaining, this result becomes a DIRECT HIT instead.";
        case 5:
        case 6:
          return "Emergency systems kick in and stabilize your mech, but it’s @Compendium[world.status.IMPAIRED] until the end of your next turn.";
      }
    }

    // Table of titles
    let structTableT = [
      "Crushing Hit",
      "Direct Hit",
      "System Trauma",
      "System Trauma",
      "System Trauma",
      "Glancing Blow",
      "Glancing Blow",
    ];

    if ((reroll_data?.structure ?? this.actor.system.structure.value) >= this.actor.system.structure.max) {
      ui.notifications!.info("The mech is at full Structure, no structure check to roll.");
      return;
    }

    let remStruct = reroll_data?.structure ?? this.actor.system.structure.value;
    let templateData = {};

    // If we're already at 0 just kill em
    if (remStruct > 0) {
      let damage = this.actor.system.structure.max - remStruct;

      let roll: Roll = await new Roll(`${damage}d6kl1`).evaluate({ async: true });
      let result = roll.total;
      if (result === undefined) return;

      let tt = await roll.getTooltip();
      let title = structTableT[result];
      let text = structTableD(result, remStruct);
      let total = result.toString();

      let secondaryRoll = "";

      // Crushing hits
      let one_count = (roll.terms as Die[])[0].results.filter(v => v.result === 1).length;
      if (one_count > 1) {
        text = structTableD(result, 1);
        title = structTableT[0];
        total = "Multiple Ones";
      } else {
        if (result === 1 && remStruct === 2) {
          let macroData = encodeMacroData({
            title: "Hull",
            fn: "prepareStatMacro",
            args: [this.actor.uuid, "system.hull"],
          });

          secondaryRoll = `<button class="chat-button chat-macro-button" data-macro="${macroData}"><i class="fas fa-dice-d20"></i> Hull</button>`;
        } else if (result >= 2 && result <= 4) {
          let macroData = encodeMacroData({
            // TODO: Should create a "prepareRollMacro" or something to handle generic roll-based macros
            // Since we can't change prepareTextMacro too much or break everyone's macros
            title: "Roll for Destruction",
            fn: "prepareStructureSecondaryRollMacro",
            args: [this.actor.uuid],
          });

          secondaryRoll = `<button class="chat-macro-button"><a class="chat-button" data-macro="${macroData}"><i class="fas fa-dice-d20"></i> Destroy</a></button>`;
        }
      }
      templateData = {
        val: this.actor.system.structure.value,
        max: this.actor.system.structure.max,
        tt: tt,
        title: title,
        total: total,
        text: text,
        roll: roll,
        secondaryRoll: secondaryRoll,
        rerollMacroData: encodeMacroData({
          title: "Structure Damage",
          fn: "prepareStructureMacro",
          args: [this.actor.uuid!, { structure: remStruct }],
        }),
      };
    } else {
      // You ded
      let title = structTableT[0];
      let text = structTableD(0, 0);
      templateData = {
        val: this.actor.system.structure.value,
        max: this.actor.system.structure.max,
        title: title,
        text: text,
      };
    }
    const template = `systems/${game.system.id}/templates/chat/structure-card.hbs`;
    return renderMacroTemplate(this.actor, template, templateData);
  }

  /**
   * Stabilize this actor, given two choices that have already been made
   * @param o1  Choice 1, Cooling or Repairing
   * @param o2  Choice 2, Reloading, removing Burn, or clearing own or adjacent ally condition
   * @returns   Details to be printed to chat
   */
  async stabilize(o1: StabOptions1, o2: StabOptions2): Promise<string> {
    let return_text = "";

    if (!this.actor.is_mech() && !this.actor.is_npc()) {
      ui.notifications!.warn("This can't be stabilized!");
      return "";
    }

    let changes: any = {};
    let item_changes: any = []; // TODO

    if (o1 === StabOptions1.Cool) {
      return_text = return_text.concat("Mech is cooling itself. @Compendium[world.status.EXPOSED] cleared.<br>");
      await this.actor.update({ "system.heat": 0 });
      this.actor.effectHelper.removeActiveEffect("exposed");
    } else if (o1 === StabOptions1.Repair) {
      if (this.actor.is_mech()) {
        if (this.actor.system.repairs.value <= 0) {
          return "Mech has decided to repair, but doesn't have any repair left. Please try again.<br>";
        } else {
          changes["system.repairs"] = this.actor.system.repairs.value - 1;
        }
      }
    } else {
      return ``;
    }
    return_text = return_text.concat("<br>");
    switch (o2) {
      case StabOptions2.ClearBurn:
        return_text = return_text.concat("Mech has selected full burn clear.");
        changes["system.burn"] = 0;
        break;
      case StabOptions2.ClearOtherCond:
        return_text = return_text.concat("Mech has selected to clear an allied condition. Please clear manually.");
        break;
      case StabOptions2.ClearOwnCond:
        return_text = return_text.concat("Mech has selected to clear own condition. Please clear manually.");
        break;
      case StabOptions2.Reload:
        return_text = return_text.concat("Mech has selected full reload, reloading...");
        item_changes = this.actor.loadoutHelper.reloadAllItems();
        break;
      default:
        return ``;
    }

    await this.actor.update(changes);
    await this.actor.updateEmbeddedDocuments("Item", item_changes);

    return return_text;
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
