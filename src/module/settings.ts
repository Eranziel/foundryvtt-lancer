import { ActionTrackerConfig } from "./apps/action-tracker-settings";
import { AutomationConfig } from "./apps/automation-settings";
import { StatusIconConfig } from "./apps/status-icon-config";
import { LocalizationConfig } from "./apps/localization-settings";
import type { LancerCombat, LancerCombatant } from "./combat/lancer-combat";
import { setAppearance } from "./combat/lancer-combat-tracker";
import { LANCER } from "./config";
import { LancerActiveEffect } from "./effects/lancer-active-effect";
import { applyTheme, applySimpleFonts } from "./themes";
import fields = foundry.data.fields;
import { refreshLLPTranslations } from "./util/localization/llp-map";
import type { PackedLanguagePatchWrapper } from "./util/unpacking/packed-types";

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
    name: "lancer.setting.floatingDamageNumbers.name",
    hint: "lancer.setting.floatingDamageNumbers.hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register(game.system.id, LANCER.setting_simple_fonts, {
    name: "lancer.setting.simpleFonts.name",
    hint: "lancer.setting.simpleFonts.hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
    onChange: (v: boolean) => applySimpleFonts(v),
  });

  game.settings.register(game.system.id, LANCER.setting_ui_theme, {
    name: "lancer.setting.uiTheme.name",
    hint: "lancer.setting.uiTheme.hint",
    scope: "client",
    config: true,
    type: new foundry.data.fields.StringField({
      required: true,
      choices: {
        gms: "lancer.setting.uiTheme.gms",
        gmsDark: "lancer.setting.uiTheme.gmsDark",
        msmc: "lancer.setting.uiTheme.msmc",
        horus: "lancer.setting.uiTheme.horus",
        ha: "lancer.setting.uiTheme.ha",
        ssc: "lancer.setting.uiTheme.ssc",
        ipsn: "lancer.setting.uiTheme.ipsn",
        gal: "lancer.setting.uiTheme.gal",
      },
      initial: "gms",
    }),
    onChange: v => {
      if (!v || !["gms", "gmsDark", "msmc", "horus", "ha", "ssc", "ipsn", "gal"].includes(v)) applyTheme("gms");
      else applyTheme(v);
    },
  });

  game.settings.register(game.system.id, LANCER.setting_pause_icon, {
    name: "lancer.setting.pauseIcon.name",
    hint: "lancer.setting.pauseIcon.hint",
    scope: "world",
    config: true,
    type: new foundry.data.fields.StringField({
      required: true,
      choices: {
        gms: "lancer.setting.pauseIcon.gms",
        horus: "lancer.setting.pauseIcon.horus",
        ha: "lancer.setting.pauseIcon.ha",
        ssc: "lancer.setting.pauseIcon.ssc",
        "ips-n": "lancer.setting.pauseIcon.ips-n",
        albatross: "lancer.setting.pauseIcon.albatross",
        aun: "lancer.setting.pauseIcon.aun",
        barony: "lancer.setting.pauseIcon.barony",
        horizon: "lancer.setting.pauseIcon.horizon",
        ra: "lancer.setting.pauseIcon.ra",
        sparri: "lancer.setting.pauseIcon.sparri",
        voladores: "lancer.setting.pauseIcon.voladores",
      },
      initial: "gms",
    }),
    default: "gms",
  });

  game.settings.registerMenu(game.system.id, LANCER.setting_status_icons, {
    name: "lancer.setting.statusIconsConfig.menu.name",
    label: "lancer.setting.statusIconsConfig.menu.label",
    hint: "lancer.setting.statusIconsConfig.menu.hint",
    icon: "cci cci-difficulty i--2",
    type: StatusIconConfig,
    restricted: true,
  });

  game.settings.register(game.system.id, LANCER.setting_status_icons, {
    scope: "world",
    config: false,
    type: StatusIconConfigOptions,
    onChange: async () => {
      await LancerActiveEffect.updateIcons();
    },
    default: new StatusIconConfigOptions(),
  });

  game.settings.registerMenu(game.system.id, LANCER.setting_automation, {
    name: "lancer.setting.automation.menu.name",
    label: "lancer.setting.automation.menu.label",
    hint: "lancer.setting.automation.menu.hint",
    icon: "mdi mdi-state-machine",
    type: AutomationConfig,
    restricted: true,
  });

  game.settings.register(game.system.id, LANCER.setting_automation, {
    scope: "world",
    config: false,
    type: AutomationOptions,
    default: new AutomationOptions(),
  });

  game.settings.register(game.system.id, LANCER.setting_scan_outputs, {
    name: "lancer.setting.scanOutput.name",
    hint: "lancer.setting.scanOutput.hint",
    scope: "world",
    config: true,
    type: new foundry.data.fields.StringField({
      required: true,
      choices: {
        both: "lancer.setting.scanOutput.both",
        chat: "lancer.setting.scanOutput.chat",
        journal: "lancer.setting.scanOutput.journal",
      },
      initial: "both",
    }),
    default: "both",
  });

  game.settings.registerMenu(game.system.id, LANCER.setting_actionTracker, {
    name: "lancer.setting.actionTracker.menu.name",
    label: "lancer.setting.actionTracker.menu.label",
    hint: "lancer.setting.actionTracker.menu.hint",
    icon: "mdi mdi-state-machine",
    type: ActionTrackerConfig,
    restricted: true,
  });

  game.settings.register(game.system.id, LANCER.setting_actionTracker, {
    scope: "world",
    config: false,
    type: ActionTrackerOptions,
    default: {},
  });

  game.settings.register(game.system.id, LANCER.setting_dsn_setup, {
    scope: "world",
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.registerMenu(game.system.id, LANCER.setting_localization, {
    name: "lancer.setting.localization.menu.name",
    label: "lancer.setting.localization.menu.label",
    hint: "lancer.setting.localization.menu.hint",
    icon: "mdi mdi-translate",
    type: LocalizationConfig,
    restricted: true,
  });

  game.settings.register(game.system.id, LANCER.setting_localization, {
    scope: "world",
    config: false,
    type: LocalizationOptions,
    default: new LocalizationOptions(),
  });

  game.settings.register(game.system.id, LANCER.setting_localization_llp_files, {
    name: "LLP Localization Files",
    scope: "world",
    config: false,
    type: Object,
    default: {},
    onChange: () => refreshLLPTranslations(), // Reapply changed LLPs to everyone
  });

  game.settings.register(game.system.id, LANCER.setting_localization_llp_index_override, {
    name: "LLP Index Overrides",
    scope: "world",
    config: false,
    type: Object,
    default: {},
    onChange: () => refreshLLPTranslations(),
  });

  // Lancer initiative stuff
  CONFIG.LancerInitiative = {
    templatePath: `systems/${game.system.id}/templates/combat/combat-tracker.hbs`,
  };
  game.settings.register(game.system.id, LANCER.setting_combat_appearance, {
    scope: "client",
    config: false,
    type: CombatTrackerAppearance,
    onChange: setAppearance,
    default: new CombatTrackerAppearance(),
  });
  game.settings.register(game.system.id, LANCER.setting_combat_sort, {
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
interface AutomationOptionsSchema extends foundry.data.fields.DataSchema {
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
        label: "lancer.setting.automation.attacks.label",
        hint: "lancer.setting.automation.attacks.hint",
      }),
      structure: new fields.BooleanField({
        required: true,
        initial: true,
        label: "lancer.setting.automation.structure.label",
        hint: "lancer.setting.automation.structure.hint",
      }),
      overcharge_heat: new fields.BooleanField({
        required: true,
        initial: true,
        label: "lancer.setting.automation.overchargeHeat.label",
        hint: "lancer.setting.automation.overchargeHeat.hint",
      }),
      attack_self_heat: new fields.BooleanField({
        required: true,
        initial: true,
        label: "lancer.setting.automation.attackSelfHeat.label",
        hint: "lancer.setting.automation.attackSelfHeat.hint",
      }),
      limited_loading: new fields.BooleanField({
        required: true,
        initial: true,
        label: "lancer.setting.automation.limitedLoading.label",
        hint: "lancer.setting.automation.limitedLoading.hint",
      }),
      npc_recharge: new fields.BooleanField({
        required: true,
        initial: true,
        label: "lancer.setting.automation.npcRecharge.label",
        hint: "lancer.setting.automation.npcRecharge.hint",
      }),
      remove_templates: new fields.BooleanField({
        required: true,
        initial: false,
        label: "lancer.setting.automation.removeTemplates.label",
        hint: "lancer.setting.automation.removeTemplates.hint",
      }),
      token_size: new fields.BooleanField({
        required: true,
        initial: true,
        label: "lancer.setting.automation.tokenSize.label",
        hint: "lancer.setting.automation.tokenSize.hint",
      }),
    };
  }
}

