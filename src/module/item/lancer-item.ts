
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

export class LancerSkill extends Item {
  data: LancerSkillItemData;

  /**
   * Return the skill trigger's bonus to rolls
   */
  get bonus(): number {
    return this.data.data.rank * 2;
  }
}

export class LancerTalent extends Item {
  data: LancerTalentItemData;
}

export class LancerCoreBonus extends Item {
  data: LancerCoreBonusItemData;
}

export class LancerLicense extends Item {
  data: LancerLicenseItemData;
}

export class LancerPilotArmor extends Item {
  data: LancerPilotArmorItemData;
}

export class LancerPilotWeapon extends Item {
  data: LancerPilotWeaponItemData;
}

export class LancerPilotGear extends Item {
  data: LancerPilotGearItemData;
}

export class LancerFrame extends Item {
  data: LancerFrameItemData;
}

export class LancerMechSystem extends Item {
  data: LancerMechSystemItemData;
}

export class LancerMechWeapon extends Item {
  data: LancerMechWeaponItemData;
}