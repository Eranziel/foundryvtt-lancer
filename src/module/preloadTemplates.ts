export const preloadTemplates = async function() {
	const templatePaths = [
		"systems/lancer/templates/actors/pilot.html",
		"systems/lancer/templates/actors/npc.html",
		"systems/lancer/templates/actors/deployable.html",
		"systems/lancer/templates/chat/attack-card.html",
		"systems/lancer/templates/items/core-bonus.html",
		"systems/lancer/templates/items/core-license.html",
		"systems/lancer/templates/items/pilot-gear.html",
		"systems/lancer/templates/items/skill.html",
		"systems/lancer/templates/items/talent.html",
		"systems/lancer/templates/items/npc_classes.html",
		"systems/lancer/templates/items/npc_templates.html",
		"systems/lancer/templates/items/npc_features.html"
	];

	return loadTemplates(templatePaths);
}
