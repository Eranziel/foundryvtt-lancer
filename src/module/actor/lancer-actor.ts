import { LANCER, replace_default_resource, TypeIcon } from "../config";
import {
  EntryType,
  funcs,
  RegMechData,
  Mech,
  Deployable,
  Npc,
  RegRef,
  RegDeployableData,
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
} from "machine-mind";
import { FoundryFlagData, FoundryReg, FoundryRegActorData } from "../mm-util/foundry-reg";
import { LancerHooks, LancerSubscription } from "../helpers/hooks";
import { mm_wrap_actor } from "../mm-util/helpers";
import { system_ready } from "../../lancer";
import { LancerItemType } from "../item/lancer-item";
import { renderMacroTemplate, prepareTextMacro, encodeMacroData } from "../macros";
import { RegEntry, MechWeapon, NpcFeature } from "machine-mind";
import { StabOptions1, StabOptions2 } from "../enums";
import { ActionData } from "../action";
import { handleActorExport } from "../helpers/io";
import { LancerMacroData } from "../interfaces";
const lp = LANCER.log_prefix;

export function lancerActorInit(base_actor: any, creation_args: any, sheet_options: any, id_maybe: any, something_or_other: any) {
  // Some subtype of ActorData
  console.log(`${lp} Initializing new ${base_actor.type}`);

  // Produce our default data
  let default_data: any = {};
  let display_mode: number = CONST.TOKEN_DISPLAY_MODES.ALWAYS;
  let disposition: number = CONST.TOKEN_DISPOSITIONS.FRIENDLY;
  switch (base_actor.type) {
    case EntryType.NPC:
      default_data = funcs.defaults.NPC();
      display_mode = CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER;
      disposition = CONST.TOKEN_DISPOSITIONS.HOSTILE;
      break;
    case EntryType.PILOT:
      default_data = funcs.defaults.PILOT();
      break;
    case EntryType.DEPLOYABLE:
      default_data = funcs.defaults.DEPLOYABLE();
      display_mode = CONST.TOKEN_DISPLAY_MODES.HOVER;
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
  default_data.name = base_actor.name ?? default_data.name;

  // Put in the basics
  return base_actor.data.update({
    data: default_data,
    img: TypeIcon(base_actor.type),
    "token.bar1": { attribute: "derived.current_hp" }, // Default Bar 1 to HP
    "token.bar2": { attribute: "derived.current_heat" }, // Default Bar 2 to Heat
    "token.displayName": display_mode,
    "token.displayBars": display_mode,
    "token.disposition": disposition,
    name: default_data.name,
    "token.name": base_actor.name ?? default_data.name, // Set token name to match internal
    "token.actorLink": [EntryType.PILOT, EntryType.MECH].includes(base_actor.type), // Link the token to the Actor for pilots and mechs, but not for NPCs or deployables
  });
}

// Use for HP, etc
interface BoundedValue {
  min: number;
  max: number;
  value: number;
}

/**
 * Extend the Actor class for Lancer Actors.
 */
export class LancerActor<T extends LancerActorType> extends Actor {
  data!: FoundryRegActorData<T> & {
    // TODO: update to match template
    data: {
      // Temporary action store.
      actions?: ActionData;

      // Include additional derived info
      derived: {
        // These are all derived and populated by MM
        current_hp: BoundedValue;
        current_heat: BoundedValue;
        current_stress: BoundedValue;
        current_structure: BoundedValue;
        current_repairs: BoundedValue;
        overshield: BoundedValue; // Though not truly a bounded value, useful to have it as such for bars etc

        // Other values we particularly appreciate having cached
        evasion: number;
        edef: number;
        save_target: number;
        speed: number;
        armor: number;
        // todo - bonuses and stuff. How to allow for accuracy?
      };
    };
  };

  /* -------------------------------------------- */

  // Tracks data propagation
  subscriptions: LancerSubscription[] = [];

  // Kept for comparing previous to next values
  prior_max_hp = -1;

  // Kept separately so it can be used by items. Same as in our .data.data.derived.mm_promise
  _actor_ctx!: OpCtx;

  /**
   * Performs overheat
   * For now, just rolls on table. Eventually we can include configuration to do automation
   */
  // TODO: Only let us overheat things that can actually overheat
  async overheat() {
    // Assert that we're on a mech or NPC
    if (this.data.type === EntryType.MECH) {
      this.overheatMech();
    } else if (this.data.type === EntryType.NPC) {
      ui.notifications.warn("Currently just doing normal mech overheats");
      this.overheatMech();
    } else {
      ui.notifications.warn("Can only overheat NPCs and Mechs");
      return;
    }
  }
  async overheatMech() {
    // Table of descriptions
    function stressTableD(roll: number, remStress: number) {
      switch (roll) {
        // Used for multiple ones
        case 0:
          return "The reactor goes critical – your mech suffers a reactor meltdown at the end of your next turn.";
        case 1:
          switch (remStress) {
            case 2:
              // Choosing not to auto-roll the checks to keep the suspense up
              return "Roll an ENGINEERING check. On a success, your mech is EXPOSED; on a failure, it suffers a reactor meltdown after 1d6 of your turns (rolled by the GM). A reactor meltdown can be prevented by retrying the ENGINEERING check as a full action.";
            case 1:
              return "Your mech suffers a reactor meltdown at the end of your next turn.";
            default:
              return "Your mech becomes Exposed.";
          }
        case 2:
        case 3:
        case 4:
          return "The power plant becomes unstable, beginning to eject jets of plasma. Your mech becomes EXPOSED, taking double kinetic, explosive and electric damage until the status is cleared.";
        case 5:
        case 6:
          return "Your mech’s cooling systems manage to contain the increasing heat; however, your mech becomes IMPAIRED until the end of your next turn.";
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

    let ent = (await this.data.data.derived.mm) as Mech | Npc;
    if (
      game.settings.get(LANCER.sys_name, LANCER.setting_automation) &&
      game.settings.get(LANCER.sys_name, LANCER.setting_auto_structure)
    ) {
      if (ent.CurrentHeat > ent.HeatCapacity) {
        // https://discord.com/channels/426286410496999425/760966283545673730/789297842228297748
        ent.CurrentHeat -= ent.HeatCapacity;
        ent.CurrentStress -= 1;
      }
    }
    if (ent.CurrentStress === ent.MaxStress) {
      ui.notifications.info("The mech is at full Stress, no overheating check to roll.");
      return;
    }
    await ent.writeback();
    let remStress = ent.CurrentStress;
    let templateData = {};

    // If we're already at 0 just kill em
    if (remStress > 0) {
      let damage = ent.MaxStress - ent.CurrentStress;
      // @ts-ignore .8
      let roll: Roll = await new Roll(`${damage}d6kl1`).evaluate({ async: true });
      let result = roll.total;

      let tt = await roll.getTooltip();
      let title = stressTableT[result];
      let text = stressTableD(result, remStress);
      let total = roll.total.toString();

      let secondaryRoll = "";

      // Critical
      // This is fine
      //@ts-ignore
      let one_count = roll.terms[0].results.reduce((a, v) => {
        return v.result === 1 ? a + 1 : a;
      }, 0);
      if (one_count > 1) {
        text = stressTableD(result, 1);
        title = stressTableT[0];
        total = "Multiple Ones";
      } else {
        if(result === 1 && remStress === 2) {
          let macroData = encodeMacroData({
            command: `game.lancer.prepareStatMacro("${ent.RegistryID}","mm.Eng");`,
            title: "Engineering",
          });

          secondaryRoll = `<button class="chat-macro-button"><a class="chat-button" data-macro="${macroData}"><i class="fas fa-dice-d20"></i> Engineering</a></button>`;
        }
      }
      templateData = {
        val: ent.CurrentStress,
        max: ent.MaxStress,
        tt: tt,
        title: title,
        total: total,
        text: text,
        roll: roll,
        secondaryRoll: secondaryRoll
      };
    } else {
      // You ded
      let title = stressTableT[0];
      let text = stressTableD(0, 0);
      templateData = {
        val: ent.CurrentStress,
        max: ent.MaxStress,
        title: title,
        text: text,
      };
    }
    const template = `systems/lancer/templates/chat/overheat-card.hbs`;
    const actor: Actor = game.actors.get(ChatMessage.getSpeaker().actor);
    return renderMacroTemplate(actor, template, templateData);
  }

  /**
   * Performs structure on the mech
   * For now, just rolls on table. Eventually we can include configuration to do automation
   */
  async structure() {
    // Assert that we're on a mech or NPC
    if (this.data.type === EntryType.MECH) {
      this.structureMech();
    } else if (this.data.type === EntryType.NPC) {
      ui.notifications.warn("Currently just doing normal mech structures");
      this.structureMech();
    } else {
      ui.notifications.warn("Can only structure NPCs and Mechs");
      return;
    }
  }

  async structureMech() {
    // Table of descriptions
    function structTableD(roll: number, remStruct: number) {
      switch (roll) {
        // Used for multiple ones
        case 0:
          return "Your mech is damaged beyond repair – it is destroyed. You may still exit it as normal.";
        case 1:
          switch (remStruct) {
            case 2:
              return "Roll a HULL check. On a success, your mech is STUNNED until the end of your next turn. On a failure, your mech is destroyed.";
            case 1:
              return "Your mech is destroyed.";
            default:
              return "Your mech is STUNNED until the end of your next turn.";
          }
        case 2:
        case 3:
        case 4:
          return "Parts of your mech are torn off by the damage. Roll 1d6. On a 1–3, all weapons on one mount of your choice are destroyed; on a 4–6, a system of your choice is destroyed. LIMITED systems and weapons that are out of charges are not valid choices. If there are no valid choices remaining, it becomes the other result. If there are no valid systems or weapons remaining, this result becomes a DIRECT HIT instead.";
        case 5:
        case 6:
          return "Emergency systems kick in and stabilize your mech, but it’s IMPAIRED until the end of your next turn.";
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

    let ent = (await this.data.data.derived.mm) as Mech | Npc;
    if (
      game.settings.get(LANCER.sys_name, LANCER.setting_automation) &&
      game.settings.get(LANCER.sys_name, LANCER.setting_auto_structure)
    ) {
      if (ent.CurrentHP <= 0) {
        ent.CurrentHP += ent.MaxHP;
        ent.CurrentStructure -= 1;
      }
    }
    if (ent.CurrentStructure === ent.MaxStructure) {
      ui.notifications.info("The mech is at full Structure, no structure check to roll.");
      return;
    }

    await ent.writeback();
    let remStruct = ent.CurrentStructure;
    let templateData = {};
    // If we're already at 0 just kill em
    if (remStruct > 0) {
      let damage = ent.MaxStructure - ent.CurrentStructure;

      // @ts-ignore .8
      let roll: Roll = await new Roll(`${damage}d6kl1`).evaluate({ async: true });
      let result = roll.total;

      let tt = await roll.getTooltip();
      let title = structTableT[result];
      let text = structTableD(result, remStruct);
      let total = roll.total.toString();

      let secondaryRoll = "";

      // Crushing hits
      // This is fine
      //@ts-ignore
      let one_count = roll.terms[0].results.reduce((a, v) => {
        return v.result === 1 ? a + 1 : a;
      }, 0);
      if (one_count > 1) {
        text = structTableD(result, 1);
        title = structTableT[0];
        total = "Multiple Ones";
      } else {
        if(result === 1 && remStruct === 2) {
          let macroData = encodeMacroData({
            command: `game.lancer.prepareStatMacro("${ent.RegistryID}","mm.Hull");`,
            title: "Hull",
          });

          secondaryRoll = `<button class="chat-macro-button"><a class="chat-button" data-macro="${macroData}"><i class="fas fa-dice-d20"></i>Hull</a></button>`;
        } else if (result >= 2 && result <= 4) {
          let macroData = encodeMacroData({
            // TODO: Should create a "prepareRollMacro" or something to handle generic roll-based macros
            // Since we can't change prepareTextMacro too much or break everyone's macros
            command: `
            let roll = new Roll('1d6').evaluate({async: false});
            let result = roll.total;
            if(result<=3) { 
              game.lancer.prepareTextMacro("${ent.RegistryID}","Destroy Weapons",\`
              <div class="dice-roll lancer-dice-roll">
                <div class="dice-result">
                  <div class="dice-formula lancer-dice-formula flexrow">
                    <span style="text-align: left; margin-left: 5px;">\${ roll.formula }</span>
                    <span class="dice-total lancer-dice-total major">\${ result }</span>
                  </div>
                </div>
              </div>
              <span>On a 1–3, all weapons on one mount of your choice are destroyed</span>\`);
            } else {
              game.lancer.prepareTextMacro("${ent.RegistryID}","Destroy Systems",\`
              <div class="dice-roll lancer-dice-roll">
                <div class="dice-result">
                  <div class="dice-formula lancer-dice-formula flexrow">
                    <span style="text-align: left; margin-left: 5px;">\${ roll.formula }</span>
                    <span class="dice-total lancer-dice-total major">\${ result }</span>
                  </div>
                </div>
              </div>
              <span>On a 4–6, a system of your choice is destroyed</span>\`);
            }`,
            title: "Roll for Destruction",
          });

          secondaryRoll = `<button class="chat-macro-button"><a class="chat-button" data-macro="${macroData}"><i class="fas fa-dice-d20"></i>Destroy</a></button>`;
        }
      }
      templateData = {
        val: ent.CurrentStructure,
        max: ent.MaxStructure,
        tt: tt,
        title: title,
        total: total,
        text: text,
        roll: roll,
        secondaryRoll: secondaryRoll
      };
    } else {
      // You ded
      let title = structTableT[0];
      let text = structTableD(0, 0);
      templateData = {
        val: ent.CurrentStructure,
        max: ent.MaxStructure,
        title: title,
        text: text,
      };
    }
    const template = `systems/lancer/templates/chat/structure-card.hbs`;
    const actor: Actor = game.actors.get(ChatMessage.getSpeaker().actor);
    return renderMacroTemplate(actor, template, templateData);
  }

  // Fully repair actor
  // Even pilots can be fully repaired
  async full_repair() {
    let ent = await this.data.data.derived.mm_promise;

    ent.CurrentHP = ent.MaxHP;

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
    }

    // I believe the only thing a pilot needs
    if (is_reg_pilot(ent)) {
      let mech = await ent.ActiveMech();
      if (mech) {
        await mech.Flags.orig_doc.full_repair();
      }
    }

    if (!is_dep(this)) await this.restore_all_items();
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
    let ent = (await this.data.data.derived.mm_promise) as Mech | Pilot | Npc | Deployable;
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
      ui.notifications.warn("Cannot reload deployables");
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
   * Stabilize this actor, given two choices that have already been made
   * @param o1  Choice 1, Cooling or Repairing
   * @param o2  Choice 2, Reloading, removing Burn, or clearing own or adjacent ally condition
   * @returns   Details to be printed to chat
   */
  async stabilize(o1: StabOptions1, o2: StabOptions2): Promise<string> {
    let ent = await this.data.data.derived.mm_promise;
    let skip = false;

    let return_text = "";

    if (!(is_reg_mech(ent) || is_reg_npc(ent))) {
      ui.notifications.warn("This can't be stabilized!");
      return "";
    }

    if (o1 === StabOptions1.Cool) {
      return_text = return_text.concat("Mech is cooling itself. Please clear Exposed manually<br>");
      ent.CurrentHeat = 0;
      await ent.writeback();
    } else if (o1 === StabOptions1.Repair) {
      if (is_reg_mech(ent) && ent.CurrentRepairs === 0) {
        return "Mech has decided to repair, but doesn't have any repair left. Please try again<br>";
      } else if (is_reg_mech(ent)) {
        ent.CurrentRepairs -= 1;
      }
      ent.CurrentHP = ent.MaxHP;
      await ent.writeback();
    } else {
      return ``;
    }

    switch (o2) {
      case StabOptions2.ClearBurn:
        return_text = return_text.concat("Mech has selected full burn clear. Please clear manually");
        break;
      case StabOptions2.ClearOtherCond:
        return_text = return_text.concat("Mech has selected to clear an allied condition. Please clear manually");
        break;
      case StabOptions2.ClearOwnCond:
        return_text = return_text.concat("Mech has selected to clear own condition. Please clear manually");
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

  // Imports an old-style compcon pilot sync code
  async importCC(data: PackedPilotData, clearFirst = false) {
    if (this.data.type !== "pilot") {
      return;
    }
    if (data == null) return;
    if (clearFirst) await this.clearBadData();

    try {
      const mm = await this.data.data.derived.mm_promise;
      // This block is kept for posterity, in case we want to re-implement automatic folder creation.
      // Get/create folder for sub-actors
      // let unit_folder_name = `${data.callsign}'s Units`;
      // let unit_folder = game.folders.getName(unit_folder_name);
      // if (!unit_folder) {
      //   unit_folder = await Folder.create({
      //     name: unit_folder_name,
      //     type: "Actor",
      //     sorting: "a",
      //     // @ts-ignore  ActorData has folder, always, as far as I can tell
      //     parent: this.data.folder || null,
      //   });
      // }
      let unit_folder = this.folder;
      console.log("Unit folder id:", unit_folder?.id);
      //@ts-ignore 0.8
      let permission = duplicate(this.data._source.permission);

      // Check whether players are allowed to create Actors
      if (!game.user.can("ACTOR_CREATE")) {
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
        // @ts-ignore
        sync_deployable_nosave: (dep: Deployable) => {
          let flags = dep.Flags as FoundryFlagData<EntryType.DEPLOYABLE>;
          let owned_name = dep.Name.includes(data.callsign) ? dep.Name : `${data.callsign}'s ${dep.Name}`;
          flags.top_level_data["name"] = owned_name;
          flags.top_level_data["folder"] = unit_folder ? unit_folder.id : null;
          flags.top_level_data["token.name"] = owned_name;
          flags.top_level_data["permission"] = permission;
          // dep.writeback(); -- do this later, after setting active!
          synced_deployables.push(dep);
        },
        // Rename and rehome mechs
        sync_mech: (mech: Mech) => {
          let flags = mech.Flags as FoundryFlagData<EntryType.MECH>;
          flags.top_level_data["name"] = mech.Name;
          flags.top_level_data["folder"] = unit_folder ? unit_folder.id : null;
          flags.top_level_data["token.name"] = data.callsign;
          flags.top_level_data["permission"] = permission;
          // TODO: Retrogrades
        },
        // Set pilot token
        sync_pilot: (pilot: Pilot) => {
          let flags = pilot.Flags as FoundryFlagData<EntryType.PILOT>;
          let new_img = replace_default_resource(flags.top_level_data["img"], pilot.CloudPortrait);
          flags.top_level_data["name"] = pilot.Name;
          flags.top_level_data["img"] = new_img;
          flags.top_level_data["token.name"] = pilot.Callsign;
          flags.top_level_data["token.img"] = new_img;
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
      (await (synced_data as any).Mechs()).forEach((m: Mech) => m.Flags.orig_doc.render());

      ui.notifications.info("Successfully loaded pilot new state.");
    } catch (e) {
      console.warn(e);
      ui.notifications.warn("Failed to update pilot, likely due to missing LCP data: " + e.message);
    }
  }

  async clearBadData() {
    // @ts-ignore .8
    await this.deleteEmbeddedDocuments("Item", Array.from(this.data.items.keys()));
  }

  /* -------------------------------------------- */

  /** @override
   * We want to reset our ctx before this. It is used by our items, such that they all can share
   * the same ctx space.
   */
  prepareEmbeddedEntities() {
    this._actor_ctx = new OpCtx();
    super.prepareEmbeddedEntities();
  }

  // Use this to prevent race conditions / carry over data
  private _current_prepare_job_id!: number;
  private _job_tracker!: Map<number, Promise<AnyMMActor>>;
  private _prev_derived!: this["data"]["data"]["derived"];

  /** @override
   * We need to both:
   *  - Re-generate all of our subscriptions
   *  - Re-initialize our MM context
   */
  prepareDerivedData() {
    // If no id, leave
    if(!this.id) return;

    // Track which prepare iteration this is
    if(this._current_prepare_job_id == undefined) {
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
    if(!this._prev_derived) {
      dr = {
        edef: 0,
        evasion: 0,
        save_target: 0,
        speed: 0,
        armor: 0,
        current_heat: default_bounded(),
        current_hp: default_bounded(),
        overshield: default_bounded(),
        current_structure: default_bounded(),
        current_stress: default_bounded(),
        current_repairs: default_bounded(),
        mm: null, // we will set these momentarily
        mm_promise: null as any, // we will set these momentarily
      };
      this._prev_derived = dr;
    } else {
      // Otherwise, grab existing/prior
      dr = this._prev_derived
    }
    this.data.data.derived = dr;

    // Update our known values now, synchronously. 
    dr.current_hp.value = this.data.data.current_hp
    if(this.data.type != EntryType.PILOT) {
      let md = this.data.data as RegEntryTypes<EntryType.MECH | EntryType.NPC | EntryType.DEPLOYABLE>;
      dr.current_heat.value = md.current_heat;
      if(this.data.type != EntryType.DEPLOYABLE) {
        let md = this.data.data as RegEntryTypes<EntryType.MECH | EntryType.NPC>;
        dr.current_stress.value = md.current_stress;
        dr.current_structure.value = md.current_structure;
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
        let ent = await reg.get_cat(this.data.type).create_default(ctx);
        return ent;
      })
      .then(mm => {
        // If our job ticker doesnt match, then another prepared object has usurped us in setting these values. 
        // We return this elevated promise, so anyone waiting on this task instead waits on the most up to date one
        if(job_id != this._current_prepare_job_id) {
          return this._job_tracker.get(this._current_prepare_job_id)! as any; // This will definitely be a different promise
        }

        // Delete all old tracked jobs
        for(let k of this._job_tracker.keys()) {
          if(k != job_id) {
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
            value: mm
          }
        });

        // Changes in max-hp should heal the actor. But certain requirements must be met
        // - Must know prior (would be in dr.current_hp.max). If 0, do nothing
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

        dr.current_hp.value = mm.CurrentHP;
        dr.current_hp.max = mm.MaxHP;

        dr.overshield.value = mm.Overshield;
        dr.overshield.max = mm.MaxHP; // as good a number as any I guess

        // Depending on type, setup derived fields more precisely as able
        if (mm.Type != EntryType.PILOT) {
          let robot = mm as Mech | Npc | Deployable;

          // All "wow, cool robot" type units have these
          dr.save_target = robot.SaveTarget;
          dr.current_heat.max = robot.HeatCapacity;
          dr.current_heat.value = robot.CurrentHeat;

          if (robot.Type != EntryType.DEPLOYABLE) {
            // Deployables don't have stress/struct
            dr.current_structure.max = robot.MaxStructure;
            dr.current_structure.value = robot.CurrentStructure;

            dr.current_stress.max = robot.MaxStress;
            dr.current_stress.value = robot.CurrentStress;
          }
          if (robot.Type != EntryType.NPC) {
            // Npcs don't have repairs
            dr.current_repairs.max = robot.RepairCapacity;
            dr.current_repairs.value = robot.CurrentRepairs;
          }
        }

        // Update prior max hp val
        this.prior_max_hp = dr.current_hp.max;

        // Now that data is set properly, force token to draw its bars
        if (this.isToken && (this.token as any).bars) {
          // Just redraw self
          try {
            (this.token as any).drawBars();
          } catch (e) {}
        } else {
          // Redraw all active tokens
          for (let token of this.getActiveTokens()) {
            if ((token as any).bars) {
              try {
                (token as any).drawBars();
              } catch (e) {}
            }
          }
        }

        return mm;
      });
      this._job_tracker.set(job_id, dr.mm_promise);
  }

  /** @override
   * Want to destroy derived data before passing it to an update
   */
  async update(data: any, options: any = undefined) {
    // Never submit derived data. Typically won't show up here regardless
    if (data?.derived) {
      delete data.data.derived;
    }

    return super.update(data, options);
  }

  /** @override
   * On the result of an update, we want to cascade derived data.
   */
  _onUpdate(...args: any) {
    //@ts-ignore Incorrect typings
    super._onUpdate(...args);
    LancerHooks.call(this);
  }

  // Ditto - items alter stats quite often
  _onModifyEmbeddedEntity(...args: any) {
    //@ts-ignore Incorrect typings
    super._onModifyEmbeddedEntity(...args);
    LancerHooks.call(this);
  }

  _onDelete(...args: any) {
    //@ts-ignore Incorrect typings
    super._onDelete(...args);

    this.subscriptions?.forEach(subscription => {
      subscription.unsubscribe();
    });
    this.subscriptions = [];
  }

  setupLancerHooks() {
    // If we're a compendium entity, don't actually do anything
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
    if (this.data.type == EntryType.MECH) {
      let mech_data = (this.data.data as unknown) as RegMechData;
      if (mech_data.pilot) {
        dependency = mech_data.pilot;
      }
    } else if (this.data.type == EntryType.DEPLOYABLE) {
      // If deployable, same deal
      let dep_data = (this.data.data as unknown) as RegDeployableData;
      if (dep_data.deployer) {
        dependency = dep_data.deployer;
      }
    }

    // Make a subscription for each
    if (dependency) {
      let sub = LancerHooks.on(dependency, async (_: any) => {
        console.debug("Triggering subscription-based update on " + this.name);
        // We typically don't need to actually .update() ourselves when a dependency updates
        // Each client will individually prepareDerivedData in response to the update, and so there is no need for DB communication
        // Only exception is for cases like changes in max hp changing current HP - a tangible change in what data should be stored on this.
        // Said updates will be fied off in prepareData if necessary.
        this._actor_ctx = new OpCtx();
        this.prepareDerivedData();

        // Wait for it to be done
        await this.data.data.derived.mm_promise;

        // Trigger a render. Sheets may need to show something different now
        this.render();

        // Also, let any listeners on us know!
        LancerHooks.call(this);
      });
      this.subscriptions.push(sub);
    }
  }

  /**
   * Returns the current overcharge roll/text
   * Only applicable for pilots
   * Overkill for now but there are situations where we'll want this to be configurable
   */
  getOverchargeRoll(): string | null {
    // Function is only applicable to pilots.
    if (this.data.type !== EntryType.MECH) return null;

    const data = this.data as LancerMechData;

    switch (data.data.current_overcharge) {
      case 1:
        return "1d3";
      case 2:
        return "1d6";
      case 3:
        return "1d6+4";
      default:
        return "1";
    }
  }
}

// Discrete types for all of our possible generic values
export type LancerMech = LancerActor<EntryType.MECH>;
export type LancerMechData = FoundryRegActorData<EntryType.MECH>;
export type LancerNpc = LancerActor<EntryType.NPC>;
export type LancerNpcData = FoundryRegActorData<EntryType.NPC>;
export type LancerPilot = LancerActor<EntryType.PILOT>;
export type LancerPilotData = FoundryRegActorData<EntryType.PILOT>;
export type LancerDeployable = LancerActor<EntryType.DEPLOYABLE>;
export type LancerDeployableData = FoundryRegActorData<EntryType.DEPLOYABLE>;

export type AnyLancerActor = LancerActor<LancerActorType>;
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

export function is_pilot(actor: LancerActor<any>): actor is LancerActor<EntryType.PILOT> {
  return actor.data.type === EntryType.PILOT;
}

export function is_mech(actor: LancerActor<any>): actor is LancerActor<EntryType.MECH> {
  return actor.data.type === EntryType.MECH;
}

export function is_npc(actor: LancerActor<any>): actor is LancerActor<EntryType.NPC> {
  return actor.data.type === EntryType.NPC;
}

export function is_dep(actor: LancerActor<any>): actor is LancerActor<EntryType.DEPLOYABLE> {
  return actor.data.type === EntryType.DEPLOYABLE;
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
