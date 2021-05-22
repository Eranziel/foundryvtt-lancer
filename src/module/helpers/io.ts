import { PilotLoadout } from "machine-mind";
import { nanoid } from "nanoid";
import { LancerActor } from "../actor/lancer-actor";
import {
  LancerMechData,
  LancerMechLoadoutData,
  LancerMechWeaponItemData,
  LancerMountData,
  LancerPilotActorData,
  LancerPilotData,
  LancerPilotSubData,
} from "../interfaces";

export function handleActorExport(actor: LancerActor) {
  switch (actor.data.type) {
    case "pilot":
      handlePilotExport(actor);
  }
}

// I'll just make my own since I'm scared to bring modern MM here.
//
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
//
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
  integratedMounts: { weapon: FakePackedWeapon }[];
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
//
type FakePackedPilot = {
  id: string;
  name: string;
  callsign: string;
  level: number;
  notes: string;
  history: string;
  quirk: string;
  current_hp: number;
  background: string;
  mechSkills: [number, number, number, number];
  // license: { id: string; rank: number }[];
  skills: { id: string; rank: number }[];
  talents: { id: string; rank: number }[];
  core_bonuses: string[];
  loadout: FakePackedPilotLoadout;
  mechs: [FakePackedMech];
};

function handlePilotExport(actor: LancerActor) {
  const data = actor.data as LancerPilotActorData;
  console.log(`Exporting Pilot: ${data.name}`);
  // const loadout = actor.data.data.loadout;
  // const frame = loadout.frame?.fallback_lid;
  // if (!frame) return; // Throw error in future?

  const items: Collection<Item> = (data as any).items;
  const pilot: LancerPilotSubData = (data.data as LancerPilotData).pilot;
  const mech: LancerMechData = (data.data as LancerPilotData).mech;
  const loadout: LancerMechLoadoutData = (data.data as LancerPilotData).mech_loadout;

  console.log(actor.data.data);

  const pilotLoadout: FakePackedPilotLoadout = {
    id: nanoid(),
    name: "Primary",
    armor: items
      .filter((item: Item) => item.type === "pilot_armor")
      .map((item: any) => {
        return { id: item.data.id, destroyed: false, cascading: false, customDamageType: null };
      }),
    weapons: items
      .filter((item: Item) => item.type === "pilot_weapon")
      .map((item: any) => {
        return { id: item.data.id, destroyed: false, cascading: false, customDamageType: null };
      }),
    gear: items
      .filter((item: Item) => item.type === "pilot_gear")
      .map((item: any) => {
        return {
          id: item.data.id,
          uses: item.data.uses,
          destroyed: false,
          cascading: false,
          customDamageType: null,
        };
      }),
    extendedWeapons: [],
    extendedGear: [],
  };
  const mechLoadout: FakePackedMechLoadout = {
    id: nanoid(),
    name: "Primary",
    systems: items
      .filter((item: any) => item.type === "mech_system" && !item.data.integrated)
      .map((item: any) => {
        return { id: item.data.id, uses: item.data.uses, destroyed: false, cascading: false };
      }),
    integratedSystems: items
      .filter((item: any) => item.type === "mech_system" && item.data.integrated)
      .map((item: any) => {
        return { id: item.data.id, uses: item.data.uses, destroyed: false, cascading: false };
      }),
    mounts: loadout.mounts
      .filter(mount => mount.type !== "Integrated")
      .map(mount => mapMount(mount)),
    integratedMounts: loadout.mounts
      .filter(mount => mount.type === "Integrated")
      .map(mount => {
        return {
          weapon: mapWeapon(mount.weapons[0]),
        };
      }),
  };

  const exportPilot: FakePackedPilot = {
    id: nanoid(),
    name: pilot.name,
    callsign: pilot.callsign,
    level: pilot.level,
    notes: pilot.notes,
    history: pilot.history,
    quirk: pilot.quirk,
    current_hp: pilot.stats.hp.value,
    background: pilot.background,
    mechSkills: [mech.hull, mech.agility, mech.systems, mech.engineering],
    skills: items
      .filter((item: Item) => item.type === "skill")
      .map((item: any) => {
        return { id: item.data.id, rank: item.data.rank };
      }),
    talents: items
      .filter((item: Item) => item.type === "talent")
      .map((item: any) => {
        return { id: item.data.id, rank: item.data.rank };
      }),
    core_bonuses: items
      .filter((item: Item) => item.type === "core_bonus")
      .map((item: any) => item.data.id),
    loadout: pilotLoadout,
    mechs: [
      {
        id: nanoid(),
        name: mech.name,
        frame: items.find((item: Item) => item.type === "frame")?.data.id,
        active: true,
        current_structure: mech.structure.value,
        current_move: mech.speed,
        current_hp: mech.hp.value,
        current_stress: mech.stress.value,
        current_heat: mech.heat.value,
        current_repairs: mech.repairs.value,
        current_overcharge: mech.overcharge_level,
        current_core_energy: mech.current_core_energy,
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
      },
    ],
  };

  console.log(exportPilot);
}

function mapMount(mount: LancerMountData) {
  const packedMount: FakePackedMount = {
    mount_type: mount.type,
    lock: false,
    slots: [],
    extra: [],
    bonus_effects: [],
  };

  packedMount.slots = mount.weapons.map(weapon => mapWeapon(weapon));

  return packedMount;
}

function mapWeapon(weapon: LancerMechWeaponItemData): FakePackedWeapon {
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
