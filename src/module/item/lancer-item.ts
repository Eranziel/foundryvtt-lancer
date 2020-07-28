
import {  LancerSkillItemData, 
          LancerTalentItemData,
          LancerCoreBonusItemData,
          LancerLicenseItemData,
          LancerPilotArmorItemData,
          LancerPilotWeaponItemData,
          LancerPilotGearItemData, 
          LancerFrameItemData,
          LancerMechSystemItemData,
          LancerMechWeaponItemData,
          LancerNPCFeatureItemData,
          LancerNPCTemplateItemData,
          LancerNPCClassItemData} from '../interfaces'
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
    img += 'trait.svg';
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
  data: LancerSkillItemData | LancerTalentItemData | LancerCoreBonusItemData |
        LancerLicenseItemData | LancerPilotArmorItemData | LancerPilotWeaponItemData |
        LancerPilotGearItemData | LancerFrameItemData | LancerMechSystemItemData |
        LancerMechWeaponItemData| LancerNPCFeatureItemData | LancerNPCTemplateItemData |
        LancerNPCClassItemData;

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

export class LancerNPCFeature extends LancerItem {
  data: LancerNPCFeatureItemData;
}

export class LancerNPCTemplate extends LancerItem{
  data: LancerNPCTemplateItemData;
}

export class LancerNPCClass extends LancerItem{
  data: LancerNPCClassItemData;
}