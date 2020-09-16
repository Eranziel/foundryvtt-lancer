import {
  LancerPilotSheetData,
  LancerMechData,
  LancerTalentData,
  LancerCoreBonusData,
  LancerSkillData,
  LancerLicenseData,
  LancerFrameData,
  LancerMechLoadoutData,
  LancerMechSystemData,
  LancerNPCClassData,
  LancerNPCTemplateData,
  LancerPilotGearData,
  LancerPilotWeaponData,
  LancerPilotArmorData,
  LancerNPCFeatureData,
  LancerNPCClassStatsData,
  LancerMountData, RangeData, LancerMechWeaponData
} from "./interfaces";

// const x: LancerPilotData;
import {
  IPilotData,
  IRankedData,
  IMechData,
  IMechLoadoutData,
  CompendiumCategory,
  IEquipmentData,
  PersistentStore,
  ITalentData,
  ISkillData,
  ICoreBonusData,
  IFrameData,
  IWeaponModData,
  INpcClassData,
  INpcFeatureData,
  INpcTemplateData,
  IPilotGearData,
  IPilotArmorData,
  IPilotWeaponData,
  IMechSystemData,
  IntegratedMount,
  EquippableMount,
  MountType,
  MechSystem,
  IDamageData,
  IRangeData, IMechWeaponData
} from "machine-mind";
import { INpcClassStats } from "machine-mind/dist/classes/npc/NpcClassStats";
// import { Compendium } from "machine-mind/dist/store/compendium";

// Temporary placeholders for while we work
const NOT_APPLICABLE = "";
const NOT_YET_IMPLEMENTED = "todo";
const CC_VERSION = "ERR"; // this can't be right, but it is what was in my example file

// References a specific lookup to the compendium
interface CompendiumID {
  id: string;
  category: CompendiumCategory;
}

// Simple function for generating "unique" keys. TODO: Replace with an actual UUID func
let _ctr = 0;
function uid(): string {
  _ctr += 1;
  return _ctr.toString();
}

export class Converter {
  brew: string;

  constructor(brew: string) {
    this.brew = brew;
  }

  // TALENTS
  LancerTalentData_to_IRankedData(t: LancerTalentData): IRankedData {
    return t;
  }

  LancerTalentData_to_ITalentData(t: LancerTalentData): ITalentData {
    return {
      id: t.id,
      description: t.description,
      name: t.name,
      ranks: t.ranks, // These are, fortunately, the exact same type, kinda!!!
      brew: this.brew,
      counters: [],
    };
  }

  ITalentData_to_LancerTalentData(sd: ITalentData, rd?: IRankedData): LancerTalentData {
    let data: LancerTalentData = {
      ...sd,
      rank: rd ? rd.rank : 1,
    };
    return data;
  }

  // SKILLS
  LancerSkillData_to_IRankedData(t: LancerSkillData): IRankedData {
    return {
      id: t.id,
      rank: t.rank,
    };
  }

  LancerSkillData_to_ISkillData(t: LancerSkillData): ISkillData {
    return {
      id: t.id,
      brew: this.brew,
      counters: [],
      description: t.description,
      detail: t.detail,
      family: t.family,
      name: t.name,
    };
  }

  ISkillData_to_LancerSkillData(sd: ISkillData, rd?: IRankedData): LancerSkillData {
    let data: LancerSkillData = {
      ...sd,
      rank: rd ? rd.rank : 1,
    };
    return data;
  }

  // CORE BONUSES
  LancerCoreBonusData_to_CompID(t: LancerCoreBonusData): CompendiumID {
    return {
      id: t.id,
      category: "CoreBonuses",
    };
  }

  LancerCoreBonusData_to_ICoreBonusData(t: LancerCoreBonusData): ICoreBonusData {
    return {
      id: t.id,
      brew: this.brew,
      counters: [],
      description: NOT_YET_IMPLEMENTED,
      mounted_effect: t.mounted_effect,
      name: t.name,
      effect: t.effect,
      source: t.source,
    };
  }

