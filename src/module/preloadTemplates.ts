export const preloadTemplates = async function() {
	const templatePaths = [
		"systems/lancer/templates/pilot-sheet.html" // May not be needed?
	];

	return loadTemplates(templatePaths);
}
