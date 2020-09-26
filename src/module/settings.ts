import { LANCER } from "./config";
import * as mm from "machine-mind";
import { IContentPackManifest } from "machine-mind";
import { LCPIndex } from "./apps/lcpManager";

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
    scope: "system",
    config: false,
    type: String,
    default: ""
  });

  game.settings.register(LANCER.sys_name, LANCER.setting_lcps, {
    name: "Installed LCPs",
    scope: "system",
    config: false,
    type: Object,
  });
};
