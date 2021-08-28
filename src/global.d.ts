import { IContentPackManifest } from "machine-mind";

declare global {
  interface LenientGlobalVariableTypes {
    game: never;
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
      "lancer.automationSwitch": boolean;
      "lancer.attackSwitch": boolean;
      "lancer.actionManager": boolean;
      "lancer.actionManagerPlayersUse": boolean;
      "lancer.autoOCHeat": boolean;
      "lancer.autoOKillHeat": boolean;
      "lancer.autoCalcStructure": boolean;
      // "lancer.warningFor120": boolean; // Old setting, currently unused.
      // "lancer.warningForBeta": boolean; // Old setting, currently unused.
    }
  }
}
