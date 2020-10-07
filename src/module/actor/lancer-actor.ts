import {
  LancerPilotActorData,
  LancerNPCActorData,
  LancerDeployableActorData,
  LancerFrameStatsData,
  LancerNPCClassStatsData,
  LancerNPCData,
  LancerMountData,
} from "../interfaces";
import { LANCER } from "../config";
import { MountType } from "machine-mind";
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
  current_core_energy: 1
};

export function lancerActorInit(data: any) {
  // Some subtype of ActorData
  console.log(`${lp} Initializing new ${data.type}`);
  if (data.type === "pilot" || data.type === "npc") {
    const mech = { ...DEFAULT_MECH };

    if (data.type === "npc") {
      mech.structure.value = 1;
      mech.structure.max = 1;
      mech.stress.value = 1;
      mech.stress.max = 1;
    }

    mergeObject(data, {
      // Initialize mech stats
      "data.mech": mech,
      // Initialize prototype token
      "token.bar1": { attribute: "mech.hp" }, // Default Bar 1 to HP
      "token.bar2": { attribute: "mech.heat" }, // Default Bar 2 to Heat
      "token.displayName": CONST.TOKEN_DISPLAY_MODES.ALWAYS, // Default display name to be always on
      "token.displayBars": CONST.TOKEN_DISPLAY_MODES.ALWAYS, // Default display bars to be always on
      // Default disposition to friendly for pilots and hostile for NPCs
      "token.disposition":
        data.type === "pilot"
          ? CONST.TOKEN_DISPOSITIONS.FRIENDLY
          : CONST.TOKEN_DISPOSITIONS.HOSTILE,
      "token.name": data.name, // Set token name to actor name
      "token.actorLink": data.type === "pilot", // Link the token to the Actor for pilots, but not for NPCs
    });
  } else if (data.type === "deployable") {
    mergeObject(data, {
      // Initialize image
      img: "systems/lancer/assets/icons/deployable.svg",
      // Initialize prototype token
      "token.bar1": { attribute: "hp" }, // Default Bar 1 to HP
      "token.displayName": CONST.TOKEN_DISPLAY_MODES.HOVER, // Default display name to be always on
      "token.displayBars": CONST.TOKEN_DISPLAY_MODES.HOVER, // Default display bars to be always on
      "token.name": data.name, // Set token name to actor name
    });
  }
}

/**
 * Extend the Actor class for Lancer Actors.
 */
export class LancerActor extends Actor {
  data!: LancerPilotActorData | LancerNPCActorData | LancerDeployableActorData;

  /**
   * Change mech frames for a pilot. Recalculates all mech-related stats on the pilot.
   * @param newFrame Stats object from the new mech frame.
   * @param oldFrame Stats object from the old mech frame, optional.
   */
  async swapFrames(newFrame: LancerFrameStatsData, oldFrame?: LancerFrameStatsData): Promise<void> {
    // Function is only applicable to pilots.
    if (this.data.type !== "pilot") return;

    const data = duplicate(this.data) as LancerPilotActorData;
    const mech = duplicate((this.data as LancerPilotActorData).data.mech);

    if (!oldFrame) {
      oldFrame = {
        size: 0,
        armor: 0,
        hp: 0,
        evasion: 0,
        edef: 0,
        heatcap: 0,
        repcap: 0,
        sensor_range: 0,
        tech_attack: 0,
        save: 0,
        speed: 0,
        sp: 0,
      };
    }
    // Resources
    mech.hp.max = mech.hp.max - oldFrame.hp + newFrame.hp;
    mech.hp.value = Math.min(mech.hp.value, mech.hp.max);
    mech.heat.max = mech.heat.max - oldFrame.heatcap + newFrame.heatcap;
    mech.heat.value = Math.min(mech.heat.value, mech.heat.max);
    mech.repairs.max = mech.repairs.max - oldFrame.repcap + newFrame.repcap;
    mech.repairs.value = Math.min(mech.repairs.value, mech.repairs.max);

    // Stats
    mech.size = mech.size - oldFrame.size + newFrame.size;
    mech.armor = Math.max(mech.armor - oldFrame.armor + newFrame.armor, 0);
    mech.speed = mech.speed - oldFrame.speed + newFrame.speed;
    mech.evasion = mech.evasion - oldFrame.evasion + newFrame.evasion;
    mech.edef = mech.edef - oldFrame.edef + newFrame.edef;
    mech.sensors = mech.sensors - oldFrame.sensor_range + newFrame.sensor_range;
    mech.save = mech.save - oldFrame.save + newFrame.save;
    mech.tech_attack = mech.tech_attack - oldFrame.tech_attack + newFrame.tech_attack;
    mech.sp = mech.sp - oldFrame.sp + newFrame.sp;

    // Update the actor
    data.data.mech = mech;
    await this.update(data);
  }

  /**
   * Change Class or Tier on a NPC. Recalculates all stats on the NPC.
   * @param newNPCClass Stats object from the new Class.
   */
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
}

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
    <option value="${MountType.Flex}" ${mount.type === MountType.Flex ? "selected" : ""}>Flexible Mount</option>
    <option value="${MountType.Main}" ${mount.type === MountType.Main ? "selected" : ""}>Main Mount</option>
    <option value="${MountType.MainAux}" ${
      mount.type === MountType.MainAux ? "selected" : ""
    }>Main/Aux Mount</option>
    <option value="${MountType.Heavy}" ${mount.type === MountType.Heavy ? "selected" : ""}>Heavy Mount</option>
    <option value="${MountType.Integrated}" ${
      mount.type === MountType.Integrated ? "selected" : ""
    }>Integrated Mount</option>
  </select>`;
  return template;
}

/**
 * Handlebars partial for a Pilot sheet mount card.
 */
export const mount_card = `<div class="flexcol lancer-mount-container" data-item-id="{{key}}">
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
export function npc_tier_selector(tier: LancerNPCData["tier"]) {
  let template = `<select id="tier-type" class="tier-control" data-action="update">
    <option value="npc-tier-1" ${tier === "npc-tier-1" ? "selected" : ""}>TIER 1</option>
    <option value="npc-tier-2" ${tier === "npc-tier-2" ? "selected" : ""}>TIER 2</option>
    <option value="npc-tier-3" ${tier === "npc-tier-3" ? "selected" : ""}>TIER 3</option>
    <option value="npc-tier-custom" ${tier === "npc-tier-custom" ? "selected" : ""}>CUSTOM</option>
  </select>`;
  return template;
}
