import { LancerPILOT } from "../actor/lancer-actor";
import { EntryType } from "../enums";
import { LancerFRAME, LancerMECH_WEAPON } from "../item/lancer-item";
import { BonusData } from "../models/bits/bonus";
import { SystemData, SystemTemplates } from "../system-template";
import { AE_MODE_SET_JSON, LancerActiveEffectConstructorData, LancerEffectTarget } from "./lancer-active-effect";

const INNATE_STAT_PRIORITY = 10;
const PILOT_STAT_PRIORITY = 20;

// Makes a active effect for a frame. Frames should automatically regenerate these when edited
type FrameStatKey = keyof SystemData.Frame["stats"];
type MechStatKey = keyof SystemData.Mech;
export function effect_for_frame(frame: LancerFRAME): LancerActiveEffectConstructorData {
  let keys: Array<FrameStatKey & MechStatKey> = [
    "armor",
    "edef",
    "evasion",
    "save",
    "sensor_range",
    "size",
    "speed",
    "stress",
    "structure",
    "tech_attack",
  ];
  // @ts-expect-error Shouldn't be restricted to not take numbers I don't think
  let changes: LancerActiveEffectConstructorData["changes"] = keys.map(key => ({
    key: `system.${key}`,
    mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
    priority: INNATE_STAT_PRIORITY,
    value: frame.system.stats[key],
  }));

  // Three weirder ones
  changes!.push({
    key: "system.hp.max",
    mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
    priority: INNATE_STAT_PRIORITY,
    // @ts-expect-error
    value: frame.system.stats.hp,
  });
  changes!.push({
    key: "system.heat.max",
    mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
    priority: INNATE_STAT_PRIORITY,
    // @ts-expect-error
    value: frame.system.stats.heatcap,
  });
  changes!.push({
    key: "system.loadout.sp.max",
    mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
    priority: INNATE_STAT_PRIORITY,
    // @ts-expect-error
    value: frame.system.stats.sp,
  });

  return {
    flags: { lancer: { innate: true } },
    label: frame.name,
    icon: frame.img,
    origin: frame.uuid,
    transfer: true,
    changes,
  };
}

export function pilot_downstream_effects(pilot: LancerPILOT): LancerActiveEffectConstructorData[] {
  let result_effects = [] as LancerActiveEffectConstructorData[];

  // First get effects that don't target the pilot directly
  let passdown_effects = pilot.effects.filter(e => {
    let tt = e.getFlag("lancer", "target_type") as string | null;
    return !!(tt && tt != EntryType.PILOT);
  });

  // Add metadata and label tweak to mark them as passthrough
  for (let eff of passdown_effects) {
    let pde = eff.toObject() as LancerActiveEffectConstructorData;
    pde.flags.lancer.cascade_origin = pilot.uuid;
    pde.label = `[PILOT] ${pde.label}`;
  }

  // Bake HASE into an active effect

  result_effects.push({
    label: "Pilot Stats",
    changes: [
      // HASE
      {
        mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        key: "system.hull",
        priority: INNATE_STAT_PRIORITY,
        // @ts-expect-error
        value: pilot.system.hull,
      },
      {
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        key: "system.hp.max",
        priority: PILOT_STAT_PRIORITY,
        // @ts-expect-error
        value: 2 * pilot.system.hull + pilot.system.grit,
      },
      {
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        key: "system.repairs.max",
        priority: PILOT_STAT_PRIORITY,
        // @ts-expect-error
        value: Math.floor(pilot.system.hull / 2),
      },
      {
        mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        key: "system.agi",
        priority: PILOT_STAT_PRIORITY,
        // @ts-expect-error
        value: pilot.system.agi,
      },
      {
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        key: "system.evasion",
        priority: PILOT_STAT_PRIORITY,
        // @ts-expect-error
        value: pilot.system.agi,
      },
      {
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        key: "system.speed",
        priority: PILOT_STAT_PRIORITY,
        // @ts-expect-error
        value: Math.floor(pilot.system.agi / 2),
      },
      {
        mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        key: "system.sys",
        priority: PILOT_STAT_PRIORITY,
        // @ts-expect-error
        value: pilot.system.sys,
      },
      {
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        key: "system.edef",
        priority: PILOT_STAT_PRIORITY,
        // @ts-expect-error
        value: pilot.system.sys,
      },
      {
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        key: "system.loadout.sp.max",
        priority: PILOT_STAT_PRIORITY,
        // @ts-expect-error
        value: Math.floor(pilot.system.sys / 2),
      },
      {
        mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        key: "system.eng",
        priority: PILOT_STAT_PRIORITY,
        // @ts-expect-error
        value: pilot.system.eng,
      },
      {
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        key: "system.heat.max",
        priority: PILOT_STAT_PRIORITY,
        // @ts-expect-error
        value: pilot.system.eng,
      },
      {
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        key: "system.loadout.limited_bonus",
        priority: PILOT_STAT_PRIORITY,
        // @ts-expect-error
        value: Math.floor(pilot.system.eng / 2),
      },
      {
        mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        key: "system.grit",
        priority: PILOT_STAT_PRIORITY,
        // @ts-expect-error
        value: pilot.system.grit,
      },
      // Bake the rest of the pilot source data into an active effect
      {
        mode: AE_MODE_SET_JSON as any,
        key: "system.psd",
        // @ts-expect-error
        value: JSON.stringify(pilot.system.toObject()),
      },
    ],
    origin: pilot.uuid,
    flags: {
      lancer: {
        target_type: EntryType.MECH,
        cascade_origin: pilot.uuid,
      },
    },
  });
  return result_effects;
}

