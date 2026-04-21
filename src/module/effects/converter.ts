import { LancerActor, type LancerNPC } from "../actor/lancer-actor";
import { EntryType } from "../enums";
import {
  type LancerFRAME,
  LancerItem,
  type LancerMECH_WEAPON,
  type LancerNPC_CLASS,
  type LancerNPC_FEATURE,
  type LancerSTATUS,
} from "../item/lancer-item";
import type { BonusData } from "../models/bits/bonus";
import type { SystemTemplates } from "../system-template";
import { rollEvalSync } from "../util/misc";
import { AE_TYPE_APPEND_JSON, LancerActiveEffect, type LancerEffectTarget } from "./lancer-active-effect";

const FRAME_STAT_PRIORITY = 10; // Also handles npc classes
const BONUS_STAT_PRIORITY = 20;
const PILOT_STAT_PRIORITY = 30;
const EFFECT_STAT_PRIORITY = 40;
const FEATURE_OVERRIDE_PRIORITY = 50;

// Makes an active effect for a frame.
type FrameStatKey = keyof Item.OfType<"frame">["stats"];
type MechStatKey = keyof Actor.OfType<"mech">;
export function frameInnateEffect(frame: LancerFRAME) {
  let keys: Array<FrameStatKey & MechStatKey> = [
    "armor",
    "edef",
    "evasion",
    "save",
    "sensor_range",
    "size",
    "speed",
    "tech_attack",
  ];
  let changes = keys.map(key => ({
    key: `system.${key}`,
    type: "override" as const,
    phase: "initial" as const,
    priority: FRAME_STAT_PRIORITY,
    value: String(frame.system.stats[key]),
  }));
  // The weirder ones
  changes.push({
    key: "system.hp.max",
    type: "override",
    phase: "initial",
    priority: FRAME_STAT_PRIORITY,
    value: String(frame.system.stats.hp),
  });
  changes.push({
    key: "system.structure.max",
    type: "override",
    phase: "initial",
    priority: FRAME_STAT_PRIORITY,
    value: String(frame.system.stats.structure),
  });
  changes.push({
    key: "system.stress.max",
    type: "override",
    phase: "initial",
    priority: FRAME_STAT_PRIORITY,
    value: String(frame.system.stats.stress),
  });
  changes.push({
    key: "system.heat.max",
    type: "override",
    phase: "initial",
    priority: FRAME_STAT_PRIORITY,
    value: String(frame.system.stats.heatcap),
  });
  changes.push({
    key: "system.repairs.max",
    type: "override",
    phase: "initial",
    priority: FRAME_STAT_PRIORITY,
    value: String(frame.system.stats.repcap),
  });
  changes.push({
    key: "system.loadout.sp.max",
    type: "override",
    phase: "initial",
    priority: FRAME_STAT_PRIORITY,
    value: String(frame.system.stats.sp),
  });

  return {
    flags: { lancer: { ephemeral: true } },
    name: frame.name,
    img: frame.img,
    origin: frame.uuid,
    transfer: true,
    changes,
  };
}

/**
 * Creates the "innate" ActiveEffect of a pilot, essentially just the buff supplied by being piloted by this mech
 */
