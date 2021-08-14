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
  setting_120: "warningFor120",
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

export function FOUNDRY_VERSION_WARNING(): string {
  return `<div style="margin: 10px 5px">
  <h1>WARNING - Version unsupported!</h1> 
  <h2>Please read the below text in full!</h2>
  <p>You are trying to run Lancer ${game.system.data.version} on a version of Foundry beyond 0.7.X. 
  This breaks this version of the system, but fear not!</p>
  
  <p>If this is your first time using the Lancer system in Foundry VTT or you 
  are starting a new world, we recommend you update to our beta release, 0.9.X.
  The beta has new features that enrich the experience such as having multiple 
  mechs allowed per character, automatic hit calculation, an action tracker,
  and compatibility with current-format LCPs.</p>
  
  <p>If this is a 0.1.X Lancer world that you have been playing with in 0.7.X 
  Foundry, you have two options.</p>
  <ol><li>Downgrade Foundry to 0.7.10 and restore your data from a backup from before upgrading Foundry.
  Since you are seeing this message, Foundry has already migrated its data for your world to its new
  format, so your world won't launch correctly if you only downgrade.</li>
  <li>Install the beta version of Lancer and start a new world. The beta lacks migration code and
  will corrupt worlds created before the beta, however this is the only thing 
  barring it from being considered a stable release.</li></ol>
  
  <p>If you have read the above and wish to upgrade Lancer to the beta version, 
  you can install this manifest in the Foundry systems menu: 
  <a href="https://raw.githubusercontent.com/Eranziel/foundryvtt-lancer/beta-release/src/system.json">
  https://raw.githubusercontent.com/Eranziel/foundryvtt-lancer/beta-release/src/system.json</a></p>
  </div>`;
}