// Converts a single bonus to a single active effect
export function convert_bonus(label: string, bonus: BonusData): null | LancerActiveEffectConstructorData {
  // Separate logic for "restricted" bonuses
  if (bonus.range_types || bonus.damage_types || bonus.weapon_sizes || bonus.weapon_types) {
    if (bonus.lid == "damage") {
      // TODO
    } else if (bonus.lid == "range") {
      // TODO
    } else {
      // ui.notifications?.warn("Bonus restrictions have no effect");
    }
    // ui.notifications?.warn("Bonus damage/range generation not yet fully supported");
    return null;
  } else {
    let changes: Required<LancerActiveEffectConstructorData["changes"]> = [];
    let disabled = false;
    let target_type: LancerEffectTarget | undefined = undefined;

    // Broadly speaking, we ignore overwrite and replace, as they are largely unused
    // However, if one or the other is set, we do tweak our AE mode as a halfhearted compatibility attempt
    let mode = bonus.replace || bonus.overwrite ? CONST.ACTIVE_EFFECT_MODES.OVERRIDE : CONST.ACTIVE_EFFECT_MODES.ADD;
    let priority = bonus.replace || bonus.overwrite ? 50 : INNATE_STAT_PRIORITY;
    let value = bonus.val;

    // First try to infer the target type.
    switch (bonus.lid) {
      // We don't yet verify points, so implementing these (which just increase "budget") doesn't help much
      // case "skill_point":
      // case "mech_skill_point":
      // case "talent_point":
      // case "license_point":
      // case "cb_point":
      // We don't yet support verifying pilot gear
      // case "pilot_gear":

      // Here's what we care about
      case "range":
        target_type = EntryType.MECH;
        changes.push({ mode, value, priority, key: "system.range_bonus" });
        break;
      case "damage":
        target_type = EntryType.MECH;
        changes.push({ mode, value, priority, key: "system.damage_bonus" });
        break;
      case "hp":
        target_type = EntryType.MECH;
        changes.push({ mode, value, priority, key: "system.hp.max" });
        break;
      case "armor":
        target_type = EntryType.MECH;
        changes.push({ mode, value, priority, key: "system.armor" });
        break;
      case "structure":
        target_type = EntryType.MECH;
        changes.push({ mode, value, priority, key: "system.structure.max" });
        break;
      case "stress":
        target_type = EntryType.MECH;
        changes.push({ mode, value, priority, key: "system.stress.max" });
        break;
      case "heatcap":
        target_type = EntryType.MECH;
        changes.push({ mode, value, priority, key: "system.heat.max" });
        break;
      case "repcap":
        target_type = EntryType.MECH;
        changes.push({ mode, value, priority, key: "system.repairs.max" });
        break;
      case "speed":
        target_type = EntryType.MECH;
        changes.push({ mode, value, priority, key: "system.speed" });
        break;
      case "evasion":
        target_type = EntryType.MECH;
        changes.push({ mode, value, priority, key: "system.evasion" });
        break;
      case "edef":
        target_type = EntryType.MECH;
        changes.push({ mode, value, priority, key: "system.edef" });
        break;
      case "sensor":
        target_type = EntryType.MECH;
        changes.push({ mode, value, priority, key: "system.sensor_range" });
        break;
      case "attack":
        target_type = EntryType.MECH;
        changes.push({ mode, value, priority, key: "system.bonuses.flat.range_attack" });
        break;
      case "tech_attack":
        target_type = EntryType.MECH;
        changes.push({ mode, value, priority, key: "system.bonuses.flat.tech_attack" });
        break;
      case "grapple":
        target_type = EntryType.MECH;
        changes.push({ mode, value, priority, key: "system.bonuses.flat.grapple" });
        break;
      case "ram":
        target_type = EntryType.MECH;
        changes.push({ mode, value, priority, key: "system.bonuses.flat.ram" });
        break;
      case "save":
        target_type = EntryType.MECH;
        changes.push({ mode, value, priority, key: "system.save" });
        break;
      case "sp":
        target_type = EntryType.MECH;
        changes.push({ mode, value, priority, key: "system.loadout.sp.max" });
        break;
      case "size":
        target_type = EntryType.MECH;
        changes.push({ mode, value, priority, key: "system.size" });
        break;
      case "ai_cap":
        target_type = EntryType.MECH;
        changes.push({ mode, value, priority, key: "system.ai.max" });
        break;
      // case "cheap_struct":
      // case "cheap_stress":
      // case "overcharge":
      // case "limited_bonus":
      case "pilot_hp":
        target_type = EntryType.PILOT;
        changes.push({ mode, value, priority, key: "system.hp.max" });
        break;
      case "pilot_armor":
        target_type = EntryType.PILOT;
        changes.push({ mode, value, priority, key: "system.armor" });
        break;
      case "pilot_evasion":
        target_type = EntryType.PILOT;
        changes.push({ mode, value, priority, key: "system.evasion" });
        break;
      case "pilot_edef":
        target_type = EntryType.PILOT;
        changes.push({ mode, value, priority, key: "system.edef" });
        break;
      case "pilot_speed":
        target_type = EntryType.PILOT;
        changes.push({ mode, value, priority, key: "system.speed" });
        break;
      case "deployable_hp":
        target_type = "only_deployable";
        changes.push({ mode, value, priority, key: "system.hp.max" });
        break;
      case "deployable_size":
        target_type = "only_deployable";
        changes.push({ mode, value, priority, key: "system.size" });
        break;
      // case "deployable_charges":
      case "deployable_armor":
        target_type = "only_deployable";
        changes.push({ mode, value, priority, key: "system.armor" });
        break;
      case "deployable_evasion":
        target_type = "only_deployable";
        changes.push({ mode, value, priority, key: "system.evasion" });
        break;
      case "deployable_edef":
        target_type = "only_deployable";
        changes.push({ mode, value, priority, key: "system.edef" });
        break;
      case "deployable_sensor_range":
        target_type = "only_deployable";
        changes.push({ mode, value, priority, key: "system.sensor_range" }); // Dumb but whatever
        break;
      case "deployable_tech_attack":
        target_type = "only_deployable";
        changes.push({ mode, value, priority, key: "system.tech_attack_bonus" }); // Dumb but whastever
        break;
      case "deployable_save":
        target_type = "only_deployable";
        changes.push({ mode, value, priority, key: "system.save" });
        break;
      case "deployable_speed":
        target_type = "only_deployable";
        changes.push({ mode, value, priority, key: "system.speed" });
        break;
      case "drone_hp":
        target_type = "only_drone";
        changes.push({ mode, value, priority, key: "system.hp.max" });
        break;
      case "drone_size":
        target_type = "only_drone";
        changes.push({ mode, value, priority, key: "system.size" });
        break;
      // case "drone_charges":
      case "drone_armor":
        target_type = "only_drone";
        changes.push({ mode, value, priority, key: "system.armor" });
        break;
      case "drone_evasion":
        target_type = "only_drone";
        changes.push({ mode, value, priority, key: "system.evasion" });
        break;
      case "drone_edef":
        target_type = "only_drone";
        changes.push({ mode, value, priority, key: "system.edef" });
        break;
      case "drone_sensor_range":
        target_type = "only_drone";
        changes.push({ mode, value, priority, key: "system.sensor_range" });
        break;
      case "drone_tech_attack":
        target_type = "only_drone";
        changes.push({ mode, value, priority, key: "system.tech_attack_bonus" });
        break;
      case "drone_save":
        target_type = "only_drone";
        changes.push({ mode, value, priority, key: "system.save" });
        break;
      case "drone_speed":
        target_type = "only_drone";
        changes.push({ mode, value, priority, key: "system.speed" });
        break;
      default:
        ui.notifications?.warn(`Bonus of type ${bonus.lid} not yet supported`);
        return null; // This effect is unsupported
    }
    // Return a normal bonus
    return {
      label,
      flags: {
        lancer: {
          target_type,
          innate: true,
        },
      },
      changes,
      transfer: true,
      disabled: false,
    };
  }
}

/**
 * Determine whether this Active Effect applies to the given weapon
 */
export function weapon_bonus_affects(
  weapon: LancerMECH_WEAPON,
  bonus: SystemTemplates.actor_universal["weapon_bonuses"][0]
): boolean {
  if (!weapon.is_mech_weapon()) return false;
  let sel_prof = weapon.system.active_profile;

  // Now start checking
  if (!bonus.sizes?.[weapon.system.size]) return false;
  if (!bonus.types?.[sel_prof.type]) return false;
  if (!sel_prof.damage.some(d => bonus.damages?.[d.type])) return false;
  if (!sel_prof.range.some(d => bonus.ranges?.[d.type])) return false;

  // Passed the test
  return true;
}
