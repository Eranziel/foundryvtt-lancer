import {
  AnyRegNpcFeatureData,
  EntryType,
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

// Nuke this shit from orbit asap

namespace SourceTemplates {
  export interface universal {
    lid: "";
    hp: number;
    overshield: number;
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
  export interface action_tracking {
    activations: number;
    action_tracker: {
      protocol: boolean;
      move: number;
      full: boolean;
      quick: boolean;
      reaction: boolean;
      used_reactions: any[];
    };
  }
  export interface offenses {
    save: number;
    sensor_range: number;
    tech_attack: number;
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
}


type DataTypeMap = { [key in EntryType]: object };
export interface SystemEntryTypesMap extends DataTypeMap {
  // [EntryType.CONDITION]: IStatusData;
  [EntryType.CORE_BONUS]: RegCoreBonusData;
  [EntryType.DEPLOYABLE]: RegDeployableData;
  [EntryType.ENVIRONMENT]: RegEnvironmentData;
  [EntryType.FACTION]: RegFactionData;
  [EntryType.FRAME]: RegFrameData;
  [EntryType.LICENSE]: RegLicenseData;
  [EntryType.MANUFACTURER]: RegManufacturerData;
  [EntryType.MECH]: Omit<RegMechData, 'heat' | 'structure' | 'stress' | 'hp' | 'overshield'> 
                    & SystemTemplates.heat & SystemTemplates.struss & SystemTemplates.hp;
  [EntryType.MECH_SYSTEM]: RegMechSystemData;
  [EntryType.MECH_WEAPON]: RegMechWeaponData;
  [EntryType.NPC]: Omit<RegNpcData, 'heat' | 'structure' | 'stress' | 'hp' | 'overshield'> 
                    & SystemTemplates.heat & SystemTemplates.struss & SystemTemplates.hp;
  [EntryType.NPC_CLASS]: RegNpcClassData;
  [EntryType.NPC_FEATURE]: AnyRegNpcFeatureData;
  [EntryType.NPC_TEMPLATE]: RegNpcTemplateData;
  [EntryType.ORGANIZATION]: RegOrganizationData;
  [EntryType.PILOT_ARMOR]: RegPilotArmorData;
  [EntryType.PILOT_GEAR]: RegPilotGearData;
  [EntryType.PILOT_WEAPON]: RegPilotWeaponData;
  [EntryType.PILOT]: RegPilotData;
  [EntryType.RESERVE]: RegReserveData;
  [EntryType.SITREP]: RegSitrepData;
  [EntryType.SKILL]: RegSkillData;
  [EntryType.STATUS]: RegStatusData;
  [EntryType.TAG]: RegTagTemplateData;
  [EntryType.TALENT]: RegTalentData;
  [EntryType.QUIRK]: RegQuirkData;
  [EntryType.WEAPON_MOD]: RegWeaponModData;
}

export type SystemEntryType<T extends EntryType> = T extends keyof SystemEntryTypesMap
  ? SystemEntryTypesMap[T]
  : never;
