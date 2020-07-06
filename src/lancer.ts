/**
 * TypeScript entry file for Foundry VTT.
 * Registers custom settings, sheets, and constants using the Foundry API.
 * 
 * Author: Eranziel
 * Content License: LANCER is copyright 2019, Massif Press Inc.
 * Software License: GNU GPLv3
 */

// Import TypeScript modules
import { LancerGame } from './module/lancer-game';
import { LancerActor, lancerActorInit } from './module/actor/lancer-actor';
import { LancerItem } from './module/item/lancer-item';

// Import applications
import { LancerPilotSheet } from './module/actor/pilot-sheet';
import { LancerNPCSheet } from './module/actor/npc-sheet';
import { LancerItemSheet } from './module/item/item-sheet';
import { LancerFrameSheet } from './module/item/frame-sheet';

// Import helpers
import { preloadTemplates } from './module/preloadTemplates';
import { registerSettings } from './module/settings';
import { renderCompactTag, renderChunkyTag } from './module/item/tags';
import * as migrations from './module/migration.js';

// Import JSON data
import data from 'lancer-data';

/* ------------------------------------ */
/* Initialize system                    */
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
		applications: {
			LancerPilotSheet,
			LancerNPCSheet,
			LancerItemSheet,
		},
		entities: {
			LancerActor,
			LancerItem,
    },
		rollAttackMacro: rollAttackMacro,
		migrations: migrations,
	};

	// Record Configuration Values
	CONFIG.Actor.entityClass = LancerActor;
	CONFIG.Item.entityClass = LancerItem;

	// Register custom system settings
	registerSettings();

    // Register Web Components
    customElements.define('card-clipped', class LancerClippedCard extends HTMLDivElement {}, {extends: 'div'})

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
			"mech_system", "mech_weapon", "npc_class",
			"npc_template", "npc_feature"], 
		makeDefault: true 
	});
	Items.registerSheet("lancer", LancerFrameSheet, { types: ["frame"], makeDefault: true });

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

	Handlebars.registerHelper('lower-case', function(str: string) {
		return str.toLowerCase();
	});

	Handlebars.registerHelper('upper-case', function(str: string) {
		return str.toUpperCase();
	});

    Handlebars.registerHelper('compact-tag', renderCompactTag);
    Handlebars.registerHelper('chunky-tag', renderChunkyTag);

	// mount display mount
	Handlebars.registerHelper('mount-selector', (mount, key) => {
		let template = `<select id="mount-type" class="mounts-control" data-action="update" data-item-id=${key}>
	        <option value="Main" ${mount.type === 'Main' ? 'selected' : ''}>Main Mount</option>
	        <option value="Heavy" ${mount.type === 'Heavy' ? 'selected' : ''}>Heavy Mount</option>
	        <option value="Aux-Aux" ${mount.type === 'Aux-Aux' ? 'selected' : ''}>Aux/Aux Mount</option>
	        <option value="Main-Aux" ${mount.type === 'Main-Aux' ? 'selected' : ''}>Main/Aux Mount</option>
	        <option value="Flex" ${mount.type === 'Flex' ? 'selected' : ''}>Flexible Mount</option>
	        <option value="Integrated" ${mount.type === 'Integrated' ? 'selected' : ''}>Integrated Mount</option>
        </select>`
        return template;
	});

  Handlebars.registerPartial('pilot-weapon-preview', `<div class="flexcol clipped lancer-weapon-container" style="max-height: fit-content;" data-item-id="{{key}}">
    <span class="item lancer-weapon-header" style="padding-top: 5px;" data-item-id="{{weapon._id}}"><img class="thumbnail" src="{{weapon.img}}" data-edit="{{weapon.img}}" title="{{weapon.name}}" height="10" width="10"/> {{weapon.name}} <a class="stats-control" data-action="delete"><i class="fas fa-trash" style="float: right;"></i></a></span>
    <span class="lancer-weapon-body">
     <span class="flexrow" style="grid-area: 1 / 1 / 1 / 1; text-align: left; white-space: nowrap;">{{#each weapon.data.range as |range rkey|}}<i class="cci cci-{{lower-case range.type}} i--m i--dark"></i><span class="medium">{{range.val}}</span>{{/each}}{{#each weapon.data.damage as |damage dkey|}}<i class="cci cci-{{lower-case damage.type}} i--m damage--{{damage.type}}"></i><span class="medium">{{damage.val}}</span>{{/each}}</span>
     <span style="grid-area: 1 / 2 / 1 / 3; text-align: right;">{{weapon.data.mount}} {{weapon.data.weapon_type}}</span>
     <span style="grid-area: 2 / 1 / 2 / 3; text-align: left; white-space: wrap">
     {{#with weapon.data.effect as |effect|}}
     {{#if effect.effect_type}}
       <h3>{{effect.effect_type}} Effect</h3>
       {{effect.hit}}{{/if}}
     {{#unless effect.effect_type}}{{effect}}{{/unless}}
     {{/with}}
     </span>
     <span class="flexrow" style="grid-area: 3 / 1 / 3 / 3; text-align: left; justify-content: flex-end;">
       <span class="flexrow" style="justify-content: flex-end;">{{#each weapon.data.tags as |tag tkey|}}{{{compact-tag tag}}}{{/each}}</span>
     </span>
    </div>`
  );
});

/* ------------------------------------ */
/* Setup system			            				*/
/* ------------------------------------ */
Hooks.once('setup', function() {
  // Do anything after initialization but before
  // ready
});

/* ------------------------------------ */
/* When ready                           */
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
Hooks.on("preCreateActor", lancerActorInit);


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