//
// > ACTION TRACKER AUTOMATION

/**
 * Object for the various automation settings in the system
 */
interface ActionTrackerOptionsSchema extends foundry.data.fields.DataSchema {
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
      showHotbar: new fields.BooleanField({
        initial: true,
        required: true,
        label: "lancer.setting.actionTracker.showHotbar.label",
        hint: "lancer.setting.actionTracker.showHotbar.hint",
      }),
      allowPlayers: new fields.BooleanField({
        initial: true,
        required: true,
        label: "lancer.setting.actionTracker.allowPlayers.label",
        hint: "lancer.setting.actionTracker.allowPlayers.hint",
      }),
      printMessages: new fields.BooleanField({
        initial: true,
        required: true,
        label: "lancer.setting.actionTracker.printMessages.label",
        hint: "lancer.setting.actionTracker.printMessages.hint",
      }),
    };
  }
}

//
// > STATUS ICON CONFIGURATION
interface StatusIconConfigOptionsSchema extends foundry.data.fields.DataSchema {
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
    const fields = foundry.data.fields;
    return {
      defaultConditionsStatus: new fields.BooleanField({
        required: true,
        initial: true,
        label: "lancer.setting.statusIconsConfig.defaultConditionsStatus.label",
        hint: "lancer.setting.statusIconsConfig.defaultConditionsStatus.hint",
      }),

      cancerConditionsStatus: new fields.BooleanField({
        required: true,
        initial: false,
        label: "lancer.setting.statusIconsConfig.cancerConditionsStatus.label",
        hint: "lancer.setting.statusIconsConfig.cancerConditionsStatus.hint",
      }),

      cancerNPCTemplates: new fields.BooleanField({
        required: true,
        initial: false,
        label: "lancer.setting.statusIconsConfig.cancerNPCTemplates.label",
        hint: "lancer.setting.statusIconsConfig.cancerNPCTemplates.hint",
      }),

      hayleyConditionsStatus: new fields.BooleanField({
        required: true,
        initial: false,
        label: "lancer.setting.statusIconsConfig.hayleyConditionsStatus.label",
        hint: "lancer.setting.statusIconsConfig.hayleyConditionsStatus.hint",
      }),

      hayleyPC: new fields.BooleanField({
        required: true,
        initial: false,
        label: "lancer.setting.statusIconsConfig.hayleyPC.label",
        hint: "lancer.setting.statusIconsConfig.hayleyPC.hint",
      }),

      hayleyNPC: new fields.BooleanField({
        required: true,
        initial: false,
        label: "lancer.setting.statusIconsConfig.hayleyNPC.label",
        hint: "lancer.setting.statusIconsConfig.hayleyNPC.hint",
      }),

      hayleyUtility: new fields.BooleanField({
        required: true,
        initial: false,
        label: "lancer.setting.statusIconsConfig.hayleyUtility.label",
        hint: "lancer.setting.statusIconsConfig.hayleyUtility.hint",
      }),

      tommyConditionsStatus: new fields.BooleanField({
        required: true,
        initial: false,
        label: "lancer.setting.statusIconsConfig.tommyConditionsStatus.label",
        hint: "lancer.setting.statusIconsConfig.tommyConditionsStatus.hint",
      }),
    };
  }
}

