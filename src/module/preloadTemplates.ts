export const preloadTemplates = async function () {
  const templatePaths = [
    `systems/${game.system.id}/templates/actor/pilot.html`,
    `systems/${game.system.id}/templates/actor/npc.html`,
    `systems/${game.system.id}/templates/actor/deployable.html`,
    `systems/${game.system.id}/templates/chat/attack-card.html`,
    `systems/${game.system.id}/templates/chat/tech-attack-card.html`,
    `systems/${game.system.id}/templates/item/core_bonus.html`,
    `systems/${game.system.id}/templates/item/frame.html`,
    `systems/${game.system.id}/templates/item/license.html`,
    `systems/${game.system.id}/templates/item/mech_system.html`,
    `systems/${game.system.id}/templates/item/mech_weapon.html`,
    `systems/${game.system.id}/templates/item/npc_class.html`,
    `systems/${game.system.id}/templates/item/npc_feature.html`,
    `systems/${game.system.id}/templates/item/npc_template.html`,
    `systems/${game.system.id}/templates/item/pilot_armor.html`,
    `systems/${game.system.id}/templates/item/pilot_gear.html`,
    `systems/${game.system.id}/templates/item/pilot_weapon.html`,
    `systems/${game.system.id}/templates/item/skill.html`,
    `systems/${game.system.id}/templates/item/talent.html`
  ];

  return loadTemplates(templatePaths);
};
