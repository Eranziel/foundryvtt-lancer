import { LANCER, replace_default_resource, TypeIcon } from "../config";
import { LancerHooks, LancerSubscription } from "../helpers/hooks";
// import { LancerFRAME, LancerItem, LancerItemType, LancerNPC_CLASS } from "../item/lancer-item";
import { renderMacroTemplate, encodeMacroData, prepareOverheatMacro, prepareStructureMacro } from "../macros";
import { DamageType, EntryType, StabOptions1, StabOptions2 } from "../enums";
import { fix_modify_token_attribute } from "../token";
import { findEffect } from "../helpers/acc_diff";
import { AppliedDamage } from "./damage-calc";
import { SystemData, SystemDataType, SystemTemplates } from "../system-template";
import { SourceDataType } from "../source-template";
import * as defaults from "../util/unpacking/defaults";
import { PackedPilotData } from "../util/unpacking/packed-types";
import { getAutomationOptions } from "../settings";
import { pilot_downstream_effects } from "../effects/converter";
import {
  LancerFRAME,
  LancerItem,
  LancerMECH_SYSTEM,
  LancerMECH_WEAPON,
  LancerNPC_CLASS,
  LancerNPC_FEATURE,
  LancerNPC_TEMPLATE,
  LancerPILOT_ARMOR,
  LancerPILOT_GEAR,
  LancerPILOT_WEAPON,
  LancerWEAPON_MOD,
} from "../item/lancer-item";
import { LancerActiveEffect } from "../effects/lancer-active-effect";
import { LancerActiveEffectConstructorData } from "../effects/lancer-active-effect";
import { filter_resolved_sync } from "../helpers/commons";
import { ChangeWatchHelper } from "../util/misc";
const lp = LANCER.log_prefix;

const DEFAULT_OVERCHARGE_SEQUENCE = ["+1", "+1d3", "+1d6", "+1d6+4"];

interface LancerActorDataSource<T extends EntryType> {
  type: T;
  data: SourceDataType<T>;
}
interface LancerActorDataProperties<T extends LancerActorType> {
  type: T;
  data: SystemDataType<T>;
}

type LancerActorSource =
  | LancerActorDataSource<EntryType.PILOT>
  | LancerActorDataSource<EntryType.MECH>
  | LancerActorDataSource<EntryType.NPC>
  | LancerActorDataSource<EntryType.DEPLOYABLE>;

type LancerActorProperties =
  | LancerActorDataProperties<EntryType.PILOT>
  | LancerActorDataProperties<EntryType.MECH>
  | LancerActorDataProperties<EntryType.NPC>
  | LancerActorDataProperties<EntryType.DEPLOYABLE>;

declare global {
  interface SourceConfig {
    Actor: LancerActorSource;
  }
  interface DataConfig {
    Actor: LancerActorProperties;
  }
  interface DocumentClassConfig {
    Actor: typeof LancerActor;
  }
}

/**
 * Extend the Actor class for Lancer Actors.
 */
export class LancerActor extends Actor {
  // Kept for comparing previous to next values / doing deltas
  #max_hp_tracker = new ChangeWatchHelper();
  #innate_effect_tracker = new ChangeWatchHelper();
  #passdown_effect_tracker = new ChangeWatchHelper();

  /**
   * Performs overheat
   * If automation is enabled, this is called automatically by prepareOverheatMacro
   */
  async overheat(reroll_data?: { stress: number }): Promise<void> {
    // Assert that we're on a mech or NPC
    if (!this.is_mech() && !this.is_npc()) {
      ui.notifications!.warn("Can only overheat NPCs and Mechs");
      return;
    }
    if (!reroll_data) {
      if (this.system.heat.value > this.system.heat.max && this.system.stress.value > 0) {
        // https://discord.com/channels/426286410496999425/760966283545673730/789297842228297748
        if (this.system.stress.value > 1) this.system.heat.value -= this.system.heat.max;
        this.system.stress.value -= 1;
        await this.update({
          "system.stress": this.system.stress.value - 1,
          "system.heat": this.system.heat.value - this.system.heat.max,
        });
      } else if (this.system.heat.value <= this.system.heat.max) {
        return;
      }
    }

    await this.rollOverHeatTable(reroll_data);
  }

  async rollOverHeatTable(reroll_data?: { stress: number }): Promise<void> {
    if (!this.is_mech() && !this.is_npc()) return;
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

    if ((reroll_data?.stress ?? this.system.stress.value) >= this.system.stress.max) {
      ui.notifications!.info("The mech is at full Stress, no overheating check to roll.");
      return;
    }
    let remStress = reroll_data?.stress ?? this.system.stress.value;
    let templateData = {};

    // If we're already at 0 just kill em
    if (remStress > 0) {
      let damage = this.system.stress.max - remStress;
      let roll = await new Roll(`${damage}d6kl1`).evaluate({ async: true });
      let result = roll.total;
      if (result === undefined) return;

      let tt = await roll.getTooltip();
      let title = stressTableT[result];
      let text = stressTableD(result, remStress, this.system.stress.max);
      let total = result.toString();

      let secondaryRoll = "";

      // Critical
      let one_count = (roll.terms as Die[])[0].results.filter(v => v.result === 1).length;
      if (one_count > 1) {
        text = stressTableD(result, 1, this.system.stress.max);
        title = stressTableT[0];
        total = "Multiple Ones";
      } else {
        if (result === 1 && remStress === 2) {
          let macroData = encodeMacroData({
            title: "Engineering",
            fn: "prepareStatMacro",
            args: [this.id, "system.eng"],
          });

          secondaryRoll = `<button class="chat-button chat-macro-button" data-macro="${macroData}"><i class="fas fa-dice-d20"></i> Engineering</button>`;
        }
      }
      templateData = {
        val: remStress,
        max: this.system.stress.max,
        tt: tt,
        title: title,
        total: total,
        text: text,
        roll: roll,
        secondaryRoll: secondaryRoll,
        rerollMacroData: encodeMacroData({
          title: "Overheating",
          fn: "prepareOverheatMacro",
          args: [this.id!, { stress: remStress }],
        }),
      };
    } else {
      // You ded
      let title = stressTableT[0];
      let text = stressTableD(0, 0, this.system.stress.max);
      templateData = {
        val: this.system.stress.value,
        max: this.system.stress.max,
        title: title,
        text: text,
      };
    }
    const template = `systems/${game.system.id}/templates/chat/overheat-card.hbs`;
    return renderMacroTemplate(this, template, templateData);
  }