  ICoreBonusData_to_LancerCoreBonusDataa(sd: ICoreBonusData): LancerCoreBonusData {
    let data: LancerCoreBonusData = {
      ...sd,
      mounted_effect: sd.mounted_effect || sd.effect,
    };
    return data;
  }

  // LICENSES
  // Note that this just handles the rank - we will need to do a conversion of the full license elsewhere
  LancerLicenseData_to_IRankedData(t: LancerLicenseData): IRankedData {
    return {
      id: t.name,
      rank: t.rank,
    };
  }

  // there is no real equivalent here...

  // FRAMES
  LancerFrameData_to_IFrameData(t: LancerFrameData): IFrameData {
    return {
      brew: this.brew,
      counters: [],
      ...t,
    };
  }

  // MODS
  LancerModData_to_IWeaponModData(t: LancerMechSystemData): IWeaponModData {
    return null as any;
    // TODO!
    // return {

    // }
  }

  // NPCs
  LancerNPCClassStatsData_to_INpcClassStatsData(t: LancerNPCClassStatsData): INpcClassStats {
    return {
      ...t,
      evade: t.evasion,
      sensor: t.sensor_range,
      size: [t.size], // TODO: deal with lossiness here (we're only getting one npc size)
    };
  }

  LancerNPCClassData_to_INpcClassData(t: LancerNPCClassData): INpcClassData {
    return {
      id: t.id,
      name: t.name,
      base_features: t.base_features,
      optional_features: t.optional_features,
      stats: this.LancerNPCClassStatsData_to_INpcClassStatsData(t.stats),
      info: {
        flavor: t.flavor_name,
        tactics: t.flavor_description,
      },
      brew: this.brew,
      role: NOT_YET_IMPLEMENTED,
      power: 0, //NOT_YET_IMPLEMENTED
    };
  }

  LancerNPCFeatureData_to_INpcFeatureData(t: LancerNPCFeatureData): INpcFeatureData {
    return {
      brew: this.brew,
      hide_active: false,
      id: t.id,
      locked: false,
      name: t.name,
      origin: {
        base: t.origin_base,
        name: t.origin_name,
        type: t.origin_type,
      },
      tags: t.tags,
      type: t.feature_type,
      bonus: t.bonus,
      effect: t.effect,
      override: t.override,
    };
  }

  LancerNPCTemplateData_to_INpcTemplateData(t: LancerNPCTemplateData): INpcTemplateData {
    return {
      brew: this.brew,
      base_features: t.basefeatures,
      description: t.description,
      id: t.id,
      name: t.name,
      optional_features: t.optional_features,
      power: 0, // NOT_APPLICABLE
    };
  }

  // Pilot equipment
  LancerPilotGearData_to_IPilotEquipment(t: LancerPilotGearData): IPilotGearData {
    return {
      brew: this.brew,
      counters: [],
      type: "gear",
      ...t,
    };
  }

  LancerPilotWeaponData_to_IPilotEquipment(t: LancerPilotWeaponData): IPilotWeaponData {
    return {
      ...t,
      brew: this.brew,
      counters: [],
      type: "weapon",
      range: t.range.map(this.RangeData_to_IRangeData).filter(x => x) as IRangeData[]
    };
  }

  LancerPilotArmorData_to_IPilotEquipment(t: LancerPilotArmorData): IPilotArmorData {
    return {
      brew: this.brew,
      counters: [],
      type: "armor",
      ...t,
    };
  }

  // SYSTEMS
  LancerMechSystemData_to_IMechSystemData(t: LancerMechSystemData): IMechSystemData {
    return {
      ...t,
      brew: this.brew,
      counters: [],
      type: t.system_type,
    };
  }

  // Ranges
  RangeData_to_IRangeData(t: RangeData): IRangeData | null {
    if(t.type == "None") {
      return null;
    } else {
      return {
        ...t 
      }
    }
  }

  // WEAPONS
  LancerMechWeaponData_to_IMechWeaponData(t: LancerMechWeaponData): IMechWeaponData {
    return {
      brew: this.brew,
      counters: [],
      type: t.weapon_type,
      ...t,
      range: t.range.map(r => this.RangeData_to_IRangeData(r)).filter(x => x) as IRangeData[],
    };
  }

