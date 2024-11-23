import { ActionTrackerConfig } from "./apps/action-tracker-settings";
import { AutomationConfig } from "./apps/automation-settings";
import { StatusIconConfig } from "./apps/status-icon-config";
import type { LancerCombat, LancerCombatant } from "./combat/lancer-combat";
import { setAppearance } from "./combat/lancer-combat-tracker";
import { LANCER } from "./config";
import { LancerActiveEffect } from "./effects/lancer-active-effect";
import CompconLoginForm from "./helpers/compcon-login-form";
import { applyTheme } from "./themes";
import fields = foundry.data.fields;

export const registerSettings = function () {
  /**
   * Track the system version upon which point a migration was last applied
   */
  game.settings.register(game.system.id, LANCER.setting_migration_version, {
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
    default: "",
  });

  game.settings.register(game.system.id, LANCER.setting_lcps, {
    name: "Installed LCPs",
    scope: "world",
    config: false,
    type: Object,
    default: { index: [] },
  });

  game.settings.register(game.system.id, LANCER.setting_tag_config, {
    name: "Tags",
    scope: "world",
    config: false,
    type: Object,
    default: {},
  });

  game.settings.register(game.system.id, LANCER.setting_floating_damage_numbers, {
    name: "lancer.floatingDamageNumbers.name",
    hint: "lancer.floatingDamageNumbers.hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register(game.system.id, LANCER.setting_ui_theme, {
    name: "lancer.uiTheme.name",
    hint: "lancer.uiTheme.hint",
    scope: "client",
    config: true,
    type: new foundry.data.fields.StringField({
      required: true,
      choices: {
        gms: "lancer.uiTheme.gms",
        gmsDark: "lancer.uiTheme.gmsDark",
        msmc: "lancer.uiTheme.msmc",
        horus: "lancer.uiTheme.horus",
        ha: "lancer.uiTheme.ha",
        ssc: "lancer.uiTheme.ssc",
        ipsn: "lancer.uiTheme.ipsn",
        gal: "lancer.uiTheme.gal",
      },
      initial: "gms",
    }),
    onChange: v => {
      if (!v || !["gms", "gmsDark", "msmc", "horus", "ha", "ssc", "ipsn", "gal"].includes(v)) applyTheme("gms");
      else applyTheme(v);
    },
  });

  game.settings.registerMenu(game.system.id, LANCER.setting_compcon_login, {
    name: "Comp/Con Login",
    label: "Log in to Comp/Con",
    hint: "Log in to Comp/Con to automatically load any pilots and mechs you have access to",
    icon: "fas fa-bars",
    type: CompconLoginForm,
    restricted: false,
  });

  game.settings.registerMenu(game.system.id, LANCER.setting_status_icons, {
    name: "lancer.statusIconsConfig.menu-name",
    label: "lancer.statusIconsConfig.menu-label",
    hint: "lancer.statusIconsConfig.menu-hint",
    icon: "cci cci-difficulty i--s",
    // @ts-expect-error
    type: StatusIconConfig,
    restricted: true,
  });

  game.settings.register(game.system.id, LANCER.setting_status_icons, {
    scope: "world",
    config: false,
    type: StatusIconConfigOptions,
    onChange: async () => {
      await LancerActiveEffect.initConfig();
      await LancerActiveEffect.populateFromItems();
    },
    default: new StatusIconConfigOptions(),
  });

  game.settings.registerMenu(game.system.id, LANCER.setting_automation, {
    name: "lancer.automation.menu-name",
    label: "lancer.automation.menu-label",
    hint: "lancer.automation.menu-hint",
    icon: "mdi mdi-state-machine",
    // @ts-expect-error
    type: AutomationConfig,
    restricted: true,
  });

  game.settings.register(game.system.id, LANCER.setting_automation, {
    scope: "world",
    config: false,
    type: AutomationOptions,
    default: new AutomationOptions(),
  });

  game.settings.registerMenu(game.system.id, LANCER.setting_actionTracker, {
    name: "lancer.actionTracker.menu-name",
    label: "lancer.actionTracker.menu-label",
    hint: "lancer.actionTracker.menu-hint",
    icon: "mdi mdi-state-machine",
    // @ts-expect-error
    type: ActionTrackerConfig,
    restricted: true,
  });

  game.settings.register(game.system.id, LANCER.setting_actionTracker, {
    scope: "world",
    config: false,
    type: ActionTrackerOptions,
    default: {},
  });

  game.settings.register(game.system.id, LANCER.setting_welcome, {
    name: "Hide Welcome Message",
    hint: "Hide the welcome message for the latest update to the Lancer system.",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register(game.system.id, LANCER.setting_dsn_setup, {
    scope: "world",
    config: false,
    type: Boolean,
    default: false,
  });

  // Lancer initiative stuff
  CONFIG.LancerInitiative = {
    templatePath: `systems/${game.system.id}/templates/combat/combat-tracker.hbs`,
  };
  game.settings.register(game.system.id, "combat-tracker-appearance", {
    scope: "client",
    config: false,
    type: CombatTrackerAppearance,
    // @ts-expect-error
    onChange: setAppearance,
    default: new CombatTrackerAppearance(),
  });
  game.settings.register(game.system.id, "combat-tracker-sort", {
    scope: "world",
    config: false,
    type: Boolean,
    onChange: v => {
      CONFIG.LancerInitiative.sort = v;
      game.combats?.render();
    },
    default: true,
  });
  CONFIG.LancerInitiative.sort = game.settings.get(game.system.id, "combat-tracker-sort");
  setAppearance(game.settings.get(game.system.id, "combat-tracker-appearance"));
};

// > GENERAL AUTOMATION
/**
 * Retrieve the automation settings for the system. If automation is turned
 * off, all keys will be `false`.
 * @deprecated Get the setting directly instead.
 */
export function getAutomationOptions(): AutomationOptions {
  return game.settings.get(game.system.id, LANCER.setting_automation) ?? new AutomationOptions();
}

interface AutomationOptionsSchema extends DataSchema {
  /**
   * Master switch for automation
   * @defaultValue `true`
   */
  // enabled: boolean;
  /**
   * Toggle for whether or not you want the system to auto-calculate hits,
   * damage, and other attack related checks.
   * @defaultValue `true`
   */
  attacks: fields.BooleanField<{ initial: true }>;
  /**
   * When a mech rolls a structure/overheat macro, should it automatically
   * decrease structure/stress?
   * @defaultValue `true`
   */
  structure: fields.BooleanField<{ initial: true }>;
  /**
   * When a mech rolls an overcharge, should it automatically apply heat?
   * @defaultValue `true`
   */
  overcharge_heat: fields.BooleanField<{ initial: true }>;
  /**
   * When a mech rolls an attack with heat (self) and/or overkill, should it
   * automatically apply heat?
   * @defaultValue `true`
   */
  attack_self_heat: fields.BooleanField<{ initial: true }>;
  /**
   * Handle limited/loading items automatically, or leave that up to the user
   * @defaultValue `true`
   */
  limited_loading: fields.BooleanField<{ initial: true }>;
  /**
   * Automatically recharge NPC systems at the start of their turn
   * @defaultValue `true`
   */
  npc_recharge: fields.BooleanField<{ initial: true }>;
  /**
   * Remove measured templates created by attacks when the turn changes
   * @defaultValue `false`
   */
  remove_templates: fields.BooleanField<{ initial: true }>;
  /**
   * Automatically manage token sizes based on the actor
   * @defaultValue `true`
   */
  token_size: fields.BooleanField<{ initial: true }>;
}

/**
 * Object for the various automation settings in the system
 */
export class AutomationOptions extends foundry.abstract.DataModel<AutomationOptionsSchema> {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      attacks: new fields.BooleanField({
        required: true,
        initial: true,
        label: "lancer.automation.attacks",
        hint: "lancer.automation.attacks-desc",
      }),
      structure: new fields.BooleanField({
        required: true,
        initial: true,
        label: "lancer.automation.structure",
        hint: "lancer.automation.structure-desc",
      }),
      overcharge_heat: new fields.BooleanField({
        required: true,
        initial: true,
        label: "lancer.automation.overcharge_heat",
        hint: "lancer.automation.overcharge_heat-desc",
      }),
      attack_self_heat: new fields.BooleanField({
        required: true,
        initial: true,
        label: "lancer.automation.attack_self_heat",
        hint: "lancer.automation.attack_self_heat-desc",
      }),
      limited_loading: new fields.BooleanField({
        required: true,
        initial: true,
        label: "lancer.automation.limited_loading",
        hint: "lancer.automation.limited_loading-desc",
      }),
      npc_recharge: new fields.BooleanField({
        required: true,
        initial: true,
        label: "lancer.automation.npc_recharge",
        hint: "lancer.automation.npc_recharge-desc",
      }),
      remove_templates: new fields.BooleanField({
        required: true,
        initial: false,
        label: "lancer.automation.remove_templates",
        hint: "lancer.automation.remove_templates-desc",
      }),
      token_size: new fields.BooleanField({
        required: true,
        initial: true,
        label: "lancer.automation.token_size",
        hint: "lancer.automation.token_size-desc",
      }),
    };
  }
}

