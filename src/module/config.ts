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
  setting_pilot_oc_heat: "autoOCHeat",
  setting_overkill_heat: "autoOKillHeat",
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

export const WELCOME = `<div style="margin: 10px 5px">
<p><b>Recent changes:</b>
<ul>
<li>Syncing with Comp/Con cloud saves is fixed - no more 401 errors!</li>
<li>Syncing with Comp/Con cloud saves now builds mounts and populates them with weapons.</li>
<li>Overcharge macro added to pilot sheet, and a setting for whether to automatically add overcharge heat when the macro is rolled.</li>
<li>NPC class and template sheets now include previews of their base and optional features, which can be dragged to an NPC actor to add them.</li>
</ul></p>

<p>If you haven't updated in a while, <a href="https://github.com/Eranziel/foundryvtt-lancer/blob/master/README.md">see here for how to build the Lancer Compendiums.</a></p>

<p><a href="https://github.com/Eranziel/foundryvtt-lancer/blob/master/CHANGELOG.md">Click here for the full changelog.</a></p>
</div>
`;