  /*
  MechWeapon(t: MechWeapon): LancerMechWeaponData {
    // Convert damage, range, tags
    let damage: IDamageData[] = t.Damage.map(d => ({
        type: d.Type,
        val: d.Value,
        override: d.Override
    }));

    let range: IRangeData[] = t.Range.map(r => ({
      type: r.Type,
      val: r.Value,
      // bonus: r.kl
      override: r.Override
    }));
      
    return {
      damage,
      mount: t.Size,
      weapon_type: t.Type,
      description: t.Description,
      effect: "" + t.Effect, // TODO: Handle arrays
      id: t.ID,
      license: t.License,
      license_level: t.LicenseLevel,
      name: t.Name,
      range,
      source: t.Source,
      sp: t.SP,
      tags: t.Tags,

      mod: null,
      flavor_name: "",
      cascading: false,
      destroyed: false,
      custom_damage_type: DamageType.Kinetic, // Unsure if this matters
      note: "",
      item_type: ItemType.MechWeapon,
      flavor_description: "",
      uses: 0,
      max_uses: 0,
      max_use_override: 0,
      loaded: true,
      integrated: false
    };
  }
  */

  /*
  Mount_to_LancerMountData(m: Mount): LancerMountData {
    // Get the weapon(s)
    let weapons: LancerMechWeaponData[] = m.Weapons.map(w => {
      let base = this.IMechWeaponData_to_LancerMechWeaponData(w);
      return {
        
      }
    })
  }
  */

  // Converts the active state of a system to equip data. Note: still need to do compendium loading
  LancerMechSystemData_to_IEquipmentData(s: LancerMechSystemData): IEquipmentData {
    return {
      cascading: s.cascading,
      destroyed: s.destroyed,
      id: s.id,
      note: s.note,
      // customDamageType: s.
      uses: s.uses,
    };
  }

  LancerMechLoadoutData_to_IMechLoadoutData(l: LancerMechLoadoutData): IMechLoadoutData {
    // This is just a copy of the MechLoadout constructor
    let integratedMounts: IntegratedMount[] = []; // Normally grabs from mech. Here we assume that would've been done already

    // Map the mounts based on size
    let equippableMounts: EquippableMount[] = [];
    for (let m of l.mounts) {
      let em = new EquippableMount(m.type);

      // TODO: equip weapons
      for (let i = 0; i < m.weapons.length && i < em.Slots.length; i++) {
        let wep = null;
        //
        // em.Slots[0].EquipWeapon(
      }
    }

    let systems = l.systems.map(this.LancerMechSystemData_to_IEquipmentData);
    let integratedSystems = [] as MechSystem[]; // l.IntegratedSystems;
    let improvedArmament = new EquippableMount(MountType.Flex);
    let integratedWeapon = new EquippableMount(MountType.Aux);

    return {
      id: uid(),
      name: "Active",
      mounts: equippableMounts.map(EquippableMount.Serialize),
      integratedMounts: integratedMounts.map(IntegratedMount.Serialize),
      integratedWeapon: EquippableMount.Serialize(integratedWeapon),
      improved_armament: EquippableMount.Serialize(improvedArmament),
      integratedSystems: integratedSystems.map(MechSystem.Serialize),
      systems,
    };
  }

