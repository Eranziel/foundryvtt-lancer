// TODO: This needs a complete once-over as a lot of the stuff in here appears broken
import { nanoid } from "nanoid";
import type { LancerActor } from "../actor/lancer-actor";
import {
  PackedMechData,
  PackedMechLoadoutData,
  PackedPilotData,
  PackedPilotLoadoutData,
} from "../util/unpacking/packed-types";

// GOODBYE LEGACY TYPES
type LegacyLancerActor = {
  name: string;
  data: {
    type: string;
    data?: {
      cc_ver?: string;
    };
  };
};

/**
 * LEGACY: Exports an actor into a compatible format for importing (faked C/C style).
 * @param actor actor to export to fake C/C data.
 * @param download whether to trigger an automatic download of the json file.
 * @returns the export in object form, or null if error occurred.
 */
export function handleActorExport(actor: LegacyLancerActor | LancerActor, download = true) {
  // TODO: replace check with version check and appropriate export handler.
  if (!validForExport(actor)) {
    // ui.notifications!.warn("Exporting for this version of actor is currently unsupported.");
    return null;
  }

  let dump = null;
  // @ts-expect-error Should be fixed with v10 types
  switch (actor.type) {
    case "pilot":
      // @ts-expect-error I'm just going to assume all of this works but it probably doesn't
      dump = handlePilotExport(actor);
      break;
    case "mech":
      // dump = handlePilotExport(actor);
      break;
    case "npc":
      // @ts-expect-error I'm just going to assume all of this works but it probably doesn't
      dump = handleNPCExport(actor);
      break;
  }

  if (dump == null) {
    ui.notifications!.warn("Exporting ran into an issue, or actor type is not supported.");
    return null;
  }

  if (download) {
    const a = document.createElement("a");
    const dumpFile = new Blob([JSON.stringify(dump, undefined, 2)], { type: "text/plain" });
    a.href = URL.createObjectURL(dumpFile);
    a.download = `${actor.name.toLocaleLowerCase().replace(" ", "_")}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return dump;
}

export function addExportButton(actor: LegacyLancerActor | LancerActor, html: JQuery) {
  // @ts-expect-error I'm just going to assume all of this works but it probably doesn't
  const id = actor._id;
  if (!document.getElementById(id) && validForExport(actor)) {
    // if (!document.getElementById(id)) {

    // Don't create a second link on re-renders;
    const link = $(`<a id="${id}"><i class="fas fa-external-link-alt"></i>Export</a>`);
    link.on("click", () => handleActorExport(actor));
    html.parent().parent().find(".window-title").after(link);
  }
}

//
// Pilot
type FakePackedEquipmentState = {
  id: string;
  destroyed: boolean;
  uses?: number;
  cascading: false;
  customDamageType?: null;
};
type FakePackedWeapon = {
  size: string;
  weapon: {
    id: string;
    uses: number;
    destroyed: boolean;
    cascading: false;
    loaded?: boolean;
    mod: FakePackedEquipmentState | null;
    customDamageType: null;
    selectedProfile: number;
  };
};
type FakePackedMount = {
  mount_type: string;
  lock: false;
  slots: FakePackedWeapon[];
  extra: FakePackedWeapon[];
  bonus_effects: string[];
};

//
// NPC
type FakePackedNPC = {
  id: string;
  class: string;
  tier: number;
  name: string;
  labels: [];
  templates: string[];
  items: { itemID: string; tier: number; destroyed: false; charged: boolean; uses: number }[];
  stats: object;
  currentStats: object;
  note: "";
  side: "Enemy";
  statuses: [];
  conditions: [];
  resistances: [];
  burn: number;
  overshield: number;
  destroyed: false;
  actions: number;
};

//
// HANDLERS
function handleNPCExport(actor: LegacyLancerActor) {
  const data = actor as any;
  console.log(`Exporting NPC: ${data.name}`);

  const items = (data as any).items;
  const mech = data.mech;
  const cla = items.find((item: any) => item.type === "npc_class");
  const stats: object = {
    activations: (data as any).activations,
    armor: mech.armor,
    structure: mech.structure.max,
    stress: mech.stress.max,
    hp: mech.hp.max,
    evade: mech.evasion,
    edef: mech.edef,
    heatcap: mech.heat.max,
    speed: mech.speed,
    sensor: mech.sensors,
    save: mech.save,
    hull: mech.hull,
    agility: mech.agility,
    systems: mech.systems,
    engineering: mech.engineering,
    sizes: [mech.size],
    size: mech.size,
    reactions: ["Overwatch"],
  };

  const exportNPC: FakePackedNPC = {
    id: nanoid(),
    class: cla ? cla.id : "",
    tier: data.tier_num,
    name: data.name,
    labels: [],
    templates: items.filter((item: any) => item.type === "npc_template").map((item: any) => item.id),
    items: items
      .filter((item: any) => item.type === "npc_feature")
      .map((item: any) => {
        return {
          itemID: item.id,
          tier: data.tier_num,
          destroyed: false,
          charged: item.charged,
          uses: item.uses,
        };
      }),
    stats: stats,
    currentStats: { ...stats },
    note: "",
    side: "Enemy",
    statuses: [],
    conditions: [],
    resistances: [],
    burn: 0,
    overshield: 0,
    destroyed: false,
    actions: (data as any).activations,
  };

  console.debug(exportNPC);
  return exportNPC;
}

function handlePilotExport(actor: LegacyLancerActor) {
  const data = actor as any;
  console.log(`Exporting Pilot: ${data.name}`);
  // const loadout = actor.system.loadout;
  // const frame = loadout.frame?.fallback_lid;
  // if (!frame) return; // Throw error in future?

  const items: Collection<Item> = data.items;
  const pilot = data.pilot;
  const mech = data.mech;
  const loadout = data.mech_loadout;

  // Pilot Loadout
  const pilotLoadout: PackedPilotLoadoutData = {
    id: nanoid(),
    name: "Primary",
    armor: items
      .filter((item: Item) => item.type === "pilot_armor")
      .map((item: any) => {
        return {
          id: item.system.id,
          uses: item.system.uses ? item.system.uses : 0,
          destroyed: false,
          cascading: false,
          customDamageType: null,
        };
      }),
    weapons: items
      .filter((item: Item) => item.type === "pilot_weapon")
      .map((item: any) => {
        return {
          id: item.system.id,
          uses: item.system.uses ? item.system.uses : 0,
          destroyed: false,
          cascading: false,
          customDamageType: null,
        };
      }),
    gear: items
      .filter((item: Item) => item.type === "pilot_gear")
      .map((item: any) => {
        return {
          id: item.system.id,
          uses: item.system.uses ? item.system.uses : 0,
          destroyed: false,
          cascading: false,
          customDamageType: null,
        };
      }),
    extendedWeapons: [],
    extendedGear: [],
  };
  const mechLoadout: PackedMechLoadoutData = {
    id: nanoid(),
    name: "Primary",
    systems: items
      .filter((item: any) => item.type === "mech_system" && !item.integrated)
      .map((item: any) => {
        return {
          id: item.system.id,
          uses: item.system.uses ? item.system.uses : 0,
          destroyed: false,
          cascading: false,
          note: "",
        };
      }),
    integratedSystems: items
      .filter((item: any) => item.type === "mech_system" && item.integrated)
      .map((item: any) => {
        return {
          id: item.system.id,
          uses: item.system.uses ? item.system.uses : 0,
          destroyed: false,
          cascading: false,
          note: "",
        };
      }),
    mounts: loadout.mounts.filter((mount: any) => mount.type !== "Integrated").map((mount: any) => mapMount(mount)),
    integratedMounts: loadout.mounts
      .filter((mount: any) => mount.type === "Integrated")
      .map((mount: any) => {
        return mapWeapon(mount.weapons[0]);
      }),
    improved_armament: { bonus_effects: [], extra: [], lock: false, mount_type: "Flex", slots: [] },
    integratedWeapon: { bonus_effects: [], extra: [], lock: false, mount_type: "Aux", slots: [] },
    superheavy_mounting: { bonus_effects: [], extra: [], lock: false, mount_type: "Superheavy", slots: [] },
  };

  const frame = items.find((item: Item) => item.type === "frame");
  const exportPilot: PackedPilotData = {
    id: nanoid(),
    name: pilot.name,
    callsign: pilot.callsign,
    level: pilot.level,
    notes: pilot.notes,
    history: pilot.history,
    group: "",
    factionID: "",
    campaign: "",
    cloudID: pilot.cloud_code,
    cloudOwnerID: pilot.cloud_owner_code,
    lastCloudUpdate: pilot.cloud_time,
    player_name: data.player_name,
    status: data.status,
    text_appearance: data.text_appearance,
    portrait: data.portrait,
    cloud_portrait: data.cloud_portrait,
    cc_ver: "",
    quirk: pilot.quirk,
    brews: [],
    combat_history: {} as any,
    current_hp: pilot.stats.hp.value,
    background: pilot.background,
    mechSkills: [mech.hull, mech.agility, mech.systems, mech.engineering],
    reserves: [],
    orgs: [],
    licenses: [],
    sort_index: 0,
    skills: items
      .filter((item: Item) => item.type === "skill")
      .map((item: any) => {
        return { id: item.system.id, rank: item.system.rank };
      }),
    talents: items
      .filter((item: Item) => item.type === "talent")
      .map((item: any) => {
        return { id: item.system.id, rank: item.system.rank };
      }),
    core_bonuses: items.filter((item: Item) => item.type === "core_bonus").map((item: any) => item.system.id),
    loadout: pilotLoadout,
    mechs: [
      {
        id: nanoid(),
        name: mech.name,
        // @ts-expect-error
        frame: frame ? frame.system.id : undefined,
        active: true,
        current_structure: mech.structure.value,
        current_hp: mech.hp.value,
        current_stress: mech.stress.value,
        current_move: mech.move,
        current_heat: mech.heat.value,
        current_repairs: mech.repairs.value,
        current_overcharge: mech.overcharge_level,
        current_core_energy: mech.core_energy ? 1 : 0,
        overshield: 0,
        loadouts: [mechLoadout],
        statuses: [],
        conditions: [],
        resistances: [],
        reactions: [],
        burn: 0,
        destroyed: false,
        activations: 1,
        meltdown_imminent: false,
        reactor_destroyed: false,
        core_active: false,
        active_loadout_index: 0,
        notes: "",
        gm_note: "",
        cc_ver: "",
        defeat: "",
        portrait: "",
        cloud_portrait: "",
        ejected: false,
      } as PackedMechData,
    ],
    counter_data: [],
    custom_counters: [],
    // TODO: bond state isn't properly populated here
    bondId: "",
    xp: 0,
    stress: 0,
    maxStress: 8,
    burdens: [],
    clocks: [],
    bondPowers: [],
    powerSelections: 0,
    bondAnswers: ["", ""],
    minorIdeal: "",
  };

  console.debug(exportPilot);
  return exportPilot;
}

//
// UTILITY
function mapMount(mount: any) {
  const packedMount: FakePackedMount = {
    mount_type: mount.type,
    lock: false,
    slots: [],
    extra: [],
    bonus_effects: [],
  };

  packedMount.slots = mount.weapons.map((weapon: any) => mapWeapon(weapon));

  return packedMount;
}

function mapWeapon(weapon: any): FakePackedWeapon {
  return {
    size: weapon.mount,
    weapon: {
      id: weapon.id,
      uses: weapon.uses,
      destroyed: false,
      cascading: false,
      loaded: weapon.loaded,
      mod: weapon.mod as any,
      customDamageType: null,
      selectedProfile: 0,
    },
  };
}

export function validForExport(actor: LegacyLancerActor | LancerActor) {
  // @ts-expect-error I'm just going to assume all of this works but it probably doesn't
  return !actor.system?.cc_ver?.startsWith("MchMnd2");
}
