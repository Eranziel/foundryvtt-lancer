import { LANCER, replace_default_resource, TypeIcon } from "../config";
import {
  EntryType,
  funcs,
  Mech,
  Deployable,
  Npc,
  RegRef,
  OpCtx,
  LiveEntryTypes,
  RegEnv,
  StaticReg,
  MechSystem,
  PilotWeapon,
  Pilot,
  PilotArmor,
  PilotGear,
  WeaponMod,
  PackedPilotData,
  quick_relinker,
  RegEntryTypes,
  Frame,
  RegMechData,
  RegNpcData,
  Damage,
  DamageType,
} from "machine-mind";
import { FoundryFlagData, FoundryReg } from "../mm-util/foundry-reg";
import { LancerHooks, LancerSubscription } from "../helpers/hooks";
import { mm_wrap_actor } from "../mm-util/helpers";
import { system_ready } from "../../lancer";
import type { LancerItemType } from "../item/lancer-item";
import { renderMacroTemplate, encodeMacroData, prepareOverheatMacro, prepareStructureMacro } from "../macros";
import type { RegEntry, MechWeapon, NpcFeature } from "machine-mind";
import { StabOptions1, StabOptions2 } from "../enums";
import { fix_modify_token_attribute } from "../token";
import type { ActionData } from "../action";
import { frameToPath } from "./retrograde-map";
import { NpcClass } from "machine-mind";
import { getAutomationOptions } from "../settings";
import { findEffect } from "../helpers/acc_diff";
import { AppliedDamage } from "./damage-calc";
const lp = LANCER.log_prefix;

// Use for HP, etc
interface BoundedValue {
  min: number;
  max: number;
  value: number;
}

interface DerivedProperties<T extends EntryType> {
  // These are all derived and populated by MM
  hp: { max: number; value: number }; // -hps are useful for structure macros
  heat: BoundedValue;
  stress: BoundedValue;
  structure: BoundedValue;
  repairs: BoundedValue;
  overshield: BoundedValue; // Though not truly a bounded value, useful to have it as such for bars etc

  // Other values we particularly appreciate having cached
  evasion: number;
  edef: number;
  save_target: number;
  speed: number;
  armor: number;
  // todo - bonuses and stuff. How to allow for accuracy?

  mm: LiveEntryTypes<T> | null;
  mm_promise: Promise<LiveEntryTypes<T>>;
}

interface LancerActorDataSource<T extends EntryType> {
  type: T;
  data: RegEntryTypes<T>;
}
interface LancerActorDataProperties<T extends EntryType> {
  type: T;
  data: RegEntryTypes<T> & {
    derived: DerivedProperties<T>;
    action_tracker: ActionData;
  };
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
  // Tracks data propagation
  subscriptions: LancerSubscription[] = [];

  // Kept for comparing previous to next values
  prior_max_hp = -1;

