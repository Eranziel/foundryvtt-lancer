import {
  EntryType,
  PackedMechData,
  PackedMechLoadoutData,
  PackedMountData,
  PackedPilotData,
  PackedPilotLoadoutData,
} from "machine-mind";
import { nanoid } from "nanoid";
import { LancerActor } from "../actor/lancer-actor";

// GOODBYE LEGACY TYPES
type LegacyLancerActor = {
  name: string;
  data: {
    type: EntryType;
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
export function handleActorExport(actor: LegacyLancerActor | LancerActor<any>, download = true) {
  // TODO: replace check with version check and appropriate export handler.
  if (!validForExport(actor)) {
    // ui.notifications.warn("Exporting for this version of actor is currently unsupported.");
    return null;
  }

  let dump = null;
  switch (actor.data.type) {
    case "pilot":
      dump = handlePilotExport(actor);
      break;
    case "mech":
      // dump = handlePilotExport(actor);
      break;
    case "npc":
      dump = handleNPCExport(actor);
      break;
  }

  if (dump == null) {
    ui.notifications.warn("Exporting ran into an issue, or actor type is not supported.");
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

export function addExportButton(actor: LegacyLancerActor | LancerActor<any>, html: JQuery) {
  // @ts-ignore
  const id = actor.data._id;
  if (!document.getElementById(id) && validForExport(actor)) {
    // if (!document.getElementById(id)) {

    // Don't create a second link on re-renders;
    const link = $(`<a id="${id}"><i class="fas fa-external-link-alt"></i>Export</a>`);
    link.on("click", () => handleActorExport(actor));
    html.parent().parent().find(".window-title").after(link);
  }
}

// TODO: replace my legacy type fakes with MM proper Packed types.

//
// Pilot
type FakePackedEquipmentState = {
  id: string;
  destroyed: boolean;
  uses?: number;
  cascading: false;
  customDamageType?: null;
};
type FakePackedPilotLoadout = {
  id: string;
  name: string;
  armor: (FakePackedEquipmentState | null)[]; // Accounts for gaps in the inventory slots.... Were it my call this wouldn't be how it was, but it ain't my way
  weapons: (FakePackedEquipmentState | null)[];
  gear: (FakePackedEquipmentState | null)[];
  extendedWeapons: (FakePackedEquipmentState | null)[];
  extendedGear: (FakePackedEquipmentState | null)[];
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
type FakePackedMechLoadout = {
  id: string;
  name: "Primary";
  systems: (FakePackedEquipmentState | null)[];
  integratedSystems: (FakePackedEquipmentState | null)[];
  mounts: FakePackedMount[];
  integratedMounts: FakePackedWeapon[];
};
type FakePackedMech = {
  id: string;
  name: string;
  frame: string;
  active: true;
  current_structure: number;
  current_move: number;
  current_hp: number;
  current_stress: number;
  current_heat: number;
  current_repairs: number;
  current_overcharge: number;
  current_core_energy: number;
  overshield: number;
  loadouts: [FakePackedMechLoadout];
  active_loadout_index: 0;
  statuses: [];
  conditions: [];
  resistances: [];
  reactions: [];
  burn: number;
  destroyed: false;
  activations: 1;
  meltdown_imminent: false;
  reactor_destroyed: false;
  core_active: boolean;
};

type FakePackedPilot = {
  id: string;
  name: string;
  callsign: string;
  level: number;
  notes: string;
  history: string;
  quirks: string[];
  current_hp: number;
  background: string;
  mechSkills: [number, number, number, number];
  reserves: [];
  orgs: [];
  licenses: { id: string; rank: number }[];
  skills: { id: string; rank: number }[];
  talents: { id: string; rank: number }[];
  core_bonuses: string[];
  loadout: FakePackedPilotLoadout;
  mechs: [FakePackedMech];
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
  const data = actor.data as any;
  console.log(`Exporting NPC: ${data.name}`);

  const items = (data as any).items;
  const mech = data.data.mech;
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
    class: cla ? cla.data.id : "",
    tier: data.data.tier_num,
    name: data.name,
    labels: [],
    templates: items.filter((item: any) => item.type === "npc_template").map((item: any) => item.data.id),
    items: items
      .filter((item: any) => item.type === "npc_feature")
      .map((item: any) => {
        return {
          itemID: item.data.id,
          tier: data.data.tier_num,
          destroyed: false,
          charged: item.data.charged,
          uses: item.data.uses,
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
  const data = actor.data as any;
  console.log(`Exporting Pilot: ${data.name}`);
  // const loadout = actor.data.data.loadout;
  // const frame = loadout.frame?.fallback_lid;
  // if (!frame) return; // Throw error in future?

  const items: Collection<Item> = (data as any).items;
  const pilot = (data.data as any).pilot;
  const mech = (data.data as any).mech;
  const loadout = (data.data as any).mech_loadout;

  // Pilot Loadout
  const pilotLoadout: PackedPilotLoadoutData = {
    id: nanoid(),
    name: "Primary",
    armor: items
      .filter((item: Item) => item.type === "pilot_armor")
      .map((item: any) => {
        return {
          id: item.data.data.id,
          uses: item.data.data.uses ? item.data.data.uses : 0,
          destroyed: false,
          cascading: false,
          customDamageType: null,
        };
      }),
    weapons: items
      .filter((item: Item) => item.type === "pilot_weapon")
      .map((item: any) => {
        return {
          id: item.data.data.id,
          uses: item.data.data.uses ? item.data.data.uses : 0,
          destroyed: false,
          cascading: false,
          customDamageType: null,
        };
      }),
    gear: items
      .filter((item: Item) => item.type === "pilot_gear")
      .map((item: any) => {
        return {
          id: item.data.data.id,
          uses: item.data.data.uses ? item.data.data.uses : 0,
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
      .filter((item: any) => item.type === "mech_system" && !item.data.integrated)
      .map((item: any) => {
        return {
          id: item.data.data.id,
          uses: item.data.data.uses ? item.data.data.uses : 0,
          destroyed: false,
          cascading: false,
          note: "",
        };
      }),
    integratedSystems: items
      .filter((item: any) => item.type === "mech_system" && item.data.integrated)
      .map((item: any) => {
        return {
          id: item.data.data.id,
          uses: item.data.data.uses ? item.data.data.uses : 0,
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
    player_name: data.data.player_name,
    status: data.data.status,
    text_appearance: data.data.text_appearance,
    portrait: data.data.portrait,
    cloud_portrait: data.data.cloud_portrait,
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
        return { id: item.data.data.id, rank: item.data.data.rank };
      }),
    talents: items
      .filter((item: Item) => item.type === "talent")
      .map((item: any) => {
        return { id: item.data.data.id, rank: item.data.data.rank };
      }),
    core_bonuses: items.filter((item: Item) => item.type === "core_bonus").map((item: any) => item.data.data.id),
    loadout: pilotLoadout,
    mechs: [
      {
        id: nanoid(),
        name: mech.name,
        frame: frame ? frame.data.data.id : undefined,
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
    size: weapon.data.mount,
    weapon: {
      id: weapon.data.id,
      uses: weapon.data.uses,
      destroyed: false,
      cascading: false,
      loaded: weapon.data.loaded,
      mod: weapon.data.mod as any,
      customDamageType: null,
      selectedProfile: 0,
    },
  };
}

export function validForExport(actor: LegacyLancerActor | LancerActor<any>) {
  return !actor.data.data?.cc_ver?.startsWith("MchMnd2");
}
