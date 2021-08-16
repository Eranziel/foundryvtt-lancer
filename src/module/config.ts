// Namespace configuration Values

import { EntryType, NpcFeatureType } from "machine-mind";
import type { LancerActorType } from "./actor/lancer-actor";
import type { LancerItemType } from "./item/lancer-item";

const ASCII = `
╭╮╱╱╭━━━┳━╮╱╭┳━━━┳━━━┳━━━╮ 
┃┃╱╱┃╭━╮┃┃╰╮┃┃╭━╮┃╭━━┫╭━╮┃ 
┃┃╱╱┃┃╱┃┃╭╮╰╯┃┃╱╰┫╰━━┫╰━╯┃ 
┃┃╱╭┫╰━╯┃┃╰╮┃┃┃╱╭┫╭━━┫╭╮╭╯ 
┃╰━╯┃╭━╮┃┃╱┃┃┃╰━╯┃╰━━┫┃┃╰╮ 
╰━━━┻╯╱╰┻╯╱╰━┻━━━┻━━━┻╯╰━╯`;

let ET = EntryType;
// These are general categories that items fall under, useful for the purpose of knowing when moving that item is allowed
const mech_items: LancerItemType[] = [ET.WEAPON_MOD, ET.FRAME, ET.MECH_WEAPON, ET.MECH_SYSTEM];
const pilot_items: LancerItemType[] = [
  ET.SKILL,
  ET.TALENT,
  ET.CORE_BONUS,
  ET.LICENSE,
  ET.PILOT_ARMOR,
  ET.PILOT_WEAPON,
  ET.PILOT_GEAR,
  ET.FACTION,
  ET.QUIRK,
  ET.RESERVE,
  ET.ORGANIZATION,
];
const npc_items: LancerItemType[] = [ET.NPC_CLASS, ET.NPC_FEATURE, ET.NPC_TEMPLATE];
const weapon_items: LancerItemType[] = [ET.MECH_WEAPON, ET.PILOT_WEAPON, ET.NPC_FEATURE];

export type LancerEntityType = LancerItemType | LancerActorType;

export const STATUSES = [
  {
    id: "immobilized",
    label: "Immobilized",
    icon: "systems/lancer/assets/icons/white/condition_immobilized.svg",
  },
  {
    id: "impaired",
    label: "Impaired",
    icon: "systems/lancer/assets/icons/white/condition_impaired.svg",
  },
  {
    id: "jammed",
    label: "Jammed",
    icon: "systems/lancer/assets/icons/white/condition_jammed.svg",
  },
  {
    id: "lockon",
    label: "Lock On",
    icon: "systems/lancer/assets/icons/white/condition_lockon.svg",
  },
  {
    id: "shredded",
    label: "Shredded",
    icon: "systems/lancer/assets/icons/white/condition_shredded.svg",
  },
  {
    id: "slow",
    label: "Slow",
    icon: "systems/lancer/assets/icons/white/condition_slow.svg",
  },
  {
    id: "stunned",
    label: "Stunned",
    icon: "systems/lancer/assets/icons/white/condition_stunned.svg",
  },
  {
    id: "dangerzone",
    label: "Danger Zone",
    icon: "systems/lancer/assets/icons/white/status_dangerzone.svg",
  },
  {
    id: "downandout",
    label: "Down and Out",
    icon: "systems/lancer/assets/icons/white/status_downandout.svg",
  },
  {
    id: "engaged",
    label: "Engaged",
    icon: "systems/lancer/assets/icons/white/status_engaged.svg",
  },
  {
    id: "exposed",
    label: "Exposed",
    icon: "systems/lancer/assets/icons/white/status_exposed.svg",
  },
  {
    id: "hidden",
    label: "Hidden",
    icon: "systems/lancer/assets/icons/white/status_hidden.svg",
  },
  {
    id: "invisible",
    label: "Invisible",
    icon: "systems/lancer/assets/icons/white/status_invisible.svg",
  },
  {
    id: "prone",
    label: "Prone",
    icon: "systems/lancer/assets/icons/white/status_prone.svg",
  },
  {
    id: "shutdown",
    label: "Shut Down",
    icon: "systems/lancer/assets/icons/white/status_shutdown.svg",
  },
  {
    id: "npc_tier_1",
    label: "Tier 1",
    icon: "systems/lancer/assets/icons/white/npc_tier_1.svg",
  },
  {
    id: "npc_tier_2",
    label: "Tier 2",
    icon: "systems/lancer/assets/icons/white/npc_tier_2.svg",
  },
  {
    id: "npc_tier_3",
    label: "Tier 3",
    icon: "systems/lancer/assets/icons/white/npc_tier_3.svg",
  },
];

