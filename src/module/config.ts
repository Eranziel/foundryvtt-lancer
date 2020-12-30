// Namespace configuration Values

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
  setting_automation: "automationSwitch",
  setting_pilot_oc_heat: "autoOCHeat",
  setting_overkill_heat: "autoOKillHeat",
  setting_auto_structure: "autoCalcStructure",
  pilot_items: [
    "frame",
    "skill",
    "talent",
    "core_bonus",
    "license",
    "pilot_armor",
    "pilot_weapon",
    "pilot_gear",
    "mech_weapon",
    "mech_system",
  ],
  npc_items: ["npc_class", "npc_template", "npc_feature"],
  weapon_items: ["mech_weapon", "pilot_weapon", "npc_feature"],
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

export const FRAMES = [
  'mf_atlas',
  'mf_balor',
  'mf_barbarossa',
  'mf_black_witch',
  'mf_blackbeard',
  'mf_deaths_head',
  'mf_drake',
  'mf_dusk_wing',
  'mf_genghis',
  'mf_goblin',
  'mf_gorgon',
  'mf_hydra',
  'mf_iskander',
  'mf_kobold',
  'mf_lancaster',
  'mf_lich',
  'mf_manticore',
  'mf_metalmark',
  'mf_minotaur',
  'mf_monarch',
  'mf_mourning_cloak',
  'mf_napoleon',
  'mf_nelson',
  'mf_pegasus',
  'mf_raleigh',
  'mf_saladin',
  'mf_sherman',
  'mf_standard_pattern_i_everest',
  'mf_sunzi',
  'mf_swallowtail',
  'mf_tokugawa',
  'mf_tortuga',
  'mf_vlad',
  'mf_zheng',
];

export const WELCOME = `<div style="margin: 10px 5px">
<p>Welcome to Lancer on Foundry! If you haven't already, check out the project wiki for 
<a href="https://github.com/Eranziel/foundryvtt-lancer/wiki/FAQ">FAQ</a>
and a list of <a href="https://github.com/Eranziel/foundryvtt-lancer/wiki/Resources">recommended modules</a>, as well
as other information about how to use the system.</p>

<p>In particular, if you aren't using them already we <i>strongly</i> recommend the modules
<a href="https://foundryvtt.com/packages/hex-size-support/">"Hex Token Size Support"</a> by
Ourobor (even if you don't use hexes - seriously) and 
<a href="https://foundryvtt.com/packages/lancer-initiative/">"Lancer Initiative"</a> by Bolts.</p>

<p>You can report issues on GitHub here: 
<a href="https://github.com/Eranziel/foundryvtt-lancer/issues">https://github.com/Eranziel/foundryvtt-lancer/issues</a></p>

<p><h1>Change Log:</h1>
<h2>0.1.18 (2020-12-15)</h2>
<h3>Bug Fixes</h3>
<ul>
<li><b>Macros</b>: Fix a bug with the structure/overheat macros that decide to declare your mech destroyed if structure/stress are full.</li>
</ul>

<h2>0.1.17 (2020-12-15)</h2>
<h3>Features</h3>
<ul>
<li><b>Macros</b>: Structure and Overheat macros have been added. They can be found in the "LANCER Macros" Compendium, and their functionality can be customized using the system settings. Closes #91.</li>
<li><b>Macros</b>: Macros for placing common AOE templates have been added. They can be found in the "AoE Templates" Compendium.</li>
<li><b>NPC Classes</b>: Add functionality to NPC Class sheet allowing features from Compendium to be added. Partial for #110.</li>
</ul>
<h3>Bug Fixes</h3>
<ul>
<li><b>NPCs</b>: Don't override NPC stat values when duplicating NPCs. Closes #94.</li>
<li><b>Pilot/NPC Sheet</b>: Fix a bug which overwrites prototype token name even if the Actor's name was not edited. Closes #116.</li>
<li><b>Item Sheets</b>: Fix some inconsistencies in how range and damage selectors were handled, which caused charge-type systems in particular to lose data when saved. Closes #116.</li>
<li><b>Macros</b>: Fix and improve Overkill handling for attack macros.</li> 
</ul>
<h2>0.1.16 (2020-11-25)</h2>
<h3>Bug Fixes</h3>
<ul>
<li><b>Pilot Sheet</b>: Syncing Comp/Con cloud saves no longer fails with a 401 error. Closes #113. Again.</li>
<li><b>Pilot Sheet</b>: Fix an issue where some synced pilots caused the pilot sheet to not render after syncing. Closes #115.</li>
<li><b>Macros</b>: Pilot skill trigger and overcharge macros rolled from the sheet no longer fail if no token is selected.</li>
</ul>

<p><a href="https://github.com/Eranziel/foundryvtt-lancer/blob/master/CHANGELOG.md">Click here for the full changelog.</a></p>
</div>
`;
