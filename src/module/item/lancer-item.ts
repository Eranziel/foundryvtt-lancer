
import {  LancerSkillData, 
          LancerTalentData,
          LancerCoreBonusData,
          LancerLicenseData,
          LancerPilotArmorData,
          LancerPilotWeaponData,
          LancerPilotGearData, 
          LancerFrameData,
          LancerMechSystemData,
          LancerMechWeaponData,
          LancerNPCFeatureData,
          LancerNPCTemplateData,
          LancerNPCClassData} from '../interfaces'

export class LancerItem extends Item {
  data: LancerSkillData | LancerTalentData | LancerCoreBonusData |
        LancerLicenseData | LancerPilotArmorData | LancerPilotWeaponData |
        LancerPilotGearData | LancerFrameData | LancerMechSystemData |
        LancerMechWeaponData| LancerNPCFeatureData | LancerNPCTemplateData |
        LancerNPCClassData;

  /**
   * Return a skill trigger's bonus to rolls
   */
  get triggerBonus(): number {
    // Only works for skills.
    if (this.data.type !== "skill") return 0;
    return (this.data as LancerSkillData).data.rank * 2;
  }
}

export class LancerSkill extends LancerItem {
  data: LancerSkillData;
}

export class LancerTalent extends LancerItem {
  data: LancerTalentData;
}

export class LancerCoreBonus extends LancerItem {
  data: LancerCoreBonusData;
}

export class LancerLicense extends LancerItem {
  data: LancerLicenseData;
}

export class LancerPilotArmor extends LancerItem {
  data: LancerPilotArmorData;
}

export class LancerPilotWeapon extends LancerItem {
  data: LancerPilotWeaponData;
}

export class LancerPilotGear extends LancerItem {
  data: LancerPilotGearData;
}

export class LancerFrame extends LancerItem {
  data: LancerFrameData;
}

export class LancerMechSystem extends LancerItem {
  data: LancerMechSystemData;
}

export class LancerMechWeapon extends LancerItem {
  data: LancerMechWeaponData;
}

export class LancerNPCFeature extends LancerItem {
  data: LancerNPCFeatureData;
}

export class LancerNPCTemplate extends LancerItem{
  data: LancerNPCTemplateData;
}

export class LancerNPCClass extends LancerItem{
  data: LancerNPCClassData;
}