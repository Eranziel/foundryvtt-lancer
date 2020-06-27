/**
 * TypeScript entry file for Foundry VTT.
 * Registers custom settings, sheets, and constants using the Foundry API.
 * 
 * Author: Eranziel
 * Content License: LANCER is copyright 2019, Massif Press Inc.
 * Software License: GNU GPLv3
 */

// Import TypeScript modules
import { registerSettings } from './module/settings'
import { preloadTemplates } from './module/preloadTemplates'
import { LancerPilotSheet } from './module/actor/pilot-sheet'
import { LancerGame } from './module/lancer-game'
import { LancerNPCSheet } from './module/actor/npc-sheet';
import { LancerItemSheet } from './module/item/item-sheet';

import * as migrations from './module/migration.js';

import data from 'lancer-data'

/* ------------------------------------ */
/* Initialize system				          	*/
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
	// Create a Lancer namespace within the game global
	(game as LancerGame).lancer = {
		rollAttackMacro,
    migrations: migrations,
	};

	// Register custom system settings
	registerSettings();

	// Preload Handlebars templates
	await preloadTemplates();

	// Register sheet application classes
	Actors.unregisterSheet("core", ActorSheet);
	Actors.registerSheet("lancer", LancerPilotSheet, { types: ["pilot"], makeDefault: true });
	Actors.registerSheet("lancer", LancerNPCSheet, { types: ["npc"], makeDefault: true });
	Items.unregisterSheet("core", ItemSheet);
	Items.registerSheet("lancer", LancerItemSheet, { 
		types: ["skill", "talent", "license", "core_bonus", 
			"pilot_armor", "pilot_weapon", "pilot_gear", 
			"mech_system", "mech_weapon"], 
		makeDefault: true 
	});

	// Register handlebars helpers

	// inc, for those off-by-one errors
	Handlebars.registerHelper('inc', function(value, options) {
		return parseInt(value) + 1;
	});

	// double the input
	Handlebars.registerHelper('double', function(value) {
		return parseInt(value) * 2;
	});

	// Greater-than evaluation
	Handlebars.registerHelper('gt', function(val1, val2) {
		return val1 > val2;
	});

	// Less-than evaluation
	Handlebars.registerHelper('lt', function(val1, val2) {
		return val1 < val2;
	});

	// mount display mount
	Handlebars.registerHelper('mount-selector', (mount, key) => {
		let template = `<select id="mount-type" class="mounts-control" data-action="update" data-item-id=${key}>
	        <option value="main" ${mount.type === 'main' ? 'selected' : ''}>Main Mount</option>
	        <option value="heavy" ${mount.type === 'heavy' ? 'selected' : ''}>Heavy Mount</option>
	        <option value="aux-aux" ${mount.type === 'aux-aux' ? 'selected' : ''}>Aux/Aux Mount</option>
	        <option value="main-aux" ${mount.type === 'main-aux' ? 'selected' : ''}>Main/Aux Mount</option>
	        <option value="flex" ${mount.type === 'flex' ? 'selected' : ''}>Flexible Mount</option>
	        <option value="integrated" ${mount.type === 'integrated' ? 'selected' : ''}>Integrated Mount</option>
        </select>`
        return template;
	});
});

/* ------------------------------------ */
/* Setup system			            				*/
/* ------------------------------------ */
Hooks.once('setup', function() {
	// Do anything after initialization but before
	// ready
});

/* ------------------------------------ */
/* When ready					              		*/
/* ------------------------------------ */
Hooks.once('ready', function() {

  // Determine whether a system migration is required and feasible
	const currentVersion = game.settings.get("lancer", "systemMigrationVersion");
	// TODO: implement/import version comparison for semantic version numbers
  // const NEEDS_MIGRATION_VERSION = "0.0.4";
  // const COMPATIBLE_MIGRATION_VERSION = "0.0.4";
  // let needMigration = (currentVersion < NEEDS_MIGRATION_VERSION) || (currentVersion === null);

	// Perform the migration
	// TODO: replace game.system.version with needMigration once version number checking is implemented
  if ( currentVersion != game.system.data.version && game.user.isGM ) {
    // if ( currentVersion && (currentVersion < COMPATIBLE_MIGRATION_VERSION) ) {
    //   ui.notifications.error(`Your LANCER system data is from too old a Foundry version and cannot be reliably migrated to the latest version. The process will be attempted, but errors may occur.`, {permanent: true});
    // }
		migrations.migrateWorld();
  }

});

// Add any additional hooks if necessary



async function rollAttackMacro(title:string, grit:number, accuracy:number, damage:string, effect?:string) {
	// Determine which Actor to speak as
	const speaker = ChatMessage.getSpeaker();
	let actor: Actor;
	if (speaker.token) actor = game.actors.tokens[speaker.token].actor;
	if (!actor) actor = game.actors.get(speaker.actor, {strict : false}) as Actor;

	// Do the rolling
	let acc_str = "";
	if (accuracy > 0) acc_str = ` + ${accuracy}d6kh1`
	if (accuracy < 0) acc_str = ` - ${accuracy}d6kh1`
	let attack_roll = new Roll(`1d20+${grit}${acc_str}`).roll();
	let damage_roll = new Roll(damage).roll();

	// Output
	const attack_tt = await attack_roll.getTooltip();
	const damage_tt = await damage_roll.getTooltip();
	const templateData = {
		title: title,
		attack: attack_roll,
		attack_tooltip: attack_tt,
		damage: damage_roll,
		damage_tooltip: damage_tt,
		effect: effect ? effect : null
	};
	const template = `systems/lancer/templates/chat/attack-card.html`
	const html = await renderTemplate(template, templateData)
	let chat_data = {
		user: game.user,
		type: CONST.CHAT_MESSAGE_TYPES.IC,
		speaker: {
			actor: actor
		},
		content: html
	};
	let cm = await ChatMessage.create(chat_data);
	cm.render();
}