//
// > LOCALIZATION CONFIGURATION
//
/**
 * Object for settings related to localization of LCPs via LLPs in the system
 */
interface LocalizationOptionsSchema extends foundry.data.fields.DataSchema {}

export class LocalizationOptions extends foundry.abstract.DataModel<LocalizationOptionsSchema> {
  static defineSchema(): LocalizationOptionsSchema {
    return {};
  }
}

/**
 * Nested map of LLP translation data, keyed first by ISO 639-1 locale code, then by LCP name.
 */
export type LLPLocalizationFiles = Record<string, Record<string, PackedLanguagePatchWrapper>>;

/**
 * Map of LLP index overrides, keyed by LCP target and then complete Foundry LID + path.
 * Each value is the LLP key containing the translation to copy, possibly delimited by commas.
 */
export type LLPLocalizationIndexOverrides = Record<string, Record<string, string>>;

//
// > LANCER INITIATIVE CONFIG
//

interface CombatTrackerAppearanceSchema extends foundry.data.fields.DataSchema {
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
declare module "fvtt-types/configuration" {
  interface DocumentClassConfig {
    Combat: typeof LancerCombat<Combat.SubType>;
    Combatant: typeof LancerCombatant<Combatant.SubType>;
  }

  interface ConfiguredCombat<SubType extends Combat.SubType> {
    document: LancerCombat<SubType>;
  }

  interface ConfiguredCombatant<SubType extends Combatant.SubType> {
    document: LancerCombatant<SubType>;
  }
}
