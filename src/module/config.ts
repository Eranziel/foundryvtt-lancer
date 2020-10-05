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