import type { LancerActionManager } from "./module/action/action-manager";
import type { AutomationOptions, CombatTrackerAppearance, StatusIconConfigOptions } from "./module/settings";
import type { TerrainHeightToolsAPI } from "./types/terrain-height-tools";

interface LancerInitiativeConfig<T extends string = string> {
  /**
   * Filepath to the handlebars template for LancerCombatTracker. Can be
   * omitted if LancerCombatTracker is not used.
   */
  templatePath?: string;
  /**
   * Whether to enable the initiative rolling buttons in the tracker. Only
   * needed if LancerCombatTracker or a subclass is used for the tracker and
   * intitaitve rolling is wanted.
   * @defaultValue `false`
   */
  enable_initiative?: boolean;
  /**
   * Whether to sort the displayed combat tracker based on activation status.
   * If enabled, the active unit is displayed on the top and units that have
   * used all their activations are sorted to the bottom. Only needed if
   * LancerCombatTracker or a subclass is used and sorting is not wanted, or
   * the ability to toggle it is desired.
   * @defaultValue `true`
   */
  sort?: boolean;
}

declare global {
  // Since we never use these before `init` tell league types that they are
  // never undefined
  interface LenientGlobalVariableTypes {
    game: never;
    canvas: never;
  }
  interface AssumeHookRan {
    ready: never;
  }

  interface System {
    id: "lancer";
  }

  interface ReadyGame {
    lancer: Record<string, unknown>;
    action_manager?: LancerActionManager;
  }

  interface CONFIG {
    LancerInitiative: LancerInitiativeConfig<Game["system"]["id"]>;
  }

  interface SettingConfig {
    "lancer.systemMigrationVersion": string;
    "lancer.coreDataVersion": string;
    "lancer.installedLCPs": {
      index: IContentPackManifest[];
    };
    "lancer.keepStockIcons": boolean;
    "lancer.hideWelcome": boolean;
    "lancer.automationOptions": AutomationOptions;
    "lancer.automationSwitch": boolean;
    "lancer.attackSwitch": boolean;
    "lancer.actionManager": boolean;
    "lancer.actionManagerPlayersUse": boolean;
    "lancer.actionTracker": Record<string, unknown>;
    "lancer.autoOCHeat": boolean;
    "lancer.autoOKillHeat": boolean;
    "lancer.autoCalcStructure": boolean;
    "lancer.combat-tracker-sort": boolean;
    "lancer.floatingNumbers": boolean;
    "lancer.squareGridDiagonals": "111" | "121" | "222" | "euc";
    "lancer.statusIconConfig": StatusIconConfigOptions;
    "lancer.tagConfig": Record<string, unknown>;
    "lancer.uiTheme": "gms" | "gmsDark" | "msmc" | "horus" | "ha" | "ssc" | "ipsn" | "gal";
    // "lancer.warningFor120": boolean; // Old setting, currently unused.
    // "lancer.warningForBeta": boolean; // Old setting, currently unused.
    "lancer.combatTrackerConfig": { sortTracker: boolean } | ClientSettings.Values["lancer.combatTrackerConfig"];
    "lancer.dsnSetup": boolean;
    "lancer.combat-tracker-appearance": CombatTrackerAppearance;

    "dice-so-nice.enabledSimultaneousRollForMessage": boolean;

    "lancer-conditions.keepStockIcons": boolean;
    "lancer-conditions.cancerConditionsStatus": boolean;
    "lancer-conditions.cancerNPCTemplates": boolean;
    "lancer-conditions.hayleyConditionsStatus": boolean;
    "lancer-conditions.hayleyPC": boolean;
    "lancer-conditions.hayleyNPC": boolean;
    "lancer-conditions.hayleyUtility": boolean;
    "lancer-conditions.tommyConditionsStatus": boolean;
  }

  /**
   * Terrain Height Tools API.
   * Make sure to guard usage with a check for the module being active
   */
  const terrainHeightTools: TerrainHeightToolsAPI | undefined;
}
