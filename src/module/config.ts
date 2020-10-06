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

export const ICONS = [
  "systems/lancer/assets/icons/condition_immobilized.svg",
  "systems/lancer/assets/icons/condition_impaired.svg",
  "systems/lancer/assets/icons/condition_jammed.svg",
  "systems/lancer/assets/icons/condition_lockon.svg",
  "systems/lancer/assets/icons/condition_shredded.svg",
  "systems/lancer/assets/icons/condition_slow.svg",
  "systems/lancer/assets/icons/condition_stunned.svg",
  "systems/lancer/assets/icons/status_dangerzone.svg",
  "systems/lancer/assets/icons/status_downandout.svg",
  "systems/lancer/assets/icons/status_engaged.svg",
  "systems/lancer/assets/icons/status_exposed.svg",
  "systems/lancer/assets/icons/status_hidden.svg",
  "systems/lancer/assets/icons/status_invisible.svg",
  "systems/lancer/assets/icons/status_prone.svg",
  "systems/lancer/assets/icons/status_shutdown.svg"
];

export const WELCOME = `<div style="margin: 10px 5px">
<p>A couple changes in this update you should be aware of. First, the "System-wide Compendiums" option has been removed,
since it created some unintuitive bugs. Building the Compendiums will need to be done on each Lancer world individually.</p>

<p>Second, the Lancer system now includes the status icons from Comp/Con! There is a system setting for keeping or hiding the stock Foundry
status icons. If you also use the Lancer Conditions module, you'll need to turn on its "Keep Stock Icons" setting to see
the new icons.</p>

<p>If you haven't updated in a while, <a href="https://github.com/Eranziel/foundryvtt-lancer/blob/master/README.md">see here for how to build the Lancer Compendiums.</a></p>

<p><a href="https://github.com/Eranziel/foundryvtt-lancer/blob/master/CHANGELOG.md">Click here for the full changelog.</a></p>
</div>
`;