//
// > ACTION TRACKER AUTOMATION

/**
 * Object for the various automation settings in the system
 */
interface ActionTrackerOptionsSchema extends DataSchema {
  /**
   * Whether the hotbar should be displayed.
   * @defaultValue `true`
   */
  showHotbar: fields.BooleanField<{ initial: true }>;
  /**
   * Whether the players (non-GMs) can modify actions.
   * @defaultValue `true`
   */
  allowPlayers: fields.BooleanField<{ initial: true }>;
  /**
   * Whether to print turn start/end chat messages.
   * @defaultValue `true`
   */
  printMessages: fields.BooleanField<{ initial: true }>;
}

export class ActionTrackerOptions extends foundry.abstract.DataModel<ActionTrackerOptionsSchema> {
  static defineSchema(): ActionTrackerOptionsSchema {
    return {
      showHotbar: new fields.BooleanField({ initial: true, required: true }),
      allowPlayers: new fields.BooleanField({ initial: true, required: true }),
      printMessages: new fields.BooleanField({ initial: true, required: true }),
    };
  }
}

//
// > STATUS ICON CONFIGURATION
interface StatusIconConfigOptionsSchema extends DataSchema {
  /**
   * Enable the default icon set for conditions & status
   * @defaultValue `true`
   */
  defaultConditionsStatus: fields.BooleanField<{ initial: true }>;
  /**
   * Enable Cancermantis' icon set for conditions & status
   * @defaultValue `false`
   */
  cancerConditionsStatus: fields.BooleanField<{ initial: false }>;
  /**
   * Enable Cancermantis' icon set for NPC templates
   * @defaultValue `false`
   */
  cancerNPCTemplates: fields.BooleanField<{ initial: false }>;
  /**
   * Enable Hayley's icon set for conditions & status.
   * @defaultValue `false`
   */
  hayleyConditionsStatus: fields.BooleanField<{ initial: false }>;
  /**
   * Enable Hayley's icon set for PC system effects.
   * @defaultValue `false`
   */
  hayleyPC: fields.BooleanField<{ initial: false }>;
  /**
   * Enable Hayley's icon set for NPC system effects.
   * @defaultValue `false`
   */
  hayleyNPC: fields.BooleanField<{ initial: false }>;
  /**
   * Enable Hayley's icon set for utility indicators.
   * @defaultValue `false`
   */
  hayleyUtility: fields.BooleanField<{ initial: false }>;
  /**
   * Enable Tommy's icon set for conditions & status.
   * @defaultValue `false`
   */
  tommyConditionsStatus: fields.BooleanField<{ initial: false }>;
}

