import type { AutomationOptions } from "./module/settings";
import type { LancerActionManager } from "./module/action/action-manager";

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

interface TerrainType {
  id: string;
  name: string;
  usesHeight: boolean;
  textRotation: boolean;
  lineType: 0 | 1 | 2;
  lineWidth: number;
  lineColor: string;
  lineOpacity: number;
  lineDashSize: number;
  lineGapSize: number;
  fillType: number;
  fillColor: string;
  fillOpacity: number;
  fillTexture: string;
  textFormat: string;
  font: string;
  textSize: number;
  textColor: string;
  textOpacity: number;
}

interface terrainHeightToolsAPI {
  /**
   * Attempts to find a terrain type with the given name or ID.
   * @param  terrain The terrain to search for.
   */
  getTerrainType(
    terrain:
      | {
          /**
           * The ID of the terrain type to find. Either this or `name` must be provided.
           */
          id: string;
          /**
           * The name of the terrain type to find. Either this or `id` must be provided.
           */
          name?: string;
        }
      | {
          /**
           * The ID of the terrain type to find. Either this or `name` must be provided.
           */
          id?: string;
          /**
           * The name of the terrain type to find. Either this or `id` must be provided.
           */
          name: string;
        }
  ): TerrainType | undefined;

  /**
   * Gets the terrain data at the given grid coordinates.
   */
  getCell(x: number, y: number): { terrainTypeId: string; height: number } | undefined;

  /**
   * Paints the target cells on the current scene with the provided terrain data.
   * @param cells The grid cells to paint as [X,Y] coordinate pairs. The cells do not have to be
   * connected.
   * @param  terrain The terrain options to use when painting the cells.
   */
  paintCells(
    cells: [number, number][],
    terrain:
      | {
          /**
           * The ID of the terrain type to use. Either this or `name` must be provided.
           */
          id?: string;
          /**
           * The name of the terrain type to use. Either this or `id` must be provided.
           */
          name: string;
          height?: number;
          elevation?: number;
        }
      | {
          /**
           * The ID of the terrain type to use. Either this or `name` must be provided.
           */
          id: string;
          /**
           * The name of the terrain type to use. Either this or `id` must be provided.
           */
          name?: string;
          /**
           * If the terrain type uses heights, the height to paint on these cells.
           */
          height?: number;
          /**
           * If the terrain type uses heights, the elevation (how high off the ground) to paint these cells.
           */
          elevation?: number;
        },
    {
      overwrite,
    }: {
      /**
       * Whether or not to overwrite already-painted cells with the new
       * terrain data.
       */
      overwrite?: boolean;
    } = {}
  ): Promise<boolean>;

  /**
   * Erases terrain height data from the given cells on the current scene.
   */
  eraseCells(cells: [number, number][]): Promise<boolean>;

  /**
   * Calculates and draws line of sight rays between two tokens, as per the
   * token line of sight tool.
   * Note that currently only one set of lines can be drawn, attempting to draw
   * any other lines of sight will clear these lines, INCLUDING those drawn by
   * the tools in the side bar.
   * @param  token1 The first token to draw line of sight from.
   * @param  token2 The second token to draw line of sight to.
   * @param  options Options that change how the calculation is done.
   */
  drawLineOfSightRaysBetweenTokens: (
    token1: Token,
    token2: Token,
    options?: {
      /**
       * How far the ray starts vertically relative to token1. The height is
       * calculated as `token1.elevation + (token1RelativeHeight × token1.size)`.
       * If undefined, uses the world-configured default value.
       */
      token1RelativeHeight?: number;
      /**
       * How far the ray ends vertically relative to token2. The height is
       * calculated as `token2.elevation + (token2RelativeHeight × token2.size)`.
       * If undefined, uses the world-configured default value.
       */
      token2RelativeHeight?: number;
      /**
       * If true, terrain types that are configured as not using a height value
       * will be included in the return list. They are treated as having
       * infinite height.
       */
      includeNoHeightTerrain?: boolean;
      /**
       * Whether to draw these rays for other users connected to the game.
       */
      drawForOthers?: boolean;
    }
  ) => void;
  /**
   * Removes all lines of sight drawn by this user, INCLUDING those drawn by the tools in the side bar.
   */
  clearLineOfSightRays: () => void;
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
      "lancer.automationOptions": Partial<AutomationOptions>;
      "lancer.automationSwitch": boolean;
      "lancer.attackSwitch": boolean;
      "lancer.actionManager": boolean;
      "lancer.actionManagerPlayersUse": boolean;
      "lancer.autoOCHeat": boolean;
      "lancer.autoOKillHeat": boolean;
      "lancer.autoCalcStructure": boolean;
      "lancer.squareGridDiagonals": "111" | "121" | "222" | "euc";
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
  const terrainHeightTools: terrainHeightToolsAPI | undefined;
}