  /**
   * Performs structure on the mech
   * If automation is enabled, this is called automatically by prepareStructureMacro
   */
  async structure(reroll_data?: { structure: number }) {
    // Assert that we're on a mech or NPC
    if (!this.is_mech() && !this.is_npc()) {
      ui.notifications!.warn("Can only structure NPCs and Mechs");
      return;
    }

    if (!reroll_data) {
      let hp = this.system.hp;
      let structure = this.system.structure;
      if (hp.value < 1 && structure.value > 0) {
        await this.update({
          "system.structure": structure.value - 1,
          "system.hp": hp.value - hp.max,
        });
      } else {
        return;
      }
    }

    await this.rollStructureTable(reroll_data);
  }

  async rollStructureTable(reroll_data?: { structure: number }): Promise<void> {
    if (!this.is_mech() && !this.is_npc()) {
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

    if ((reroll_data?.structure ?? this.system.structure.value) >= this.system.structure.max) {
      ui.notifications!.info("The mech is at full Structure, no structure check to roll.");
      return;
    }

    let remStruct = reroll_data?.structure ?? this.system.structure.value;
    let templateData = {};

    // If we're already at 0 just kill em
    if (remStruct > 0) {
      let damage = this.system.structure.max - remStruct;

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
            args: [this.id, "system.hull"],
          });

          secondaryRoll = `<button class="chat-button chat-macro-button" data-macro="${macroData}"><i class="fas fa-dice-d20"></i> Hull</button>`;
        } else if (result >= 2 && result <= 4) {
          let macroData = encodeMacroData({
            // TODO: Should create a "prepareRollMacro" or something to handle generic roll-based macros
            // Since we can't change prepareTextMacro too much or break everyone's macros
            title: "Roll for Destruction",
            fn: "prepareStructureSecondaryRollMacro",
            args: [this.id],
          });

          secondaryRoll = `<button class="chat-macro-button"><a class="chat-button" data-macro="${macroData}"><i class="fas fa-dice-d20"></i> Destroy</a></button>`;
        }
      }
      templateData = {
        val: this.system.structure.value,
        max: this.system.structure.max,
        tt: tt,
        title: title,
        total: total,
        text: text,
        roll: roll,
        secondaryRoll: secondaryRoll,
        rerollMacroData: encodeMacroData({
          title: "Structure Damage",
          fn: "prepareStructureMacro",
          args: [this.id!, { structure: remStruct }],
        }),
      };
    } else {
      // You ded
      let title = structTableT[0];
      let text = structTableD(0, 0);
      templateData = {
        val: this.system.structure.value,
        max: this.system.structure.max,
        title: title,
        text: text,
      };
    }
    const template = `systems/${game.system.id}/templates/chat/structure-card.hbs`;
    return renderMacroTemplate(this, template, templateData);
  }

  // Fully repair actor
  // Even pilots can be fully repaired
  async full_repair() {
    await this.remove_all_active_effects();
    //TODO fix to be a real type
    let changes: Record<string, any> = {
      // @ts-expect-error System's broken unless narrowed
      "data.hp": this.system.hp.max,
      "data.burn": 0,
      "data.overshield": 0,
    };

    // Things for heat-havers
    if (this.is_mech() || this.is_npc() || this.is_deployable()) {
      changes["system.heat"] = 0;
    }

    if (this.is_mech() || this.is_npc()) {
      changes["system.structure"] = this.system.structure.max;
      changes["system.stress"] = this.system.stress.max;
    }

    // Things just for mechs
    if (this.is_mech()) {
      changes["system.core_energy"] = 1;
      changes["system.core_active"] = false;
      changes["system.overcharge"] = 1;
      changes["system.repairs"] = this.system.repairs.max;
      changes["system.meltdown_timer"] = null;
    }

    // Things just for pilots - propagate a repair to their mech
    if (this.is_pilot()) {
      ui.notifications!.error("Rep pilot doesnt repair mech todo fix"); // TODO
      // let mech = await ent.ActiveMech();
      // if (mech) {
      // await mech.Flags.orig_doc.full_repair();
      // }
    }

    if (!this.is_deployable()) await this.restore_all_items();
    await this.update(changes);
  }

  // Do the specified junk to an item. Returns an object suitable for updateEmbeddedDocuments
  private refresh(
    item: LancerItem,
    opts: {
      repair?: boolean;
      reload?: boolean;
      refill?: boolean;
    }
  ): any {
    let changes: any = { _id: item.id };
    if (opts.repair && (item as any).destroyed !== undefined) {
      changes["system.destroyed"] = false;
    }
    if (opts.reload && (item as any).loaded !== undefined) {
      changes["system.loaded"] = true;
    }
    if (opts.refill && (item as any).uses !== undefined) {
      changes["system.uses"] = (item as any).uses.max;
    }

    return changes;
  }

  // List the _relevant_ loadout items on this actor
  // For mechs this is everthing in system.loadout, IE: Mech weapons, Mech Systems, Frame
  private list_loadout(): Array<LancerItem> {
    let result = [] as LancerItem[];
    let it = this.itemTypes;
    if (this.is_mech()) {
      if (this.system.loadout.frame?.status == "resolved") result.push(this.system.loadout.frame.value);
      // Do all of the weapons/systems/mods on our loadout
      for (let mount of this.system.loadout.weapon_mounts) {
        for (let slot of mount.slots) {
          // Do weapon
          if (slot.weapon?.status == "resolved") {
            result.push(slot.weapon.value);
          }
          // Do mod
          if (slot.mod?.status == "resolved") {
            result.push(slot.mod.value);
          }
        }
      }

      // Do all systems now
      result.push(...filter_resolved_sync(this.system.loadout.systems));
    } else if (this.is_npc()) {
      if (this.system.class) result.push(this.system.class);
      result.push(...it.npc_class, ...it.npc_template, ...it.npc_feature);
    } else if (this.is_pilot()) {
      // result.push(...ent.OwnedPilotWeapons, ...ent.OwnedPilotArmor, ...ent.OwnedPilotGear); // TODO
    } else {
      ui.notifications!.warn("Cannot reload deployables");
    }
    return result;
  }

  /**
   * Find all limited systems and set them to their max/repaired/ideal state
   */
  async restore_all_items() {
    let fixes = this.list_loadout().map(i =>
      this.refresh(i, {
        reload: true,
        repair: true,
        refill: true,
      })
    );
    return this.updateEmbeddedDocuments("Item", fixes);
  }

  /**
   * Find all owned items and set them to be not destroyed
   */
  async repair_all_items() {
    return Promise.all(
      (await this.list_loadout())
        .map(i =>
          this.refresh(i, {
            repair: true,
          })
        )
        .map(i => i.writeback())
    );
  }

  /**
   * Find all owned weapons and (generate the changes necessary to) reload them
   */
  reload_all_items() {
    return this.list_loadout().map(i => this.refresh(i, { reload: true }));
  }

  /**
   * Locates an ActiveEffect on the Actor by name and removes it if present.
   * @param effect String name of the ActiveEffect to remove.
   */
  async remove_active_effect(effect: string) {
    const target_effect = findEffect(this, effect);
    target_effect?.delete();
  }

  /**
   * Wipes all (unsourced) ActiveEffects from the Actor.
   */
  async remove_all_active_effects() {
    let effects_to_delete = this.effects
      .filter(e => e.sourceName === "None")
      .map(e => {
        return e.id ?? "";
      });
    await this.deleteEmbeddedDocuments("ActiveEffect", effects_to_delete);
  }

  /**
   * Stabilize this actor, given two choices that have already been made
   * @param o1  Choice 1, Cooling or Repairing
   * @param o2  Choice 2, Reloading, removing Burn, or clearing own or adjacent ally condition
   * @returns   Details to be printed to chat
   */
  async stabilize(o1: StabOptions1, o2: StabOptions2): Promise<string> {
    let return_text = "";

    if (!this.is_mech() && !this.is_npc()) {
      ui.notifications!.warn("This can't be stabilized!");
      return "";
    }

    let changes: any = {}; // TODO
    let item_changes: any = null; // TODO

    if (o1 === StabOptions1.Cool) {
      return_text = return_text.concat("Mech is cooling itself. @Compendium[world.status.EXPOSED] cleared.<br>");
      await this.update({ "system.heat": 0 });
      this.remove_active_effect("exposed");
    } else if (o1 === StabOptions1.Repair) {
      if (this.is_mech()) {
        if (this.system.repairs.value <= 0) {
          return "Mech has decided to repair, but doesn't have any repair left. Please try again.<br>";
        } else {
          changes["system.repairs"] = this.system.repairs.value - 1;
        }
      }
    } else {
      return ``;
    }
    return_text = return_text.concat("<br>");
    switch (o2) {
      case StabOptions2.ClearBurn:
        return_text = return_text.concat("Mech has selected full burn clear.");
        changes["data.burn"] = 0;
        break;
      case StabOptions2.ClearOtherCond:
        return_text = return_text.concat("Mech has selected to clear an allied condition. Please clear manually.");
        break;
      case StabOptions2.ClearOwnCond:
        return_text = return_text.concat("Mech has selected to clear own condition. Please clear manually.");
        break;
      case StabOptions2.Reload:
        return_text = return_text.concat("Mech has selected full reload, reloading...");
        item_changes = this.reload_all_items();
        break;
      default:
        return ``;
    }

    await this.update(changes);
    await this.updateEmbeddedDocuments("Item", item_changes);

    return return_text;
  }

  async damage_calc(damage: AppliedDamage, ap = false, paracausal = false): Promise<number> {
    const armored_damage_types = ["Kinetic", "Energy", "Explosive", "Variable"] as const;

    const ap_damage_types = [DamageType.Burn, DamageType.Heat] as const;

    let changes = {} as Record<string, number>;

    // Entities without Heat Caps take Energy Damage instead
    if (this.is_pilot()) {
      damage.Energy += damage.Heat;
      damage.Heat = 0;
    }

    // Step 1: Exposed doubles non-burn, non-heat damage
    if (findEffect(this, "exposed")) {
      armored_damage_types.forEach(d => (damage[d] *= 2));
    }

    /**
     * Step 2: Reduce damage due to armor.
     * Step 3: Reduce damage due to resistance.
     * Armor reduction may favor attacker or defender depending on automation.
     * Default is "favors defender".
     */
    if (!paracausal && !findEffect(this, "shredded")) {
      const defense_favor = true; // getAutomationOptions().defenderArmor
      // @ts-expect-error System's broken
      const resist_armor_damage = armored_damage_types.filter(t => this.system.resistances[t.toLowerCase()]);
      // @ts-expect-error System's broken
      const normal_armor_damage = armored_damage_types.filter(t => !this.system.resistances[t.toLowerCase()]);
      // @ts-expect-error System's broken
      const resist_ap_damage = ap_damage_types.filter(t => this.system.resistances[t.toLowerCase()]);
      // @ts-expect-error System's broken
      let armor = ap ? 0 : this.system.armor;
      let leftover_armor: number; // Temp 'storage' variable for tracking used armor

      // Defender-favored: Deduct Armor from non-resisted damages first
      if (defense_favor) {
        for (const t of normal_armor_damage) {
          leftover_armor = Math.max(armor - damage[t], 0);
          damage[t] = Math.max(damage[t] - armor, 0);
          armor = leftover_armor;
        }
      }

      // Deduct Armor from resisted damage
      for (const t of resist_armor_damage) {
        leftover_armor = Math.max(armor - damage[t], 0);
        damage[t] = Math.max(damage[t] - armor, 0) / 2;
        armor = leftover_armor;
      }

      // Attacker-favored: Deduct Armor from non-resisted damages first
      if (!defense_favor) {
        for (const t of normal_armor_damage) {
          leftover_armor = Math.max(armor - damage[t], 0);
          damage[t] = Math.max(damage[t] - armor);
          armor = leftover_armor;
        }
      }

      // Resist Burn & Heat, unaffected by Armor
      for (const t of resist_ap_damage) {
        damage[t] = damage[t] / 2;
      }
    }

    // Only set heat on items that have it
    if (this.has_heat_cap()) {
      changes["system.heat"] = this.system.heat.value + damage.Heat;
    }

    const armor_damage = Math.ceil(damage.Kinetic + damage.Energy + damage.Explosive + damage.Variable);
    let total_damage = armor_damage + damage.Burn;

    // Reduce Overshield first
    // @ts-expect-error System's broken
    if (this.system.overshield.value) {
      // @ts-expect-error System's broken
      const leftover_overshield = Math.max(this.system.overshield.value - total_damage, 0);
      // @ts-expect-error System's broken
      total_damage = Math.max(total_damage - this.system.overshield.value, 0);
      changes["system.overshield"] = leftover_overshield;
    }

    // Finally reduce HP by remaining damage
    if (total_damage) {
      // @ts-expect-error System's broken
      changes["system.hp"] = this.system.hp.value - total_damage;
    }

    // Add to Burn stat
    if (damage.Burn) {
      // @ts-expect-error System's broken
      changes["system.burn"] = this.system.burn + damage.Burn;
    }

    await this.update(changes);

    return total_damage;
  }

  // Imports packed pilot data, from either a vault id or gist id
  async importCC(data: PackedPilotData, clearFirst = false) {
    /*
    TODO
    if (this.type !== EntryType.PILOT) {
      return;
    }
    if (data == null) return;
    if (clearFirst) await this.clearItems();

    try {
      // @ts-expect-error Should be fixed with v10 types
      const mm = await this.system.derived.mm_promise;
      // This block is kept for posterity, in case we want to re-implement automatic folder creation.
      // Get/create folder for sub-actors
      // let unit_folder_name = `${data.callsign}'s Units`;
      // let unit_folder = game.folders.getName(unit_folder_name);
      // if (!unit_folder) {
      //   unit_folder = await Folder.create({
      //     name: unit_folder_name,
      //     type: "Actor",
      //     sorting: "a",
      //     parent: this.folder || null,
      //   });
      // }
      let unit_folder = this.folder;
      console.log("Unit folder id:", unit_folder?.id);
      // @ts-expect-error Should be fixed with v10 types
      let permission = duplicate(this.ownership);

      // Check whether players are allowed to create Actors
      if (!game.user?.can("ACTOR_CREATE")) {
        new Dialog({
          title: "Cannot Create Actors",
          content: `<p>You are not permitted to create actors, so sync may fail.</p>
            <p>Your GM can allow Players/Trusted Players to create actors in Settings->Configure Permissions.</p>`,
          buttons: {
            ok: {
              icon: '<i class="fas fa-check"></i>',
              label: "OK",
            },
          },
          default: "ok",
        }).render(true);
      }

      // Setup registries
      // We look for missing items in world first, compendium second
      let ps1 = new FoundryReg("game");
      let ps2 = new FoundryReg("comp_core");

      // Setup relinker to be folder bound for actors
      let base_relinker = quick_relinker<any>({
        key_pairs: [
          ["LID", "lid"],
          ["Name", "name"],
        ],
      });

      // Setup sync tracking etc
      let synced_deployables: Deployable[] = []; // Track these as we go
      let synced_data = await funcs.cloud_sync(data, mm as Pilot, [ps1, ps2], {
        relinker: async (source_item, dest_reg, dest_cat) => {
          // Link by specific subfolder if deployable
          if (source_item.Type == EntryType.DEPLOYABLE) {
            console.debug("Relinking deployable: ", source_item);
            // Narrow down our destination options to find one that's in the proper folder
            let dest_deployables = (await dest_cat.list_live(source_item.OpCtx)) as Deployable[];
            return dest_deployables.find(dd => {
              let dd_folder_id: string = dd.Flags.orig_doc.data.folder;
              console.log(
                "Checking folder: " + dd.Name + " has folder id " + dd_folder_id + " which ?== " + unit_folder?.id
              );
              if (dd_folder_id != unit_folder?.id) {
                return false;
              }

              // Still need to have the right name, though. Do by substring since we reformat quite a bit
              return dd.Name.includes(source_item.Name);
            });
          } else {
            return base_relinker(source_item, dest_reg, dest_cat);
          }
        },
        // Rename and rehome deployables
        // @TODO: pilot typing weirdness.
        sync_deployable_nosave: (dep: Deployable) => {
          let flags = dep.Flags as FoundryFlagData<EntryType.DEPLOYABLE>;
          let owned_name = dep.Name.includes(data.callsign) ? dep.Name : `${data.callsign}'s ${dep.Name}`;
          flags.top_level_data["name"] = owned_name;
          flags.top_level_data["folder"] = unit_folder ? unit_folder.id : null;
          flags.top_level_data["token.name"] = owned_name;
          flags.top_level_data["permission"] = permission;
          flags.top_level_data["token.disposition"] = CONST.TOKEN_DISPOSITIONS.NEUTRAL;
          // dep.writeback(); -- do this later, after setting active!
          synced_deployables.push(dep);
        },
        // Rename and rehome mechs
        sync_mech: async (mech: Mech) => {
          let flags = mech.Flags as FoundryFlagData<EntryType.MECH>;
          let portrait = mech.CloudPortrait || mech.Frame?.ImageUrl || "";
          let new_img = replace_default_resource(flags.top_level_data["img"], portrait);

          flags.top_level_data["name"] = mech.Name;
          flags.top_level_data["folder"] = unit_folder ? unit_folder.id : null;
          flags.top_level_data["img"] = new_img;
          flags.top_level_data["permission"] = permission;
          flags.top_level_data["token.name"] = data.callsign;
          // @ts-expect-error Should be fixed with v10 types
          flags.top_level_data["token.disposition"] = this.token?.disposition;
          flags.top_level_data["token.actorLink"] = true;

          // the following block of code is version 1 to ensure all weapons are their own unique object in the registry.
          // This is primarily to fix issues with loading weapons. I am not particularly proud of the method (maybe a bit more writing and deleting than I'd like)
          // We iterate over every available mount, telling the registry to generate a new instance of itself, we then replace it in the mount and delete the original.
          // This is done only to avoid messing with how the Machine Mind deals with populating the sheet.

          for (let i = 0; i < mech.Loadout.WepMounts.length; i++) {
            for (let k = 0; k < mech.Loadout.WepMounts[i].Slots.length; k++) {
              let oldWepLocation = mech.Loadout.WepMounts[i].Slots[k];
              //console.log(`processing mount ${i}, slot ${k} :`,oldWepLocation)
              let newWep =
                (await oldWepLocation.Weapon?.Registry.create_live(
                  EntryType.MECH_WEAPON,
                  oldWepLocation.Weapon.OpCtx,
                  oldWepLocation.Weapon.OrigData
                )) || null;
              //console.log("Our brand new weapon: ", newWep)
              oldWepLocation.Weapon?.Registry.delete(EntryType.MECH_WEAPON, oldWepLocation.Weapon.RegistryID);
              oldWepLocation.Weapon = newWep;
            }
          }

          // We proceed to do a similar process for the mech systems. This is to ensure non-unique systems can be disabled individually on the mech sheet
          for (let i = 0; i < mech.Loadout.SysMounts.length; i++) {
            let oldSystemLocation = mech.Loadout.SysMounts[i];
            let newSys =
              (await oldSystemLocation.System?.Registry.create_live(
                EntryType.MECH_SYSTEM,
                oldSystemLocation.System.OpCtx,
                oldSystemLocation.System.OrigData
              )) || null;
            oldSystemLocation.System?.Registry.delete(EntryType.MECH_SYSTEM, oldSystemLocation.System.RegistryID);
            oldSystemLocation.System = newSys;
          }

          await mech.writeback();

          // If we've got a frame (which we should) check for setting Retrograde image
          if (mech.Frame && (await (mech.Flags.orig_doc as LancerActor).swapFrameImage(mech, null, mech.Frame))) {
            // Write back again if we swapped images
            await mech.writeback();
          }
        },
        // Set pilot token
        sync_pilot: (pilot: Pilot) => {
          let flags = pilot.Flags as FoundryFlagData<EntryType.PILOT>;
          let new_img = replace_default_resource(flags.top_level_data["img"], pilot.CloudPortrait);
          flags.top_level_data["name"] = pilot.Name;
          flags.top_level_data["img"] = new_img;
          flags.top_level_data["token.name"] = pilot.Callsign;

          // Check and see if we have a custom token (not from imgur) set, and if we don't, set the token image.
          if (
            // @ts-expect-error Should be fixed with v10 types
            this.token?.img === "systems/lancer/assets/icons/pilot.svg" ||
            // @ts-expect-error Should be fixed with v10 types
            this.token?.img?.includes("imgur")
          ) {
            flags.top_level_data["token.img"] = new_img;
          }
        },
      });

      // Now we can iterate over deploys, setting their deployer to active mech and writing back again. Set all deployers to the pilots active mech
      let active = await (synced_data as any).ActiveMech();
      for (let deployable of synced_deployables) {
        if (active) {
          deployable.Deployer = active;
        }
        deployable.writeback();
      }

      // Reset curr data and render all
      this.render();
      (await synced_data.Mechs()).forEach((m: Mech) => m.Flags.orig_doc.render());

      ui.notifications!.info("Successfully loaded pilot new state.");
    } catch (e) {
      console.warn(e);
      if (e instanceof Error) {
        ui.notifications!.warn(`Failed to update pilot, likely due to missing LCP data: ${e.message}`);
      } else {
        ui.notifications!.warn(`Failed to update pilot, likely due to missing LCP data: ${e}`);
      }
    }
    */
  }

  async clearItems() {
    await this.deleteEmbeddedDocuments("Item", Array.from(this.items.keys()));
  }

  /* -------------------------------------------- */

  /** @override
   * We require a customized active effect application workflow
   */
  prepareBaseData() {
    // 1. First, finalize our system tasks. Items should be (minimally) prepared by now, so we can resolve embedded items
    // @ts-expect-error
    this.system.finalize_tasks();

    // 2. Initialize our universal derived stat fields
    // @ts-expect-error
    let sys: SystemTemplates.actor_universal = this.system;
    sys.edef = 0;
    sys.evasion = 0;
    sys.speed = 0;
    sys.armor = 0;
    sys.size = 0;
    sys.save = 0;
    sys.sensor_range = 0;
    sys.tech_attack = 0;
    sys.statuses = {
      dangerzone: false,
      downandout: false,
      engaged: false,
      exposed: false,
      invisible: false,
      prone: false,
      shutdown: false,
      immobilized: false,
      impaired: false,
      jammed: false,
      lockon: false,
      shredded: false,
      slowed: false,
      stunned: false,
      hidden: false,
      invisibe: false,
    };
    sys.resistances = {
      burn: false,
      energy: false,
      explosive: false,
      heat: false,
      kinetic: false,
      variable: false,
    };
    sys.bonuses = {
      flat: defaults.ROLL_BONUS_TARGETS(),
      accuracy: defaults.ROLL_BONUS_TARGETS(),
    };
    sys.weapon_bonuses = [];

    // 3. Query effects to set status flags
    for (let eff of this.effects) {
      let status_id = (eff.getFlag("core", "statusId") ?? null) as null | keyof typeof sys.statuses;
      if (status_id && sys.statuses[status_id] === false) {
        sys.statuses[status_id] = true;
      }
    }

    // 4. Establish type specific attributes / perform type specific prep steps
    // HASE is pretty generic. All but pilot need defaults - pilot gets from source
    if (this.is_mech() || this.is_deployable() || this.is_npc()) {
      this.system.hull = 0;
      this.system.agi = 0;
      this.system.sys = 0;
      this.system.eng = 0;
    }

    if (this.is_pilot()) {
      this.system.grit = Math.ceil(this.system.level / 2);
    } else if (this.is_mech()) {
      // Mark loadout items as equipped, while aggregating sp/ai
      let equipped_sp = 0;
      let equipped_ai = 0;
      if (this.system.loadout.frame?.status == "resolved") {
        this.system.loadout.frame.value.system.equipped = true;
      }
      for (let system of this.system.loadout.systems) {
        if (system.status == "resolved") {
          system.value.system.equipped = true;
          equipped_sp += system.value.system.sp;
          equipped_ai += system.value.system.tags.some(t => t.is_ai) ? 1 : 0;
        }
      }
      for (let mount of this.system.loadout.weapon_mounts) {
        for (let slot of mount.slots) {
          if (slot.weapon?.status == "resolved") {
            slot.weapon.value.system.equipped = true;
            equipped_sp += slot.weapon.value.system.sp;
          }
          if (slot.mod?.status == "resolved") {
            slot.mod.value.system.equipped = true;
            equipped_ai += slot.mod.value.system.tags.some(t => t.is_ai) ? 1 : 0;
          }
        }
      }

      // Initialize loadout statistics. Maxs will be fixed by active effects
      this.system.loadout.sp = { max: 0, min: 0, value: equipped_sp };
      this.system.loadout.ai_cap = { max: 1, min: 0, value: equipped_ai };
      this.system.loadout.limited_bonus = 0;

      // Other misc
      this.system.overcharge_sequence = DEFAULT_OVERCHARGE_SEQUENCE;
      this.system.psd = null;
      this.system.grit = 0;
    } else if (this.is_npc()) {
      // TODO
    } else if (this.is_deployable()) {
      // TODO
    }
  }

  /** @override
   * We need to, in order:
   *  - Re-compute any derived attributes
   */
  prepareDerivedData() {
    // Reset subscriptions for new data
    // we might not need this any more this.setupLancerHooks();

    // Changes in max-hp should heal the actor. But certain requirements must be met
    // - Must know prior (would be in dr.hp.max). If 0, do nothing
    // - Must not be dead. If HP <= 0, do nothing
    // - New HP must be valid. If 0, do nothing
    // If above two are true, then set HP = HP - OldMaxHP + NewMaxHP. This should never drop the ent below 1 hp
    const hp_change_corrector = (curr_hp: number, old_max: number, new_max: number) => {
      if (curr_hp <= 0) return curr_hp;
      if (old_max <= 0) return curr_hp;
      if (new_max <= 0) return curr_hp;
      let new_hp = curr_hp - old_max + new_max;
      if (new_hp < 1) new_hp = 1;

      // Return so it can also be set to the MM item
      return new_hp;
    };

    // Ask items to prepare their final attributes using weapon_bonuses
    this.items.forEach(item => {
      /*
      if (item.is_mech_weapon()) {
        // @ts-expect-error
        let sys_clone = this.system.clone();
        let pseudo_actor = { system: sys_clone };
        for (let _eff of this.effects) {
          let eff = _eff as LancerActiveEffect;
          // Only apply those that were passed over because restricted
          if (eff.isSuppressed && !eff.isPassthrough && eff.restrictionsAllow(item)) {

            // Apply appropriate restricted effects
            item.prepareFinalAttributes(pseudo_actor);
          }
        }
      }
      */
    }); // TODO

    // If our max hp changed, do somethin'
    /*
    TODO: Move this to a pre-update hook
    let curr_hp = this.system.hp.value;
    let max_hp = this.system.hp.max;
    let corrected_hp = hp_change_corrector(curr_hp, this.prior_max_hp, max_hp);
        if (curr_hp != corrected_hp) {
          // Cancel christmas. We gotta update ourselves to reflect the new HP change >:(
          console.warn(
            "TODO: figure out a more elegant way to update hp based on max hp than calling update in prepareData. Maybe only choice."
          );
        }
    */

    // Track shift in values
    // @ts-expect-error
    this.#max_hp_tracker.setValue(this.system.hp.max);
    this.#innate_effect_tracker.setValue(this.#collectActiveEffects());
    if (this.#innate_effect_tracker.invalid) {
      console.log(
        "PI change",
        this.#innate_effect_tracker.prior_string,
        this.#innate_effect_tracker.prior_value,
        this.#innate_effect_tracker.curr_string,
        this.#innate_effect_tracker.curr_value
      );
    }
  }

  /** @override
   * Want to preserve our arrays
   */
  async update(data: any, options: any = {}) {
    // @ts-expect-error
    data = this.system.full_update_data(data);
    return super.update(data, options);
  }

  /** @override
   * This is mostly copy-pasted from Actor.modifyTokenAttribute
   * to allow negative hps, which are useful for structure checks
   */
  async modifyTokenAttribute(attribute: any, value: any, isDelta = false, isBar = true) {
    // @ts-expect-error Should be fixed with v10 types
    const current = foundry.utils.getProperty(this.system, attribute);

    let updates;
    if (isBar) {
      if (isDelta) value = Number(current.value) + value;
      updates = { [`data.${attribute}.value`]: value };
    } else {
      if (isDelta) value = Number(current) + value;
      updates = { [`data.${attribute}`]: value };
    }

    // Call a hook to handle token resource bar updates
    fix_modify_token_attribute(updates);
    const allowed = Hooks.call("modifyTokenAttribute", { attribute, value, isDelta, isBar }, updates);
    return allowed ? this.update(updates) : this;
  }

  protected async _preCreate(...[data, options, user]: Parameters<Actor["_preCreate"]>): Promise<void> {
    await super._preCreate(data, options, user);
    // @ts-expect-error Should be fixed with v10 types
    if (data.system?.lid) {
      console.log(`${lp} New ${this.type} has data provided from an import, skipping default init.`);
      return;
    }

    console.log(`${lp} Initializing new ${this.type}`);
    let default_data: Record<string, any>;
    let disposition: ValueOf<typeof CONST["TOKEN_DISPOSITIONS"]> = CONST.TOKEN_DISPOSITIONS.FRIENDLY;
    switch (this.type) {
      case EntryType.NPC:
        default_data = defaults.NPC();
        disposition = CONST.TOKEN_DISPOSITIONS.HOSTILE;
        break;
      case EntryType.PILOT:
        default_data = defaults.PILOT();
        break;
      case EntryType.DEPLOYABLE:
        default_data = defaults.DEPLOYABLE();
        disposition = CONST.TOKEN_DISPOSITIONS.NEUTRAL;
        break;
      case EntryType.MECH:
      default:
        // Idk, just in case
        default_data = defaults.MECH();
        default_data.actions = { full: true };
        break;
    }

    // Put in the basics
    // @ts-expect-error Should be fixed with v10 types
    this.updateSource({
      system: default_data,
      img: TypeIcon(this.type),
      // Link the token to the Actor for pilots and mechs, but not for NPCs or deployables
      prototypeToken: {
        actorLink: [EntryType.PILOT, EntryType.MECH].includes(this.type),
        disposition: disposition,
        name: this.name ?? default_data.name,
      },
    });
  }

  /** @override
   * On the result of an update, we want to cascade derived data.
   */
  protected _onUpdate(...[changed, options, user]: Parameters<Actor["_onUpdate"]>) {
    super._onUpdate(changed, options, user);
    if (game.userId != user) {
      return;
    }
    this.regenerateEquippedEffects()
      .then(_ => {
        return this.sendChangesDownward();
      })
      .then(_ => {
        // Check for overheating / structure
        if (
          getAutomationOptions().structure &&
          this.isOwner &&
          !(
            game.users?.players.reduce((a, u) => a || (u.active && this.testUserPermission(u, "OWNER")), false) &&
            game.user?.isGM
          ) &&
          (this.is_mech() || this.is_npc())
        ) {
          const data = changed as any; // DeepPartial<RegMechData | RegNpcData>;
          console.log("Checking structuring");
          if ((data.heat ?? 0) > this.system.heat.max && this.system.stress.value > 0) {
            prepareOverheatMacro(this);
          }
          if ((data.hp ?? 1) <= 0 && this.system.structure.value > 0) {
            prepareStructureMacro(this);
          }
        }
      })
      .then(_ => {
        // If the Size of the ent has changed since the last update, set the
        // protype token size to the new size
        // @ts-expect-error System's broken
        if (this.prototypeToken?.width !== this.system.size) {
          // @ts-expect-error System's broken
          const size = Math.max(1, this.system.size);
          // @ts-expect-error
          return this.prototypeToken?.update({
            width: size,
            height: size,
            flags: {
              "hex-size-support": {
                borderSize: size,
                altSnapping: true,
                evenSnap: !(size % 2),
              },
            },
          });
        }
      });
  }

  /** @inheritdoc */
  _onUpdateEmbeddedDocuments(
    embeddedName: "Item" | "ActiveEffect",
    documents: LancerItem[] | LancerActiveEffect[],
    result: any,
    options: any,
    user: string
  ) {
    super._onUpdateEmbeddedDocuments(embeddedName, documents, result, options, user);
    if (game.userId != user) {
      return;
    }
    this.regenerateEquippedEffects().then(_ => this.sendChangesDownward());
  }

  /**
   * Sends appropriate active effects to "children"
   */
  sendChangesDownward() {
    // Call this whenever update this actors stats in any meaningful way
    if (this.is_pilot()) {
      if (this.system.active_mech?.status == "resolved") {
        let mech = this.system.active_mech.value;
        let changes = pilot_downstream_effects(this as LancerPILOT);

        console.debug(`Pilot ${this.name} propagating effects to ${mech.name}`);
        // Get rid of old from this pilot
        let old = mech.effects.filter(e => (e.getFlag("lancer", "cascade_origin") as string) == this.uuid);
        mech.deleteEmbeddedDocuments(
          "ActiveEffect",
          old.map(e => e.id!)
        );

        // Add new from this pilot
        // @ts-expect-error
        mech.createEmbeddedDocuments("ActiveEffect", changes);
      }
    }
  }

  /**
   * Resets active effects on this item to match equipment.
   */
  async regenerateEquippedEffects(): Promise<boolean> {
    // Get what effects we'll apply
    if (this.#innate_effect_tracker.invalid) {
      // Change detected
      // First, cull all innate effects
      let old_innates = this.effects.filter(e => !!e.id && (e.getFlag("lancer", "innate") as boolean)).map(e => e.id!);
      await this.deleteEmbeddedDocuments("ActiveEffect", old_innates);
      await this.createEmbeddedDocuments("ActiveEffect", this.#innate_effect_tracker.curr_value as any);
      return true;
    }
    return false;
  }

  /**
   * Collect bonuses from "active" items, IE all "equipped" items that are not destroyed
   */
  #collectActiveEffects(): LancerActiveEffectConstructorData[] {
    let effects: LancerActiveEffectConstructorData[] = [];
    for (let i of this.list_loadout()) {
      if ((i as unknown as { system: SystemTemplates.destructible }).system.destroyed !== false) {
        effects.push(...i.generate_innate_effects());
      }
    }
    return effects;
  }

  /**
   * Yields a simple error message on a misconfigured mount, or null if no issues detected.
   * @param loadout
   * @param mount
   */
  validateMount(mount: SystemData.Mech["loadout"]["weapon_mounts"][0]): string | null {
    if (this.is_mech()) {
      let loadout = this.system.loadout;
      console.log("Mounts aren't validated yet but soon (tm)!");
      return null; // TODO
    } else {
      throw new Error(
        `${this.type} actors have no mounts to validate. Call this method on the actor you're trying to check against!`
      );
    }
  }

  /**
   * Returns the current overcharge roll/text. Only applicable for mechs.
   */
  getOverchargeRoll(): string | null {
    // Function is only applicable to mechs.
    if (!this.is_mech()) return null;

    const oc_rolls = this.system.overcharge_sequence;
    if (!oc_rolls || oc_rolls.length < 4) return null;
    return oc_rolls[this.system.overcharge];
  }

  // Typeguards
  is_pilot(): this is LancerPILOT {
    return this.type === EntryType.PILOT;
  }
  is_mech(): this is LancerMECH {
    return this.type === EntryType.MECH;
  }
  is_npc(): this is LancerNPC {
    return this.type === EntryType.NPC;
  }
  is_deployable(): this is LancerDEPLOYABLE {
    return this.type === EntryType.DEPLOYABLE;
  }

  // Quick checkers
  has_heat_cap(): this is { system: SystemTemplates.heat } {
    return (this as any).system.heat !== undefined;
  }

  /**
   * Taking a new and old frame/class, swaps the actor and/or token images if
   * we detect that the image isn't custom. Will check each individually
   * @param robot     A MM Mech or NPC, passed through to avoid data overwrites
   * @param oldFrame  Old Frame or NPC Class
   * @param newFrame  New Frame or NPC Class
   * @returns         The newFrame if any updates were performed
   */
  async swapFrameImage(
    robot: LancerMECH | LancerNPC,
    oldFrame: LancerFRAME | LancerNPC_CLASS | null,
    newFrame: LancerFRAME | LancerNPC_CLASS
  ): Promise<string> {
    ui.notifications?.error("TODO: Reimplement frame image swapping");
    return "";
    /*
    let oldFramePath = frameToPath[oldFrame?.Name || ""];
    let newFramePath = frameToPath[newFrame?.Name || ""];
    let defaultImg = is_reg_mech(robot)
      ? "systems/lancer/assets/icons/mech.svg"
      : "systems/lancer/assets/icons/npc_class.svg";

    if (!newFramePath) newFramePath = defaultImg;
    let changed = false;
    let newData: Parameters<this["update"]>[0] = {};

    // Check the token
    // Add manual check for the aws images
    if (
      // @ts-expect-error Should be fixed with v10 types
      this.token?.img == oldFramePath ||
      // @ts-expect-error Should be fixed with v10 types
      this.token?.img == defaultImg ||
      // @ts-expect-error Should be fixed with v10 types
      this.token?.img?.includes("compcon-image-assets")
    ) {
      newData.token = { img: newFramePath };
      changed = true;
    }

    // Check the actor
    if (this.img == oldFramePath || this.img == defaultImg) {
      newData.img = newFramePath;

      // Have to set our top level data in MM or it will overwrite it...
      robot.Flags.top_level_data.img = newFramePath;
      if (
        // @ts-expect-error Should be fixed with v10 types
        this.token?.img?.includes("systems/lancer/assets/retrograde-minis") ||
        // @ts-expect-error Should be fixed with v10 types
        this.token?.img == defaultImg
      ) {
        //we can override any retrograde assets, or the default image
        robot.Flags.top_level_data["token.img"] = newFramePath;
      } else {
        //do not override any custom tokens
        // @ts-expect-error Should be fixed with v10 types
        robot.Flags.top_level_data["token.img"] = this.token?.img;
      }
      changed = true;
    }

    if (changed) {
      console.log(`${lp} Automatically updating image: `, newData);
      await this.update(newData);
    }

    return newFramePath;
  */
  }
}

// Typeguards
export type LancerPILOT = LancerActor & { system: SystemData.Pilot };
export type LancerMECH = LancerActor & { system: SystemData.Mech };
export type LancerNPC = LancerActor & { system: SystemData.Npc };
export type LancerDEPLOYABLE = LancerActor & { system: SystemData.Deployable };

export type LancerActorType = EntryType.MECH | EntryType.DEPLOYABLE | EntryType.NPC | EntryType.PILOT;
export const ACTOR_TYPES: LancerActorType[] = [EntryType.MECH, EntryType.DEPLOYABLE, EntryType.NPC, EntryType.PILOT];

export function is_actor_type(type: any): type is LancerActorType {
  return ACTOR_TYPES.includes(type as LancerActorType);
}
