/**
import { LANCER } from "./config";
const lp = LANCER.log_prefix;
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
  RangeData,
  LancerMechWeaponData,
  LancerCoreSystemData,
  TagData,
  DamageData,
  NPCDamageData,
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
  IRangeData,
  IMechWeaponData,
  Talent,
  Skill,
  CoreBonus,
  Frame,
  ItemType,
  CoreSystem,
  Tag,
  NpcClass,
  NpcTemplate,
  NpcFeature,
  MechType,
  PilotArmor,
  PilotWeapon,
  PilotGear,
  Range,
  Damage,
  MechWeapon,
  DamageType,
  ItemEffect,
  AIEffect,
  BasicEffect,
  BonusEffect,
  ChargeEffect,
  Charge,
  DeployableEffect,
  DroneEffect,
  GenericEffect,
  OffensiveEffect,
  ProfileEffect,
  ProtocolEffect,
  ReactionEffect,
  TechEffect,
  NpcFeatureType,
  NpcReaction,
  NpcTech,
  NpcWeapon, INpcReactionData, INpcTechData, INpcWeaponData, INpcDamageData, CustomSkill
} from "machine-mind";
import { INpcClassStats, NpcClassStats } from "machine-mind/dist/classes/npc/NpcClassStats";
import {
  AIEffectData,
  BasicEffectData,
  BonusEffectData,
  ChargeData,
  ChargeEffectData,
  DeployableEffectData,
  DroneEffectData,
  EffectData,
  GenericEffectData,
  InvadeOptionData,
  OffensiveEffectData,
  ProfileEffectData,
  ProtocolEffectData,
  ReactionEffectData,
  TechEffectData,
} from "./item/effects";
import { ActivationType, EffectType } from "./enums";
import { InvadeOption } from "machine-mind/dist/classes/effects/TechEffect";
import { LancerNPCReactionData, LancerNPCTechData, LancerNPCWeaponData } from "./item/npc-feature";
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

  Talent_to_LancerTalentData(t: Talent): LancerTalentData {
    let data: LancerTalentData = {
      id: t.ID,
      name: t.Name,
      description: t.Description,
      ranks: t.Ranks,
      rank: 1,
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

  Skill_to_LancerSkillData(t: Skill): LancerSkillData {
    let data: LancerSkillData = {
      id: t.ID,
      name: t.Name,
      description: t.Description,
      detail: t.Detail,
      family: t.Family,
      rank: 1,
    };
    return data;
  }

  CustomSkill_to_LancerSkillData(t: CustomSkill): LancerSkillData {
    let data: LancerSkillData = {
      id: t.ID,
      name: t.Name,
      description: t.Description,
      detail: t.Detail,
      family: t.Family,
      rank: 1
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

  CoreBonus_to_LancerCoreBonusData(t: CoreBonus): LancerCoreBonusData {
    let data: LancerCoreBonusData = {
      id: t.ID,
      name: t.Name,
      source: t.Source,
      effect: t.Effect,
      mounted_effect: t.MountedEffect,
    };
    return data;
  }

  // TAGS
  Tag_to_TagData(t: Tag): TagData {
    return {
      id: t.ID,
      name: t.Name,
      description: t.Description,
      val: t.Value ? t.Value : undefined,
      brew: t.Brew,
      counters: null,
    };
  }

  Multi_Tag_to_TagData(t: Tag[]): TagData[] {
    return t.map((v: Tag) => {
      return this.Tag_to_TagData(v);
    });
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

  CoreSystem_to_LancerCoreSystemData(t: CoreSystem): LancerCoreSystemData {
    let data: LancerCoreSystemData = {
      name: t.Name,
      description: t.Description,
      tags: this.Multi_Tag_to_TagData(t.Tags),
      active_name: t.ActiveName,
      active_effect: t.ActiveEffect,
      passive_name: t.PassiveName,
      passive_effect: t.PassiveEffect,
      integrated: t.Integrated ? { id: t.Integrated.ID } : null,
    };
    return data;
  }

  Frame_to_LancerFrameData(t: Frame): LancerFrameData {
    let data: LancerFrameData = {
      id: t.ID,
      name: t.Name,
      description: t.Description,
      flavor_name: t.FlavorName,
      flavor_description: "",
      license: t.License,
      license_level: t.LicenseLevel,
      source: t.Source,
      mechtype: t.Mechtype,
      note: t.Note,
      mounts: t.Mounts,
      traits: t.Traits,
      core_system: this.CoreSystem_to_LancerCoreSystemData(t.CoreSystem),
      stats: {
        armor: t.Armor,
        edef: t.EDefense,
        evasion: t.Evasion,
        heatcap: t.HeatCap,
        hp: t.HP,
        repcap: t.RepCap,
        save: t.SaveTarget,
        sensor_range: t.SensorRange,
        size: t.Size,
        sp: t.SP,
        speed: t.Speed,
        tech_attack: t.TechAttack,
      },
      item_type: ItemType.Frame,
    };
    return data;
  }

  // MODS
  LancerModData_to_IWeaponModData(t: LancerMechSystemData): IWeaponModData {
    return null as any;
    // TODO!
    // return {

    // }
  }

  // TODO
  // WeaponMod_to_LancerModData(t: WeaponMod): LancerMechSystemData {
  //   let data: LancerMechSystemData = {

  //   };
  //   return data;
  // }

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

  LancerNPCFeatureData_to_INpcFeatureData(t: LancerNPCFeatureData | LancerNPCReactionData | LancerNPCTechData | LancerNPCWeaponData): INpcFeatureData | INpcReactionData | INpcTechData | INpcWeaponData {
    let data: INpcFeatureData;
    data = {
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
    if (t.feature_type === NpcFeatureType.Reaction) {
      let td: LancerNPCReactionData = t as LancerNPCReactionData;
      let data2: INpcReactionData = {
        ...data,
        trigger: td.trigger,
        type: NpcFeatureType.Reaction
      };
      return data2;
    } else if (t.feature_type === NpcFeatureType.Tech) {
      let td: LancerNPCTechData = t as LancerNPCTechData;
      let data2: INpcTechData = {
        ...data,
        tech_type: td.tech_type,
        accuracy: td.accuracy,
        attack_bonus: td.attack_bonus,
        type: NpcFeatureType.Tech
      };
      return data2;
    } else if (t.feature_type === NpcFeatureType.Weapon) {
      let td: LancerNPCWeaponData = t as LancerNPCWeaponData;
      let data2: INpcWeaponData = {
        ...data,
        accuracy: td.accuracy,
        attack_bonus: td.attack_bonus,
        damage: this.Multi_NPCDamageData_to_INpcDamageData(td.damage),
        range: this.Multi_RangeData_to_IRangeData(td.range),
        on_hit: td.on_hit,
        weapon_type: td.weapon_type,
        type: NpcFeatureType.Weapon
      };
      return data2;
    }
    return data;
  }

  LancerNPCTemplateData_to_INpcTemplateData(t: LancerNPCTemplateData): INpcTemplateData {
    return {
      brew: this.brew,
      base_features: t.base_features,
      description: t.description,
      id: t.id,
      name: t.name,
      optional_features: t.optional_features,
      power: 0, // NOT_APPLICABLE
    };
  }

  NpcRole(t: string): MechType {
    if (t === MechType.Artillery) return MechType.Artillery;
    if (t === MechType.Controller) return MechType.Controller;
    if (t === MechType.Defender) return MechType.Defender;
    if (t === MechType.Striker) return MechType.Striker;
    if (t === MechType.Support) return MechType.Support;
    return MechType.Balanced;
  }

  NpcClassStats_to_LancerNPCClassStatsData(t: NpcClassStats): LancerNPCClassStatsData {
    const tiers = [1, 2, 3];
    let data: LancerNPCClassStatsData = {
      activations: tiers.map((v: number) => {
        return t.Activations(v);
      }),
      agility: tiers.map((v: number) => {
        return t.Agility(v);
      }),
      armor: tiers.map((v: number) => {
        return t.Armor(v);
      }),
      edef: tiers.map((v: number) => {
        return t.EDefense(v);
      }),
      engineering: tiers.map((v: number) => {
        return t.Engineering(v);
      }),
      evasion: tiers.map((v: number) => {
        return t.Evade(v);
      }),
      heatcap: tiers.map((v: number) => {
        return t.HeatCapacity(v);
      }),
      hp: tiers.map((v: number) => {
        return t.HP(v);
      }),
      hull: tiers.map((v: number) => {
        return t.Hull(v);
      }),
      save: tiers.map((v: number) => {
        return t.Save(v);
      }),
      sensor_range: tiers.map((v: number) => {
        return t.Sensor(v);
      }),
      size: tiers.map((v: number) => {
        return t.Sizes(v)[0];
      }),
      speed: tiers.map((v: number) => {
        return t.Speed(v);
      }),
      stress: tiers.map((v: number) => {
        return t.Stress(v);
      }),
      structure: tiers.map((v: number) => {
        return t.Structure(v);
      }),
      systems: tiers.map((v: number) => {
        return t.Systems(v);
      }),
    };
    return data;
  }

  NpcClass_to_LancerNPCClassData(t: NpcClass): LancerNPCClassData {
    let data: LancerNPCClassData = {
      id: t.ID,
      name: t.Name,
      note: "",
      info: { flavour: t.Flavor, tactics: t.Tactics },
      description: "",
      flavor_name: "",
      flavor_description: "",
      mechtype: this.NpcRole(t.Role),
      stats: this.NpcClassStats_to_LancerNPCClassStatsData(t.Stats),
      base_features: t.BaseFeatures.map((f: NpcFeature) => {
        return f.ID;
      }),
      optional_features: t.OptionalFeatures.map((f: NpcFeature) => {
        return f.ID;
      }),
      item_type: ItemType.None,
    };
    return data;
  }

  NpcTemplate_to_LancerNPCTemplateData(t: NpcTemplate): LancerNPCTemplateData {
    let data: LancerNPCTemplateData = {
      id: t.ID,
      name: t.Name,
      description: t.Description,
      flavor_name: "",
      flavor_description: "",
      note: "",
      base_features: t.BaseFeatures.map((f: NpcFeature) => {
        return f.ID;
      }),
      optional_features: t.OptionalFeatures.map((f: NpcFeature) => {
        return f.ID;
      }),
      item_type: ItemType.None,
    };
    return data;
  }

  NpcFeature_to_LancerNPCFeatureData(t: NpcFeature): LancerNPCFeatureData {
    const tiers = [1, 2, 3];
    let data: LancerNPCFeatureData = {
      id: t.ID,
      name: t.Name,
      description: "",
      note: "",
      flavor_name: "",
      flavor_description: "",
      charged: true,
      destroyed: false,
      feature_type: t.FeatureType,
      item_type: ItemType.NpcFeature,
      max_uses: 0,
      uses: 0,
      origin_base: t.IsBase,
      origin_name: t.OriginClass,
      origin_type: t.OriginSet,
      tags: this.Multi_Tag_to_TagData(t.Tags),
      bonus: t.Bonus,
      effect: t.Effect,
      override: t.Override,
    };

    if (data.feature_type === NpcFeatureType.Reaction) {
      const td: NpcReaction = t as NpcReaction;
      (data as LancerNPCReactionData) = {
        ...data,
        trigger: td.Trigger,
        feature_type: NpcFeatureType.Reaction
      }
    } else if (data.feature_type === NpcFeatureType.Tech) {
      const td: NpcTech = t as NpcTech;
      (data as LancerNPCTechData) = {
        ...data,
        tech_type: td.TechType,
        accuracy: tiers.map((x: number) => { return td.Accuracy(x) }),
        attack_bonus: tiers.map((x: number) => { return td.AttackBonus(x) }),
        feature_type: NpcFeatureType.Tech
      }
    } else if (data.feature_type === NpcFeatureType.Weapon) {
      const td: NpcWeapon = t as NpcWeapon;
      (data as LancerNPCWeaponData) = {
        ...data,
        accuracy: tiers.map((x: number) => { return td.Accuracy(x) }),
        attack_bonus: tiers.map((x: number) => { return td.AttackBonus(x) }),
        damage: this.Multi_Damage_to_NPCDamageData(tiers.map((x: number) => { return td.Damage(x) })),
        range: this.Multi_Range_to_RangeData(td.Range),
        weapon_type: td.WeaponType,
        on_hit: td.OnHit,
        feature_type: NpcFeatureType.Weapon
      }
    }
    return data;
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
      range: t.range.map(this.RangeData_to_IRangeData).filter(x => x) as IRangeData[],
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

  PilotArmor_to_LancerPilotArmorData(t: PilotArmor): LancerPilotArmorData {
    let data: LancerPilotArmorData = {
      id: t.ID,
      name: t.Name,
      description: t.Description,
      flavor_name: t.FlavorName,
      flavor_description: "",
      note: t.Note,
      armor: t.Armor,
      edef: t.EDefense,
      edef_bonus: t.EDefenseBonus,
      evasion: t.Evasion,
      evasion_bonus: t.EvasionBonus,
      hp_bonus: t.HPBonus,
      speed: t.Speed,
      speed_bonus: t.SpeedBonus,
      item_type: t.ItemType,
      tags: this.Multi_Tag_to_TagData(t.Tags),
    };
    return data;
  }

  PilotWeapon_to_LancerPilotWeaponData(t: PilotWeapon): LancerPilotWeaponData {
    let data: LancerPilotWeaponData = {
      id: t.ID,
      name: t.Name,
      description: t.Description,
      flavor_name: t.FlavorName,
      flavor_description: "",
      note: t.Note,
      tags: this.Multi_Tag_to_TagData(t.Tags),
      range: this.Multi_Range_to_RangeData(t.Range),
      damage: this.Multi_Damage_to_DamageData(t.Damage),
      effect: t.Effect,
      custom_damage_type: t.DamageTypeOverride ? t.DamageTypeOverride : null,
      item_type: t.ItemType,
    };
    return data;
  }

  PilotGear_to_LancerPilotGearData(t: PilotGear): LancerPilotGearData {
    let data: LancerPilotGearData = {
      id: t.ID,
      name: t.Name,
      description: t.Description,
      flavor_name: t.FlavorName,
      flavor_description: "",
      note: t.Note,
      uses: t.MaxUses,
      current_uses: t.Uses ? t.Uses : t.MaxUses,
      item_type: t.ItemType,
      tags: this.Multi_Tag_to_TagData(t.Tags),
    };
    return data;
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

  Charge_to_ChargeData(t: Charge): ChargeData {
    let data: ChargeData = {
      name: t.Name ? t.Name : "",
      detail: t.Detail,
      charge_type: t.ChargeType,
      range: this.Multi_Range_to_RangeData(t.Range),
      damage: this.Multi_Damage_to_DamageData(t.Damage),
      tags: this.Multi_Tag_to_TagData(t.Tags),
    };
    return data;
  }

  Multi_Charge_to_ChargeData(t: Charge[]): ChargeData[] {
    return t.map((v: Charge) => {
      return this.Charge_to_ChargeData(v);
    });
  }

  InvadeOption_to_InvadeOptionsData(t: InvadeOption): InvadeOptionData {
    let data: InvadeOptionData = {
      name: t.Name,
      detail: t.Detail,
      activation: t.Activation,
    };
    return data;
  }

  Multi_InvadeOption_to_InvadeOptionsData(t: InvadeOption[]): InvadeOptionData[] {
    return t.map((v: InvadeOption) => {
      return this.InvadeOption_to_InvadeOptionsData(v);
    });
  }

  ItemEffect_to_EffectData(t: ItemEffect): any {
    if (!t) return null;
    if (t.EffectType === EffectType.AI) {
      const td = t as AIEffect;
      let data: AIEffectData = {
        name: td.Name ? td.Name : undefined,
        effect_type: td.EffectType ? td.EffectType : EffectType.Generic,
        detail: td.Detail,
        activation: td.Activation ? td.Activation : undefined,
        tags: this.Multi_Tag_to_TagData(td.Tags),
        abilities: this.Multi_ItemEffect_to_EffectData(td.Abilities),
      };
      return data;
    } else if (t.EffectType === EffectType.Basic) {
      const td = t as BasicEffect;
      let data: BasicEffectData = {
        name: td.Name ? td.Name : undefined,
        effect_type: td.EffectType ? td.EffectType : EffectType.Generic,
        detail: td.Detail,
        activation: td.Activation ? td.Activation : undefined,
        tags: this.Multi_Tag_to_TagData(td.Tags),
      };
      return data;
    } else if (t.EffectType === EffectType.Bonus) {
      const td = t as BonusEffect;
      let data: BonusEffectData = {
        name: td.Name ? td.Name : undefined,
        effect_type: td.EffectType ? td.EffectType : EffectType.Generic,
        detail: td.Detail,
        activation: td.Activation ? td.Activation : undefined,
        tags: this.Multi_Tag_to_TagData(td.Tags),
        armor: td.Armor ? td.Armor : undefined,
        edef: td.EDef ? td.EDef : undefined,
        evasion: td.Evasion ? td.Evasion : undefined,
        hp: td.HP ? td.HP : undefined,
        size: td.Size ? td.Size : undefined,
      };
      return data;
    } else if (t.EffectType === EffectType.Charge) {
      const td = t as ChargeEffect;
      let data: ChargeEffectData = {
        name: td.Name ? td.Name : undefined,
        effect_type: td.EffectType ? td.EffectType : EffectType.Generic,
        charges: this.Multi_Charge_to_ChargeData(td.Charges),
        activation: td.Activation ? td.Activation : undefined,
        tags: this.Multi_Tag_to_TagData(td.Tags),
      };
      return data;
    } else if (t.EffectType === EffectType.Deployable) {
      const td = t as DeployableEffect;
      let data: DeployableEffectData = {
        name: td.Name ? td.Name : undefined,
        effect_type: td.EffectType ? td.EffectType : EffectType.Generic,
        detail: td.Detail ? td.Detail : "",
        activation: td.Activation ? td.Activation : undefined,
        tags: this.Multi_Tag_to_TagData(td.Tags),
        count: td.Count ? td.Count : undefined,
        hp: td.HP ? td.HP : undefined,
        edef: td.EDef ? td.EDef : undefined,
        evasion: td.Evasion ? td.Evasion : undefined,
        // TODO: Comp/Con doesn't support heat on deployables yet
        // heat: td.Heat ? td.Heat : undefined,
        size: td.Size ? td.Size : undefined,
      };
      return data;
    } else if (t.EffectType === EffectType.Drone) {
      const td = t as DroneEffect;
      let data: DroneEffectData = {
        name: td.Name ? td.Name : undefined,
        effect_type: td.EffectType ? td.EffectType : EffectType.Generic,
        detail: td.Detail,
        activation: td.Activation ? td.Activation : undefined,
        tags: this.Multi_Tag_to_TagData(td.Tags),
        edef: td.EDef,
        evasion: td.Evasion,
        hp: td.HP,
        size: td.Size,
        armor: td.Armor,
        // TODO: Comp/Con doesn't support heat on drones yet
        // heat: td.Heat ? td.Heat : undefined,
        abilities: this.Multi_ItemEffect_to_EffectData(td.Abilities),
      };
      return data;
    } else if (t.EffectType === EffectType.Generic) {
      const td = t as GenericEffect;
      let data: GenericEffectData = {
        effect_type: td.EffectType ? td.EffectType : EffectType.Generic,
        detail: td.Detail,
        activation: td.Activation ? td.Activation : undefined,
        tags: this.Multi_Tag_to_TagData(td.Tags),
      };
      return data;
    } else if (t.EffectType === EffectType.Offensive) {
      const td = t as OffensiveEffect;
      let data: OffensiveEffectData = {
        name: td.Name ? td.Name : undefined,
        effect_type: td.EffectType ? td.EffectType : EffectType.Generic,
        detail: td.Detail ? td.Detail : undefined,
        activation: td.Activation ? td.Activation : undefined,
        tags: this.Multi_Tag_to_TagData(td.Tags),
        attack: td.OnAttack ? td.OnAttack : undefined,
        hit: td.OnHit ? td.OnHit : undefined,
        critical: td.OnCrit ? td.OnCrit : undefined,
        abilities: td.Abilities ? this.Multi_ItemEffect_to_EffectData(td.Abilities) : undefined,
      };
      return data;
    } else if (t.EffectType === EffectType.Profile) {
      const td = t as ProfileEffect;
      let data: ProfileEffectData = {
        name: td.Name ? td.Name : "",
        effect_type: td.EffectType ? td.EffectType : EffectType.Generic,
        detail: td.Detail ? td.Detail : undefined,
        activation: td.Activation ? td.Activation : undefined,
        tags: this.Multi_Tag_to_TagData(td.Tags),
        range: this.Multi_Range_to_RangeData(td.Range),
        damage: this.Multi_Damage_to_DamageData(td.Damage),
      };
      return data;
    } else if (t.EffectType === EffectType.Protocol) {
      const td = t as ProtocolEffect;
      let data: ProtocolEffectData = {
        name: td.Name ? td.Name : undefined,
        effect_type: td.EffectType ? td.EffectType : EffectType.Generic,
        detail: td.Detail,
        activation: td.Activation ? td.Activation : undefined,
        tags: this.Multi_Tag_to_TagData(td.Tags),
      };
      return data;
    } else if (t.EffectType === EffectType.Reaction) {
      const td = t as ReactionEffect;
      let data: ReactionEffectData = {
        name: td.Name,
        effect_type: td.EffectType ? td.EffectType : EffectType.Generic,
        detail: td.Detail,
        activation: td.Activation ? td.Activation : undefined,
        tags: this.Multi_Tag_to_TagData(td.Tags),
        init: td.Init ? td.Init : undefined,
        trigger: td.Trigger,
        frequency: td.Frequency,
      };
      return data;
    } else if (t.EffectType === EffectType.Tech) {
      const td = t as TechEffect;
      let data: TechEffectData = {
        name: td.Name ? td.Name : undefined,
        effect_type: td.EffectType ? td.EffectType : EffectType.Generic,
        detail: td.Detail,
        activation: td.Activation ? td.Activation : ActivationType.None,
        tags: this.Multi_Tag_to_TagData(td.Tags),
        option_set: td.OptionSet,
        options: td.Options ? this.Multi_InvadeOption_to_InvadeOptionsData(td.Options) : undefined,
      };
      return data;
    }
  }

  Multi_ItemEffect_to_EffectData(t: ItemEffect[]): EffectData[] {
    return t.map((x: ItemEffect) => {
      return this.ItemEffect_to_EffectData(x);
    });
  }

  MechSystem_to_LancerMechSystemData(t: MechSystem): LancerMechSystemData {
    if (t.Effect.length > 1) console.log(`${lp} multi-effect item: `, t);
    let data: LancerMechSystemData = {
      id: t.ID,
      name: t.Name,
      description: t.Description,
      flavor_name: t.FlavorName,
      flavor_description: "",
      note: t.Note,
      source: t.Source,
      license: t.License,
      license_level: t.LicenseLevel,
      item_type: t.ItemType,
      cascading: t.IsCascading,
      destroyed: t.Destroyed,
      integrated: t.IsIntegrated,
      loaded: t.Loaded,
      max_uses: t.MaxUses,
      max_use_override: t.MaxUses,
      uses: t.Uses,
      effect: this.ItemEffect_to_EffectData(t.Effect[0]),
      sp: t.SP,
      system_type: t.Type,
      tags: this.Multi_Tag_to_TagData(t.Tags),
    };
    return data;
  }

  // Ranges
  RangeData_to_IRangeData(t: RangeData): IRangeData | null {
    if (t.type == "None") {
      return null;
    } else {
      return {
        ...t,
      };
    }
  }

  Multi_RangeData_to_IRangeData(t: RangeData[]): IRangeData[] {
    let ranges = t.map((r: RangeData) => {
      return this.RangeData_to_IRangeData(r);
    });
    return (ranges.filter(r => {
      return r !== null;
    }) as IRangeData[]);
  }

  // TODO - RangeData.val needs to be able to take a string
  Range_to_RangeData(t: Range): RangeData {
    let data: RangeData = {
      type: t.Type,
      val: (t.Value as unknown) as number, // This is a dirty hack - it's definitely a string sometimes
      override: t.Override,
    };
    return data;
  }

  Multi_Range_to_RangeData(t: Range[]): RangeData[] {
    return t.map((v: Range) => {
      return this.Range_to_RangeData(v);
    });
  }

  // Damages
  Damage(t: string): DamageType {
    if (t === DamageType.Burn) return DamageType.Burn;
    if (t === DamageType.Energy) return DamageType.Energy;
    if (t === DamageType.Explosive) return DamageType.Explosive;
    if (t === DamageType.Heat) return DamageType.Heat;
    if (t === DamageType.Kinetic) return DamageType.Kinetic;
    return DamageType.Variable;
  }

  Damage_to_DamageData(t: Damage): DamageData {
    let data: DamageData = {
      type: t.Type,
      val: t.Value,
      override: t.Override,
    };
    return data;
  }

  Multi_Damage_to_DamageData(t: Damage[]): DamageData[] {
    return t.map((v: Damage) => {
      return this.Damage_to_DamageData(v);
    });
  }

  /**
   * Converts a 2D array of Comp/Con Damage objects to an array of NPCDamageData objects.
   * @param t Damage[][] - first index is tier, second index is Damage objects for each type on the weapon.
   */
  /*
  Multi_Damage_to_NPCDamageData(t: Damage[][]): NPCDamageData[] {
    let data: NPCDamageData[] = [];
    if (Array.isArray(t)) {
      // Iterate through the tiers
      for (var i = 0; i < t.length; i++) {
        const dtier = t[i]; // Damage array for this tier
        if (Array.isArray(dtier)) {
          for (var j = 0; j < dtier.length; j++) {
            const dtype = dtier[j];
            // If there is no NPCDamageData for this damage type yet, create it
            if (!data[j]) {
              let sub_data: NPCDamageData = {
                type: dtype.Type,
                override: dtype.Override ? dtype.Override : undefined,
                val: [dtype.Value]
              };
              data.push(sub_data);
            } else {
              // Otherwise, add the tier value for this type
              data[j].val.push(dtype.Value);
            }
          }
        }
      }
    }
    return data;
  }

  Multi_NPCDamageData_to_INpcDamageData(t: NPCDamageData[]): INpcDamageData[] {
    let data: INpcDamageData[] = [];
    if (Array.isArray(t) && t.length > 0) {
      data = t.map((d: NPCDamageData) => {
        let sub_data: INpcDamageData = {
          damage: d.val.map((v: string) => { return Number(v) }),
          type: d.type
        };
        return sub_data;
      });
    }
    return data;
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

  MechWeapon_to_LancerMechWeaponData(t: MechWeapon): LancerMechWeaponData {
    if (t.Effect.length > 1) console.log(`${lp} multi-effect item: `, t);
    let data: LancerMechWeaponData = {
      id: t.ID,
      name: t.Name,
      description: t.Description,
      note: t.Note,
      flavor_name: t.FlavorName,
      flavor_description: "",
      source: t.Source,
      license: t.License,
      license_level: t.LicenseLevel,
      integrated: t.IsIntegrated,
      weapon_type: t.Type,
      mount: t.Size,
      cascading: t.IsCascading,
      destroyed: t.Destroyed,
      loaded: t.Loaded,
      item_type: t.ItemType,
      max_uses: t.MaxUses,
      max_use_override: t.MaxUseOverride,
      uses: t.Uses,
      custom_damage_type: t.DamageTypeOverride !== "" ? this.Damage(t.DamageTypeOverride) : null,
      mod: t.Mod,
      sp: t.SP,
      range: this.Multi_Range_to_RangeData(t.Range),
      damage: this.Multi_Damage_to_DamageData(t.Damage),
      effect: this.ItemEffect_to_EffectData(t.Effect[0]),
      tags: this.Multi_Tag_to_TagData(t.Tags),
    };
    return data;
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
  /*
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
  async set_item(key: string, val: any): Promise<void> { }
  async get_item<T>(key: string): Promise<T> {
    return (null as unknown) as T;
  }
}
*/
