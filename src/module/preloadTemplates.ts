export const preloadTemplates = async function () {
  const templatePaths = [
    "systems/lancer/templates/actor/pilot.hbs",
    "systems/lancer/templates/actor/npc.hbs",
    "systems/lancer/templates/actor/deployable.hbs",
    "systems/lancer/templates/chat/attack-card.hbs",
    "systems/lancer/templates/chat/tech-attack-card.hbs",
    "systems/lancer/templates/item/core_bonus.hbs",
    "systems/lancer/templates/item/frame.hbs",
    "systems/lancer/templates/item/license.hbs",
    "systems/lancer/templates/item/mech_system.hbs",
    "systems/lancer/templates/item/mech_weapon.hbs",
    "systems/lancer/templates/item/npc_class.hbs",
    "systems/lancer/templates/item/npc_feature.hbs",
    "systems/lancer/templates/item/npc_template.hbs",
    "systems/lancer/templates/item/pilot_armor.hbs",
    "systems/lancer/templates/item/pilot_gear.hbs",
    "systems/lancer/templates/item/pilot_weapon.hbs",
    "systems/lancer/templates/item/skill.hbs",
    "systems/lancer/templates/item/talent.hbs",
  ];

  return loadTemplates(templatePaths);
};
