
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
import { LANCER } from '../config'
import { NPCFeatureType } from '../enums';
const lp = LANCER.log_prefix;

export function lancerItemInit(data: any) {
  console.log(`${lp} Initializing new ${data.type}`);
  let img: string = 'systems/lancer/assets/icons/';
  if (data.type === 'skill') {
    img += 'skill.svg';
  }
  else if (data.type === 'talent') {
    img += 'talent.svg';
  }
  else if (data.type === 'core_bonus') {
    img += 'corebonus.svg';
  }
  else if (data.type === 'license') {
    img += 'license.svg';
  }
  else if (data.type === 'pilot_armor') {
    img += 'shield_outline.svg';
  }
  else if (data.type === 'pilot_weapon') {
    img += 'weapon.svg';
  }
  else if (data.type === 'pilot_gear') {
    img += 'generic_item.svg';
  }
  else if (data.type === 'frame') {
    img += 'frame.svg';
  }
  else if (data.type === 'mech_weapon') {
    img += 'weapon.svg';
  }
  else if (data.type === 'mech_system') {
    img += 'system.svg';
    // TODO: set default system type
  }
  else if (data.type === 'npc_class') {
    img += 'npc_class.svg';
  }
  else if (data.type === 'npc_template') {
    img += 'npc_template.svg';
  }
  else if (data.type === 'npc_feature') {
    img += 'npc_feature.svg';
    mergeObject(data, {
      // Default new NPC features to traits
      "data.feature_type": NPCFeatureType.Trait
    })
  }
  else {
    img += 'generic_item.svg';
  }

  mergeObject(data, {
    // Initialize image
    "img": img
  });
}

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