  // Kept separately so it can be used by items. Same as in our .system.derived.mm_promise
  _actor_ctx!: OpCtx;

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
    // @ts-expect-error Should be fixed with v10 types
    const mech = await this.system.derived.mm_promise;
    if (!reroll_data) {
      if (mech.CurrentHeat > mech.HeatCapacity && mech.CurrentStress > 0) {
        // https://discord.com/channels/426286410496999425/760966283545673730/789297842228297748
        if (mech.CurrentStress > 1) mech.CurrentHeat -= mech.HeatCapacity;
        mech.CurrentStress -= 1;
      } else if (mech.CurrentHeat <= mech.HeatCapacity) {
        return;
      }
      await mech.writeback();
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

    // @ts-expect-error Should be fixed with v10 types
    let ent = await this.system.derived.mm_promise;
    if ((reroll_data?.stress ?? ent.CurrentStress) >= ent.MaxStress) {
      ui.notifications!.info("The mech is at full Stress, no overheating check to roll.");
      return;
    }
    let remStress = reroll_data?.stress ?? ent.CurrentStress;
    let templateData = {};

    // If we're already at 0 just kill em
    if (remStress > 0) {
      let damage = ent.MaxStress - remStress;
      let roll = await new Roll(`${damage}d6kl1`).evaluate({ async: true });
      let result = roll.total;
      if (result === undefined) return;

      let tt = await roll.getTooltip();
      let title = stressTableT[result];
      let text = stressTableD(result, remStress, ent.MaxStress);
      let total = result.toString();

      let secondaryRoll = "";

      // Critical
      let one_count = (<Die[]>roll.terms)[0].results.filter(v => v.result === 1).length;
      if (one_count > 1) {
        text = stressTableD(result, 1, ent.MaxStress);
        title = stressTableT[0];
        total = "Multiple Ones";
      } else {
        if (result === 1 && remStress === 2) {
          let macroData = encodeMacroData({
            title: "Engineering",
            fn: "prepareStatMacro",
            args: [ent.RegistryID, "mm.Eng"],
          });

          secondaryRoll = `<button class="chat-button chat-macro-button" data-macro="${macroData}"><i class="fas fa-dice-d20"></i> Engineering</button>`;
        }
      }
      templateData = {
        val: remStress,
        max: ent.MaxStress,
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
      // Single-stress NPCs should use the Emergency Shunt message instead
      let title = ent.MaxStress > 1 ? stressTableT[0] : stressTableT[6];
      let text = stressTableD(0, 0, ent.MaxStress);
      templateData = {
        val: ent.CurrentStress,
        max: ent.MaxStress,
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

    // @ts-expect-error Should be fixed with v10 types
    const mech = await this.system.derived.mm_promise;
    if (!reroll_data) {
      if (mech.CurrentHP < 1 && mech.CurrentStructure > 0) {
        if (mech.CurrentStructure > 1) mech.CurrentHP += mech.MaxHP;
        mech.CurrentStructure -= 1;
      } else if (mech.CurrentHP >= 1) {
        return;
      }
      await mech.writeback();
    }

    await this.rollStructureTable(reroll_data);
  }

  async rollStructureTable(reroll_data?: { structure: number }): Promise<void> {
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

    // @ts-expect-error Should be fixed with v10 types
    let mech = (await this.system.derived.mm_promise) as Mech | Npc;
    if ((reroll_data?.structure ?? mech.CurrentStructure) >= mech.MaxStructure) {
      ui.notifications!.info("The mech is at full Structure, no structure check to roll.");
      return;
    }

    let remStruct = reroll_data?.structure ?? mech.CurrentStructure;
    let templateData = {};

    // If we're already at 0 just kill em
    if (remStruct > 0) {
      let damage = mech.MaxStructure - remStruct;

      let roll: Roll = await new Roll(`${damage}d6kl1`).evaluate({ async: true });
      let result = roll.total;
      if (result === undefined) return;

      let tt = await roll.getTooltip();
      let title = structTableT[result];
      let text = structTableD(result, remStruct);
      let total = result.toString();

      let secondaryRoll = "";

      // Crushing hits
      let one_count = (<Die[]>roll.terms)[0].results.filter(v => v.result === 1).length;
      if (one_count > 1) {
        text = structTableD(result, 1);
        title = structTableT[0];
        total = "Multiple Ones";
      } else {
        if (result === 1 && remStruct === 2) {
          let macroData = encodeMacroData({
            title: "Hull",
            fn: "prepareStatMacro",
            args: [mech.RegistryID, "mm.Hull"],
          });

          secondaryRoll = `<button class="chat-button chat-macro-button" data-macro="${macroData}"><i class="fas fa-dice-d20"></i> Hull</button>`;
        } else if (result >= 2 && result <= 4) {
          let macroData = encodeMacroData({
            // TODO: Should create a "prepareRollMacro" or something to handle generic roll-based macros
            // Since we can't change prepareTextMacro too much or break everyone's macros
            title: "Roll for Destruction",
            fn: "prepareStructureSecondaryRollMacro",
            args: [mech.RegistryID],
          });

          secondaryRoll = `<button class="chat-macro-button"><a class="chat-button" data-macro="${macroData}"><i class="fas fa-dice-d20"></i> Destroy</a></button>`;
        }
      }
      templateData = {
        val: mech.CurrentStructure,
        max: mech.MaxStructure,
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
        val: mech.CurrentStructure,
        max: mech.MaxStructure,
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
    // @ts-expect-error Should be fixed with v10 types
    let ent = await this.system.derived.mm_promise;

    await this.remove_all_active_effects();
    ent.CurrentHP = ent.MaxHP;
    ent.Burn = 0;
    ent.Overshield = 0;

    // Things for mechs & NPCs
    if (is_reg_mech(ent) || is_reg_npc(ent)) {
      ent.CurrentHeat = 0;
      ent.CurrentStress = ent.MaxStress;
      ent.CurrentStructure = ent.MaxStructure;
    }

    // Things just for mechs
    if (is_reg_mech(ent)) {
      ent.CurrentCoreEnergy = 1;
      ent.CurrentRepairs = ent.RepairCapacity;
      ent.OverchargeCount = 0;
    }

    // I believe the only thing a pilot needs
    if (is_reg_pilot(ent)) {
      let mech = await ent.ActiveMech();
      if (mech) {
        await mech.Flags.orig_doc.full_repair();
      }
    }

    if (!this.is_deployable()) await this.restore_all_items();
    await ent.writeback();
  }

  // Do the specified junk to an item. Returns the item. Does not writeback
  private refresh(
    item: PilotWeapon | MechWeapon | PilotArmor | PilotGear | MechSystem | WeaponMod | NpcFeature,
    opts: {
      repair?: boolean;
      reload?: boolean;
      refill?: boolean;
    }
  ): PilotWeapon | MechWeapon | PilotArmor | PilotGear | MechSystem | WeaponMod | NpcFeature {
    if (opts.repair) {
      if (
        [EntryType.MECH_WEAPON, EntryType.MECH_SYSTEM, EntryType.WEAPON_MOD, EntryType.NPC_FEATURE].includes(item.Type)
      ) {
        (item as MechWeapon | MechSystem | WeaponMod).Destroyed = false;
      }
    }
    if (opts.reload) {
      if ([EntryType.MECH_WEAPON, EntryType.NPC_FEATURE, EntryType.PILOT_WEAPON].includes(item.Type)) {
        (item as MechWeapon | NpcFeature | PilotWeapon).Loaded = true;
      }
    }
    if (opts.refill) {
      item.Uses = item.OrigData.derived.max_uses;
    }
    return item;
  }

  // List the relevant items on this actor
  private async list_items(): Promise<
    Array<PilotWeapon | MechWeapon | PilotArmor | PilotGear | MechSystem | WeaponMod | NpcFeature>
  > {
    // @ts-expect-error Should be fixed with v10 types
    let ent = (await this.system.derived.mm_promise) as Mech | Pilot | Npc | Deployable;
    let result: any[] = [];
    if (is_reg_mech(ent)) {
      // Do all of the weapons/systems/mods on our loadout
      for (let mount of ent.Loadout.WepMounts) {
        for (let slot of mount.Slots) {
          // Do weapon
          if (slot.Weapon) {
            result.push(slot.Weapon);
          }
          // Do mod
          if (slot.Mod) {
            result.push(slot.Mod);
          }
        }
      }

      // Do all systems now
      result.push(...ent.Loadout.Systems);
    } else if (is_reg_npc(ent)) {
      result.push(...ent.Features);
    } else if (is_reg_pilot(ent)) {
      result.push(...ent.OwnedPilotWeapons, ...ent.OwnedPilotArmor, ...ent.OwnedPilotGear);
    } else {
      ui.notifications!.warn("Cannot reload deployables");
    }
    return result;
  }

  /**
   * Find all limited systems and set them to their max/repaired/ideal state
   */
  async restore_all_items() {
    return Promise.all(
      (await this.list_items())
        .map(i =>
          this.refresh(i, {
            reload: true,
            repair: true,
            refill: true,
          })
        )
        .map(i => i.writeback())
    );
  }

  /**
   * Find all owned items and set them to be not destroyed
   */
  async repair_all_items() {
    return Promise.all(
      (await this.list_items())
        .map(i =>
          this.refresh(i, {
            repair: true,
          })
        )
        .map(i => i.writeback())
    );
  }

  /**
   * Find all owned weapons and reload them
   */
  async reload_all_items() {
    return Promise.all(
      (await this.list_items())
        .map(i =>
          this.refresh(i, {
            reload: true,
          })
        )
        .map(i => i.writeback())
    );
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
   * Locates ActiveEffects on the Actor by names provided and removes them if present.
   * @param effects Array of String names of the ActiveEffects to remove.
   */
  async remove_active_effects(effects: string[]) {
    const target_effects = effects.map(e => findEffect(this, e));
    this.deleteEmbeddedDocuments(
      "ActiveEffect",
      target_effects.map(e => e?.id || "")
    );
  }

  /**
   * Wipes all ActiveEffects from the Actor.
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
   * Wipes all ActiveEffects that aren't NPC tiers from the Actor.
   * May be subject to updates to protect additional ActiveEffects.
   */
  async remove_nontier_active_effects() {
    let npc_tier_exp = /npc_tier_(\d)$/;
    let effects_to_delete = this.effects
      .filter(e => {
        return e.sourceName === "None" && !npc_tier_exp.test(e.data.flags.core?.statusId ?? "");
      })
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
    // @ts-expect-error Should be fixed with v10 types
    let ent = await this.system.derived.mm_promise;

    let return_text = "";

    if (!(is_reg_mech(ent) || is_reg_npc(ent))) {
      ui.notifications!.warn("This can't be stabilized!");
      return "";
    }

    if (o1 === StabOptions1.Cool) {
      return_text = return_text.concat("Mech is cooling itself. @Compendium[world.status.EXPOSED] cleared.<br>");
      ent.CurrentHeat = 0;
      await ent.writeback();
      this.remove_active_effect("exposed");
    } else if (o1 === StabOptions1.Repair) {
      if (is_reg_mech(ent) && ent.CurrentRepairs === 0) {
        return "Mech has decided to repair, but doesn't have any repair left. Please try again.<br>";
      } else if (is_reg_mech(ent)) {
        ent.CurrentRepairs -= 1;
      }
      ent.CurrentHP = ent.MaxHP;
      await ent.writeback();
    } else {
      return ``;
    }
    return_text = return_text.concat("<br>");
    switch (o2) {
      case StabOptions2.ClearBurn:
        return_text = return_text.concat("Mech has selected full burn clear.");
        ent.Burn = 0;
        await ent.writeback();
        break;
      case StabOptions2.ClearOtherCond:
        return_text = return_text.concat("Mech has selected to clear an allied condition. Please clear manually.");
        break;
      case StabOptions2.ClearOwnCond:
        return_text = return_text.concat("Mech has selected to clear own condition. Please clear manually.");
        break;
      case StabOptions2.Reload:
        return_text = return_text.concat("Mech has selected full reload, reloading...");
        await this.reload_all_items();
        break;
      default:
        return ``;
    }
    return return_text;
  }

  async damage_calc(damage: AppliedDamage, ap = false, paracausal = false): Promise<number> {
    // @ts-expect-error Should be fixed with v10 types
    const ent = await this.system.derived.mm_promise;

    const armored_damage_types = ["Kinetic", "Energy", "Explosive", "Variable"] as const;

    const ap_damage_types = ["Burn", "Heat"] as const;

    let writeback_needed = false;

    // Entities without Heat Caps take Energy Damage instead
    if (!("CurrentHeat" in ent)) {
      damage.Energy += damage.Heat;
      damage.Heat = 0;
    }

    // Step 1: Exposed doubles non-burn, non-heat damage
    if (findEffect(this, "exposed")) {
      armored_damage_types.forEach(d => (damage[d] *= 2));
    }

    /**
     * FIXME - Once Deployables and Pilots have Resistances, only include the
     * Shredded check.
     */

    /**
     * Step 2: Reduce damage due to armor.
     * Step 3: Reduce damage due to resistance.
     * Armor reduction may favor attacker or defender depending on automation.
     * Default is "favors defender".
     */
    if (!paracausal && !findEffect(this, "shredded") && !is_reg_dep(ent) && !is_reg_pilot(ent)) {
      const defense_favor = true; // getAutomationOptions().defenderArmor
      const resist_armor_damage = armored_damage_types.filter(t => ent.Resistances[t]);
      const normal_armor_damage = armored_damage_types.filter(t => !ent.Resistances[t]);
      const resist_ap_damage = ap_damage_types.filter(t => ent.Resistances[t]);
      let armor = ap ? 0 : ent.Armor;
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

    if ("CurrentHeat" in ent && damage.Heat > 0) {
      ent.CurrentHeat += damage.Heat;
      writeback_needed = true;
    }

    const armor_damage = Math.ceil(damage.Kinetic + damage.Energy + damage.Explosive + damage.Variable);
    let total_damage = armor_damage + damage.Burn;

    // Reduce Overshield first
    if (ent.Overshield) {
      const leftover_overshield = Math.max(ent.Overshield - total_damage, 0);
      total_damage = Math.max(total_damage - ent.Overshield, 0);
      ent.Overshield = leftover_overshield;
      writeback_needed = true;
    }

    // Finally reduce HP by remaining damage
    if (total_damage) {
      ent.CurrentHP -= total_damage;
      writeback_needed = true;
    }

    // Add to Burn stat
    if (damage.Burn) {
      ent.Burn += damage.Burn;
      writeback_needed = true;
    }

    if (writeback_needed) await ent.writeback();

    return total_damage;
  }

  // Imports packed pilot data, from either a vault id or gist id
  async importCC(data: PackedPilotData, clearFirst = false) {
    if (this.type !== "pilot") {
      return;
    }
    if (data == null) return;
    if (clearFirst) await this.clearBadData();

    console.log("Importing pilot from Comp/Con. Raw data:", data);

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
              let dd_folder_id: string = dd.Flags.orig_doc.folder;
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
          flags.top_level_data["prototypeToken.name"] = owned_name;
          flags.top_level_data["permission"] = permission;
          flags.top_level_data["prototypeToken.disposition"] = CONST.TOKEN_DISPOSITIONS.NEUTRAL;
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
          flags.top_level_data["prototypeToken.name"] = data.callsign;
          // @ts-expect-error Should be fixed with v10 types
          flags.top_level_data["prototypeToken.disposition"] = this.prototypeToken?.disposition;
          flags.top_level_data["prototypeToken.actorLink"] = true;

          // Ensure each mounted weapon and mod is a unique instance, so that loaded/limited/etc... is tracked individually
          const mounted: { weps: MechWeapon[]; mods: WeaponMod[] } = { weps: [], mods: [] };
          for (const mount of mech.Loadout.WepMounts) {
            for (const slot of mount.Slots) {
              if (slot.Weapon) {
                // Check to see if this weapon was found in another mount already
                if (mounted.weps.find(w => w.RegistryID === slot.Weapon?.RegistryID)) {
                  // Replace the weapon with a distinct copy
                  let newWep =
                    (await slot.Weapon?.Registry.create_live(
                      EntryType.MECH_WEAPON,
                      slot.Weapon.OpCtx,
                      slot.Weapon.OrigData
                    )) || null;
                  slot.Weapon = newWep;
                } else {
                  // If this unique weapon hasn't been encountered before, add it to the array.
                  mounted.weps.push(slot.Weapon);
                }
              }
              if (slot.Mod) {
                mounted.mods.push(slot.Mod);
                // Check to see if this mod was found in another mount already
                if (mounted.mods.find(m => m.RegistryID === slot.Mod?.RegistryID)) {
                  // Replace the weapon with a distinct copy
                  let newMod =
                    (await slot.Mod?.Registry.create_live(EntryType.WEAPON_MOD, slot.Mod.OpCtx, slot.Mod.OrigData)) ||
                    null;
                  slot.Mod = newMod;
                } else {
                  // If this unique mod hasn't been encountered before, add it to the array.
                  mounted.mods.push(slot.Mod);
                }
              }
            }
          }
          // Likewise, ensure all systems have unique instances.
          const mountedSys: MechSystem[] = [];
          for (const sysMount of mech.Loadout.SysMounts) {
            if (!sysMount.System) continue;
            if (mountedSys.find(s => s.RegistryID === sysMount.System?.RegistryID)) {
              let newSys =
                (await sysMount.System?.Registry.create_live(
                  EntryType.MECH_SYSTEM,
                  sysMount.System.OpCtx,
                  sysMount.System.OrigData
                )) || null;
              sysMount.System = newSys;
            } else {
              mountedSys.push(sysMount.System);
            }
          }
          // Save new copies of weapons, mods, and systems.
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
          flags.top_level_data["prototypeToken.name"] = pilot.Callsign;

          // Check and see if we have a custom token (not from imgur) set, and if we don't, set the token image.
          if (
            // @ts-expect-error Should be fixed with v10 types
            this.prototypeToken?.texture?.src === "systems/lancer/assets/icons/pilot.svg" ||
            // @ts-expect-error Should be fixed with v10 types
            this.prototypeToken?.texture?.src?.includes("imgur")
          ) {
            flags.top_level_data["prototypeToken.texture.src"] = new_img;
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
  }

  async clearBadData() {
    await this.deleteEmbeddedDocuments("Item", Array.from(this.items.keys()));
  }

  /* -------------------------------------------- */

  /** @override
   * We want to reset our ctx before this. It is used by our items, such that they all can share
   * the same ctx space.
   */
  prepareEmbeddedDocuments() {
    this._actor_ctx = new OpCtx();
    //@ts-ignore prepareEmbeddedEntities is deprecated in v9, prepareEmbeddedDocuments is the replacement.
    super.prepareEmbeddedDocuments();
  }

  // Use this to prevent race conditions / carry over data
  private _current_prepare_job_id!: number;
  private _job_tracker!: Map<number, Promise<AnyMMActor>>;
  private _prev_derived: this["data"]["data"]["derived"] | undefined;

  /** @override
   * We need to both:
   *  - Re-generate all of our subscriptions
   *  - Re-initialize our MM context
   */
  prepareDerivedData() {
    // If no id, leave
    if (!this.id) return;

    // Track which prepare iteration this is
    if (this._current_prepare_job_id == undefined) {
      this._current_prepare_job_id = 0;
      this._job_tracker = new Map();
    }
    this._current_prepare_job_id++;
    let job_id = this._current_prepare_job_id;

    // Reset subscriptions for new data
    this.setupLancerHooks();

    // Declare our derived data with a shorthand "dr" - we will be using it a lot
    let dr: this["data"]["data"]["derived"];

    // Default in fields
    let default_bounded = () => ({
      min: 0,
      max: 0,
      value: 0,
    });

    // If no value at present, set this up. Better than nothing. Reuse derived data when possible
    if (!this._prev_derived) {
      dr = {
        edef: 0,
        evasion: 0,
        save_target: 0,
        speed: 0,
        armor: 0,
        heat: default_bounded(),
        hp: { max: 0, value: 0 },
        overshield: default_bounded(),
        structure: default_bounded(),
        stress: default_bounded(),
        repairs: default_bounded(),
        mm: null, // we will set these momentarily
        mm_promise: null as any, // we will set these momentarily
      };
      this._prev_derived = dr;
    } else {
      // Otherwise, grab existing/prior
      dr = this._prev_derived;
    }
    // @ts-expect-error Should be fixed with v10 types
    this.system.derived = dr;

    // Update our known values now, synchronously.
    // @ts-expect-error Should be fixed with v10 types
    dr.hp.value = this.system.hp;
    if (this.is_mech() || this.is_npc() || this.is_deployable()) {
      // @ts-expect-error Should be fixed with v10 types
      let md = this.system;
      dr.heat.value = md.heat;
      if (!this.is_deployable()) {
        // @ts-expect-error Should be fixed with v10 types
        let md = this.system;
        dr.stress.value = md.stress;
        dr.structure.value = md.structure;
      }
    }

    // Break these out of this scope to avoid weird race scoping
    let actor_ctx = this._actor_ctx;

    // Begin the task of wrapping our actor. When done, it will setup our derived fields - namely, our max values
    // Need to wait for system ready to avoid having this break if prepareData called during init step (spoiler alert - it is)
    dr.mm_promise = system_ready
      .then(() => mm_wrap_actor(this, actor_ctx))
      .catch(async e => {
        // This is 90% of the time a token not being able to resolve itself due to canvas not loading yet
        console.warn("Token unable to prepare - hopefully trying again when canvas ready. In meantime, using dummy");
        console.warn(e);

        // Make a dummy value
        let ctx = new OpCtx();
        let env = new RegEnv();
        let reg = new StaticReg(env);
        let ent = await reg.get_cat(this.type).create_default(ctx);
        return ent;
      })
      .then(mm => {
        // If our job ticker doesnt match, then another prepared object has usurped us in setting these values.
        // We return this elevated promise, so anyone waiting on this task instead waits on the most up to date one
        if (job_id != this._current_prepare_job_id) {
          return this._job_tracker.get(this._current_prepare_job_id)! as any; // This will definitely be a different promise
        }

        // Delete all old tracked jobs
        for (let k of this._job_tracker.keys()) {
          if (k != job_id) {
            this._job_tracker.delete(k);
          }
        }

        // Always save the context
        // Save the context via defineProperty so it does not show up in JSON stringifies. Also, no point in having it writeable
        Object.defineProperties(dr, {
          mm: {
            enumerable: false,
            configurable: true,
            writable: false,
            value: mm,
          },
        });

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

        // If our max hp changed, do somethin'
        let curr_hp = mm.CurrentHP;
        let corrected_hp = hp_change_corrector(curr_hp, this.prior_max_hp, mm.MaxHP);
        if (curr_hp != corrected_hp) {
          // Cancel christmas. We gotta update ourselves to reflect the new HP change >:(
          console.warn(
            "TODO: figure out a more elegant way to update hp based on max hp than calling update in prepareData. Maybe only choice."
          );
        }

        // Set the general props. ALl actors have at least these
        dr.edef = mm.EDefense;
        dr.evasion = mm.Evasion;
        dr.speed = mm.Speed;
        dr.armor = mm.Armor;

        dr.hp.value = mm.CurrentHP;
        dr.hp.max = mm.MaxHP;

        dr.overshield.value = mm.Overshield;
        dr.overshield.max = mm.MaxHP; // as good a number as any I guess

        // Depending on type, setup derived fields more precisely as able
        if (!is_reg_pilot(mm)) {
          // All "wow, cool robot" type units have these
          dr.save_target = mm.SaveTarget;
          dr.heat.max = mm.HeatCapacity;
          dr.heat.value = mm.CurrentHeat;

          // If the Size of the ent has changed since the last update, set the
          // protype token size to the new size
          // @ts-expect-error Should be fixed with v10 types
          const cached_token_size = this.prototypeToken?.flags[game.system.id]?.mm_size;
          // @ts-expect-error Should be fixed with v10 types
          if (this.prototypeToken && (cached_token_size === undefined || cached_token_size !== mm.Size)) {
            const size = mm.Size <= 1 ? 1 : mm.Size;
            // @ts-expect-error Should be fixed with v10 types
            this.prototypeToken?.update({
              width: size,
              height: size,
              flags: {
                "hex-size-support": {
                  borderSize: size,
                  altSnapping: true,
                  evenSnap: !(size % 2),
                },
                [game.system.id]: {
                  mm_size: mm.Size,
                },
              },
            });
          }

          if (!is_reg_dep(mm)) {
            // Deployables don't have stress/struct
            dr.structure.max = mm.MaxStructure;
            dr.structure.value = mm.CurrentStructure;

            dr.stress.max = mm.MaxStress;
            dr.stress.value = mm.CurrentStress;
          }
          if (!is_reg_npc(mm)) {
            // Npcs don't have repairs
            dr.repairs.max = mm.RepairCapacity;
            dr.repairs.value = mm.CurrentRepairs;
          }
        }

        // Update prior max hp val
        this.prior_max_hp = dr.hp.max;

        // Now that data is set properly, force token to draw its bars
        this.getActiveTokens().forEach(token => {
          // Ensure the bars container exists before attempting to redraw the
          // bars. This check is necessary because foundry doesn't initialize
          // token components until draw is called.
          // TODO: Remove token.bars part of check when 0.8 compat removed
          // @ts-expect-error `bars` param not typed. `hud.bars` is in v9
          if (token.bars || token.hud?.bars) {
            token.drawBars();
          }
        });

        return mm;
      });
    this._job_tracker.set(job_id, dr.mm_promise);
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
    return allowed !== false ? this.update(updates) : this;
  }

  /** @override
   * Want to destroy derived data before passing it to an update
   */
  async update(...[data, context = undefined]: Parameters<Actor["update"]>) {
    // Never submit derived data. Typically won't show up here regardless
    // @ts-expect-error Sohouldn't appear on this data
    if (data?.derived) {
      // @ts-expect-error Shouldn't appear on this data
      delete data?.derived;
    }

    return super.update(data, context);
  }

  protected async _preCreate(...[data, options, user]: Parameters<Actor["_preCreate"]>): Promise<void> {
    await super._preCreate(data, options, user);
    // @ts-expect-error Should be fixed with v10 types
    if (data.system) {
      console.log(`${lp} New ${this.type} has data provided from an import, skipping default init.`, data);
      return;
    }

    console.log(`${lp} Initializing new ${this.type}`);
    let default_data: RegEntryTypes<LancerActorType> & { actions?: unknown };
    let disposition: ValueOf<typeof CONST["TOKEN_DISPOSITIONS"]> = CONST.TOKEN_DISPOSITIONS.FRIENDLY;
    switch (this.type) {
      case EntryType.NPC:
        default_data = funcs.defaults.NPC();
        disposition = CONST.TOKEN_DISPOSITIONS.HOSTILE;
        break;
      case EntryType.PILOT:
        default_data = funcs.defaults.PILOT();
        break;
      case EntryType.DEPLOYABLE:
        default_data = funcs.defaults.DEPLOYABLE();
        disposition = CONST.TOKEN_DISPOSITIONS.NEUTRAL;
        break;
      case EntryType.MECH:
      default:
        // Idk, just in case
        default_data = funcs.defaults.MECH();
        default_data.actions = { full: true };
        break;
    }
    // Sync the name
    default_data.name = this.name ?? default_data.name;

    // Put in the basics
    // @ts-expect-error Should be fixed with v10 types
    this.updateSource({
      system: default_data,
      img: TypeIcon(this.type),
      name: default_data.name,
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
    LancerHooks.call(this);

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
      const data = changed as DeepPartial<RegMechData | RegNpcData>;
      if (
        // @ts-expect-error Should be fixed with v10 types
        "heat" in (data.system ?? {}) &&
        // @ts-expect-error Should be fixed with v10 types
        (data?.system.heat ?? 0) > (this.system.derived.mm?.HeatCapacity ?? 0) &&
        // @ts-expect-error Should be fixed with v10 types
        (this.system.derived.mm?.CurrentStress ?? 0) > 0
      ) {
        prepareOverheatMacro(this);
      }
      if (
        // @ts-expect-error Should be fixed with v10 types
        "hp" in (data.system ?? {}) &&
        // @ts-expect-error Should be fixed with v10 types
        (data?.system.hp ?? 0) <= 0 &&
        // @ts-expect-error Should be fixed with v10 types
        (this.system.derived.mm?.CurrentStructure ?? 0) > 0
      ) {
        prepareStructureMacro(this);
      }
    }
  }

  // Ditto - items alter stats quite often
  _onUpdateEmbeddedDocuments(...args: Parameters<Actor["_onUpdateEmbeddedDocuments"]>) {
    super._onUpdateEmbeddedDocuments(...args);
    LancerHooks.call(this);
  }

  _onDelete(...args: Parameters<Actor["_onDelete"]>) {
    super._onDelete(...args);

    this.subscriptions?.forEach(subscription => {
      subscription.unsubscribe();
    });
    this.subscriptions = [];
  }

  setupLancerHooks() {
    // If we're a compendium document, don't actually do anything
    if (this.compendium) {
      return;
    }

    // Clear old subs
    this.subscriptions?.forEach(subscription => {
      subscription.unsubscribe();
    });
    this.subscriptions = [];

    let dependency: RegRef<LancerActorType> | null = null;
    // If we are a mech, we need to subscribe to our pilot (if it exists)
    if (this.is_mech()) {
      // @ts-expect-error Should be fixed with v10 types
      let mech_data = this.system;
      if (mech_data.pilot) {
        dependency = mech_data.pilot;
      }
    } else if (this.is_deployable()) {
      // If deployable, same deal
      // @ts-expect-error Should be fixed with v10 types
      let dep_data = this.system;
      if (dep_data.deployer) {
        dependency = dep_data.deployer;
      }
    }

    // Make a subscription for each
    if (dependency) {
      let sub = LancerHooks.on(dependency, async _ => {
        console.debug("Triggering subscription-based update on " + this.name);
        // We typically don't need to actually .update() ourselves when a dependency updates
        // Each client will individually prepareDerivedData in response to the update, and so there is no need for DB communication
        // Only exception is for cases like changes in max hp changing current HP - a tangible change in what data should be stored on this.
        // Said updates will be fied off in prepareData if necessary.
        this._actor_ctx = new OpCtx();
        this.prepareDerivedData();

        // Wait for it to be done
        // @ts-expect-error Should be fixed with v10 types
        await this.system.derived.mm_promise;

        // Trigger a render. Sheets may need to show something different now
        this.render();

        // Also, let any listeners on us know!
        LancerHooks.call(this);
      });
      this.subscriptions.push(sub);
    }
  }

  /**
   * Returns the overcharge rolls, modified by bonuses. Only applicable for mechs.
   */
  getOverchargeSequence(): string[] | null {
    // Function is only applicable to mechs.
    if (!this.is_mech()) return null;

    let oc_rolls = ["+1", "+1d3", "+1d6", "+1d6+4"];
    // @ts-expect-error Should be fixed with v10 types
    const mech = this.system.derived.mm;
    if (!mech) return oc_rolls;

    // @ts-expect-error Should be fixed with v10 types
    let oc_bonus = mech.AllBonuses.filter(b => {
      return b.LID === "overcharge";
    });
    if (oc_bonus.length > 0) {
      oc_rolls = oc_bonus[0].Value.split(",");
    }
    return oc_rolls;
  }

  /**
   * Returns the current overcharge roll/text. Only applicable for mechs.
   */
  getOverchargeRoll(): string | null {
    // Function is only applicable to mechs.
    if (!this.is_mech()) return null;

    const oc_rolls = this.getOverchargeSequence();
    if (!oc_rolls || oc_rolls.length < 4) return null;
    // @ts-expect-error Should be fixed with v10 types
    return oc_rolls[this.system.overcharge];
  }

  // Typeguards
  is_pilot(): this is LancerActor & { data: LancerActorDataProperties<EntryType.PILOT> } {
    return this.type === EntryType.PILOT;
  }
  is_mech(): this is LancerActor & { data: LancerActorDataProperties<EntryType.MECH> } {
    return this.type === EntryType.MECH;
  }
  is_npc(): this is LancerActor & { data: LancerActorDataProperties<EntryType.NPC> } {
    return this.type === EntryType.NPC;
  }
  is_deployable(): this is LancerActor & { data: LancerActorDataProperties<EntryType.DEPLOYABLE> } {
    return this.type === EntryType.DEPLOYABLE;
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
    robot: Mech | Npc,
    oldFrame: Frame | NpcClass | null,
    newFrame: Frame | NpcClass
  ): Promise<string> {
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
      this.prototypeToken?.texture?.src == oldFramePath ||
      // @ts-expect-error Should be fixed with v10 types
      this.prototypeToken?.texture?.src == defaultImg ||
      // @ts-expect-error Should be fixed with v10 types
      this.prototypeToken?.texture?.src?.includes("compcon-image-assets")
    ) {
      // @ts-expect-error Should be fixed with v10 types
      newData["prototypeToken.texture.src"] = newFramePath;
      changed = true;
    }

    // Check the actor
    if (this.img == oldFramePath || this.img == defaultImg) {
      newData.img = newFramePath;

      // Have to set our top level data in MM or it will overwrite it...
      robot.Flags.top_level_data.img = newFramePath;
      if (
        // @ts-expect-error Should be fixed with v10 types
        this.prototypeToken?.texture?.src?.includes("systems/lancer/assets/retrograde-minis") ||
        // @ts-expect-error Should be fixed with v10 types
        this.prototypeToken?.texture?.src == defaultImg
      ) {
        //we can override any retrograde assets, or the default image
        robot.Flags.top_level_data["prototypeToken.texture.src"] = newFramePath;
      } else {
        //do not override any custom tokens
        // @ts-expect-error Should be fixed with v10 types
        robot.Flags.top_level_data["prototypeToken.texture.src"] = this.prototypeToken?.texture?.src;
      }
      changed = true;
    }

    if (changed) {
      console.log(`${lp} Automatically updating image: `, newData);
      await this.update(newData);
    }

    return newFramePath;
  }
}

export type AnyMMActor = LiveEntryTypes<LancerActorType>;
export type LancerActorType = EntryType.MECH | EntryType.DEPLOYABLE | EntryType.NPC | EntryType.PILOT;
export const LancerActorTypes: LancerActorType[] = [
  EntryType.MECH,
  EntryType.DEPLOYABLE,
  EntryType.NPC,
  EntryType.PILOT,
];

export function is_actor_type(type: LancerActorType | LancerItemType): type is LancerActorType {
  return LancerActorTypes.includes(type as LancerActorType);
}

export function is_reg_pilot(actor: RegEntry<any>): actor is Pilot {
  return actor.Type === EntryType.PILOT;
}

export function is_reg_mech(actor: RegEntry<any>): actor is Mech {
  return actor.Type === EntryType.MECH;
}

export function is_reg_npc(actor: RegEntry<any>): actor is Npc {
  return actor.Type === EntryType.NPC;
}

export function is_reg_dep(actor: RegEntry<any>): actor is Deployable {
  return actor.Type === EntryType.DEPLOYABLE;
}
