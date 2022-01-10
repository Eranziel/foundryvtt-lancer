export const preloadTemplates = async function () {
  const templatePaths = [
    `systems/${game.system.id}/templates/actor/pilot.hbs`,
    `systems/${game.system.id}/templates/actor/npc.hbs`,
    `systems/${game.system.id}/templates/actor/deployable.hbs`,
    `systems/${game.system.id}/templates/chat/attack-card.hbs`,
    `systems/${game.system.id}/templates/chat/tech-attack-card.hbs`,
    `systems/${game.system.id}/templates/combat/combat-tracker-config.hbs`,
    `systems/${game.system.id}/templates/combat/combat-tracker.hbs`,
    `systems/${game.system.id}/templates/combat/lancer-initiative-settings.hbs`,
    `systems/${game.system.id}/templates/item/core_bonus.hbs`,
    `systems/${game.system.id}/templates/item/frame.hbs`,
    `systems/${game.system.id}/templates/item/license.hbs`,
    `systems/${game.system.id}/templates/item/mech_system.hbs`,
    `systems/${game.system.id}/templates/item/mech_weapon.hbs`,
    `systems/${game.system.id}/templates/item/npc_class.hbs`,
    `systems/${game.system.id}/templates/item/npc_feature.hbs`,
    `systems/${game.system.id}/templates/item/npc_template.hbs`,
    `systems/${game.system.id}/templates/item/pilot_armor.hbs`,
    `systems/${game.system.id}/templates/item/pilot_gear.hbs`,
    `systems/${game.system.id}/templates/item/pilot_weapon.hbs`,
    `systems/${game.system.id}/templates/item/skill.hbs`,
    `systems/${game.system.id}/templates/item/talent.hbs`,
  ];

  return loadTemplates(templatePaths);
};
