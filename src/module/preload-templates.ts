export const preloadTemplates = async function () {
  const templatePaths = [
    // Actor sheets
    `systems/${game.system.id}/templates/actor/deployable.hbs`,
    `systems/${game.system.id}/templates/actor/mech.hbs`,
    `systems/${game.system.id}/templates/actor/npc.hbs`,
    `systems/${game.system.id}/templates/actor/pilot.hbs`,
    // Most common chat cards
    `systems/${game.system.id}/templates/chat/attack-card.hbs`,
    `systems/${game.system.id}/templates/chat/tech-attack-card.hbs`,
    `systems/${game.system.id}/templates/chat/generic-card.hbs`,
    `systems/${game.system.id}/templates/chat/stat-roll-card.hbs`,
    `systems/${game.system.id}/templates/chat/system-card.hbs`,
    // Combat tracker & settings UI
    `systems/${game.system.id}/templates/combat/combat-tracker-config.hbs`,
    `systems/${game.system.id}/templates/combat/combat-tracker.hbs`,
    // Item sheets
    `systems/${game.system.id}/templates/item/bond.hbs`,
    `systems/${game.system.id}/templates/item/core_bonus.hbs`,
    `systems/${game.system.id}/templates/item/frame.hbs`,
    `systems/${game.system.id}/templates/item/license.hbs`,
    `systems/${game.system.id}/templates/item/mech_system.hbs`,
    `systems/${game.system.id}/templates/item/mech_weapon.hbs`,
    `systems/${game.system.id}/templates/item/npc_class.hbs`,
    `systems/${game.system.id}/templates/item/npc_feature.hbs`,
    `systems/${game.system.id}/templates/item/npc_template.hbs`,
    `systems/${game.system.id}/templates/item/organization.hbs`,
    `systems/${game.system.id}/templates/item/pilot_armor.hbs`,
    `systems/${game.system.id}/templates/item/pilot_gear.hbs`,
    `systems/${game.system.id}/templates/item/pilot_weapon.hbs`,
    `systems/${game.system.id}/templates/item/reserve.hbs`,
    `systems/${game.system.id}/templates/item/skill.hbs`,
    `systems/${game.system.id}/templates/item/status.hbs`,
    `systems/${game.system.id}/templates/item/tag.hbs`,
    `systems/${game.system.id}/templates/item/talent.hbs`,
    `systems/${game.system.id}/templates/item/weapon_mod.hbs`,
    // Misc App UIs
    `systems/${game.system.id}/templates/lcp/lcp-manager.hbs`,
    `systems/${game.system.id}/templates/window/action_editor.hbs`,
    `systems/${game.system.id}/templates/window/action_manager.hbs`,
    `systems/${game.system.id}/templates/window/bonus.hbs`,
    `systems/${game.system.id}/templates/window/counter.hbs`,
    `systems/${game.system.id}/templates/window/html_editor.hbs`,
    `systems/${game.system.id}/templates/window/inventory.hbs`,
    `systems/${game.system.id}/templates/window/tag.hbs`,
  ];

  return loadTemplates(templatePaths);
};
