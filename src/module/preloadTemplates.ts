export const preloadTemplates = async function() {
	const templatePaths = [
		"systems/lancer/templates/actors/pilot.html",
	];

	return loadTemplates(templatePaths);
}
