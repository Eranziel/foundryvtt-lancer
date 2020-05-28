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
					LancerTalent, 
					LancerCoreBonus,
					LancerPilotArmor,
					LancerPilotWeapon,
					LancerPilotGear} from './module/classes/item/lancer-item'
import {  LancerSkillData,
					LancerTalentData, 
					LancerCoreBonusData,
					LancerPilotGearData,
					LancerPilotEquipmentData,
					LancerPilotArmorData,
					LancerSkillEntityData,
					LancerTalentEntityData,
					LancerCoreBonusEntityData,
					LancerPilotArmorEntityData,
					LancerPilotWeaponData,
					LancerPilotWeaponEntityData,
					LancerPilotGearEntityData} from './module/classes/interfaces'

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
	await buildCoreBonusCompendium();
	await buildPilotEquipmentCompendiums();
	return Promise.resolve();
}

async function findPack(pack_name : string, metaData: object): Promise<Compendium> {
	let pack : Compendium;
	
	// Find existing system compendium
	pack = game.packs.get(`lancer.${pack_name}`);
	if (!pack) {
		// System compendium doesn't exist, attempt to find a world compendium
		pack = game.packs.get(`world.${pack_name}`);
		}
	if (pack) {
		console.log(`LANCER | Updating existing compendium: ${pack.collection}.`);
		pack.locked = false;
	}
	else {
		// Compendium doesn't exist yet. Create a new one.
		pack = await Compendium.create(metaData);
		console.log(`LANCER | Building new compendium: ${pack.collection}.`);
	}

	return pack;
}

async function buildSkillCompendium() {
	const skills = data.skills;
	const metaData : Object = {
		name: "skills",
		label: "Skill Triggers",
		system: "lancer",
		package: "lancer",
		path: "./packs/skills.db",
		entity: "Item"
	}
	let pack : Compendium = await findPack("skills", metaData);
	await pack.getIndex();

	// Iterate through the list of skills and add them each to the Compendium
	skills.forEach(async (skill : LancerSkillData) => {
		let entry : any = pack.index.find(e => e.name === skill.name);
		// The skill already exists in the pack, update its data.
		if (entry) {
			console.log(`LANCER | Updating skill ${entry.name} in compendium ${pack.collection}`)
			pack.getEntity(entry._id).then(
				async (e : LancerSkill) => e.data.data = skill);
		}
		else {
			// The skill doesn't exist yet, create it
			const sd : LancerSkillEntityData = {
				name: skill.name,
				type: "skill",
				flags: {},
				data: skill
			};
			console.log(`LANCER | Adding skill ${sd.name} to compendium ${pack.collection}`);
			// Create an Item from the skill data
			let newSkill : LancerSkill = (await pack.createEntity(sd)) as LancerSkill;
			// console.log(newSkill);
		}
	});
	pack.locked = true;
	return Promise.resolve(); 
}

async function buildTalentCompendium() {
	const talents = data.talents;
	const metaData : Object = {
		name: "talents",
		label: "Talents",
		system: "lancer",
		package: "lancer",
		path: "./packs/talents.db",
		entity: "Item"
	}
	let pack : Compendium = await findPack("talents", metaData);
	await pack.getIndex();

	// Iterate through the list of talents and add them each to the Compendium
	talents.forEach(async (talent : LancerTalentData) => {
		let entry : any = pack.index.find(e => e.name === talent.name);
		// The skill already exists in the pack, update its data.
		if (entry) {
			console.log(`LANCER | Updating talent ${entry.name} in compendium ${pack.collection}`)
			pack.getEntity(entry._id).then(
				async (e : LancerTalent) => e.data.data = talent);
		}
		else {
			// The talent doesn't exist yet, create it
			const td : LancerTalentEntityData = {
				name: talent.name,
				type: "talent",
				flags: {},
				data: talent
			};
			console.log(`LANCER | Adding talent ${td.name} to compendium ${pack.collection}`);
			// Create an Item from the talent data
			let newTalent : LancerTalent = (await pack.createEntity(td)) as LancerTalent;
			// console.log(newTalent);
		}
	});
	pack.locked = true;
	return Promise.resolve(); 
}

async function buildCoreBonusCompendium() {
	const coreBonus = data.core_bonuses;
	const metaData : Object = {
		name: "core_bonuses",
		label: "Core Bonuses",
		system: "lancer",
		package: "lancer",
		path: "./packs/core_bonuses.db",
		entity: "Item"
	}
	let pack : Compendium = await findPack("core_bonuses", metaData);
	await pack.getIndex();

	// Iterate through the list of core bonuses and add them each to the Compendium
	coreBonus.forEach(async (cbonus : LancerCoreBonusData) => {
		let entry : any = pack.index.find(e => e.name === cbonus.name);
		// The core bonus already exists in the pack, update its data.
		if (entry) {
			console.log(`LANCER | Updating core bonus ${entry.name} in compendium ${pack.collection}`)
			pack.getEntity(entry._id).then(
				async (e : LancerCoreBonus) => e.data.data = cbonus);
		}
		else {
			// The core bonus doesn't exist yet, create it
			const cb : LancerCoreBonusEntityData = {
				name: cbonus.name,
				type: "core_bonus",
				flags: {},
				data: cbonus
			};
			console.log(`LANCER | Adding core bonus ${cb.name} to compendium ${pack.collection}`);
			// Create an Item from the talent data
			let newCoreBonus : LancerCoreBonus = (await pack.createEntity(cb)) as LancerCoreBonus;
			// console.log(newCoreBonus);
		}
	});
	pack.locked = true;
	return Promise.resolve(); 
}