export function pilotInnateEffects(pilot: LancerActor): LancerActiveEffect[] {
  // This guard is mostly just to keep TS happy
  if (!pilot.is_pilot()) throw new Error("Cannot create pilot innate effect for non-pilot actor");
  // Bake GRIT+HASE into an active effect
  let mech_effect = new LancerActiveEffect(
    {
      name: "Pilot → Mech Bonuses",
      changes: [
        // HASE
        {
          type: "override",
          phase: "initial",
          key: "system.hull",
          priority: PILOT_STAT_PRIORITY,
          value: pilot.system.hull.toString(),
        },
        {
          type: "add",
          phase: "initial",
          key: "system.hp.max",
          priority: PILOT_STAT_PRIORITY,
          value: (2 * pilot.system.hull + pilot.system.grit).toString(),
        },
        {
          type: "add",
          phase: "initial",
          key: "system.repairs.max",
          priority: PILOT_STAT_PRIORITY,
          value: Math.floor(pilot.system.hull / 2).toString(),
        },
        {
          type: "override",
          phase: "initial",
          key: "system.agi",
          priority: PILOT_STAT_PRIORITY,
          value: pilot.system.agi.toString(),
        },
        {
          type: "add",
          phase: "initial",
          key: "system.evasion",
          priority: PILOT_STAT_PRIORITY,
          value: pilot.system.agi.toString(),
        },
        {
          type: "add",
          phase: "initial",
          key: "system.speed",
          priority: PILOT_STAT_PRIORITY,
          value: Math.floor(pilot.system.agi / 2).toString(),
        },
        {
          type: "override",
          phase: "initial",
          key: "system.sys",
          priority: PILOT_STAT_PRIORITY,
          value: pilot.system.sys.toString(),
        },
        {
          type: "add",
          phase: "initial",
          key: "system.edef",
          priority: PILOT_STAT_PRIORITY,
          value: pilot.system.sys.toString(),
        },
        {
          type: "add",
          phase: "initial",
          key: "system.tech_attack",
          priority: PILOT_STAT_PRIORITY,
          value: pilot.system.sys.toString(),
        },
        {
          type: "add",
          phase: "initial",
          key: "system.save",
          priority: PILOT_STAT_PRIORITY,
          value: pilot.system.grit.toString(),
        },
        {
          type: "add",
          phase: "initial",
          key: "system.loadout.sp.max",
          priority: PILOT_STAT_PRIORITY,
          value: (Math.floor(pilot.system.sys / 2) + pilot.system.grit).toString(),
        },
        {
          type: "override",
          phase: "initial",
          key: "system.eng",
          priority: PILOT_STAT_PRIORITY,
          value: pilot.system.eng.toString(),
        },
        {
          type: "add",
          phase: "initial",
          key: "system.heat.max",
          priority: PILOT_STAT_PRIORITY,
          value: pilot.system.eng.toString(),
        },
        {
          type: "add",
          phase: "initial",
          key: "system.loadout.limited_bonus",
          priority: PILOT_STAT_PRIORITY,
          value: Math.floor(pilot.system.eng / 2).toString(),
        },
        // More basic pilot info
        {
          type: "override",
          phase: "initial",
          key: "system.grit",
          priority: PILOT_STAT_PRIORITY,
          value: pilot.system.grit.toString(),
        },
        {
          type: "override",
          phase: "initial",
          key: "system.level",
          priority: PILOT_STAT_PRIORITY,
          value: pilot.system.level.toString(),
        },
      ],
      img: pilot.img,
      origin: pilot.uuid,
      flags: {
        lancer: {
          target_type: EntryType.MECH,
          ephemeral: true,
        },
      },
    },
    {
      parent: pilot,
    }
  );

  let deployable_effect = new LancerActiveEffect(
    {
      name: "Pilot → Deployable Bonuses",
      changes: [
        // Much simpler
        {
          type: "override",
          phase: "initial",
          key: "system.grit",
          priority: PILOT_STAT_PRIORITY,
          value: pilot.system.grit.toString(),
        },
        {
          type: "override",
          phase: "initial",
          key: "system.level",
          priority: PILOT_STAT_PRIORITY,
          value: pilot.system.level.toString(),
        },
      ],
      img: pilot.img,
      origin: pilot.uuid,
      flags: {
        lancer: {
          target_type: EntryType.DEPLOYABLE,
          ephemeral: true,
        },
      },
    },
    {
      parent: pilot,
    }
  );

  return [mech_effect, deployable_effect];
}

/**
 * Creates the "innate" ActiveEffect of an NPC, conferring its tier as a grit bonus to its deployables
 */
