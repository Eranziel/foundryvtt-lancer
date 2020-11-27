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
const lp = LANCER.log_prefix;

export const DEFAULT_MECH = {
  name: "",
  size: 1,
  hull: 0,
  agility: 0,
  systems: 0,
  engineering: 0,
  hp: { min: 0, max: 0, value: 0 },
  structure: { min: 0, max: 4, value: 4 },
  heat: { min: 0, max: 0, value: 0 },
  stress: { min: 0, max: 4, value: 4 },
  repairs: { min: 0, max: 0, value: 0 },
  armor: 0,
  speed: 0,
  evasion: 0,
  edef: 0,
  sensors: 0,
  save: 0,
  tech_attack: 0,
  current_core_energy: 1,
  overcharge_level: 0,
};

export function lancerActorInit(data: any) {
  // Some subtype of ActorData
  console.log(`${lp} Initializing new ${data.type}`);

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
    "token.bar1": { attribute: "current_hp" }, // Default Bar 1 to HP
    "token.bar2": { attribute: "current_heat" }, // Default Bar 2 to Heat
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

  /**
   * Change mech frames for a pilot. Recalculates all mech-related stats on the pilot.
   * @param newFrame Stats object from the new mech frame.
   * @param oldFrame Stats object from the old mech frame, optional.
   */
  async swapFrames(/*newFrame: LancerFrameStatsData, oldFrame?: LancerFrameStatsData*/): Promise<
    void
  > {
    console.log("Disabled");
  }

  /**
   * Returns the current frame used by the actor as an item
   * Only applicable for pilots
   */
  /*
  getCurrentFrame(): LancerFrameItemData | null {
    // Function is only applicable to pilots.
    if (this.data.type !== "pilot") return null;


    let item_data = (this.items as unknown) as LancerItemData[]; 
    let sorted = new ItemDataManifest().add_items(item_data.values());

    // Only take one frame
    if (sorted.frames.length) {
      return (sorted.frames[0].data as unknown) as LancerFrameItemData;
    } else {
      return null
    }
  }
    */

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
 * Handlebars helper for a mount type selector for Pilot sheets
 * @param mount The mount object tied to the selector
 * @param key The index of the mount object
 */
export function mount_type_selector(mount: LancerMountData, key: string | number) {
  let template = `<select class="mounts-control" data-action="update" data-item-id=${key}>
    <option value="${MountType.AuxAux}" ${
    mount.type === MountType.AuxAux ? "selected" : ""
  }>Aux/Aux Mount</option>
    <option value="${MountType.Flex}" ${
    mount.type === MountType.Flex ? "selected" : ""
  }>Flexible Mount</option>
    <option value="${MountType.Main}" ${
    mount.type === MountType.Main ? "selected" : ""
  }>Main Mount</option>
    <option value="${MountType.MainAux}" ${
    mount.type === MountType.MainAux ? "selected" : ""
  }>Main/Aux Mount</option>
    <option value="${MountType.Heavy}" ${
    mount.type === MountType.Heavy ? "selected" : ""
  }>Heavy Mount</option>
    <option value="${MountType.Integrated}" ${
    mount.type === MountType.Integrated ? "selected" : ""
  }>Integrated Mount</option>
  </select>`;
  return template;
}

/**
 * Handlebars partial for a Pilot sheet mount card.
 */
export const mount_card = `<div class="flexcol lancer-mount-container" data-item-key="{{key}}">
  <span class="mount-header clipped-top">
    {{{mount-selector mount @index}}}
    <a class="mounts-control" data-action="delete"><i class="fas fa-trash"></i></a>
  </span>
  <span class="lancer-mount-body">
    {{#unless mount.weapons}}
    <span class="major"><br>Drag a Mech Weapon Here</span>
    {{/unless}}
    {{#if mount.weapons}}
    {{#each mount.weapons as |weapon key|}}
    {{> mech-weapon-preview weapon=weapon key=key}}
    {{/each}}
    {{/if}}
  </span>
</div>`;

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

/**
 * Handlebars helper for an overcharge button
 * Currently this is overkill, but eventually we want to support custom overcharge values
 * @param level Level of overcharge, between 0 (1) and 3 (1d6+4)
 */
export function overcharge_button(level: number) {
  let template = `<div class="overcharge-container">
      <a class="overcharge-button" style="width:90%;height:90%">
        1
      </a>
    </div>`;
  return template;
}
