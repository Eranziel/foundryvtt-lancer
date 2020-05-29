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
		rollAttackMacro
	};

	// Register custom system settings
	registerSettings();

	// Preload Handlebars templates
	await preloadTemplates();

	// Register sheet application classes
	Actors.unregisterSheet("core", ActorSheet);
	Actors.registerSheet("lancer", LancerPilotSheet, { types: ["pilot"], makeDefault: true });
	Actors.registerSheet("lancer", LancerNPCSheet, { types: ["npc"], makeDefault: true });
	// Items.unregisterSheet("core", ItemSheet);
	// Items.registerSheet("lancer", LancerSkillSheet, { types: ["skill"], makeDefault: true });
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