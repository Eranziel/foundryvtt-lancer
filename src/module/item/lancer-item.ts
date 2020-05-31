
import {  LancerSkillEntityData, 
          LancerTalentEntityData,
          LancerCoreBonusEntityData,
          LancerLicenseEntityData,
          LancerPilotArmorEntityData,
          LancerPilotWeaponEntityData,
          LancerPilotGearEntityData, 
          LancerFrameEntityData,
          LancerMechSystemEntityData,
          LancerMechWeaponEntityData} from '../interfaces'

export class LancerSkill extends Item {
  data: LancerSkillEntityData;
}

export class LancerTalent extends Item {
  data: LancerTalentEntityData;
}

export class LancerCoreBonus extends Item {
  data: LancerCoreBonusEntityData;
}

export class LancerLicense extends Item {
  data: LancerLicenseEntityData;
}

export class LancerPilotArmor extends Item {
  data: LancerPilotArmorEntityData;
}

export class LancerPilotWeapon extends Item {
  data: LancerPilotWeaponEntityData;
}

export class LancerPilotGear extends Item {
  data: LancerPilotGearEntityData;
}

export class LancerFrame extends Item {
  data: LancerFrameEntityData;
}

export class LancerMechSystem extends Item {
  data: LancerMechSystemEntityData;
}

export class LancerMechWeapon extends Item {
  data: LancerMechWeaponEntityData;
}