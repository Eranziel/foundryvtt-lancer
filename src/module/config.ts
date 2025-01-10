// Namespace configuration Values

import type { LancerActorType } from "./actor/lancer-actor";
import { EntryType, NpcFeatureType } from "./enums";
import type { LancerItemType } from "./item/lancer-item";

const ASCII = `
╭╮╱╱╭━━━┳━╮╱╭┳━━━┳━━━┳━━━╮ 
┃┃╱╱┃╭━╮┃┃╰╮┃┃╭━╮┃╭━━┫╭━╮┃ 
┃┃╱╱┃┃╱┃┃╭╮╰╯┃┃╱╰┫╰━━┫╰━╯┃ 
┃┃╱╭┫╰━╯┃┃╰╮┃┃┃╱╭┫╭━━┫╭╮╭╯ 
┃╰━╯┃╭━╮┃┃╱┃┃┃╰━╯┃╰━━┫┃┃╰╮ 
╰━━━┻╯╱╰┻╯╱╰━┻━━━┻━━━┻╯╰━╯`;

export function WELCOME(changelog: string): string {
  return `<div style="margin: 10px 5px">
  <div style="text-align: center; margin-top: .5em" class="flex-center">
    <a href="https://massifpress.com/legal">
      <img style="max-width: 350px; border: none" src="https://massifpress.com/_next/image?url=%2Fimages%2Flegal%2Fpowered_by_Lancer-01.svg&w=640&q=75" alt="Powered by Lancer">
    </a>
  </div>
  <h2>Welcome to Lancer on Foundry!</h2>
  <p>If you haven't already, check out the project wiki for 
  <a href="https://github.com/Eranziel/foundryvtt-lancer/wiki/FAQ">FAQ</a>
  and a list of <a href="https://github.com/Eranziel/foundryvtt-lancer/wiki/Resources">recommended modules</a>, as well
  as other information about how to use the system.</p>
  
  <span>Special thanks to <a class="center" href="https://www.retrogrademinis.com/">Retrograde Minis</a> for our default token artwork.</span>

  <div style="text-align: center; margin-top: .5em" class="flex-center">
    <a href="https://www.retrogrademinis.com/">
      <img style="max-width: 350px; border: none" src="https://retrograde-minis.nyc3.digitaloceanspaces.com/text/retrograde-logo.png" alt="Retrograde Minis">
    </a>
  </div>

  <p>You can report issues on GitHub here: 
  <a href="https://github.com/Eranziel/foundryvtt-lancer/issues">https://github.com/Eranziel/foundryvtt-lancer/issues</a></p>
  <br/>
  <h2>Legal</h2>
  <p>"Lancer for FoundryVTT" is not an official <i>Lancer</i> product; it is a third party work, and is not affiliated with Massif Press. "Lancer for FoundryVTT" is published via the <i>Lancer</i> Third Party License.</p>
  <p><i>Lancer</i> is copyright Massif Press.</p>
  <br/>
  <p>
    <h1>Change Log:</h1>
    ${changelog}
  </p>
  
  <p><a href="https://github.com/Eranziel/foundryvtt-lancer/blob/master/CHANGELOG.md">Click here for the full changelog.</a></p>
  </div>
  `;
}

export const LANCER = {
  ASCII,
  log_prefix: "LANCER |" as const,
  setting_migration_version: "systemMigrationVersion" as const,
  setting_core_data: "coreDataVersion" as const,
  setting_lcps: "installedLCPs" as const,
  setting_stock_icons: "keepStockIcons" as const,
  setting_welcome: "hideWelcome" as const,
  setting_floating_damage_numbers: "floatingNumbers" as const,
  setting_ui_theme: "uiTheme" as const,
  setting_compcon_login: "compconLogin" as const,
  setting_status_icons: "statusIconConfig" as const,
  setting_grit_disable: "disableGritBonus" as const,
  setting_automation: "automationOptions" as const,
  setting_automation_switch: "automationSwitch" as const,
  setting_automation_attack: "attackSwitch" as const, // Deprecated
  setting_actionTracker: "actionTracker" as const,
  setting_pilot_oc_heat: "autoOCHeat" as const,
  setting_overkill_heat: "autoOKillHeat" as const,
  setting_auto_structure: "autoCalcStructure" as const,
  setting_dsn_setup: "dsnSetup" as const,
  setting_square_grid_diagonals: "squareGridDiagonals" as const,
  setting_tag_config: "tagConfig" as const,
  // setting_120: "warningFor120" as const, // Old setting, currently unused.
  // setting_beta_warning: "warningForBeta" as const, // Old setting, currently unused.
};

// Convenience for mapping item/actor types to full names
const FRIENDLY_DOCUMENT_NAMES_SINGULAR = {
  [EntryType.CORE_BONUS]: "Core Bonus",
  [EntryType.DEPLOYABLE]: "Deployable",
  [EntryType.FRAME]: "Frame",
  [EntryType.LICENSE]: "License",
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
  [EntryType.RESERVE]: "Reserve",
  [EntryType.SKILL]: "Skill",
  [EntryType.STATUS]: "Status/Condition",
  [EntryType.TALENT]: "Talent",
  [EntryType.BOND]: "Bond",
  [EntryType.WEAPON_MOD]: "Weapon Mod",
};
const FRIENDLY_DOCUMENT_NAMES_PLURAL = {
  [EntryType.CORE_BONUS]: "Core Bonuses",
  [EntryType.DEPLOYABLE]: "Deployables",
  [EntryType.FRAME]: "Frames",
  [EntryType.LICENSE]: "Licenses",
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
  [EntryType.RESERVE]: "Reserves",
  [EntryType.SKILL]: "Skills",
  [EntryType.STATUS]: "Statuses / Conditions",
  [EntryType.TALENT]: "Talents",
  [EntryType.BOND]: "Bonds",
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
  [EntryType.FRAME]: `systems/lancer/assets/icons/mech.svg`,
  [EntryType.LICENSE]: `systems/lancer/assets/icons/license.svg`,
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
  [EntryType.RESERVE]: `systems/lancer/assets/icons/reserve_tac.svg`,
  [EntryType.SKILL]: `systems/lancer/assets/icons/skill.svg`,
  [EntryType.STATUS]: `systems/lancer/assets/icons/reticule.svg`,
  [EntryType.TALENT]: `systems/lancer/assets/icons/talent.svg`,
  [EntryType.WEAPON_MOD]: `systems/lancer/assets/icons/weapon_mod.svg`,
  generic: GENERIC_ITEM_ICON,
};

// TODO: const MACRO_ICONS

export function TypeIcon(type: string, macro?: boolean): string {
  return DOCUMENT_ICONS[type] ?? DOCUMENT_ICONS["generic"];
}

// A substitution method that replaces the first argument IFF it is an img that we don't think should be preserved, and if the trimmed replacement string is truthy
export function replaceDefaultResource(
  current: string | null | undefined,
  ...replacements: Array<string | null>
): string {
  if (!current?.trim() || current.includes("systems/lancer") || current == "icons/svg/mystery-man.svg") {
    for (let replacement of replacements) {
      // If no replacement, skip
      if (!replacement?.trim()) {
        continue;
      }

      // If empty or from system path or mystery man, replace
      return replacement;
    }
    return current || ""; // We've got nothing
  }

  // Otherwise keep as is
  return current;
}