export function WELCOME(changelog: string): string {
  return `<div style="margin: 10px 5px">
  <p>Welcome to Lancer on Foundry! If you haven't already, check out the project wiki for 
  <a href="https://github.com/Eranziel/foundryvtt-lancer/wiki/FAQ">FAQ</a>
  and a list of <a href="https://github.com/Eranziel/foundryvtt-lancer/wiki/Resources">recommended modules</a>, as well
  as other information about how to use the system.</p>
  
  <p>In particular, if you aren't using them already we <i>strongly</i> recommend the modules
  <a href="https://foundryvtt.com/packages/hex-size-support/">"Hex Token Size Support"</a> by
  Ourobor (even if you don't use hexes it is very useful for tweaking token art size and placement) and 
  <a href="https://foundryvtt.com/packages/lancer-initiative/">"Lancer Initiative"</a> by Bolts.</p>
  
  <p>You can report issues on GitHub here: 
  <a href="https://github.com/Eranziel/foundryvtt-lancer/issues">https://github.com/Eranziel/foundryvtt-lancer/issues</a></p>
  
  <p><h1>Change Log:
  ${changelog}
  
  <p><a href="https://github.com/Eranziel/foundryvtt-lancer/blob/master/CHANGELOG.md">Click here for the full changelog.</a></p>
  </div>
  `;
}

export const LANCER = {
  ASCII,
  log_prefix: "LANCER |" as const,
  sys_name: "lancer" as const,
  setting_migration: "systemMigrationVersion" as const,
  setting_core_data: "coreDataVersion" as const,
  setting_lcps: "installedLCPs" as const,
  setting_stock_icons: "keepStockIcons" as const,
  setting_welcome: "hideWelcome" as const,
  setting_compcon_login: "compconLogin" as const,
  setting_automation: "automationSwitch" as const,
  setting_automation_attack: "attackSwitch" as const,
  setting_action_manager: "actionManager" as const,
  setting_action_manager_players: "actionManagerPlayersUse" as const,
  setting_pilot_oc_heat: "autoOCHeat" as const,
  setting_overkill_heat: "autoOKillHeat" as const,
  setting_auto_structure: "autoCalcStructure" as const,
  setting_120: "warningFor120" as const,
  setting_beta_warning: "warningForBeta" as const,
  mech_items,
  pilot_items,
  weapon_items,
  npc_items,
};

// Convenience for mapping item/actor types to full names
const FRIENDLY_ENTITY_NAMES_SINGULAR = {
  [EntryType.CORE_BONUS]: "Core Bonus",
  [EntryType.DEPLOYABLE]: "Deployable",
  [EntryType.ENVIRONMENT]: "Environment",
  [EntryType.FACTION]: "Faction",
  [EntryType.FRAME]: "Frame",
  [EntryType.LICENSE]: "License",
  [EntryType.MANUFACTURER]: "Manufacturer",
  [EntryType.MECH]: "Mech",
  [EntryType.MECH_SYSTEM]: "Mech System",
  [EntryType.MECH_WEAPON]: "Mech Weapon",
  [EntryType.NPC]: "Npc",
  [EntryType.NPC_CLASS]: "Npc Class",
  [EntryType.NPC_FEATURE]: "Npc Feature",
  [EntryType.NPC_TEMPLATE]: "Npc Template",
  [EntryType.ORGANIZATION]: "Organization",
  [EntryType.PILOT]: "Pilot Preset",
  [EntryType.PILOT_ARMOR]: "Pilot Armor",
  [EntryType.PILOT_GEAR]: "Pilot Gear",
  [EntryType.PILOT_WEAPON]: "Pilot Weapon",
  [EntryType.QUIRK]: "Quirk",
  [EntryType.RESERVE]: "Reserve",
  [EntryType.SITREP]: "Sitrep",
  [EntryType.SKILL]: "Skill",
  [EntryType.STATUS]: "Status/Condition",
  [EntryType.TAG]: "Tag",
  [EntryType.TALENT]: "Talent",
  [EntryType.WEAPON_MOD]: "Weapon Mod",
};
const FRIENDLY_ENTITY_NAMES_PLURAL = {
  [EntryType.CORE_BONUS]: "Core Bonuses",
  [EntryType.DEPLOYABLE]: "Deployables",
  [EntryType.ENVIRONMENT]: "Environments",
  [EntryType.FACTION]: "Factions",
  [EntryType.FRAME]: "Frames",
  [EntryType.LICENSE]: "Licenses",
  [EntryType.MANUFACTURER]: "Manufacturers",
  [EntryType.MECH]: "Mechs",
  [EntryType.MECH_SYSTEM]: "Mech Systems",
  [EntryType.MECH_WEAPON]: "Mech Weapons",
  [EntryType.NPC]: "Npcs",
  [EntryType.NPC_CLASS]: "Npc Classes",
  [EntryType.NPC_FEATURE]: "Npc Features",
  [EntryType.NPC_TEMPLATE]: "Npc Templates",
  [EntryType.ORGANIZATION]: "Organizations",
  [EntryType.PILOT]: "Pilot Presets",
  [EntryType.PILOT_ARMOR]: "Pilot Armor",
  [EntryType.PILOT_GEAR]: "Pilot Gear",
  [EntryType.PILOT_WEAPON]: "Pilot Weapons",
  [EntryType.QUIRK]: "Quirks",
  [EntryType.RESERVE]: "Reserves",
  [EntryType.SITREP]: "Sitreps",
  [EntryType.SKILL]: "Skills",
  [EntryType.STATUS]: "Statuses / Conditions",
  [EntryType.TAG]: "Tags",
  [EntryType.TALENT]: "Talents",
  [EntryType.WEAPON_MOD]: "Weapon Mods",
};

