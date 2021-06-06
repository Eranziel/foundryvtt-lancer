import { LANCER } from "./config";
import CompconLoginForm from "./helpers/compcon-login-form";

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
    // Toggle for dev swapping to test import.
    default: "0.0.0",
    // default: "3.0.21",
  });

  game.settings.register(LANCER.sys_name, LANCER.setting_lcps, {
    name: "Installed LCPs",
    scope: "world",
    config: false,
    type: Object,
  });

  game.settings.registerMenu(LANCER.sys_name, LANCER.setting_compcon_login, {
    name: "Comp/Con Login",
    label: "Log in to Comp/Con",
    scope: "user",
    hint: "Log in to Comp/Con to automatically load any pilots and mechs you have access to",
    icon: "fas fa-bars",
    type: CompconLoginForm,
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
    scope: "user",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register(LANCER.sys_name, LANCER.setting_action_manager, {
    name: "Action Manager Hotbar",
    hint: "Toggle for whether you will see the action tracking hotbar for selected tokens.",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(LANCER.sys_name, LANCER.setting_action_manager_players, {
    name: "Action Manager - Player Usage",
    hint: "If enabled, players will be able to manually toggle actions for any controlled tokens.",
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

  game.settings.register(LANCER.sys_name, LANCER.setting_beta_warning, {
    name: "Show Beta Warning",
    scope: "world",
    config: false,
    type: Boolean,
    default: true,
  });

  // Keep all automation settings at the bottom for the selector
  // If you're adding an automation setting, be sure to go increment the settings-list css selector
  game.settings.register(LANCER.sys_name, LANCER.setting_automation, {
    name: "System Automation",
    hint: "Master enable switch for system automation. Turn this off to do everything manually.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(LANCER.sys_name, LANCER.setting_automation_attack, {
    name: "Attack Automation",
    hint:
      "Toggle for whether or not you want the system to auto-calculate hits, damage, and other attack related checks.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(LANCER.sys_name, LANCER.setting_auto_structure, {
    name: "Automatic Structure/Stress",
    hint: "When a mech rolls a structure/overheat macro, should it automatically decrease structure/stress?",
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

  // Only put automation settings above this
  // Nothing below this
};
