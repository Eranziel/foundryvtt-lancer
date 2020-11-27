// Namespace configuration Values

import { EntryType } from "machine-mind";

const ASCII = `
╭╮╱╱╭━━━┳━╮╱╭┳━━━┳━━━┳━━━╮ 
┃┃╱╱┃╭━╮┃┃╰╮┃┃╭━╮┃╭━━┫╭━╮┃ 
┃┃╱╱┃┃╱┃┃╭╮╰╯┃┃╱╰┫╰━━┫╰━╯┃ 
┃┃╱╭┫╰━╯┃┃╰╮┃┃┃╱╭┫╭━━┫╭╮╭╯ 
┃╰━╯┃╭━╮┃┃╱┃┃┃╰━╯┃╰━━┫┃┃╰╮ 
╰━━━┻╯╱╰┻╯╱╰━┻━━━┻━━━┻╯╰━╯`;

let ET = EntryType;
// These are general categories that items fall under, useful for the purpose of knowing when moving that item is allowed
const mech_items: LancerItemType[] = [
  ET.WEAPON_MOD,
  ET.FRAME,
  ET.FRAME_TRAIT,
  ET.MECH_WEAPON,
  ET.MECH_SYSTEM,
  ET.CORE_SYSTEM,
];
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


// A type containing all valid item types, machine-mind or otherwise
export type LancerItemType =
  | EntryType.CORE_BONUS
  | EntryType.CORE_SYSTEM
  | EntryType.FACTION
  | EntryType.FRAME
  | EntryType.FRAME_TRAIT
  | EntryType.LICENSE
  | EntryType.MECH_WEAPON
  | EntryType.MECH_SYSTEM
  | EntryType.NPC_CLASS
  | EntryType.NPC_TEMPLATE
  | EntryType.NPC_FEATURE
  | EntryType.ORGANIZATION
  | EntryType.PILOT_ARMOR
  | EntryType.PILOT_WEAPON
  | EntryType.PILOT_GEAR
  | EntryType.RESERVE
  | EntryType.SKILL
  | EntryType.STATUS
  | EntryType.TALENT
  | EntryType.WEAPON_MOD
  | EntryType.QUIRK
  | EntryType.MANUFACTURER // hmmmm.... these falls into a similar role as tag. for the time being leaving it here, but it should really be more of a journal thing. Are there journal types?
  | EntryType.SITREP
  | EntryType.ENVIRONMENT
  | EntryType.TAG;

// A list of items that MM can handle safely. Ideally would be all of them, but there could be cases where they can't be (e.g. if someone adds mana or pets or something
const mm_compat_item_types: Array<LancerItemType & EntryType> = [
  ET.CORE_BONUS,
  ET.CORE_SYSTEM,
  ET.FACTION,
  ET.FRAME,
  ET.FRAME_TRAIT,
  ET.LICENSE,
  ET.MECH_WEAPON,
  ET.MECH_SYSTEM,
  ET.NPC_CLASS,
  ET.NPC_TEMPLATE,
  ET.NPC_FEATURE,
  ET.ORGANIZATION,
  ET.PILOT_ARMOR,
  ET.PILOT_WEAPON,
  ET.PILOT_GEAR,
  ET.RESERVE,
  ET.SKILL,
  ET.STATUS,
  ET.TALENT,
  ET.WEAPON_MOD,
  ET.QUIRK,
  ET.MANUFACTURER, 
  ET.SITREP,
  ET.ENVIRONMENT,
  ET.TAG
];

// A type containing all valid npc types, machine-mind or otherwise
export type LancerActorType =
  | EntryType.MECH
  | EntryType.NPC
  | EntryType.DEPLOYABLE
  | EntryType.PILOT;

// A list of actors that MM can handle safely.
const mm_compat_actor_types: Array<LancerActorType & EntryType> = [
  ET.MECH,
  ET.NPC,
  ET.DEPLOYABLE,
  ET.PILOT
]

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
  npc_items,
  mm_compat_actor_types,
  mm_compat_item_types,
  actor_types: [...mm_compat_actor_types] , // Could eventually be more
  item_types: [...mm_compat_item_types] // Could eventually be more
};