// Quick for single/plural
export function friendly_entrytype_name(type: LancerItemType | LancerActorType, count?: number): string {
  if ((count ?? 1) > 1) {
    return FRIENDLY_ENTITY_NAMES_PLURAL[type] ?? `Unknown <${type}>s`;
  } else {
    return FRIENDLY_ENTITY_NAMES_SINGULAR[type] ?? `Unknown <${type}>`;
  }
}

// Icons for each entity
export const GENERIC_ITEM_ICON = "systems/lancer/assets/icons/generic_item.svg";
const ENTITY_ICONS = {
  [EntryType.CORE_BONUS]: "systems/lancer/assets/icons/core_bonus.svg",
  [EntryType.DEPLOYABLE]: "systems/lancer/assets/icons/deployable.svg",
  [EntryType.ENVIRONMENT]: "systems/lancer/assets/icons/orbit.svg",
  [EntryType.FACTION]: "systems/lancer/assets/icons/encounter.svg",
  [EntryType.FRAME]: "systems/lancer/assets/icons/mech.svg",
  [EntryType.LICENSE]: "systems/lancer/assets/icons/license.svg",
  [EntryType.MANUFACTURER]: "systems/lancer/assets/icons/manufacturer.svg",
  [EntryType.MECH]: "systems/lancer/assets/icons/mech.svg",
  [EntryType.MECH_SYSTEM]: "systems/lancer/assets/icons/mech_system.svg",
  [EntryType.MECH_WEAPON]: "systems/lancer/assets/icons/mech_weapon.svg",
  [EntryType.NPC]: "systems/lancer/assets/icons/npc_class.svg",
  [EntryType.NPC_CLASS]: "systems/lancer/assets/icons/npc_class.svg",
  [EntryType.NPC_FEATURE]: "systems/lancer/assets/icons/npc_feature.svg",
  [EntryType.NPC_FEATURE + NpcFeatureType.Trait]: "systems/lancer/assets/icons/trait.svg",
  [EntryType.NPC_FEATURE + NpcFeatureType.Reaction]: "systems/lancer/assets/icons/reaction.svg",
  [EntryType.NPC_FEATURE + NpcFeatureType.System]: "systems/lancer/assets/icons/system.svg",
  [EntryType.NPC_FEATURE + NpcFeatureType.Weapon]: "systems/lancer/assets/icons/weapon.svg",
  [EntryType.NPC_FEATURE + NpcFeatureType.Tech]: "systems/lancer/assets/icons/tech_full.svg",
  [EntryType.NPC_TEMPLATE]: "systems/lancer/assets/icons/npc_template.svg",
  [EntryType.ORGANIZATION]: "systems/lancer/assets/icons/encounter.svg",
  [EntryType.PILOT]: "systems/lancer/assets/icons/pilot.svg",
  [EntryType.PILOT_ARMOR]: "systems/lancer/assets/icons/role_tank.svg",
  [EntryType.PILOT_GEAR]: "systems/lancer/assets/icons/generic_item.svg",
  [EntryType.PILOT_WEAPON]: "systems/lancer/assets/icons/role_artillery.svg",
  [EntryType.QUIRK]: "systems/lancer/assets/icons/trait.svg",
  [EntryType.RESERVE]: "systems/lancer/assets/icons/reserve_tac.svg",
  [EntryType.SITREP]: "systems/lancer/assets/icons/compendium.svg",
  [EntryType.SKILL]: "systems/lancer/assets/icons/skill.svg",
  [EntryType.STATUS]: "systems/lancer/assets/icons/reticule.svg",
  [EntryType.TAG]: "systems/lancer/assets/icons/tag.svg",
  [EntryType.TALENT]: "systems/lancer/assets/icons/talent.svg",
  [EntryType.WEAPON_MOD]: "systems/lancer/assets/icons/weapon_mod.svg",
  generic: GENERIC_ITEM_ICON,
};

// TODO: const MACRO_ICONS

export function TypeIcon(type: string, macro?: boolean): string {
  return ENTITY_ICONS[type] ?? ENTITY_ICONS["generic"];
}

// A substitution method that replaces the first argument IFF it is an img that we don't think should be preserved, and if the trimmed replacement string is truthy
export function replace_default_resource(current: string, replacement: string | null): string {
  // If no replacement, then obviously keep initial
  if (!replacement?.trim()) {
    return current;
  }

  // If empty or from system path or mystery man, replace
  if (!current?.trim() || current.includes("systems/lancer") || current == "icons/svg/mystery-man.svg") {
    return replacement;
  }

  // Otherwise keep as is
  return current;
}
