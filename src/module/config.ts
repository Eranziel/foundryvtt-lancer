// Namespace configuration Values

import { ACTOR_TYPES, type LancerActorType } from "./actor/lancer-actor";
import { EntryType, NpcFeatureType } from "./enums";
import type { LancerItemType } from "./item/lancer-item";

const ASCII = `
╭╮╱╱╭━━━┳━╮╱╭┳━━━┳━━━┳━━━╮ 
┃┃╱╱┃╭━╮┃┃╰╮┃┃╭━╮┃╭━━┫╭━╮┃ 
┃┃╱╱┃┃╱┃┃╭╮╰╯┃┃╱╰┫╰━━┫╰━╯┃ 
┃┃╱╭┫╰━╯┃┃╰╮┃┃┃╱╭┫╭━━┫╭╮╭╯ 
┃╰━╯┃╭━╮┃┃╱┃┃┃╰━╯┃╰━━┫┃┃╰╮ 
╰━━━┻╯╱╰┻╯╱╰━┻━━━┻━━━┻╯╰━╯`;

export function WELCOME(): string {
  return `
  <div style="text-align: center;">
    <a href="https://massifpress.com/legal">
      <img style="max-width: 90%; border: none" src="https://massifpress.com/_next/image?url=%2Fimages%2Flegal%2Fpowered_by_Lancer-01.svg&w=640&q=75" alt="Powered by Lancer">
    </a>
  </div>

  <p><a href="https://github.com/Eranziel/foundryvtt-lancer/blob/master/CHANGELOG.md">CHANGELOG</a></p>
  
  <p>Check out the project wiki for 
  <a href="https://github.com/Eranziel/foundryvtt-lancer/wiki/FAQ">FAQ</a>, 
  <a href="https://github.com/Eranziel/foundryvtt-lancer/wiki/Resources">recommended modules</a>,
  and other information about how to use the system.</p>
  
  <p>@UUID[Compendium.lancer.lancer_info.JournalEntry.JDfVPzoWPOLyhCCa.JournalEntryPage.LVsmG9EfKH9VpVJX]{Legal & Acknowlegements}</p>
  <p>@UUID[Compendium.lancer.lancer_info.JournalEntry.JDfVPzoWPOLyhCCa.JournalEntryPage.gotpldNfOwLxauXi]{Migrating from Earlier Versions}</p>
  `;
}

export const LANCER = {
  ASCII,
  log_prefix: "LANCER |",
  setting_migration_version: "systemMigrationVersion",
  setting_core_data: "coreDataVersion",
  setting_lcps: "installedLCPs",
  setting_stock_icons: "keepStockIcons",
  // setting_welcome: "hideWelcome", // Deprecated as of v2.7.0
  setting_floating_damage_numbers: "floatingNumbers",
  setting_ui_theme: "uiTheme",
  setting_compcon_login: "compconLogin",
  setting_status_icons: "statusIconConfig",
  setting_automation: "automationOptions",
  setting_automation_switch: "automationSwitch",
  setting_automation_attack: "attackSwitch", // Deprecated
  setting_actionTracker: "actionTracker",
  setting_combat_appearance: "combat-tracker-appearance",
  setting_combat_sort: "combat-tracker-sort",
  setting_pilot_oc_heat: "autoOCHeat",
  setting_overkill_heat: "autoOKillHeat",
  setting_auto_structure: "autoCalcStructure",
  setting_dsn_setup: "dsnSetup",
  setting_square_grid_diagonals: "squareGridDiagonals",
  setting_tag_config: "tagConfig",
  // setting_120: "warningFor120", // Old setting, currently unused.
  // setting_beta_warning: "warningForBeta", // Old setting, currently unused.
} as const;

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

// TODO: const MACRO_ICONS

export function TypeIcon(type: EntryType, macro?: boolean): string {
  const docType = ACTOR_TYPES.includes(type as any) ? "Actor" : "Item";
  // @ts-expect-error `type` is fine here
  const img = getDocumentClass(docType).getDefaultArtwork({ type }).img;
  return img;
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
