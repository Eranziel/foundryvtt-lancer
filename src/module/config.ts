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
  setting_pause_icon: "pauseIcon",
  setting_compcon_login: "compconLogin",
  setting_status_icons: "statusIconConfig",
  setting_automation: "automationOptions",
  setting_automation_switch: "automationSwitch",
  setting_automation_attack: "attackSwitch", // Deprecated
  setting_scan_outputs: "scanOutputs",
  setting_actionTracker: "actionTracker",
  setting_combat_appearance: "combat-tracker-appearance",
  setting_combat_sort: "combat-tracker-sort",
  setting_pilot_oc_heat: "autoOCHeat",
  setting_overkill_heat: "autoOKillHeat",
  setting_auto_structure: "autoCalcStructure",
  setting_dsn_setup: "dsnSetup",
  setting_square_grid_diagonals: "squareGridDiagonals",
  setting_tag_config: "tagConfig",
  setting_simple_fonts: "simpleFonts",
  setting_localization: "localizationOptions",
  setting_localization_llp_files: "localizationLLPFile",
  setting_localization_llp_index_override: "localizationLLPOverride",
  // setting_120: "warningFor120", // Old setting, currently unused.
  // setting_beta_warning: "warningForBeta", // Old setting, currently unused.
} as const;

// Convenience for mapping item/actor types to full names
const FRIENDLY_DOCUMENT_NAME_KEYS: Partial<Record<LancerItemType | LancerActorType, string>> = {
  [EntryType.CORE_BONUS]: "lancer.common.item.coreBonus",
  [EntryType.DEPLOYABLE]: "lancer.common.actor.deployable",
  [EntryType.FRAME]: "lancer.common.item.frame",
  [EntryType.LICENSE]: "lancer.common.item.license",
  [EntryType.MECH]: "lancer.common.actor.mech",
  [EntryType.MECH_SYSTEM]: "lancer.common.item.mechSystem",
  [EntryType.MECH_WEAPON]: "lancer.common.item.mechWeapon",
  [EntryType.NPC]: "lancer.common.actor.npc",
  [EntryType.NPC_CLASS]: "lancer.common.item.npcClass",
  [EntryType.NPC_FEATURE]: "lancer.common.item.npcFeature",
  [EntryType.NPC_TEMPLATE]: "lancer.common.item.npcTemplate",
  [EntryType.ORGANIZATION]: "lancer.common.item.organization",
  [EntryType.PILOT]: "lancer.common.actor.pilot",
  [EntryType.PILOT_ARMOR]: "lancer.common.item.pilotArmor",
  [EntryType.PILOT_GEAR]: "lancer.common.item.pilotGear",
  [EntryType.PILOT_WEAPON]: "lancer.common.item.pilotWeapon",
  [EntryType.RESERVE]: "lancer.common.item.reserve",
  [EntryType.SKILL]: "lancer.common.item.skill",
  [EntryType.STATUS]: "lancer.common.item.status",
  [EntryType.TALENT]: "lancer.common.item.talent",
  [EntryType.BOND]: "lancer.common.item.bond",
  [EntryType.WEAPON_MOD]: "lancer.common.item.weaponMod",
};

// Quick for single/plural
export function friendlyEntryTypeName(type: LancerItemType | LancerActorType, count?: number): string {
  const plural = (count ?? 1) > 1;
  const key = FRIENDLY_DOCUMENT_NAME_KEYS[type];
  if (!key) return plural ? `Unknown <${type}>s` : `Unknown <${type}>`;
  return game.i18n.localize(`${key}.${plural ? "plural" : "label"}`);
}

// TODO: const MACRO_ICONS

export function TypeIcon(type: EntryType, macro?: boolean): string {
  const docType = ACTOR_TYPES.includes(type) ? "Actor" : "Item";
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