export function npcInnateEffects(npc: LancerActor): LancerActiveEffect[] {
  // This guard is mostly just to keep TS happy
  if (!npc.is_npc()) throw new Error("Cannot create NPC innate effect for non-NPC actor");

  let deployable_effect = new LancerActiveEffect(
    {
      name: "NPC → Deployable Bonuses",
      changes: [
        // Much simpler
        {
          type: "override",
          phase: "initial",
          key: "system.grit",
          priority: PILOT_STAT_PRIORITY,
          value: npc.system.tier.toString(),
        },
      ],
      img: npc.img,
      origin: npc.uuid,
      flags: {
        lancer: {
          target_type: EntryType.DEPLOYABLE,
          ephemeral: true,
        },
      },
    },
    {
      parent: npc,
    }
  );

  return [deployable_effect];
}

/**
 * Creates the ActiveEffect data for a status/condition
 */
export function statusInnateEffect(status: LancerSTATUS) {
  let changes = [
    {
      key: `system.statuses.${status.system.lid}`,
      type: "override",
      phase: "initial",
      priority: EFFECT_STAT_PRIORITY,
      value: "true",
    },
  ];
  return {
    name: status.name!,
    changes,
    origin: status.uuid,
    img: status.img,
    flags: {
      lancer: {
        ephemeral: true,
        status_type: status.system.type,
      },
      core: {
        // So it can be deleted via the ui if it is a core active effect
        statusId: status.system.lid,
      },
    },
  };
}

/**
 * Creates the pseudo-activeeffect-data that goes in the CONFIG.statusEffects variable,
 * based on a particular status
 * @param status Status to convert
 * @returns A value to be placed in CONFIG.statusEffects
 */
export function statusConfigEffect(status: LancerSTATUS): any {
  let base = statusInnateEffect(status);
  return {
    id: status.system.lid,
    name: base.name,
    changes: base.changes,
    origin: base.origin,
    img: base.img,
    flags: {
      lancer: {
        status_type: status.system.type,
      },
    },
  };
}

// Makes an active effect for an npc class.
type ClassStatKey = keyof SystemTemplates.NPC.NullableStatBlock;
const npc_keys: Array<ClassStatKey> = [
  // Can be taken as is
  "activations",
  "armor",
  "evasion",
  "edef",
  "speed",
  "sensor_range",
  "save",
  "hull",
  "agi",
  "sys",
  "eng",
  "size",

  // Handled specially
  "hp",
  "heatcap",
  "structure",
  "stress",
];

// Make a bonus appropriate to the provided stat key
function makeNpcBonus(stat: ClassStatKey, value: number, changeType: "override" | "add", priority: number) {
  const v = String(value);
  switch (stat) {
    case "hp":
      return {
        key: "system.hp.max",
        type: changeType,
        phase: "initial",
        priority,
        value: v,
      };
    case "heatcap":
      return {
        key: "system.heat.max",
        type: changeType,
        phase: "initial",
        priority,
        value: v,
      };
    case "structure":
      return {
        key: "system.structure.max",
        type: changeType,
        phase: "initial",
        priority,
        value: v,
      };
    case "stress":
      return {
        key: "system.stress.max",
        type: changeType,
        phase: "initial",
        priority,
        value: v,
      };
    default:
      // All the rest trivially handled
      return {
        key: `system.${stat}`,
        type: changeType,
        phase: "initial",
        priority,
        value: v,
      };
  }
}

// Create innate effect for an npc class, AKA its base stats adjusted for tier
export function npcClassInnateEffect(class_: LancerNPC_CLASS) {
  let tier = (class_?.actor as LancerNPC | undefined)?.system.tier ?? 1;
  let bs = class_.system.base_stats[tier - 1];

  let changes = npc_keys.map(key => makeNpcBonus(key, bs[key], "override", FRAME_STAT_PRIORITY));

  return {
    flags: { lancer: { ephemeral: true } },
    name: class_.name!,
    img: class_.img,
    origin: class_.uuid,
    transfer: true,
    changes,
  };
}

// Converts the system.bonus of an npc feature into an array
export function npcFeatureBonusEffects(feature: LancerNPC_FEATURE) {
  if (!feature.system.bonus) return null; // No bonuses to convert
  let changes = [];
  for (let key of npc_keys) {
    let value = feature.system.bonus[key];
    if (value !== null) {
      changes.push(makeNpcBonus(key, value, "add", BONUS_STAT_PRIORITY));
    }
  }
  if (changes.length) {
    return {
      flags: { lancer: { ephemeral: true } },
      name: `${feature.name!} - bonuses`,
      img: feature.img,
      origin: feature.uuid,
      transfer: true,
      changes,
    };
  } else {
    return null;
  }
}

