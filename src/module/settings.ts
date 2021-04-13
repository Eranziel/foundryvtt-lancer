import { LANCER } from "./config";

export const registerSettings = function () {
  /**
   * Track the system version upon which point a migration was last applied
   */
  game.settings.register(LANCER.sys_name, LANCER.setting_migration, {
    name: "System Migration Version",
    scope: "world",
    config: false,
    type: String,
    default: 0,
  });

  game.settings.register(LANCER.sys_name, LANCER.setting_core_data, {
    name: "Lancer Data Version",
    scope: "world",
    config: false,
    type: String,
    default: "0.0.0",
  });

  game.settings.register(LANCER.sys_name, LANCER.setting_lcps, {
    name: "Installed LCPs",
    scope: "world",
    config: false,
    type: Object,
  });

  game.settings.register(LANCER.sys_name, LANCER.setting_stock_icons, {
    name: "Keep Stock Icons",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register(LANCER.sys_name, LANCER.setting_welcome, {
    name: "Hide Welcome Message",
    hint: "Hide the welcome message for the latest update to the Lancer system.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register(LANCER.sys_name, LANCER.setting_automation, {
    name: "System Automation",
    hint: "Master enable switch for system automation. Turn this off to do everything manually.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(LANCER.sys_name, LANCER.setting_auto_structure, {
    name: "Automatic Structure/Stress",
    hint:
      "When a mech rolls a structure/overheat macro, should it automatically decrease structure/stress?",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(LANCER.sys_name, LANCER.setting_pilot_oc_heat, {
    name: "Auto-Apply Overcharge Heat",
    hint: "When a mech rolls an overcharge, should it automatically apply heat?",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(LANCER.sys_name, LANCER.setting_overkill_heat, {
    name: "Auto-Apply Overkill Heat",
    hint: "When an overkill weapon triggers overkill rerolls, should it automatically apply heat?",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });
  
  game.settings.register(LANCER.sys_name, LANCER.setting_120, {
    name: "Show v0.1.20 Warning",
    scope: "world",
    config: false,
    type: Boolean,
    default: true,
  });
};