  convert_mech(
    t: LancerMechData,
    f: LancerFrameData,
    l: LancerMechLoadoutData,
    with_id: string
  ): IMechData {
    let loadouts = [this.LancerMechLoadoutData_to_IMechLoadoutData(l)];
    return {
      activations: 1,
      active: true, // We assume only converting the active mech, for the time being
      active_loadout_index: 0, // Also assume a single loadout
      burn: 0, // TODO: When foundry status support rolls out, yo!
      cc_ver: CC_VERSION,
      cloud_portrait: NOT_APPLICABLE,
      conditions: [], // TODO: When foundry status support rolls out, yo!
      current_core_energy: 0, // NOT_YET_IMPLEMENTED
      current_heat: t.heat.value,
      current_hp: t.hp.value,
      current_overcharge: 0, // NOT_YET_IMPLEMENTED
      current_repairs: t.repairs.value,
      current_stress: t.stress.value,
      current_structure: t.structure.value,
      defeat: "", // NOT_YET_IMPLEMENTED
      destroyed: false, // NOT_YET_IMPLEMENTED
      ejected: false, // NOT_YET_IMPLEMENTED - status
      frame: f.name,
      gm_note: "",
      id: with_id,
      loadouts,
      meltdown_imminent: false, // NOT_YET_IMPLEMENTED
      name: t.name,
      notes: "",
      overshield: 0, // NOT_YET_IMPLEMENTED
      portrait: "",
      reactions: [], // DO WE EVEN CARE?
      reactor_destroyed: false, // NOT_YET_IMPLEMENTED
      resistances: [], // NOT_YET_IMPLEMENTED
      statuses: [], // NOT_YET_IMPLEMENTED

      // We just punt this data for now. If we want it, it'd be coming from compcon, not the other way (probably)
      state: {
        actions: 2,
        braced: false,
        bracedCooldown: false,
        history: [],
        move: 0,
        overcharged: false,
        overwatch: false,
        prepare: false,
        redundant: false,
        stage: "",
        turn: 0,
      },
    };
  }

  // Converts to the Compcon canonical format
  LancerPilotSheetData_to_IPilotData(t: LancerPilotSheetData): IPilotData {
    let p = t.data.pilot;
    let m = t.data.mech;
    // Do some sub-parts first
    let talents = t.talents.map(x => this.LancerTalentData_to_IRankedData(x.data.data));
    let core_bonuses = t.core_bonuses.map(x => this.LancerCoreBonusData_to_CompID(x.data.data).id);
    let skills = t.skills.map(x => this.LancerSkillData_to_IRankedData(x.data.data));
    let mech_id = uid();
    let mechs = [this.convert_mech(t.data.mech, t.frame.data.data, t.data.mech_loadout, mech_id)];

    return {
      id: "unique",
      campaign: NOT_APPLICABLE,
      group: NOT_APPLICABLE,
      sort_index: 0,
      cloudID: NOT_YET_IMPLEMENTED,
      cloudOwnerID: NOT_YET_IMPLEMENTED,
      lastCloudUpdate: NOT_APPLICABLE,
      level: p.level,
      callsign: p.callsign,
      name: p.name,
      player_name: NOT_YET_IMPLEMENTED,
      status: p.status,
      mounted: true, // NOT_YET_IMPLEMENTED
      factionID: NOT_APPLICABLE,
      text_appearance: NOT_APPLICABLE,
      notes: p.notes,
      history: p.history,
      portrait: NOT_APPLICABLE,
      cloud_portrait: NOT_APPLICABLE,
      quirk: p.quirk,
      current_hp: p.stats.hp.value,
      background: p.background,
      mechSkills: [m.hull, m.agility, m.systems, m.engineering],
      licenses: [], // Don't really care
      skills,
      talents,
      core_bonuses,
      reserves: [], // Just track in compcon
      orgs: [], // Ditto
      loadout: {
        armor: [], // TODO
        weapons: [], // TODO
        gear: [], // TODO
        extendedGear: [], // NOT_APPLICABLE
        extendedWeapons: [], // NOT_APPLICABLE
        id: uid() + "pilot_loadout",
        name: "Loadout",
      },
      mechs,
      active_mech: mech_id,
      cc_ver: CC_VERSION,
      counter_data: [], // ICounterSaveData[], TODO ??? Maybe???
      custom_counters: [], // Same ??? object[],
      brews: [this.brew], // TODO
    };
  }
}

// function init_compendium_from_items()
// Stores/retrieves. For now does nothing. Might eventually hook into entity ids, perhaps?
export class FauxPersistor extends PersistentStore {
  async set_item(key: string, val: any): Promise<void> {}
  async get_item<T>(key: string): Promise<T> {
    return (null as unknown) as T;
  }
}
