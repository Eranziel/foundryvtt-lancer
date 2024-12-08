import {
  AllSynergyLocations,
  DamageTypeChecklist,
  makeSystemTypeChecklist,
  makeWeaponSizeChecklist,
  makeWeaponTypeChecklist,
  RangeTypeChecklist,
  SynergyLocation,
  SystemType,
  SystemTypeChecklist,
  WeaponSize,
  WeaponSizeChecklist,
  WeaponType,
  WeaponTypeChecklist,
} from "../../enums";
import { PackedSynergyData } from "../../util/unpacking/packed-types";
import {
  DamageTypeChecklistField,
  RangeTypeChecklistField,
  SystemTypeChecklistField,
  WeaponSizeChecklistField,
  WeaponTypeChecklistField,
} from "../shared";

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

  migrateSource(sourceData: any, fieldData: any) {
    // In some old imports we never properly separated synergy locations
    if (fieldData.locations?.some((s: string) => s.includes(","))) {
      fieldData.locations = fieldData.locations.flatMap((s: string) => s.split(",").map(s2 => s2.trim()));
    }
    // Ensure all lowercase
    if (fieldData.locations) {
      fieldData.locations = fieldData.locations.map((l: string) => l.toLowerCase());
    }

    return super.migrateSource(sourceData, fieldData);
  }
}

export function unpackSynergy(data: PackedSynergyData): SynergyData {
  // Have to do a lot of annoying fixup
  let raw_locations = data.locations ?? [];
  if (!Array.isArray(raw_locations)) raw_locations = [raw_locations];
  let locations = raw_locations.flatMap(base => {
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
