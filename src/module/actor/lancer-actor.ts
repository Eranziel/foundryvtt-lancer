import { LANCER, replace_default_resource, TypeIcon } from "../config";
import { LancerHooks, LancerSubscription } from "../helpers/hooks";
// import { LancerFRAME, LancerItem, LancerItemType, LancerNPC_CLASS } from "../item/lancer-item";
import { renderMacroTemplate, encodeMacroData, prepareOverheatMacro, prepareStructureMacro } from "../macros";
import { DamageType, EntryType, FittingSize, MountType, StabOptions1, StabOptions2, WeaponSize } from "../enums";
import { fix_modify_token_attribute } from "../token";
import { AppliedDamage } from "./damage-calc";
import { SystemData, SystemDataType, SystemTemplates } from "../system-template";
import { SourceData, SourceDataType } from "../source-template";
import * as defaults from "../util/unpacking/defaults";
import { PackedPilotData } from "../util/unpacking/packed-types";
import { getAutomationOptions } from "../settings";
import { pilotInnateEffect } from "../effects/converter";
import { LancerFRAME, LancerItem, LancerNPC_CLASS, LancerNPC_FEATURE } from "../item/lancer-item";
import { LancerActiveEffect } from "../effects/lancer-active-effect";
import { LancerActiveEffectConstructorData } from "../effects/lancer-active-effect";
import { filter_resolved_sync } from "../helpers/commons";
import { ChangeWatchHelper } from "../util/misc";
import { frameToPath } from "./retrograde-map";
import { EffectHelper } from "../effects/effector";
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

// Track deletions here to avoid double-tapping delete of active effects.
const deleteIdCache = new Set<string>();
const deleteIdCacheCleanup = foundry.utils.debounce(() => deleteIdCache.clear(), 20_000); // If 20 seconds pass without us modifying delete id cache, wipe it

/**
 * Extend the Actor class for Lancer Actors.
 */
export class LancerActor extends Actor {
  // Kept for comparing previous to next values / doing deltas
  _passdownEffectTracker = new ChangeWatchHelper(); // Holds effects that are/will be passed down to descendants. Invalidation means we must pass down effects again

  /** Helps us manage our ephemeral effects, as well as providing miscellaneous utility functions */
  effectHelper = new EffectHelper(this);

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
          "system.hp": hp.value + hp.max,
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
  async fullRepair() {
    // Remove all statuses affecting this mech. Keep active effects generally - most are positive
    await this.effectHelper.removeAllStatuses();

    // Remove unequipped items
    this._deleteUnequippedItems();

    let changes: Record<string, any> = {
      // @ts-expect-error System's broken unless narrowed
      "system.hp": this.system.hp.max,
      "system.burn": 0,
      "system.overshield": 0,
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
      changes["system.overcharge"] = 0;
      changes["system.repairs"] = this.system.repairs.max;
      changes["system.meltdown_timer"] = null;
    }

    // Pilots propagate a repair to their mech
    if (this.is_pilot()) {
      await this.system.active_mech?.value?.fullRepair();
    }

    if (!this.is_deployable()) await this.restoreAllItems();
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

  // List the all equipped loadout items on this actor
  // For mechs this is everthing in system.loadout, IE: Mech weapons, Mech Systems, Frame
  private listLoadout(): Array<LancerItem> {
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
    }
    return result;
  }

