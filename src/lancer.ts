/**
 * TypeScript entry file for Foundry VTT.
 * Registers custom settings, sheets, and constants using the Foundry API.
 * 
 * Author: Eranziel
 * Content License: LANCER is copyright 2019, Massif Press Inc.
 * Software License: GNU GPLv3
 */

// Import TypeScript modules
import { registerSettings } from './module/settings.js';
import { preloadTemplates } from './module/preloadTemplates.js';
import { LancerActorSheet } from "./module/actor-sheet.js";
import { AttackMacro } from './module/macros.js';

/* ------------------------------------ */
/* Initialize system					*/
/* ------------------------------------ */
Hooks.once('init', async function() {
	console.log(`Initializing LANCER RPG System 
	╭╮╱╱╭━━━┳━╮╱╭┳━━━┳━━━┳━━━╮ 
	┃┃╱╱┃╭━╮┃┃╰╮┃┃╭━╮┃╭━━┫╭━╮┃ 
	┃┃╱╱┃┃╱┃┃╭╮╰╯┃┃╱╰┫╰━━┫╰━╯┃ 
	┃┃╱╭┫╰━╯┃┃╰╮┃┃┃╱╭┫╭━━┫╭╮╭╯ 
	┃╰━╯┃╭━╮┃┃╱┃┃┃╰━╯┃╰━━┫┃┃╰╮ 
	╰━━━┻╯╱╰┻╯╱╰━┻━━━┻━━━┻╯╰━╯`); 

	// Assign custom classes and constants here

	// Register custom system settings
	registerSettings();

	// Preload Handlebars templates
	await preloadTemplates();

	// Register sheet application classes
	Actors.unregisterSheet("core", ActorSheet);
	Actors.registerSheet("lancer", LancerActorSheet, { makeDefault: true });
});

/* ------------------------------------ */
/* Setup system							*/
/* ------------------------------------ */
Hooks.once('setup', function() {
	// Do anything after initialization but before
	// ready
});

/* ------------------------------------ */
/* When ready							*/
/* ------------------------------------ */
Hooks.once('ready', function() {
	// Do anything once the system is ready
});

// Add any additional hooks if necessary
