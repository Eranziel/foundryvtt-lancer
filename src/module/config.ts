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

// These are general categories that items fall under, useful for the purpose of knowing when moving that item is allowed
export const STATUSES = [
  {
    id: "immobilized",
    label: "Immobilized",
    icon: `systems/lancer/assets/icons/white/condition_immobilized.svg`,
  },
  {
    id: "impaired",
    label: "Impaired",
    icon: `systems/lancer/assets/icons/white/condition_impaired.svg`,
  },
  {
    id: "jammed",
    label: "Jammed",
    icon: `systems/lancer/assets/icons/white/condition_jammed.svg`,
  },
  {
    id: "lockon",
    label: "Lock On",
    icon: `systems/lancer/assets/icons/white/condition_lockon.svg`,
  },
  {
    id: "shredded",
    label: "Shredded",
    icon: `systems/lancer/assets/icons/white/condition_shredded.svg`,
  },
  {
    id: "slowed",
    label: "Slowed",
    icon: `systems/lancer/assets/icons/white/condition_slow.svg`,
  },
  {
    id: "stunned",
    label: "Stunned",
    icon: `systems/lancer/assets/icons/white/condition_stunned.svg`,
  },
  {
    id: "dangerzone",
    label: "Danger Zone",
    icon: `systems/lancer/assets/icons/white/status_dangerzone.svg`,
  },
  {
    id: "downandout",
    label: "Down and Out",
    icon: `systems/lancer/assets/icons/white/status_downandout.svg`,
  },
  {
    id: "engaged",
    label: "Engaged",
    icon: `systems/lancer/assets/icons/white/status_engaged.svg`,
  },
  {
    id: "exposed",
    label: "Exposed",
    icon: `systems/lancer/assets/icons/white/status_exposed.svg`,
  },
  {
    id: "hidden",
    label: "Hidden",
    icon: `systems/lancer/assets/icons/white/status_hidden.svg`,
  },
  {
    id: "invisible",
    label: "Invisible",
    icon: `systems/lancer/assets/icons/white/status_invisible.svg`,
  },
  {
    id: "prone",
    label: "Prone",
    icon: `systems/lancer/assets/icons/white/status_prone.svg`,
  },
  {
    id: "shutdown",
    label: "Shut Down",
    icon: `systems/lancer/assets/icons/white/status_shutdown.svg`,
  },
  {
    id: "npc_tier_1",
    label: "Tier 1",
    icon: `systems/lancer/assets/icons/white/npc_tier_1.svg`,
  },
  {
    id: "npc_tier_2",
    label: "Tier 2",
    icon: `systems/lancer/assets/icons/white/npc_tier_2.svg`,
  },
  {
    id: "npc_tier_3",
    label: "Tier 3",
    icon: `systems/lancer/assets/icons/white/npc_tier_3.svg`,
  },
];

export function WELCOME(changelog: string): string {
  return `<div style="margin: 10px 5px">

  <h2>V10 WARNING</h2>
  <p>Lancer does not yet have a stable release for Foundry v10! You can check the <a href="https://docs.google.com/spreadsheets/d/e/2PACX-1vRrcQL-r09Bi4MsbHUXlmOVx6DP4Ju143zRmk3HiUK2qU6gA3naxuSUcyv3EVhjMThXzJ_455jnyWfK/pubhtml">
  v10 compatibility spreadsheet</a> or the <a href="https://foundryvtt.com/packages/lancer">Lancer system listing</a>
  to see if a compatible version has been released yet, or grab the <b>Foundry Club</b> role on
  <a href="https://discord.gg/7dnpJm46">PilotNET, the Lancer Discord server</a>, to be notified about updates to the
  Lancer system.</p>
  
  <h2>Welcome to Lancer on Foundry!</h2>
  <p>If you haven't already, check out the project wiki for 
  <a href="https://github.com/Eranziel/foundryvtt-lancer/wiki/FAQ">FAQ</a>
  and a list of <a href="https://github.com/Eranziel/foundryvtt-lancer/wiki/Resources">recommended modules</a>, as well
  as other information about how to use the system.</p>
  
  <p>In particular, we <i>strongly</i> recommend the
  <a href="https://foundryvtt.com/packages/hex-size-support/">"Hex Token Size Support"</a> module 
  (even if you don't use hexes it is very useful for tweaking token art size and placement).</p>
  
  <span>Special thanks to <a class="center" href="https://www.retrogrademinis.com/">Retrograde Minis</a> for our default token artwork.</span>

  <div style="text-align: center; margin-top: .5em" class="flex-center">
    <a href="https://www.retrogrademinis.com/">
      <img style="max-width: 350px; border: none" src="https://retrograde-minis.nyc3.digitaloceanspaces.com/text/retrograde-logo.png" alt="Retrograde Minis">
    </a>
  </div>

  <p>You can report issues on GitHub here: 
  <a href="https://github.com/Eranziel/foundryvtt-lancer/issues">https://github.com/Eranziel/foundryvtt-lancer/issues</a></p>
  
  <p><h1>Change Log:
  ${changelog}
  
  <p><a href="https://github.com/Eranziel/foundryvtt-lancer/blob/master/CHANGELOG.md">Click here for the full changelog.</a></p>
  </div>
  `;
}

// Modify these constants to set which Lancer version numbers need and permit migration.
export const NEEDS_MAJOR_MIGRATION_VERSION = "0.9.0";
export const NEEDS_MINOR_MIGRATION_VERSION = "0.9.99";
export const COMPATIBLE_MIGRATION_VERSION = "0.1.0";
export const NEEDS_AUTOMATION_MIGRATION_VERSION = "1.0.3";

