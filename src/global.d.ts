import type { LancerInitiativeConfig } from "lancer-initiative";
import type { IContentPackManifest } from "machine-mind";
import type { AutomationOptions } from "./module/settings";
import type { LancerActionManager } from "./module/action/actionManager";

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
    lancer: {
      [x: string]: unknown;
    };
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
}
