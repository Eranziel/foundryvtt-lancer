import {
  AnyRegNpcFeatureData,
  EntryType,
  FittingSize,
  MountType,
  RegCoreBonusData,
  RegDeployableData,
  RegEnvironmentData,
  RegFactionData,
  RegFrameData,
  RegLicenseData,
  RegManufacturerData,
  RegMechData,
  RegMechSystemData,
  RegMechWeaponData,
  RegNpcClassData,
  RegNpcData,
  RegNpcTemplateData,
  RegOrganizationData,
  RegPilotArmorData,
  RegPilotData,
  RegPilotGearData,
  RegPilotWeaponData,
  RegQuirkData,
  RegReserveData,
  RegSitrepData,
  RegSkillData,
  RegStatusData,
  RegTagTemplateData,
  RegTalentData,
  RegWeaponModData,
} from "machine-mind";
import { LancerMECH, LancerPILOT } from "./actor/lancer-actor";
import { LancerFRAME, LancerLICENSE, LancerMECH_WEAPON, LancerNPC_CLASS, LancerNPC_FEATURE, LancerNPC_TEMPLATE, LancerWEAPON_MOD } from "./item/lancer-item";

// Nuke this shit from orbit as soon as LukeAbbey gets their cool auto typing thing working

namespace SourceTemplates {
  export interface actor_universal {
    lid: "";
    burn: number;

    resistances: {
      Kinetic: boolean;
      Energy: boolean;
      Explosive: boolean;
      Heat: boolean;
      Burn: boolean;
      Variable: boolean;
    };

    custom_counters: any[];
  }
  
  export interface hp {
    hp: number;
    overshield: number;
    armor: number;
  }

  export interface action_tracking {
    action_tracker: {
      protocol: boolean;
      move: number;
      full: boolean;
      quick: boolean;
      reaction: boolean;
      free: boolean;
      // used_reactions: any[];
    };
  }
  export interface heat {
    heat: number;
  }
  export interface statuses {
    statuses: {
      dangerzone: boolean;
      downandout: boolean;
      engaged: boolean;
      exposed: boolean;
      invisible: boolean;
      prone: boolean;
      shutdown: boolean;
      immobilized: boolean;
      impaired: boolean;
      jammed: boolean;
      lockon: boolean;
      shredded: boolean;
      slow: boolean;
      stunned: boolean;
    };
  }
  export interface struss {
    stress: number;
    structure: number;
  }
}

interface BoundedNum {
    min?: number,
    max?: number,
    value: 0
}

type FullBoundedNum = Required<BoundedNum>;

namespace SystemTemplates {
  export interface actor_universal extends SourceTemplates.actor_universal {
    edef : number;
    evasion : number;
    speed : number;
    armor : number;
    size: number
  }

  // We expect these to be on every item
  export interface struss {
    stress: FullBoundedNum;
    structure: FullBoundedNum;
  }

  export interface heat {
    heat: FullBoundedNum;  
  }

  export interface hp {
    hp: FullBoundedNum;  
    overshield: FullBoundedNum;
  }
  export interface offenses {
    save: number;
    sensor_range: number;
    tech_attack: number;
  }

  export interface uses {
    uses: FullBoundedNum
  }
}


type DataTypeMap = { [key in EntryType]: object };
interface SystemDataTypesMap extends DataTypeMap {
  // [EntryType.CONDITION]: IStatusData;
  [EntryType.CORE_BONUS]: RegCoreBonusData;
  [EntryType.DEPLOYABLE]: Omit<RegDeployableData, 'hp'>
                    & SystemTemplates.actor_universal
                    & SystemTemplates.hp & SystemTemplates.heat;
  [EntryType.ENVIRONMENT]: RegEnvironmentData;
  [EntryType.FACTION]: RegFactionData;
  [EntryType.FRAME]: RegFrameData;
  [EntryType.LICENSE]: RegLicenseData;
  [EntryType.MANUFACTURER]: RegManufacturerData;
  [EntryType.MECH]: Omit<RegMechData, 'heat' | 'structure' | 'stress' | 'hp' | 'overshield' | 'repairs' | 'pilot' | 'loadout'> 
                    & SystemTemplates.actor_universal
                    & SystemTemplates.hp & SystemTemplates.heat & SystemTemplates.struss 
                    & SourceTemplates.action_tracking
                    & SystemTemplates.offenses
                    & { 
                      repairs: FullBoundedNum, 
                      pilot: LancerPILOT | null ,
                      overcharge: number,
                      loadout: {
                        frame: LancerFRAME | null,
                        weapon_mounts: Array<{
                          slots: Array<{
                            weapon: LancerMECH_WEAPON | null,
                            mod: LancerWEAPON_MOD | null,
                            size: FittingSize
                          }>,
                          type: MountType,
                          intergrated: boolean,
                          bracing: boolean,
                          // mount_flags: Record<string, unknown> 
                        }>, // TODO
                        system_mounts: Array<any>, // TODO
                        // TODO: class/template enumeration
                      }
                    };
  [EntryType.MECH_SYSTEM]: Omit<RegMechSystemData, 'uses'>
                    & SystemTemplates.uses;
  [EntryType.MECH_WEAPON]: RegMechWeaponData;
  [EntryType.NPC]: Omit<RegNpcData, 'heat' | 'structure' | 'stress' | 'hp' | 'overshield'> 
                    & SystemTemplates.actor_universal
                    & SystemTemplates.hp & SystemTemplates.heat & SystemTemplates.struss 
                    & SystemTemplates.offenses
                    & SourceTemplates.action_tracking 
                    & { 
                      class: LancerNPC_CLASS, 
                      templates: Array<LancerNPC_TEMPLATE>, 
                      features: Array<LancerNPC_FEATURE> 
                    };
  [EntryType.NPC_CLASS]: Omit<RegNpcClassData, 'base_features' | 'optional_features'> & {
    base_features: Array<LancerNPC_FEATURE>,
    optional_features: Array<LancerNPC_FEATURE>  
  };
  [EntryType.NPC_FEATURE]: AnyRegNpcFeatureData;
  [EntryType.NPC_TEMPLATE]: RegNpcTemplateData & {
    base_features: Array<LancerNPC_FEATURE>,
    optional_features: Array<LancerNPC_FEATURE>  
  };
  [EntryType.ORGANIZATION]: RegOrganizationData;
  [EntryType.PILOT_ARMOR]: RegPilotArmorData;
  [EntryType.PILOT_GEAR]: RegPilotGearData;
  [EntryType.PILOT_WEAPON]: Omit<RegPilotWeaponData, 'uses'>
                    & SystemTemplates.uses;
  [EntryType.PILOT]: Omit<RegPilotData, 'hp'> 
                    & SystemTemplates.actor_universal
                    & SystemTemplates.hp
                    & { 
                      active_mech: LancerMECH | null,
                      owned_mechs: LancerMECH[],
                      licenses: LancerLICENSE[],
                      // TODO: other item enumeration, typed loadout
                    };
  [EntryType.RESERVE]: RegReserveData;
  [EntryType.SITREP]: RegSitrepData;
  [EntryType.SKILL]: RegSkillData;
  [EntryType.STATUS]: RegStatusData;
  [EntryType.TAG]: RegTagTemplateData;
  [EntryType.TALENT]: RegTalentData;
  [EntryType.QUIRK]: RegQuirkData;
  [EntryType.WEAPON_MOD]: RegWeaponModData;
}

export type SystemDataType<T extends EntryType> = T extends keyof SystemDataTypesMap
  ? SystemDataTypesMap[T]
  : never;
