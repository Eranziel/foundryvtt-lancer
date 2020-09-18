export const registerSettings = function () {
  /**
   * Track the system version upon which point a migration was last applied
   */
  game.settings.register("lancer", "systemMigrationVersion", {
    name: "System Migration Version",
    scope: "world",
    config: false,
    type: String,
    default: 0,
  });
};
