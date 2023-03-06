import {
  makeSystemTypeChecklist,
  makeWeaponSizeChecklist,
  makeWeaponTypeChecklist,
  SystemType,
  WeaponSize,
  WeaponType,
  AllSynergyLocations,
} from "../../enums.js";
import type {
  DamageTypeChecklist,
  RangeTypeChecklist,
  SynergyLocation,
  SystemTypeChecklist,
  WeaponSizeChecklist,
  WeaponTypeChecklist,
} from "../../enums.js";
import type { PackedSynergyData } from "../../util/unpacking/packed-types.js";
import {
  DamageTypeChecklistField,
  RangeTypeChecklistField,
  SystemTypeChecklistField,
  WeaponSizeChecklistField,
  WeaponTypeChecklistField,
} from "../shared.js";

// @ts-ignore
const fields: any = foundry.data.fields;

export interface SynergyData {
  locations: SynergyLocation[];
  detail: string;
  system_types?: SystemTypeChecklist | null;
  damage_types: DamageTypeChecklist | null;
  range_types: RangeTypeChecklist | null;
  weapon_types: WeaponTypeChecklist | null;
  weapon_sizes: WeaponSizeChecklist | null;
}

export class SynergyField extends fields.SchemaField {
  constructor(options = {}) {
    super(
      {
        locations: new fields.ArrayField(new fields.StringField({ choices: AllSynergyLocations, initial: "any" })),
        detail: new fields.StringField({ nullable: false }),
        damage_types: new DamageTypeChecklistField(),
        range_types: new RangeTypeChecklistField(),
        weapon_types: new WeaponTypeChecklistField(),
        weapon_sizes: new WeaponSizeChecklistField(),
        system_types: new SystemTypeChecklistField(),
      },
      options
    );
  }
}

export function unpackSynergy(data: PackedSynergyData): SynergyData {
  // Have to do a lot of annoying fixup
  let locations: SynergyLocation[] = [];
  locations = locations.flatMap(base => {
    let l = base.toLowerCase().trim();
    if (l.includes(",")) return l.split(",").map(sub_l => sub_l.trim());
    return l;
  }) as SynergyLocation[];

  let sizes: WeaponSizeChecklist | null = null;
  if (data.weapon_sizes) {
    let x = data.weapon_sizes;
    if (!Array.isArray(x)) {
      x = [x];
    }
    if (x.includes("any")) {
      x = [WeaponSize.Aux, WeaponSize.Heavy, WeaponSize.Main, WeaponSize.Superheavy];
    }
    sizes = makeWeaponSizeChecklist(x as WeaponSize[]);
  }

  let types: WeaponTypeChecklist | null = null;
  if (data.weapon_types) {
    let x = data.weapon_types;
    if (!Array.isArray(x)) {
      x = [x];
    }
    if (x.includes("any")) {
      x = [
        WeaponType.CQB,
        WeaponType.Cannon,
        WeaponType.Launcher,
        WeaponType.Melee,
        WeaponType.Nexus,
        WeaponType.Rifle,
      ];
    }
    types = makeWeaponTypeChecklist(x as WeaponType[]);
  }

  let systems: SystemTypeChecklist | null = null;
  if (data.system_types) {
    let x = data.system_types;
    if (!Array.isArray(x)) {
      x = [x];
    }
    if (x.includes("any")) {
      x = [
        SystemType.AI,
        SystemType.Armor,
        SystemType.Deployable,
        SystemType.Drone,
        SystemType.FlightSystem,
        SystemType.Integrated,
        SystemType.Mod,
        SystemType.Shield,
        SystemType.System,
        SystemType.Tech,
      ];
    }
    systems = makeSystemTypeChecklist(x as SystemType[]);
  }

  return {
    detail: data.detail,
    locations,
    damage_types: null,
    range_types: null,
    weapon_sizes: sizes,
    weapon_types: types,
    system_types: systems,
  };
}
