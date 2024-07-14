import type { AutomationOptions, StatusIconConfigOptions } from "./module/settings";
import type { LancerActionManager } from "./module/action/action-manager";
import type { TerrainHeightToolsAPI } from "./types/terrain-height-tools";

interface LancerInitiativeConfig<T extends string = string> {
  /**
   * Namespace for flags and settings. Should be the id of the system or
   * module.
   */
  module: T;
  /**
   * Filepath to the handlebars template for LancerCombatTracker. Can be
   * omitted if LancerCombatTracker is not used.
   */
  templatePath?: string;
  /**
   * Default appearance settings for LancerCombatTracker. Can be omitted if
   * LancerCombatTracker is not used.
   */
  def_appearance?: {
    icon: string;
    deactivate: string;
    icon_size: number;
    player_color: string;
    friendly_color: string;
    neutral_color: string;
    enemy_color: string;
    done_color: string;
  };
  /**
   * Activations for each unit.  If a string, path to the activation parameter
   * in actor.getRollData(), if a number, that value. Otherwise 1
   * @defaultValue `1`
   */
  activations?: string | number;
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

  namespace Game {
    interface SystemData<T> {
      id: "lancer";
    }
  }
  interface Game {
    lancer: Record<string, unknown>;
    action_manager?: LancerActionManager;
  }

  interface CONFIG {
    LancerInitiative: LancerInitiativeConfig<Game["system"]["id"]>;
  }

  namespace ClientSettings {
    interface Values {
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
      "lancer.autoOCHeat": boolean;
      "lancer.autoOKillHeat": boolean;
      "lancer.autoCalcStructure": boolean;
      "lancer.squareGridDiagonals": "111" | "121" | "222" | "euc";
      "lancer.statusIconConfig": StatusIconConfigOptions;
      "lancer.uiTheme": "gms" | "gmsDark" | "msmc" | "horus" | "ha" | "ssc" | "ipsn" | "gal";
      // "lancer.warningFor120": boolean; // Old setting, currently unused.
      // "lancer.warningForBeta": boolean; // Old setting, currently unused.
      "lancer.combatTrackerConfig": { sortTracker: boolean } | ClientSettings.Values["lancer.combatTrackerConfig"];
      "lancer.dsnSetup": boolean;
      "lancer.combat-tracker-appearance": Partial<LancerInitiativeConfig["def_appearance"]>;
    }
  }

  /**
   * Terrain Height Tools API.
   * Make sure to guard usage with a check for the module being active
   */
  const terrainHeightTools: TerrainHeightToolsAPI | undefined;
}