  /**
   * Find all limited systems and set them to their max/repaired/ideal state
   */
  async restoreAllItems() {
    let fixes = this.listLoadout().map(i =>
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
  async repairAllItems() {
    return Promise.all(this.listLoadout().map(i => this.refresh(i, { repair: true })));
  }

  /**
   * Find all owned weapons and (generate the changes necessary to) reload them
   */
  reloadAllItems() {
    return this.listLoadout().map(i => this.refresh(i, { reload: true }));
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
      this.effectHelper.removeActiveEffect("exposed");
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
        item_changes = this.reloadAllItems();
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
    if (this.effectHelper.findEffect("exposed")) {
      armored_damage_types.forEach(d => (damage[d] *= 2));
    }

    /**
     * Step 2: Reduce damage due to armor.
     * Step 3: Reduce damage due to resistance.
     * Armor reduction may favor attacker or defender depending on automation.
     * Default is "favors defender".
     */
    if (!paracausal && !this.effectHelper.findEffect("shredded")) {
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
    if (this.hasHeatcap()) {
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
      // Aggregate sp/ai
      let equipped_sp = 0;
      let equipped_ai = 0;
      for (let system of this.system.loadout.systems) {
        if (system.status == "resolved") {
          equipped_sp += system.value.system.sp;
          equipped_ai += system.value.system.tags.some(t => t.is_ai) ? 1 : 0;
        }
      }
      for (let mount of this.system.loadout.weapon_mounts) {
        for (let slot of mount.slots) {
          if (slot.weapon?.status == "resolved") {
            equipped_sp += slot.weapon.value.system.sp;
          }
          if (slot.mod?.status == "resolved") {
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
      sys.armor = this.system.stats.armor;
      sys.edef = this.system.stats.edef;
      sys.evasion = this.system.stats.evasion;
      this.system.heat.max = this.system.stats.heatcap;
      sys.hp.max = this.system.stats.hp;
      sys.save = this.system.stats.save;
      sys.size = this.system.stats.size;
      sys.speed = this.system.stats.speed;
    }
  }

  /** @override
   * We need to, in order:
   *  - Mark things as equipped
   *  - Finalize derived data on weaponry based on fully prepared actor statistics
   */
  prepareDerivedData() {
    // Track equipping if pilot or mech
    if (this.is_pilot()) {
      // Mark things equipped
      let ld = this.system.loadout;
      for (let armor of ld.armor) {
        if (armor?.status == "resolved") {
          armor.value.system.equipped = true;
        }
      }
      for (let weapon of ld.weapons) {
        if (weapon?.status == "resolved") {
          weapon.value.system.equipped = true;
        }
      }
      for (let gear of ld.gear) {
        if (gear?.status == "resolved") {
          gear.value.system.equipped = true;
        }
      }
    } else if (this.is_mech()) {
      // Mark things equipped
      let ld = this.system.loadout;
      if (ld.frame?.status == "resolved") {
        ld.frame.value.system.equipped = true;
      }
      for (let system of ld.systems) {
        if (system.status == "resolved") {
          system.value.system.equipped = true;
        }
      }
      for (let mount of this.system.loadout.weapon_mounts) {
        for (let slot of mount.slots) {
          if (slot.weapon?.status == "resolved") {
            slot.weapon.value.system.equipped = true;
          }
          if (slot.mod?.status == "resolved") {
            slot.mod.value.system.equipped = true;
          }
        }
      }
    }

    // Ask items to prepare their final attributes using weapon_bonuses / equip information
    for (let item of this.items.contents) {
      // @ts-expect-error
      item.prepareFinalAttributes(this.system);
    }

    // Track shift in values. Use optional to handle compendium bulk-created items, which handle strangely
    this._passdownEffectTracker?.setValue(this.effectHelper.collectPassdownEffects());
  }

  /** @override
   * Want to preserve our arrays, so we use full_update_data to hydrate our update data
   */
  async update(data: any, options: any = {}) {
    // @ts-expect-error
    data = this.system.full_update_data(data);
    return super.update(data, options);
  }

  /** @override
   * This is mostly copy-pasted from Actor.modifyTokenAttribute to allow negative hps, which are useful for structure checks
   */
  async modifyTokenAttribute(attribute: string, value: any, isDelta = false, isBar = true) {
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

  /** @override
   * This is overridden to pre-populate with slightly more sensible data,
   * such as nicer icons and default names, token dispositions, etc
   */
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
   * Upon an actor being updated, we want to trigger automated cleanup, effect generation, etc
   */
  protected _onUpdate(...[changed, options, user]: Parameters<Actor["_onUpdate"]>) {
    console.log("OnUpdate");
    super._onUpdate(changed, options, user);
    if (game.userId != user || !this.isOwner) {
      return;
    }

    // Many of the operations below MIGHT cause DB operations (async operations!).
    // We can't really await them here, nor should we - they will re-trigger an onUpdate as necessary
    // Remove unresolved references.
    this._cleanupUnresolvedReferences();

    // First try to regenerate our innate effect. If this is a no-op, it won't actually do any db operations
    if (this.is_pilot()) {
      this.effectHelper.setEphemeralEffects(this.uuid, [pilotInnateEffect(this)]);
    }

    // Then re-asset all of our item effects
    for (let item of this.items.contents) {
      if (item.isEquipped()) {
        this.effectHelper.setEphemeralEffectsFromItem(item);
      } else {
        this.effectHelper.clearEphemeralEffects(item.uuid);
      }
    }

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
      if ((data.system?.heat ?? 0) > this.system.heat.max && this.system.stress.value > 0) {
        prepareOverheatMacro(this);
      }
      if ((data.system?.hp ?? 1) <= 0 && this.system.structure.value > 0) {
        prepareStructureMacro(this);
      }
    }

    // If the Size of the ent has changed since the last update, set the
    // protype token size to the new size
    // @ts-expect-error System's broken
    if (this.prototypeToken?.width !== this.system.size) {
      // @ts-expect-error System's broken
      const size = Math.max(1, this.system.size);
      // @ts-expect-error
      this.prototypeToken?.update({
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
  }

  /** @inheritdoc
   * Due to the complex effects equipment can have on an actors statistical values, it is necessary to be sure our
   * effects are kept in lockstep as items are created, updated, and deleted
   */
  _onCreateEmbeddedDocuments(
    embeddedName: "Item" | "ActiveEffect",
    documents: LancerItem[] | LancerActiveEffect[],
    result: any,
    options: any,
    user: string
  ) {
    console.log("OnCreateEmbedded", embeddedName, documents);
    super._onCreateEmbeddedDocuments(embeddedName, documents, result, options, user);
    if (game.userId != user) {
      return;
    }

    // Create effects from new items
    if (embeddedName == "Item") {
      for (let item of documents as LancerItem[]) {
        if (item.isEquipped()) {
          this.effectHelper.setEphemeralEffectsFromItem(item);
        }
      }
    } else {
      this.propagateEffects(); // Effects have changed
    }
  }

  /** @inheritdoc */
  _onUpdateEmbeddedDocuments(
    embeddedName: "Item" | "ActiveEffect",
    documents: LancerItem[] | LancerActiveEffect[],
    result: any,
    options: any,
    user: string
  ) {
    console.log("OnUpdateEmbedded", embeddedName, documents);
    super._onUpdateEmbeddedDocuments(embeddedName, documents, result, options, user);
    if (game.userId != user) {
      return;
    }

    // (Possibly) update effects from updated items, if the effects they provide have changed & item is equipped
    if (embeddedName == "Item") {
      for (let item of documents as LancerItem[]) {
        if (item.isEquipped() && item._generatedEffectTracker.isDirty) {
          this.effectHelper.setEphemeralEffectsFromItem(item);
        }
      }
    } else {
      this.propagateEffects(); // Effects have changed
    }
  }

  /** @inheritdoc */
  _onDeleteEmbeddedDocuments(
    embeddedName: "Item" | "ActiveEffect",
    documents: LancerItem[] | LancerActiveEffect[],
    result: any,
    options: any,
    user: string
  ) {
    console.log("OnDeleteEmbedded", embeddedName, documents);
    super._onDeleteEmbeddedDocuments(embeddedName, documents, result, options, user);
    // Mark them all as deleted
    for (let doc of documents) {
      deleteIdCache.add(doc.uuid);
    }
    deleteIdCacheCleanup();

    // Only continue if we did this
    if (game.userId != user) {
      return;
    }

    // Clear effects from deleted items
    if (embeddedName == "Item") {
      for (let item of documents as LancerItem[]) {
        this.effectHelper.clearEphemeralEffects(item.uuid);
      }
      this._cleanupUnresolvedReferences();
    } else {
      this.propagateEffects(); // Effects have changed
    }
  }

  /**
   * Delete an active effect(s) without worrying if its been deleted before.
   * There is still technically an _exceedingly_ narrow window in which we can get duplicate deletion of effects, but this mitigates it
   */
  async _safeDeleteEmbedded(collection: "Item" | "ActiveEffect", ...effects: ActiveEffect[] | Item[]): Promise<any> {
    if (!effects.length) return;
    let toDelete = [];
    for (let e of effects) {
      let u = e.uuid ?? "";
      if (!deleteIdCache.has(u)) {
        deleteIdCache.add(u);
        toDelete.push(e.id!);
      }
    }
    deleteIdCacheCleanup();
    return this.deleteEmbeddedDocuments(collection, toDelete);
  }

  /**
   * Sends appropriate active effects to "children".
   * Utilizes passdown effect tracker to minimize how often we actually send it. As such, feel free to call it as often as you want
   * TODO: Minimally update???
   * Debounced
   */
  propagateEffects = foundry.utils.debounce((force: boolean = false) => this.propagateEffectsInner(force), 500);
  propagateEffectsInner(force: boolean = false) {
    if (!force && !this._passdownEffectTracker.isDirty) {
      console.log("Skipping a passdown");
      return;
    }
    console.log("Performing a passdown");
    const propagateTo = (target: LancerActor) => {
      console.debug(`Actor ${this.name} propagating effects to ${target.name}`);
      // Add new from this pilot
      let changes: LancerActiveEffectConstructorData[] = foundry.utils.duplicate(
        this._passdownEffectTracker.curr_value
      );
      changes.forEach(c => (c.flags.lancer.passdown_parent = this.uuid));
      target.effectHelper.setEphemeralEffects(this.uuid, changes);
    };

    // Call this whenever update this actors stats in any meaningful way
    if (this.is_pilot()) {
      if (this.system.active_mech?.status == "resolved") {
        propagateTo(this.system.active_mech.value);
      }
    } else {
      // Send to deployables TODO
    }
  }

  /**
   * Check our items for any that aren't equipped, and delete them
   */

  _deleteUnequippedItems() {
    let deletables: LancerItem[] = [];

    // Flag all unequipped mech equipment
    for (let item of this.items.contents) {
      if (item.id && this.is_mech()) {
        if (
          (item.is_frame() || item.is_mech_system() || item.is_mech_weapon() || item.is_weapon_mod()) &&
          !item.system.equipped
        ) {
          deletables.push(item);
        }
      } else if (item.id && this.is_pilot()) {
        if ((item.is_pilot_armor() || item.is_pilot_weapon() || item.is_pilot_gear()) && !item.system.equipped) {
          deletables.push(item);
        }
      }
    }
    // Kill!
    if (deletables.length) this._safeDeleteEmbedded("Item", ...deletables);
  }

  /**
   * Check our loadout as applicable to cleanup any unresolved references
   */
  _cleanupUnresolvedReferences() {
    // Bundled updates are theoretically rare, but if they ever were to occur its better than just first-instinct-updating 30 times
    let killedIds: string[] = [];
    if (this.is_pilot()) {
      // @ts-expect-error
      let cleanupLoadout = duplicate(this.system._source.loadout) as SourceData.Pilot["loadout"];
      let currLoadout = this.system.loadout;
      // Fairly simple
      cleanupLoadout.armor = cleanupLoadout.armor.map((_, index) => {
        if (currLoadout.armor[index]?.status == "missing") {
          killedIds.push(cleanupLoadout.armor[index]!);
          return null;
        } else {
          return cleanupLoadout.armor[index];
        }
      });
      cleanupLoadout.gear = cleanupLoadout.gear.map((_, index) => {
        if (currLoadout.gear[index]?.status == "missing") {
          killedIds.push(cleanupLoadout.gear[index]!);
          return null;
        } else {
          return cleanupLoadout.gear[index];
        }
      });
      cleanupLoadout.weapons = cleanupLoadout.weapons.map((_, index) => {
        if (currLoadout.weapons[index]?.status == "missing") {
          killedIds.push(cleanupLoadout.weapons[index]!);
          return null;
        } else {
          return cleanupLoadout.weapons[index];
        }
      });

      // Only cleanup on length mismatch
      if (killedIds.length) {
        console.log(`Cleaning up unresolved ids ${killedIds.join(", ")}...`);
        this.update({ system: { loadout: cleanupLoadout } });
      }
    } else if (this.is_mech()) {
      // @ts-expect-error
      let cleanupLoadout = duplicate(this.system._source.loadout) as SourceData.Mech["loadout"];
      let currLoadout = this.system.loadout;
      // Frame is simple
      if (currLoadout.frame?.status == "missing") {
        killedIds.push(currLoadout.frame.id);
        cleanupLoadout.frame = null;
      }

      // Systems are annoying. Remove all missing references corresponding source entry, then mark as needing cleanup if that shortened our array
      cleanupLoadout.systems = cleanupLoadout.systems.filter((_, index) => {
        if (currLoadout.systems[index].status == "missing") {
          killedIds.push(currLoadout.systems[index].id);
          return false;
        } else {
          return true;
        }
      });

      // Weapons are incredibly annoying. Traverse and nullify corresponding slots
      for (let i = 0; i < currLoadout.weapon_mounts.length; i++) {
        let mount = currLoadout.weapon_mounts[i];
        for (let j = 0; j < mount.slots.length; j++) {
          let slot = mount.slots[j];
          if (slot.mod?.status == "missing") {
            cleanupLoadout.weapon_mounts[i].slots[j].mod = null;
            killedIds.push(slot.mod.id);
          }
          if (slot.weapon?.status == "missing") {
            cleanupLoadout.weapon_mounts[i].slots[j].weapon = null;
            killedIds.push(slot.weapon.id);
          }
        }
      }

      // Only update if necessary
      if (killedIds.length) {
        console.log(`Cleaning up unresolved ids ${killedIds.join(", ")}...`);
        this.update({ system: { loadout: cleanupLoadout } });
      }
    }
    // Deployables and NPCs don't have embedded junk, so we don't mess with 'em
  }
  /**
   * Yields a simple error message on a misconfigured mount, or null if no issues detected.
   * @param mount Specific mount to validate
   */
  validateMount(mount: SystemData.Mech["loadout"]["weapon_mounts"][0]): string | null {
    if (this.is_mech()) {
      let loadout = this.system.loadout;
      let hasBracing = loadout.weapon_mounts.some(m => m.bracing);
      let hasSuper = false;
      let hasFlexMain = false;
      let weaponCount = 0;
      let result = "";

      // If someone has messed up fittings, then they probably did so on purpose.
      // Thus, we only check that within each slot the size makes sense

      for (let slot of mount.slots) {
        if (slot.weapon?.status != "resolved") continue;
        weaponCount += 1;
        // if (slot.weapon.value.system.size == WeaponSize.)

        // See if it fits
        const weaponSizeScore =
          {
            [WeaponSize.Aux]: 1,
            [WeaponSize.Main]: 2,
            [WeaponSize.Heavy]: 3,
            [WeaponSize.Superheavy]: 3,
          }[slot.weapon.value.system.size] ?? 4;
        const fittingSizeScore =
          {
            [FittingSize.Auxiliary]: 1,
            [FittingSize.Main]: 2,
            [FittingSize.Flex]: 2,
            [FittingSize.Heavy]: 3,
            [FittingSize.Integrated]: 4,
          }[slot.size] ?? 0;
        if (weaponSizeScore > fittingSizeScore) {
          result += `Weapon of size ${slot.weapon.value.system.size} cannot fit on fitting of size ${slot.size}. `;
          continue;
        }
        if (slot.size == FittingSize.Flex && weaponSizeScore > 1) {
          hasFlexMain = true;
        }
        if (slot.weapon.value.system.size == WeaponSize.Superheavy) {
          hasSuper = true;
        }
      }

      if (hasFlexMain && weaponCount > 1) {
        result += `Flex mounts can either have two Auxillary or one Main weapon.`;
      }

      if (hasSuper && !hasBracing) {
        result += `Superheavy weapons require a mount to be set as "Bracing".`;
      }

      return result || null;
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
  hasHeatcap(): this is { system: SystemTemplates.heat } {
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
    let oldFramePath = frameToPath[oldFrame?.name || ""];
    let newFramePath = frameToPath[newFrame?.name || ""];
    let defaultImg = robot.is_mech()
      ? "systems/lancer/assets/icons/mech.svg"
      : "systems/lancer/assets/icons/npc_class.svg";

    if (!newFramePath) newFramePath = defaultImg;
    let changed = false;
    let newData: Parameters<this["update"]>[0] = {};

    // First deduce if either our token or actor images are candidates for overwrite
    let isStandard = (x: string) =>
      x == oldFramePath ||
      x == defaultImg ||
      x.includes("compcon-image-assets" || x.includes("systems/lancer/assets/retrograde-minis"));
    // @ts-expect-error Should be fixed with v10 types
    let isTokenStandard = isStandard(this.prototypeToken?.texture?.src || oldFramePath);
    let isActorStandard = isStandard(this.img || oldFramePath);

    // Check the token
    if (isTokenStandard) {
      newData["prototypeToken.texture.src"] = newFramePath;
      changed = true;
    }

    // Check the actor
    if (isActorStandard) {
      newData.img = newFramePath;
      changed = true;
    }

    if (changed) {
      console.log(`${lp} Automatically updating image: `, newData);
      await this.update(newData);
    }

    return newFramePath;
  }

  // Checks that the provided document is not null, and is a lancer actor
  static async fromUuid(x: string | LancerActor, messagePrefix?: string): Promise<LancerActor> {
    if (x instanceof LancerActor) return x;
    x = (await fromUuid(x)) as LancerActor;
    if (!x) {
      let message = `${messagePrefix ? messagePrefix + " | " : ""}Actor ${x} not found.`;
      ui.notifications?.error(message);
      throw new Error(message);
    }
    if (!(x instanceof LancerActor)) {
      let message = `${messagePrefix ? messagePrefix + " | " : ""}Document ${x} not an actor.`;
      ui.notifications?.error(message);
      throw new Error(message);
    }
    return x;
  }

  // Checks that the provided document is not null, and is a lancer actor
  static fromUuidSync(x: string | LancerActor, messagePrefix?: string): LancerActor {
    if (x instanceof LancerActor) return x;
    x = fromUuidSync(x) as LancerActor;
    if (!x) {
      let message = `${messagePrefix ? messagePrefix + " | " : ""}Actor ${x} not found.`;
      ui.notifications?.error(message);
      throw new Error(message);
    }
    if (!(x instanceof LancerActor)) {
      let message = `${messagePrefix ? messagePrefix + " | " : ""}Document ${x} not an actor.`;
      ui.notifications?.error(message);
      throw new Error(message);
    }
    return x;
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
