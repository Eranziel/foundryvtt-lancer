// Namespace configuration Values

import { EntryType } from "machine-mind";

const ASCII = `
╭╮╱╱╭━━━┳━╮╱╭┳━━━┳━━━┳━━━╮ 
┃┃╱╱┃╭━╮┃┃╰╮┃┃╭━╮┃╭━━┫╭━╮┃ 
┃┃╱╱┃┃╱┃┃╭╮╰╯┃┃╱╰┫╰━━┫╰━╯┃ 
┃┃╱╭┫╰━╯┃┃╰╮┃┃┃╱╭┫╭━━┫╭╮╭╯ 
┃╰━╯┃╭━╮┃┃╱┃┃┃╰━╯┃╰━━┫┃┃╰╮ 
╰━━━┻╯╱╰┻╯╱╰━┻━━━┻━━━┻╯╰━╯`;

export const LANCER = {
  ASCII,
  log_prefix: "LANCER |",
  sys_name: "lancer",
  setting_migration: "systemMigrationVersion",
  setting_core_data: "coreDataVersion",
  setting_lcps: "installedLCPs",
  setting_stock_icons: "keepStockIcons",
  setting_welcome: "hideWelcome",
  pilot_items: [
    EntryType.SKILL,
    EntryType.TALENT,
    EntryType.CORE_BONUS,
    EntryType.LICENSE,
    EntryType.PILOT_ARMOR,
    EntryType.PILOT_WEAPON,
    EntryType.PILOT_GEAR,
    EntryType.FACTION,
    EntryType.QUIRK,
    EntryType.RESERVE,
    EntryType.ORGANIZATION
  ],
  mech_items: [EntryType.WEAPON_MOD, EntryType.FRAME, EntryType.FRAME_TRAIT, EntryType.MECH_WEAPON, EntryType.MECH_SYSTEM, EntryType.CORE_SYSTEM],
  npc_items: [EntryType.NPC_CLASS, EntryType.NPC_FEATURE, EntryType.NPC_TEMPLATE], 
  actor_types: [EntryType.NPC, EntryType.DEPLOYABLE, EntryType.MECH, EntryType.PILOT],
  weapon_items: [EntryType.MECH_WEAPON, EntryType.PILOT_WEAPON, EntryType.NPC_FEATURE],
};

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
