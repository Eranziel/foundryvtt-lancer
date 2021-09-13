import { LANCER } from "./config";
import { AutomationConfig } from "./apps/automation-settings";
import CompconLoginForm from "./helpers/compcon-login-form";

export const registerSettings = function () {
  /**
   * Track the system version upon which point a migration was last applied
   */
  game.settings.register(game.system.id, LANCER.setting_migration, {
    name: "System Migration Version",
    scope: "world",
    config: false,
    type: String,
    default: "0",
  });

  game.settings.register(game.system.id, LANCER.setting_core_data, {
    name: "Lancer Data Version",
    scope: "world",
    config: false,
    type: String,
    // Toggle for dev swapping to test import.
    default: "0.0.0",
    // default: "3.0.21",
  });

  game.settings.register(game.system.id, LANCER.setting_lcps, {
    name: "Installed LCPs",
    scope: "world",
    config: false,
    // @ts-ignore There's probably a fix for this
    type: Object,
  });

  game.settings.registerMenu(game.system.id, LANCER.setting_compcon_login, {
    name: "Comp/Con Login",
    label: "Log in to Comp/Con",
    hint: "Log in to Comp/Con to automatically load any pilots and mechs you have access to",
    icon: "fas fa-bars",
    type: CompconLoginForm,
    restricted: false,
  });

  game.settings.registerMenu(game.system.id, "AutomationMenu", {
    name: "lancer.automation.menu-name",
    label: "lancer.automation.menu-label",
    hint: "lancer.automation.menu-hint",
    icon: "mdi mdi-state-machine",
    type: AutomationConfig,
    restricted: true,
  });

  game.settings.register(game.system.id, LANCER.setting_stock_icons, {
    name: "Keep Stock Icons",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register(game.system.id, LANCER.setting_welcome, {
    name: "Hide Welcome Message",
    hint: "Hide the welcome message for the latest update to the Lancer system.",
    scope: "user",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register(game.system.id, LANCER.setting_action_manager, {
    name: "Action Manager Hotbar",
    hint: "Toggle for whether you will see the action tracking hotbar for selected tokens.",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(game.system.id, LANCER.setting_action_manager_players, {
    name: "Action Manager - Player Usage",
    hint: "If enabled, players will be able to manually toggle actions for any controlled tokens.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(game.system.id, LANCER.setting_automation, {
    scope: "world",
    config: false,
    type: Object,
    default: {},
  });

  // Keep all automation settings at the bottom for the selector
  // If you're adding an automation setting, be sure to go increment the settings-list css selector
  game.settings.register(game.system.id, LANCER.setting_automation_switch, {
    name: "System Automation",
    hint: "Master enable switch for system automation. Turn this off to do everything manually.",
    scope: "world",
    config: false,
    type: Boolean,
    default: true,
  });

  game.settings.register(game.system.id, LANCER.setting_automation_attack, {
    name: "Attack Automation",
    hint:
      "Toggle for whether or not you want the system to auto-calculate hits, damage, and other attack related checks.",
    scope: "world",
    config: false,
    type: Boolean,
    default: true,
  });

  game.settings.register(game.system.id, LANCER.setting_auto_structure, {
    name: "Automatic Structure/Stress",
    hint: "When a mech rolls a structure/overheat macro, should it automatically decrease structure/stress?",
    scope: "world",
    config: false,
    type: Boolean,
    default: true,
  });

  game.settings.register(game.system.id, LANCER.setting_pilot_oc_heat, {
    name: "Auto-Apply Overcharge Heat",
    hint: "When a mech rolls an overcharge, should it automatically apply heat?",
    scope: "world",
    config: false,
    type: Boolean,
    default: true,
  });

  game.settings.register(game.system.id, LANCER.setting_overkill_heat, {
    name: "Auto-Apply Overkill Heat",
    hint: "When an overkill weapon triggers overkill rerolls, should it automatically apply heat?",
    scope: "world",
    config: false,
    type: Boolean,
    default: true,
  });

  // Only put automation settings above this
  // Nothing below this
};

/**
 * Retrieve the automation settings for the system. If automation is turned
 * off, all keys will be `false`.
 * @param useDefault - Control if the returned value is the default.
 *                     (default: `false`)
 */
export function getAutomationOptions(useDefault = false): AutomationOptions {
  const def: AutomationOptions = {
    enabled: true,
    attacks: true,
    structure: true,
    overcharge_heat: true,
    attack_self_heat: true,
    remove_templates: false,
  };
  if (useDefault) return def;
  const set = game.settings.get(game.system.id, LANCER.setting_automation);
  if (set.enabled ?? true) {
    return {
      ...def,
      ...set,
    };
  } else {
    // Return all falses if automation is off
    return {
      enabled: false,
      attacks: false,
      structure: false,
      overcharge_heat: false,
      attack_self_heat: false,
      remove_templates: false,
    };
  }
}

/**
 * Object for the various automation settings in the system
 */
export interface AutomationOptions {
  /**
   * Master switch for automation
   * @defaultValue `true`
   */
  enabled: boolean;
  /**
   * Toggle for whether or not you want the system to auto-calculate hits,
   * damage, and other attack related checks.
   * @defaultValue `true`
   */
  attacks: boolean;
  /**
   * When a mech rolls a structure/overheat macro, should it automatically
   * decrease structure/stress?
   * @defaultValue `true`
   */
  structure: boolean;
  /**
   * When a mech rolls an overcharge, should it automatically apply heat?
   * @defaultValue `true`
   */
  overcharge_heat: boolean;
  /**
   * When a mech rolls an attack with heat (self) and/or overkill, should it
   * automatically apply heat?
   * @defaultValue `true`
   */
  attack_self_heat: boolean;
  /**
   * Remove measured templates created by attacks when the turn changes
   * @defaultValue `false`
   */
  remove_templates: boolean;
}
