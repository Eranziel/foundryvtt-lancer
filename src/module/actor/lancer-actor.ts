import {
  LancerPilotActorData,
  LancerNPCActorData,
  LancerDeployableActorData,
  LancerNPCData,
  LancerMountData,
} from "../interfaces";
import { LANCER, LancerActorType } from "../config";
import { EntryType, MountType, funcs, RegEntryTypes } from "machine-mind";
import { FoundryRegActorData, FoundryRegItemData } from "../mm-util/foundry-reg";
import { renderMacro } from "../macros";
const lp = LANCER.log_prefix;

export function lancerActorInit(data: any) {
  // Some subtype of ActorData
  console.log(`${lp} Initializing new ${data.type}`);
  // If it has an ID it's a duplicate, so we don't want to override values
  if (!data._id && (data.type === "pilot" || data.type === "npc")) {

  // Produce our default data
  let default_data: any = {};
  let display_mode: number = CONST.TOKEN_DISPLAY_MODES.ALWAYS;
  let disposition: number = CONST.TOKEN_DISPOSITIONS.FRIENDLY;
  switch (data.type) {
    case EntryType.NPC:
      default_data = funcs.defaults.NPC();
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
      break;
  }
  // Put in the basics
  mergeObject(data, {
    data: default_data,
    img: `systems/lancer/assets/icons/${data.type}.svg`,
    // TODO: NPCs still need to use mech.hp and mech.heat
    "token.bar1": { attribute: "hp" }, // Default Bar 1 to HP
    "token.bar2": { attribute: "heat" }, // Default Bar 2 to Heat
    "token.displayName": display_mode,
    "token.displayBars": display_mode,
    "token.disposition": disposition,
    name: data.name ?? default_data.name, // Set name to match internal
    "token.name": data.name ?? default_data.name, // Set token name to match internal
    "token.actorLink": [EntryType.PILOT, EntryType.MECH].includes(data.type), // Link the token to the Actor for pilots and mechs, but not for NPCs or deployables
  });

  console.log(data);
}

/**
 * Extend the Actor class for Lancer Actors.
 */
export class LancerActor<T extends LancerActorType> extends Actor {
  data!: FoundryRegActorData<T>;

  // Some TypeGuards...
  isPilot = (
    data: LancerPilotActorData | LancerNPCActorData | LancerDeployableActorData
  ): data is LancerPilotActorData => data.type === "Pilot";
  isNPC = (
    data: LancerPilotActorData | LancerNPCActorData | LancerDeployableActorData
  ): data is LancerNPCActorData => data.type === "NPC";
  isDep = (
    data: LancerPilotActorData | LancerNPCActorData | LancerDeployableActorData
  ): data is LancerDeployableActorData => data.type === "deployable";

  /**
   * @override
   * Handle how changes to a Token attribute bar are applied to the Actor.
   * @param {string} attribute    The attribute path
   * @param {number} value        The target attribute value
   * @param {boolean} isDelta     Whether the number represents a relative change (true) or an absolute change (false)
   * @param {boolean} isBar       Whether the new value is part of an attribute bar, or just a direct value
   * @return {Promise<Actor>}     The updated Actor entity
   */
  async modifyTokenAttribute(
    attribute: any,
    value: number,
    isDelta: boolean = false,
    isBar: boolean = true
  ) {
    const current = getProperty(this.data.data, attribute);
    if (isBar) {
      if (isDelta) value = Number(current.value) + value;
      return this.update({ [`data.${attribute}.value`]: value });
    } else {
      if (isDelta) value = Number(current) + value;
      return this.update({ [`data.${attribute}`]: value });
    }
  }

  /**
   * Returns the current frame used by the actor as an item
   * Only applicable for pilots
   */
  getCurrentFrame(): LancerFrameItemData | null {
    // Function is only applicable to pilots.
    if (this.data.type !== "pilot") return null;

    let item_data = (this.items as unknown) as LancerItemData[];
    let sorted = new ItemDataManifest().add_items(item_data.values());

    // Only take one frame
    if (sorted.frames.length) {
      return (sorted.frames[0].data as unknown) as LancerFrameItemData;
    } else {
      return null;
    }
  }

  /**
   * Returns the current overcharge roll/text
   * Only applicable for pilots
   * Overkill for now but there are situations where we'll want this to be configurable
   */
  getOverchargeRoll(): string | null {
    // Function is only applicable to pilots.
    if (this.data.type !== "pilot") return null;

    const data = this.data as LancerPilotActorData;

    switch (data.data.mech.overcharge_level) {
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

  /**
   * Change Class or Tier on a NPC. Recalculates all stats on the NPC.
   * @param newNPCClass Stats object from the new Class.
   */
  /*
  async swapNPCClassOrTier(
    newNPCClass: LancerNPCClassStatsData,
    ClassSwap: boolean,
    tier?: string
  ): Promise<void> {
    // Function is only applicable to NPCs.
    if (this.data.type !== "npc") return;

    let data = duplicate(this.data) as LancerNPCActorData;
    const mech = duplicate((this.data as LancerNPCActorData).data.mech);

    if (ClassSwap) {
      data.data.tier = "npc-tier-1";
      tier = "npc-tier-1";
    }
    let i = 0;
    data.data.tier_num = 1;
    switch (tier) {
      case "npc-tier-custom":
        data.data.tier_num = 4;
        await this.update(data);
        return;
      case "npc-tier-2":
        data.data.tier_num = 2;
        i = 1;
        break;
      case "npc-tier-3":
        data.data.tier_num = 3;
        i = 2;
    }
    console.log(`LANCER| Swapping to Tier ${data.data.tier_num}`);

    //HASE
    mech.hull = newNPCClass.hull[i];
    mech.agility = newNPCClass.agility[i];
    mech.systems = newNPCClass.systems[i];
    mech.engineering = newNPCClass.engineering[i];

    // Resources
    mech.hp.max = newNPCClass.hp[i];
    mech.hp.value = mech.hp.max;
    mech.heat.max = newNPCClass.heatcap[i];
    mech.heat.value = 0;
    if (Array.isArray(newNPCClass.structure) && newNPCClass.structure[i]) {
      mech.structure.max = newNPCClass.structure[i];
      mech.structure.value = mech.structure.max;
    } else {
      mech.structure.max = 1;
      mech.structure.value = 1;
    }
    if (Array.isArray(newNPCClass.stress) && newNPCClass.stress[i]) {
      mech.stress.max = newNPCClass.stress[i];
      mech.stress.value = mech.stress.max;
    } else {
      mech.stress.max = 1;
      mech.stress.value = 1;
    }

    // Stats
    mech.size = newNPCClass.size[i];
    mech.armor = newNPCClass.armor[i];
    mech.speed = newNPCClass.speed[i];
    mech.evasion = newNPCClass.evasion[i];
    mech.edef = newNPCClass.edef[i];
    mech.sensors = newNPCClass.sensor_range[i];
    mech.save = newNPCClass.save[i];
    if (Array.isArray(newNPCClass.size) && newNPCClass.size[i]) {
      mech.size = newNPCClass.size[i];
      if (newNPCClass.size[i] === 0.5) {
        data.data.npc_size = "size-half";
      } else {
        data.data.npc_size = `size-${newNPCClass.size[i]}`;
      }
    } else {
      mech.size = 1;
      data.data.npc_size = `size-1`;
    }
    data.data.activations = newNPCClass.activations[i];

    // Update the actor
    data.data.mech = mech;
    await this.update(data);
  }
  */

  /**
   * Performs overheat on the mech
   * For now, just rolls on table. Eventually we can include configuration to do automation
   */
  async overheatMech() {
    // Assert that we aren't on a deployable somehow
    if (this.isDep(this.data)) {
      return;
    }

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
              return "Roll an ENGINEERING check. On a success, your mech is EXPOSED; on a failure, it suffers a reactor meltdown after 1d6 of your turns (rolled by the GM). A reactor meltdown can be prevented by retrying the ENGINEERING check as a free action.";
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

    const mech = this.data.data.mech;
    if (
      game.settings.get(LANCER.sys_name, LANCER.setting_automation) &&
      game.settings.get(LANCER.sys_name, LANCER.setting_auto_structure)
    ) {
      if (mech.heat.value > mech.heat.max) {
        // https://discord.com/channels/426286410496999425/760966283545673730/789297842228297748
        mech.heat.value -= (mech.heat.max);
        mech.stress.value -= 1;
      }
    }
    if (mech.stress.value === mech.stress.max) {
      ui.notifications.info("The mech is at full Stress, no overheating check to roll.");
      return;
    }
    await this.update(this.data);
    let remStress = mech.stress.value;
    let templateData = {};

    // If we're already at 0 just kill em
    if (remStress > 0) {
      let damage = mech.stress.max - mech.stress.value;

      let roll = new Roll(`${damage}d6kl1`).roll();
      let result = roll.total;

      let tt = await roll.getTooltip();
      let title = stressTableT[result];
      let text = stressTableD(result, remStress);
      let total = roll.total.toString();

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
      }
      templateData = {
        val: mech.stress.value,
        max: mech.stress.max,
        tt: tt,
        title: title,
        total: total,
        text: text,
        roll: roll,
      };
    } else {
      // You ded
      let title = stressTableT[0];
      let text = stressTableD(0, 0);
      templateData = {
        val: mech.stress.value,
        max: mech.stress.max,
        title: title,
        text: text,
      };
    }
    const template = `systems/lancer/templates/chat/overheat-card.html`;
    const actor: Actor = game.actors.get(ChatMessage.getSpeaker().actor);
    return renderMacro(actor, template, templateData);
  }

  /**
   * Performs structure on the mech
   * For now, just rolls on table. Eventually we can include configuration to do automation
   */
  async structureMech() {
    // Assert that we aren't on a deployable somehow
    if (this.isDep(this.data)) {
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
              // Choosing not to auto-roll the checks to keep the suspense up
              return "Roll a HULL check. On a success, your mech is STUNNED until the end of your next turn. On a failure, your mech is destroyed.";
            case 1:
              return "Your mech is destroyed.";
            default:
              return "Your mech is STUNNED until the end of your next turn.";
          }
        case 2:
        case 3:
        case 4:
          // Idk, should this auto-roll?
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

    const mech = this.data.data.mech;
    if (
      game.settings.get(LANCER.sys_name, LANCER.setting_automation) &&
      game.settings.get(LANCER.sys_name, LANCER.setting_auto_structure)
    ) {
      if (mech.hp.value <= 0) {
        mech.hp.value += mech.hp.max;
        mech.structure.value -= 1;
      }
    }
    if (mech.structure.value === mech.structure.max) {
      ui.notifications.info("The mech is at full Structure, no structure check to roll.");
      return;
    }
    await this.update(this.data);
    let remStruct = mech.structure.value;
    let templateData = {};
    // If we're already at 0 just kill em
    if (remStruct > 0) {
      let damage = mech.structure.max - mech.structure.value;

      let roll = new Roll(`${damage}d6kl1`).roll();
      let result = roll.total;

      let tt = await roll.getTooltip();
      let title = structTableT[result];
      let text = structTableD(result, remStruct);
      let total = roll.total.toString();

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
      }
      templateData = {
        val: mech.structure.value,
        max: mech.structure.max,
        tt: tt,
        title: title,
        total: total,
        text: text,
        roll: roll,
      };
    } else {
      // You ded
      let title = structTableT[0];
      let text = structTableD(0, 0);
      templateData = {
        val: mech.structure.value,
        max: mech.structure.max,
        title: title,
        text: text,
      };
    }
    const template = `systems/lancer/templates/chat/structure-card.html`;
    const actor: Actor = game.actors.get(ChatMessage.getSpeaker().actor);
    return renderMacro(actor, template, templateData);
  }
  */

  /* -------------------------------------------- */

  /** @override
   * Prepare any derived data which is actor-specific and does not depend on Items or Active Effects
   */
  prepareBaseData() {
    // console.log("Prepare base", this.data.name, this.data);
    // switch ( this.data.type ) {
      // case EntryType.PILOT:
        // break;
      // case "npc":
        // break;
      // case "vehicle":
        // break;
    // }
  }

  /* -------------------------------------------- */

  /** @override */
  prepareDerivedData() {
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

/* ------------------------------------ */
/* Handlebars Helpers                    */
/* ------------------------------------ */


/**
 * Handlebars helper for an NPC tier selector
 * @param tier The tier ID string
 */
export function npc_tier_selector(tier: number) {
  let template = `<select id="tier-type" class="tier-control" data-action="update">
    <option value="npc-tier-1" ${tier === 1 ? "selected" : ""}>TIER 1</option>
    <option value="npc-tier-2" ${tier === 2 ? "selected" : ""}>TIER 2</option>
    <option value="npc-tier-3" ${tier === 3 ? "selected" : ""}>TIER 3</option>
    <option value="npc-tier-custom" ${
      tier != 1 && tier != 2 && tier != 3 ? "selected" : ""
    }>CUSTOM</option>
  </select>`;
  return template;
}