/**
 * Object for the various automation settings in the system
 */
export class StatusIconConfigOptions extends foundry.abstract.DataModel<StatusIconConfigOptionsSchema> {
  static defineSchema() {
    const fields: any = foundry.data.fields;
    return {
      defaultConditionsStatus: new fields.BooleanField({
        required: true,
        initial: true,
        label: "lancer.statusIconsConfig.defaultConditionsStatus",
        hint: "lancer.statusIconsConfig.defaultConditionsStatus-desc",
      }),

      cancerConditionsStatus: new fields.BooleanField({
        required: true,
        initial: false,
        label: "lancer.statusIconsConfig.cancerConditionsStatus",
        hint: "lancer.statusIconsConfig.cancerConditionsStatus-desc",
      }),

      cancerNPCTemplates: new fields.BooleanField({
        required: true,
        initial: false,
        label: "lancer.statusIconsConfig.cancerNPCTemplates",
        hint: "lancer.statusIconsConfig.cancerNPCTemplates-desc",
      }),

      hayleyConditionsStatus: new fields.BooleanField({
        required: true,
        initial: false,
        label: "lancer.statusIconsConfig.hayleyConditionsStatus",
        hint: "lancer.statusIconsConfig.hayleyConditionsStatus-desc",
      }),

      hayleyPC: new fields.BooleanField({
        required: true,
        initial: false,
        label: "lancer.statusIconsConfig.hayleyPC",
        hint: "lancer.statusIconsConfig.hayleyPC-desc",
      }),

      hayleyNPC: new fields.BooleanField({
        required: true,
        initial: false,
        label: "lancer.statusIconsConfig.hayleyNPC",
        hint: "lancer.statusIconsConfig.hayleyNPC-desc",
      }),

      hayleyUtility: new fields.BooleanField({
        required: true,
        initial: false,
        label: "lancer.statusIconsConfig.hayleyUtility",
        hint: "lancer.statusIconsConfig.hayleyUtility-desc",
      }),

      tommyConditionsStatus: new fields.BooleanField({
        required: true,
        initial: false,
        label: "lancer.statusIconsConfig.tommyConditionsStatus",
        hint: "lancer.statusIconsConfig.tommyConditionsStatus-desc",
      }),
    };
  }
}

