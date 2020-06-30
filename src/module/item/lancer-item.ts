
import {  LancerSkillItemData, 
          LancerTalentItemData,
          LancerCoreBonusItemData,
          LancerLicenseItemData,
          LancerPilotArmorItemData,
          LancerPilotWeaponItemData,
          LancerPilotGearItemData, 
          LancerFrameItemData,
          LancerMechSystemItemData,
          LancerMechWeaponItemData} from '../interfaces'

export class LancerItem extends Item {
  data: LancerSkillItemData | LancerTalentItemData | LancerCoreBonusItemData |
        LancerLicenseItemData | LancerPilotArmorItemData | LancerPilotWeaponItemData |
        LancerPilotGearItemData | LancerFrameItemData | LancerMechSystemItemData |
        LancerMechWeaponItemData;

  /**
   * Return a skill trigger's bonus to rolls
   */
  get triggerBonus(): number {
    // Only works for skills.
    if (this.data.type !== "skill") return 0;
    return (this.data as LancerSkillItemData).data.rank * 2;
  }
}

export class LancerSkill extends LancerItem {
  data: LancerSkillItemData;
}

export class LancerTalent extends LancerItem {
  data: LancerTalentItemData;
}

export class LancerCoreBonus extends LancerItem {
  data: LancerCoreBonusItemData;
}

export class LancerLicense extends LancerItem {
  data: LancerLicenseItemData;
}

export class LancerPilotArmor extends LancerItem {
  data: LancerPilotArmorItemData;
}

export class LancerPilotWeapon extends LancerItem {
  data: LancerPilotWeaponItemData;
}

export class LancerPilotGear extends LancerItem {
  data: LancerPilotGearItemData;
}

export class LancerFrame extends LancerItem {
  data: LancerFrameItemData;
}

export class LancerMechSystem extends LancerItem {
  data: LancerMechSystemItemData;
}

export class LancerMechWeapon extends LancerItem {
  data: LancerMechWeaponItemData;
}