// Converts the system.override of an npc feature into an array
export function npcFeatureOverrideEffects(feature: LancerNPC_FEATURE) {
  if (!feature.system.override) return null; // No overrides to convert
  let changes = [];
  for (let key of npc_keys) {
    let value = feature.system.override[key];
    if (value !== null) {
      changes.push(makeNpcBonus(key, value, "override", FEATURE_OVERRIDE_PRIORITY));
    }
  }
  if (changes.length) {
    return {
      flags: { lancer: { ephemeral: true } },
      name: `${feature.name!} - overrides`,
      img: feature.img,
      origin: feature.uuid,
      transfer: true,
      changes,
    };
  } else {
    return null;
  }
}

// Converts a single bonus to a single active effect
export function convertBonus(item: LancerItem, name: string, bonus: BonusData) {
  const uuid = item.uuid;
  const owner = item.actor;
  // Separate logic for "restricted" bonuses
  if (bonus.lid == "damage" || bonus.lid == "range") {
    return {
      name,
      flags: {
        // @ts-ignore Kill me (infinite recursion in types)
        [game.system.id]: {
          target_type: EntryType.MECH,
          ephemeral: true,
        },
      },
      changes: [
        {
          type: AE_TYPE_APPEND_JSON,
          phase: "initial",
          value: JSON.stringify(bonus),
          priority: 50,
          key: "system.bonuses.weapon_bonuses",
        },
      ],
      transfer: true,
      disabled: false,
      origin: uuid,
    };
  } else {
    // ui.notifications?.warn("Bonus restrictions have no effect");
  }
  let changes = [];
  let disabled = false;
  let target_type: LancerEffectTarget | undefined = undefined;

  // Broadly speaking, we ignore overwrite and replace, as they are largely unused
  // However, if one or the other is set, we do tweak our AE change type as a halfhearted compatibility attempt
  let changeType: "override" | "add" = bonus.replace || bonus.overwrite ? "override" : "add";
  let priority = bonus.replace || bonus.overwrite ? 50 : BONUS_STAT_PRIORITY;
  // Attempt to replace special keys in bonus values. Supported keys are {ll} and {grit}. These
  // require the item to belong to either a pilot or an active mech.
  let value = bonus.val;
  if (value.includes("{ll}")) {
    const ll = `${owner?.is_pilot() || owner?.is_mech() ? owner.system.level : 0}`;
    value = value.replace("{ll}", ll);
  }
  if (value.includes("{grit}")) {
    const grit = `${owner?.is_pilot() || owner?.is_mech() ? owner.system.grit : 0}`;
    value = value.replace("{grit}", grit);
  }
  // Convert formulas to a single value
  if (value.includes("-") || value.includes("+")) {
    value = `${rollEvalSync(value)}`;
  }

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
    case "hp":
      target_type = EntryType.MECH;
      changes.push({ type: changeType, phase: "initial", value: String(value), priority, key: "system.hp.max" });
      break;
    case "armor":
      target_type = EntryType.MECH;
      changes.push({ type: changeType, phase: "initial", value: String(value), priority, key: "system.armor" });
      break;
    case "structure":
      target_type = EntryType.MECH;
      changes.push({ type: changeType, phase: "initial", value: String(value), priority, key: "system.structure.max" });
      break;
    case "stress":
      target_type = EntryType.MECH;
      changes.push({ type: changeType, phase: "initial", value: String(value), priority, key: "system.stress.max" });
      break;
    case "heatcap":
      target_type = EntryType.MECH;
      changes.push({ type: changeType, phase: "initial", value: String(value), priority, key: "system.heat.max" });
      break;
    case "repcap":
      target_type = EntryType.MECH;
      changes.push({ type: changeType, phase: "initial", value: String(value), priority, key: "system.repairs.max" });
      break;
    case "speed":
      target_type = EntryType.MECH;
      changes.push({ type: changeType, phase: "initial", value: String(value), priority, key: "system.speed" });
      break;
    case "evasion":
      target_type = EntryType.MECH;
      changes.push({ type: changeType, phase: "initial", value: String(value), priority, key: "system.evasion" });
      break;
    case "edef":
      target_type = EntryType.MECH;
      changes.push({ type: changeType, phase: "initial", value: String(value), priority, key: "system.edef" });
      break;
    case "sensor":
      target_type = EntryType.MECH;
      changes.push({ type: changeType, phase: "initial", value: String(value), priority, key: "system.sensor_range" });
      break;
    case "attack":
      target_type = EntryType.MECH;
      changes.push({ type: changeType, phase: "initial", value: String(value), priority, key: "system.bonuses.flat.range_attack" });
      break;
    case "tech_attack":
      target_type = EntryType.MECH;
      changes.push({ type: changeType, phase: "initial", value: String(value), priority, key: "system.tech_attack" });
      break;
    case "grapple":
      target_type = EntryType.MECH;
      changes.push({ type: changeType, phase: "initial", value: String(value), priority, key: "system.bonuses.flat.grapple" });
      break;
    case "ram":
      target_type = EntryType.MECH;
      changes.push({ type: changeType, phase: "initial", value: String(value), priority, key: "system.bonuses.flat.ram" });
      break;
    case "save":
      target_type = EntryType.MECH;
      changes.push({ type: changeType, phase: "initial", value: String(value), priority, key: "system.save" });
      break;
    case "sp":
      target_type = EntryType.MECH;
      changes.push({ type: changeType, phase: "initial", value: String(value), priority, key: "system.loadout.sp.max" });
      break;
    case "size":
      target_type = EntryType.MECH;
      changes.push({ type: changeType, phase: "initial", value: String(value), priority, key: "system.size" });
      break;
    case "ai_cap":
      target_type = EntryType.MECH;
      changes.push({ type: changeType, phase: "initial", value: String(value), priority, key: "system.ai.max" });
      break;
    case "cheap_struct":
      target_type = EntryType.MECH;
      changes.push({
        type: "override",
          phase: "initial",
        value: "1",
        priority,
        key: "system.structure_repair_cost",
      });
      break;
    case "cheap_stress":
      target_type = EntryType.MECH;
      changes.push({
        type: "override",
          phase: "initial",
        value: "1",
        priority,
        key: "system.stress_repair_cost",
      });
      break;
    case "overcharge":
      target_type = EntryType.MECH;
      // Hardwire overcharge to use override mode
      // Heatfall doesn't have overwrite or replace set in lancer-data, but that's how it needs to work.
      changes.push({
        type: "override",
        phase: "initial",
        value: String(value),
        priority,
        key: "system.overcharge_sequence",
      });
      break;
    case "limited_bonus":
      target_type = EntryType.MECH;
      changes.push({ type: changeType, phase: "initial", value: String(value), priority, key: "system.loadout.limited_bonus" });
      break;
    case "pilot_hp":
      target_type = EntryType.PILOT;
      changes.push({ type: changeType, phase: "initial", value: String(value), priority, key: "system.hp.max" });
      break;
    case "pilot_armor":
      target_type = EntryType.PILOT;
      changes.push({ type: changeType, phase: "initial", value: String(value), priority, key: "system.armor" });
      break;
    case "pilot_evasion":
      target_type = EntryType.PILOT;
      changes.push({ type: changeType, phase: "initial", value: String(value), priority, key: "system.evasion" });
      break;
    case "pilot_edef":
      target_type = EntryType.PILOT;
      changes.push({ type: changeType, phase: "initial", value: String(value), priority, key: "system.edef" });
      break;
    case "pilot_speed":
      target_type = EntryType.PILOT;
      changes.push({ type: changeType, phase: "initial", value: String(value), priority, key: "system.speed" });
      break;
    case "deployable_hp":
      target_type = "only_deployable";
      changes.push({ type: changeType, phase: "initial", value: String(value), priority, key: "system.hp_bonus" });
      break;
    case "deployable_size":
      target_type = "only_deployable";
      changes.push({ type: changeType, phase: "initial", value: String(value), priority, key: "system.size" });
      break;
    // case "deployable_charges":
    case "deployable_armor":
      target_type = "only_deployable";
      changes.push({ type: changeType, phase: "initial", value: String(value), priority, key: "system.armor" });
      break;
    case "deployable_evasion":
      target_type = "only_deployable";
      changes.push({ type: changeType, phase: "initial", value: String(value), priority, key: "system.evasion" });
      break;
    case "deployable_edef":
      target_type = "only_deployable";
      changes.push({ type: changeType, phase: "initial", value: String(value), priority, key: "system.edef" });
      break;
    case "deployable_sensor_range":
      target_type = "only_deployable";
      changes.push({ type: changeType, phase: "initial", value: String(value), priority, key: "system.sensor_range" }); // Dumb but whatever
      break;
    case "deployable_tech_attack":
      target_type = "only_deployable";
      changes.push({ type: changeType, phase: "initial", value: String(value), priority, key: "system.tech_attack_bonus" }); // Dumb but whastever
      break;
    case "deployable_save":
      target_type = "only_deployable";
      changes.push({ type: changeType, phase: "initial", value: String(value), priority, key: "system.save" });
      break;
    case "deployable_speed":
      target_type = "only_deployable";
      changes.push({ type: changeType, phase: "initial", value: String(value), priority, key: "system.speed" });
      break;
    case "drone_hp":
      target_type = "only_drone";
      changes.push({ type: changeType, phase: "initial", value: String(value), priority, key: "system.hp_bonus" });
      break;
    case "drone_size":
      target_type = "only_drone";
      changes.push({ type: changeType, phase: "initial", value: String(value), priority, key: "system.size" });
      break;
    // case "drone_charges":
    case "drone_armor":
      target_type = "only_drone";
      changes.push({ type: changeType, phase: "initial", value: String(value), priority, key: "system.armor" });
      break;
    case "drone_evasion":
      target_type = "only_drone";
      changes.push({ type: changeType, phase: "initial", value: String(value), priority, key: "system.evasion" });
      break;
    case "drone_edef":
      target_type = "only_drone";
      changes.push({ type: changeType, phase: "initial", value: String(value), priority, key: "system.edef" });
      break;
    case "drone_sensor_range":
      target_type = "only_drone";
      changes.push({ type: changeType, phase: "initial", value: String(value), priority, key: "system.sensor_range" });
      break;
    case "drone_tech_attack":
      target_type = "only_drone";
      changes.push({ type: changeType, phase: "initial", value: String(value), priority, key: "system.tech_attack_bonus" });
      break;
    case "drone_save":
      target_type = "only_drone";
      changes.push({ type: changeType, phase: "initial", value: String(value), priority, key: "system.save" });
      break;
    case "drone_speed":
      target_type = "only_drone";
      changes.push({ type: changeType, phase: "initial", value: String(value), priority, key: "system.speed" });
      break;
    default:
      console.warn(`Bonus of type ${bonus.lid} not yet supported. Please fix or remove it. Source: ${uuid}`);
      return null; // This effect is unsupported
  }
  // Return a normal bonus
  return {
    name,
    flags: {
      [game.system.id]: {
        target_type,
        ephemeral: true,
      },
    },
    changes,
    transfer: true,
    disabled: false,
    origin: uuid,
  };
}

/**
 * Determine whether this Active Effect applies to the given weapon
 */
export function bonusAffectsWeapon(weapon: LancerMECH_WEAPON, bonus: BonusData): boolean {
  if (!weapon.is_mech_weapon()) return false;
  let sel_prof = weapon.system.active_profile;

  // Now start checking
  if (bonus.weapon_sizes?.[weapon.system.size] === false) return false;
  if (bonus.weapon_types?.[sel_prof.type] === false) return false;
  if (!sel_prof.damage.some(d => bonus.damage_types?.[d.type] === true)) return false;
  if (!sel_prof.range.some(d => bonus.range_types?.[d.type] === true)) return false;

  // Passed the test
  return true;
}