//
// > LANCER INITIATIVE CONFIG
//

interface CombatTrackerAppearanceSchema extends DataSchema {
  /**
   * Css class to specify the icon
   * @default `cci cci-activate`
   */
  icon: fields.StringField<{ required: true; initial: "cci cci-activate" }>;
  /**
   * Css class to specify deactivation icon
   * @default `cci cci-deactivate`
   */
  deactivate: fields.StringField<{ required: true; initial: "cci cci-deactivate" }>;
  /**
   * Size of the icon in rem
   * @default `2`
   */
  icon_size: fields.NumberField<{ initial: 2 }>;
  /**
   * Color for players in the tracker
   * @default `#44abe0`
   */
  player_color: fields.ColorField<{ initial: "#44abe0" }>;
  /**
   * Color for friendly npcs
   * @default `#44abe0`
   */
  friendly_color: fields.ColorField<{ initial: "#44abe0" }>;
  /**
   * Color for neutral npcs
   * @default `#146464`
   */
  neutral_color: fields.ColorField<{ initial: "#146464" }>;
  /**
   * Color for enemy npcs
   * @default `#d98f30`
   */
  enemy_color: fields.ColorField<{ initial: "#d98f30" }>;
  /**
   * Color for units that have finished their turn
   * @default `#444444`
   */
  done_color: fields.ColorField<{ initial: "#444444" }>;
}

export class CombatTrackerAppearance extends foundry.abstract.DataModel<CombatTrackerAppearanceSchema> {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      icon: new fields.StringField({
        required: true,
        initial: "cci cci-activate",
        label: "LANCERINITIATIVE.Icon",
      }),
      deactivate: new fields.StringField({
        required: true,
        initial: "cci cci-deactivate",
        label: "LANCERINITIATIVE.DeactivateIcon",
      }),
      icon_size: new fields.NumberField({
        required: true,
        initial: 2,
        integer: false,
        label: "LANCERINITIATIVE.IconSize",
      }),
      player_color: new fields.ColorField({
        required: true,
        initial: "#44abe0",
        label: "LANCERINITIATIVE.PCColor",
      }),
      friendly_color: new fields.ColorField({
        required: true,
        initial: "#44abe0",
        label: "LANCERINITIATIVE.FriendlyColor",
      }),
      neutral_color: new fields.ColorField({
        required: true,
        initial: "#146464",
        label: "LANCERINITIATIVE.NeutralColor",
      }),
      enemy_color: new fields.ColorField({
        required: true,
        initial: "#d98f30",
        label: "LANCERINITIATIVE.EnemyColor",
      }),
      done_color: new fields.ColorField({
        required: true,
        initial: "#aaaaaa",
        label: "LANCERINITIATIVE.DoneColor",
      }),
    };
  }
}

//
// > GLOBALS
declare global {
  interface DocumentClassConfig {
    Combat: typeof LancerCombat;
    Combatant: typeof LancerCombatant;
  }
}
