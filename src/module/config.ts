// Namespace configuration Values

import { EntryType } from "machine-mind";
import { LancerActorType } from "./actor/lancer-actor";
import { LancerItemType } from "./item/lancer-item";

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
];

export const WELCOME = `<div style="margin: 10px 5px">
<p><b>Recent changes:</b>
<ul>
<li>Talent ranks can be sent to chat by clicking the rank icon, and systems can be sent to chat 
by clicking the die icon.</li>
<li>We have hotbar macros now! You can drag the following from a pilot sheet:<ul>
  <li>Grit, tech attack, and HASE</li>
  <li>Skill triggers</li>
  <li>Talent ranks</li>
  <li>Weapon attacks</li>
  <li>Mech systems</li></ul></li>
<li>And the following from an NPC sheet:<ul>
  <li>HASE</li>
  <li>Weapon attacks</li>
  <li>Tech attacks</li></ul></li>
<li>The "System-wide Compendiums" option has been removed, since it created some unintuitive bugs. 
Building the Compendiums will need to be done on each Lancer world individually.</li>
<li>The system now includes the status icons from Comp/Con! There is a system setting for keeping or hiding the stock Foundry
status icons. If you also use the Lancer Conditions module, you'll need to turn on its "Keep Stock Icons" setting to see
the new icons.</li>
</ul></p>

<p>If you haven't updated in a while, <a href="https://github.com/Eranziel/foundryvtt-lancer/blob/master/README.md">see here for how to build the Lancer Compendiums.</a></p>

<p><a href="https://github.com/Eranziel/foundryvtt-lancer/blob/master/CHANGELOG.md">Click here for the full changelog.</a></p>
</div>
`;

export const LANCER = {
  ASCII,
  log_prefix: "LANCER |",
  sys_name: "lancer",
  setting_migration: "systemMigrationVersion",
  setting_core_data: "coreDataVersion",
  setting_lcps: "installedLCPs",
  setting_stock_icons: "keepStockIcons",
  setting_welcome: "hideWelcome",
  mech_items,
  pilot_items,
  weapon_items,
  npc_items
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
export function FriendlyTypeName(type: LancerItemType | LancerActorType, count?: number): string {
  if ((count ?? 1) > 1) {
    return FRIENDLY_ENTITY_NAMES_PLURAL[type] ?? `Unknown <${type}>s`;
  } else {
    return FRIENDLY_ENTITY_NAMES_SINGULAR[type] ?? `Unknown <${type}>`;
  }
}

// Icons for each entity
const ENTITY_ICONS = {
  [EntryType.CORE_BONUS]: "systems/lancer/assets/icons/core_bonus.svg",
  [EntryType.DEPLOYABLE]: "systems/lancer/assets/icons/deployable.svg",
  [EntryType.ENVIRONMENT]: "systems/lancer/assets/icons/environment.svg",
  [EntryType.FACTION]: "systems/lancer/assets/icons/faction.svg",
  [EntryType.FRAME]: "systems/lancer/assets/icons/frame.svg",
  [EntryType.LICENSE]: "systems/lancer/assets/icons/license.svg",
  [EntryType.MANUFACTURER]: "systems/lancer/assets/icons/manufacturer.svg",
  [EntryType.MECH]: "systems/lancer/assets/icons/mech.svg",
  [EntryType.MECH_SYSTEM]: "systems/lancer/assets/icons/mech_system.svg",
  [EntryType.MECH_WEAPON]: "systems/lancer/assets/icons/mech_weapon.svg",
  [EntryType.NPC]: "systems/lancer/assets/icons/npc.svg",
  [EntryType.NPC_CLASS]: "systems/lancer/assets/icons/npc_class.svg",
  [EntryType.NPC_FEATURE]: "systems/lancer/assets/icons/npc_feature.svg",
  [EntryType.NPC_TEMPLATE]: "systems/lancer/assets/icons/npc_template.svg",
  [EntryType.ORGANIZATION]: "systems/lancer/assets/icons/organization.svg",
  [EntryType.PILOT]: "systems/lancer/assets/icons/pilot.svg",
  [EntryType.PILOT_ARMOR]: "systems/lancer/assets/icons/role_tank.svg",
  [EntryType.PILOT_GEAR]: "systems/lancer/assets/icons/generic_item.svg",
  [EntryType.PILOT_WEAPON]: "systems/lancer/assets/icons/role_artillery.svg",
  [EntryType.QUIRK]: "systems/lancer/assets/icons/quirk.svg",
  [EntryType.RESERVE]: "systems/lancer/assets/icons/reserve.svg",
  [EntryType.SITREP]: "systems/lancer/assets/icons/sitrep.svg",
  [EntryType.SKILL]: "systems/lancer/assets/icons/skill.svg",
  [EntryType.STATUS]: "systems/lancer/assets/icons/status.svg",
  [EntryType.TAG]: "systems/lancer/assets/icons/tag.svg",
  [EntryType.TALENT]: "systems/lancer/assets/icons/talent.svg",
  [EntryType.WEAPON_MOD]: "systems/lancer/assets/icons/weapon_mod.svg",
  generic: "systems/lancer/assets/icons/generic_item.svg",
};

// TODO: const MACRO_ICONS

export function TypeIcon(type: LancerItemType | LancerActorType, macro?: boolean): string {
  return ENTITY_ICONS[type] ?? ENTITY_ICONS["generic"];
}