export const LANCER = {
  ASCII,
  log_prefix: "LANCER |" as const,
  setting_migration: "systemMigrationVersion" as const,
  setting_core_data: "coreDataVersion" as const,
  setting_lcps: "installedLCPs" as const,
  setting_stock_icons: "keepStockIcons" as const,
  setting_welcome: "hideWelcome" as const,
  setting_compcon_login: "compconLogin" as const,
  setting_automation: "automationOptions" as const,
  setting_automation_switch: "automationSwitch" as const,
  setting_automation_attack: "attackSwitch" as const,
  setting_actionTracker: "actionTracker" as const,
  setting_pilot_oc_heat: "autoOCHeat" as const,
  setting_overkill_heat: "autoOKillHeat" as const,
  setting_auto_structure: "autoCalcStructure" as const,
  setting_dsn_setup: "dsnSetup" as const,
  setting_square_grid_diagonals: "squareGridDiagonals" as const,
  // setting_120: "warningFor120" as const, // Old setting, currently unused.
  // setting_beta_warning: "warningForBeta" as const, // Old setting, currently unused.
};

// Convenience for mapping item/actor types to full names
const FRIENDLY_DOCUMENT_NAMES_SINGULAR = {
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
const FRIENDLY_DOCUMENT_NAMES_PLURAL = {
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
    return FRIENDLY_DOCUMENT_NAMES_PLURAL[type] ?? `Unknown <${type}>s`;
  } else {
    return FRIENDLY_DOCUMENT_NAMES_SINGULAR[type] ?? `Unknown <${type}>`;
  }
}

// Icons for each document
export const GENERIC_ITEM_ICON = "systems/lancer/assets/icons/generic_item.svg";
const DOCUMENT_ICONS = {
  [EntryType.CORE_BONUS]: `systems/lancer/assets/icons/core_bonus.svg`,
  [EntryType.DEPLOYABLE]: `systems/lancer/assets/icons/deployable.svg`,
  [EntryType.ENVIRONMENT]: `systems/lancer/assets/icons/orbit.svg`,
  [EntryType.FACTION]: `systems/lancer/assets/icons/encounter.svg`,
  [EntryType.FRAME]: `systems/lancer/assets/icons/mech.svg`,
  [EntryType.LICENSE]: `systems/lancer/assets/icons/license.svg`,
  [EntryType.MANUFACTURER]: `systems/lancer/assets/icons/manufacturer.svg`,
  [EntryType.MECH]: `systems/lancer/assets/icons/mech.svg`,
  [EntryType.MECH_SYSTEM]: `systems/lancer/assets/icons/mech_system.svg`,
  [EntryType.MECH_WEAPON]: `systems/lancer/assets/icons/mech_weapon.svg`,
  [EntryType.NPC]: `systems/lancer/assets/icons/npc_class.svg`,
  [EntryType.NPC_CLASS]: `systems/lancer/assets/icons/npc_class.svg`,
  [EntryType.NPC_FEATURE]: `systems/lancer/assets/icons/npc_feature.svg`,
  [EntryType.NPC_FEATURE + NpcFeatureType.Trait]: `systems/lancer/assets/icons/trait.svg`,
  [EntryType.NPC_FEATURE + NpcFeatureType.Reaction]: `systems/lancer/assets/icons/reaction.svg`,
  [EntryType.NPC_FEATURE + NpcFeatureType.System]: `systems/lancer/assets/icons/system.svg`,
  [EntryType.NPC_FEATURE + NpcFeatureType.Weapon]: `systems/lancer/assets/icons/weapon.svg`,
  [EntryType.NPC_FEATURE + NpcFeatureType.Tech]: `systems/lancer/assets/icons/tech_full.svg`,
  [EntryType.NPC_TEMPLATE]: `systems/lancer/assets/icons/npc_template.svg`,
  [EntryType.ORGANIZATION]: `systems/lancer/assets/icons/encounter.svg`,
  [EntryType.PILOT]: `systems/lancer/assets/icons/pilot.svg`,
  [EntryType.PILOT_ARMOR]: `systems/lancer/assets/icons/role_tank.svg`,
  [EntryType.PILOT_GEAR]: `systems/lancer/assets/icons/generic_item.svg`,
  [EntryType.PILOT_WEAPON]: `systems/lancer/assets/icons/role_artillery.svg`,
  [EntryType.QUIRK]: `systems/lancer/assets/icons/trait.svg`,
  [EntryType.RESERVE]: `systems/lancer/assets/icons/reserve_tac.svg`,
  [EntryType.SITREP]: `systems/lancer/assets/icons/compendium.svg`,
  [EntryType.SKILL]: `systems/lancer/assets/icons/skill.svg`,
  [EntryType.STATUS]: `systems/lancer/assets/icons/reticule.svg`,
  [EntryType.TAG]: `systems/lancer/assets/icons/tag.svg`,
  [EntryType.TALENT]: `systems/lancer/assets/icons/talent.svg`,
  [EntryType.WEAPON_MOD]: `systems/lancer/assets/icons/weapon_mod.svg`,
  generic: GENERIC_ITEM_ICON,
};

// TODO: const MACRO_ICONS

export function TypeIcon(type: string, macro?: boolean): string {
  return DOCUMENT_ICONS[type] ?? DOCUMENT_ICONS["generic"];
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
