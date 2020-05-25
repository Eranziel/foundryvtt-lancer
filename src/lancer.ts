/**
 * TypeScript entry file for Foundry VTT.
 * Registers custom settings, sheets, and constants using the Foundry API.
 * 
 * Author: Eranziel
 * Content License: LANCER is copyright 2019, Massif Press Inc.
 * Software License: GNU GPLv3
 */

// Import TypeScript modules
import { registerSettings } from './module/settings.js'
import { preloadTemplates } from './module/preloadTemplates.js'
import { LancerPilotSheet } from './module/pilot-sheet.js'
import { LancerGame } from './module/lancer-game.js'
import {  LancerSkill,
					LancerTalent } from './module/classes/item/lancer-item'
import {  LancerSkillData,
					LancerTalentData } from './module/classes/interfaces'

import data from 'lancer-data'

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
	Actors.registerSheet("lancer", LancerPilotSheet, { makeDefault: true });
});

/* ------------------------------------ */
/* Setup system							*/
/* ------------------------------------ */
Hooks.once('setup', function() {

});

/* ------------------------------------ */
/* When ready							*/
/* ------------------------------------ */
Hooks.once('ready', function() {
	//=== Code below must be omitted from release ====
	convertLancerData();
	//=== End omit from release ======================
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

//========================================================
// Everything below here should NOT go in release!
//========================================================

async function convertLancerData() {
	await buildSkillCompendium();
	await buildTalentCompendium();
	return Promise.resolve();
}

async function buildSkillCompendium() {
	console.log("LANCER | Building Skill Triggers compendium.");
	const skills = data.skills; 
	// Create a Compendium for skill triggers
	const metaData : Object = {
      name: "skills",
      label: "Skill Triggers",
      system: "lancer",
      path: "./packs/skills.db",
      entity: "Item"
	}
	let pack : Compendium = await Compendium.create(metaData);

	// Iterate through the list of skills and add them each to the Compendium
	for (var i=0; i<skills.length; i++) {
		let sd : LancerSkillData = {
			name: skills[i].name,
			type: "skill",
			flags: {},
			data: skills[i]
		};
		console.log(`LANCER | Adding skill ${sd.name} to compendium ${pack.collection}`);
		// Create an Item from the skill data
		let newSkill : LancerSkill = (await pack.createEntity(sd)) as LancerSkill;
		console.log(newSkill);
	}
	return Promise.resolve(); 
}

async function buildTalentCompendium() {
	console.log("LANCER | Building Talents compendium.");
	const talents = data.talents; 
	// Create a Compendium for talents
	const metaData : Object = {
      name: "talents",
      label: "Talents",
      system: "lancer",
      path: "./packs/talents.db",
      entity: "Item"
	}
	let pack : Compendium = await Compendium.create(metaData);

	// Iterate through the list of talents and add them each to the Compendium
	for (var i=0; i<talents.length; i++) {
		let td : LancerTalentData = {
			name: talents[i].name,
			type: "talent",
			flags: {},
			data: talents[i]
		};
		console.log(`LANCER | Adding talent ${td.name} to compendium ${pack.collection}`);
		// Create an Item from the talent data
		let newTalent : LancerTalent = (await pack.createEntity(td)) as LancerTalent;
		console.log(newTalent);
	}
	return Promise.resolve(); 
}
