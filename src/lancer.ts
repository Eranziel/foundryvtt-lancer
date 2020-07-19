/**
 * TypeScript entry file for Foundry VTT.
 * Registers custom settings, sheets, and constants using the Foundry API.
 * 
 * Author: Eranziel
 * Content License: LANCER is copyright 2019, Massif Press Inc.
 * Software License: GNU GPLv3
 */

// Import TypeScript modules
import { LANCER } from './module/config';
const lp = LANCER.log_prefix;
import { LancerGame } from './module/lancer-game';
import { LancerActor, lancerActorInit } from './module/actor/lancer-actor';
import { LancerItem, LancerNPCFeature, LancerMechWeapon, LancerPilotWeapon } from './module/item/lancer-item';
import { DamageData, LancerPilotActorData, LancerNPCActorData, TagDataShort } from './module/interfaces';

// Import applications
import { LancerPilotSheet } from './module/actor/pilot-sheet';
import { LancerNPCSheet } from './module/actor/npc-sheet';
import { LancerDeployableSheet } from './module/actor/deployable-sheet';
import { LancerItemSheet } from './module/item/item-sheet';
import { LancerFrameSheet } from './module/item/frame-sheet';

// Import helpers
import { preloadTemplates } from './module/preloadTemplates';
import { registerSettings } from './module/settings';
import { renderCompactTag, renderChunkyTag, renderFullTag } from './module/item/tags';
import * as migrations from './module/migration.js';

// Import JSON data
import data from 'lancer-data';

/* ------------------------------------ */
/* Initialize system                    */
/* ------------------------------------ */
Hooks.once('init', async function() {
	console.log(`Initializing LANCER RPG System ${LANCER.ASCII}`); 

	// Assign custom classes and constants here
	// Create a Lancer namespace within the game global
	(game as LancerGame).lancer = {
		applications: {
			LancerPilotSheet,
			LancerNPCSheet,
			LancerDeployableSheet,
			LancerItemSheet,
		},
		entities: {
			LancerActor,
			LancerItem,
		},
		rollStatMacro: rollStatMacro,
		rollAttackMacro: rollAttackMacro,
    rollTriggerMacro: rollTriggerMacro,
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
	Actors.registerSheet("lancer", LancerDeployableSheet, { types: ["deployable"], makeDefault: true });
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
	Handlebars.registerHelper('full-tag', renderFullTag);

	Handlebars.registerHelper('tier-selector', (tier, key) => {
		let template = `<select id="tier-type" class="tier-control" data-action="update">
		<option value="npc-tier-1" ${tier === 'npc-tier-1' ? 'selected' : ''}>TIER 1</option>
		<option value="npc-tier-2" ${tier === 'npc-tier-2' ? 'selected' : ''}>TIER 2</option>
		<option value="npc-tier-3" ${tier === 'npc-tier-3' ? 'selected' : ''}>TIER 3</option>
		<option value="npc-tier-custom" ${tier === 'npc-tier-custom' ? 'selected' : ''}>CUSTOM</option>
	</select>`
	return template;
	});
	
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

  Handlebars.registerPartial('mech-weapon-preview', `<div class="flexcol clipped lancer-weapon-container weapon" style="max-height: fit-content;" data-item-id="{{key}}">
    <span class="item lancer-weapon-header" style="padding-top: 5px;" data-item-id="{{weapon._id}}"><img class="thumbnail" src="{{weapon.img}}" data-edit="{{weapon.img}}" title="{{weapon.name}}" height="10" width="10"/> {{weapon.name}} <a class="stats-control" data-action="delete"><i class="fas fa-trash" style="float: right;"></i></a></span>
    <span class="lancer-weapon-body">
     <span class="flexrow" style="grid-area: 1 / 1 / 1 / 1; text-align: left; white-space: nowrap;"><a class="flexrow roll-attack" style="max-width: min-content;"><i class="fas fa-dice-d20 i--sm i--dark"></i></a>{{#each weapon.data.range as |range rkey|}}<i class="cci cci-{{lower-case range.type}} i--m i--dark"></i><span class="medium">{{range.val}}</span>{{/each}}{{#each weapon.data.damage as |damage dkey|}}<i class="cci cci-{{lower-case damage.type}} i--m damage--{{damage.type}}"></i><span class="medium">{{damage.val}}</span>{{/each}}</span>
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
  
	/*
	* Repeat given markup with given times
	* provides @index for the repeated iteraction
	*/
	Handlebars.registerHelper("repeat", function (times, opts) {
	    var out = "";
	    var i;
	    var data = {};

	    if ( times ) {
	        for ( i = 0; i < times; i += 1 ) {
	            data["index"] = i;
	            out += opts.fn(this, {
	                data: data
	            });
	        }
	    } else {

	        out = opts.inverse(this);
	    }

	    return out;
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

function getMacroSpeaker(): Actor | null {
	// Determine which Actor to speak as
	const speaker = ChatMessage.getSpeaker();
	console.log(`${lp} Macro speaker`, speaker);
	let actor: Actor;
	// console.log(game.actors.tokens);
	try {
		if (speaker.token) actor = game.actors.tokens[speaker.token].actor;
	} catch (TypeError) {
		// Need anything here?
	}
	if (!actor) actor = game.actors.get(speaker.actor, {strict : false}) as Actor;
	if (!actor) {
		ui.notifications.warn(`Failed to find Actor for macro. Do you need to select a token?`);
		return null;
	}
	return actor;
}

async function renderMacro(actor: Actor, template: string, templateData: any) {
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
	return Promise.resolve();
}

async function rollTriggerMacro(title: string, modifier: number, sheetMacro: boolean = false) {
  let actor: Actor = getMacroSpeaker();
  if (actor === null) return;
  console.log(`${lp} rollTriggerMacro actor`, actor);

  // Get accuracy/difficulty with a prompt
  let acc: number = 0;
  await promptAccDiffModifier().then(resolve => acc = resolve, reject => console.error(reject));

  // Do the roll
  let acc_str = acc != 0 ? ` + ${acc}d6kh1` : '';
  let roll = new Roll(`1d20+${modifier}${acc_str}`).roll();

  const roll_tt = await roll.getTooltip();

  // Construct the template
  const templateData = {
    title: title,
    roll: roll,
    roll_tooltip: roll_tt,
    effect: null
  };

  const template = `systems/lancer/templates/chat/stat-roll-card.html`
  return renderMacro(actor, template, templateData);
}

async function rollStatMacro(title: string, statKey: string, effect?: string, sheetMacro: boolean = false) {
	// Determine which Actor to speak as
	let actor: Actor = getMacroSpeaker();
	if (actor === null) return;
	console.log(`${lp} rollStatMacro actor`, actor);

	let bonus: any;
	const statPath = statKey.split(".");
	// Macros rolled directly from the sheet provide a stat key referenced from actor.data
	if (sheetMacro) {
		bonus = actor.data;
		// bonus = actor[`data.${statKey}`];
		// console.log(`${lp} actor.data`, actor['data']['data']);
	}
	else {
		bonus = actor;
	}
	for (let i = 0; i < statPath.length; i++) {
		const p = statPath[i];
		bonus = bonus[`${p}`];
	}
	console.log(`${lp} rollStatMacro `, statKey, bonus);

  // Get accuracy/difficulty with a prompt
  let acc: number = 0;
  await promptAccDiffModifier().then(resolve => acc = resolve, reject => console.error(reject));

	// Do the roll
	let acc_str = acc != 0 ? ` + ${acc}d6kh1` : '';
	let roll = new Roll(`1d20+${bonus}${acc_str}`).roll();

	const roll_tt = await roll.getTooltip();

	// Construct the template
	const templateData = {
		title: title,
		roll: roll,
		roll_tooltip: roll_tt,
		effect: effect ? effect : null
	};
	const template = `systems/lancer/templates/chat/stat-roll-card.html`
	return renderMacro(actor, template, templateData);
}

async function rollAttackMacro(w: string, a: string) {
  // Determine which Actor to speak as
  let actor: Actor = getMacroSpeaker();
  if (actor === null) return;

  // Get the item
  const item: Item = game.actors.get(a).getOwnedItem(w);
  console.log(`${lp} Rolling attack macro`, item, w, a);
  if (!item.isOwned) {
    ui.notifications.error(`Error rolling attack macro - ${item.name} is not owned by an Actor!`);
    return Promise.resolve();
  }

  let title: string = item.name;
  let grit: number;
  let damage: DamageData[];
  let effect: string;
  let tags: TagDataShort[];
  if (item.type === "mech_weapon") {
    grit = (item.actor.data as LancerPilotActorData).data.pilot.grit;
    damage = item.data.data.damage;
    tags = item.data.data.tags;
    effect = item.data.data.effect;
  }
  else if (item.type === "pilot_weapon") {
    grit = (item.actor.data as LancerPilotActorData).data.pilot.grit;
    damage = item.data.data.damage;
    tags = item.data.data.tags;
    effect = item.data.data.effect;
  }
  // TODO
  // else if (item.type === "npc_feature") {
  //   grit = (item as LancerNPCFeature).data.accuracy[(item.actor.data as LancerNPCActorData).data.tier];
  // }
  else {
    ui.notifications.error(`Error rolling attack macro - ${item.name} is not a weapon!`);
    return Promise.resolve();
  }
  console.log(`${lp} Attack Macro Item:`, item, grit, damage);

  // Get accuracy/difficulty with a prompt
  let acc: number = 0;
  await promptAccDiffModifier().then(resolve => acc = resolve, reject => console.error(reject));

  // Do the attack rolling
  let acc_str = acc != 0 ? ` + ${acc}d6kh1` : '';
  let attack_roll = new Roll(`1d20+${grit}${acc_str}`).roll();

  // Iterate through damage types, rolling each
  let damage_results = [];
  damage.forEach(async x => {
    const droll = new Roll(x.val.toString()).roll();
    const tt = await droll.getTooltip();
    damage_results.push({
      roll: droll,
      tt: tt,
      dtype: x.type,
    });
    return Promise.resolve();
  });

  // Output
	const attack_tt = await attack_roll.getTooltip();
  const templateData = {
    title: title,
    attack: attack_roll,
    attack_tooltip: attack_tt,
    damages: damage_results,
    effect: effect ? effect : null,
    tags: tags
  };

  const template = `systems/lancer/templates/chat/attack-card.html`;
  return renderMacro(actor, template, templateData);
}

function promptAccDiffModifier() {
  let template = `
<form>
  <h2>Please enter your modifiers and submit, or close this window:</h2>
  <div class="flexcol">
    <label style="max-width: fit-content;">
      <i class="cci cci-accuracy i--m i--dark" style="vertical-align:middle;border:none"> </i> Accuracy:
      <input class="accuracy" type="number" min="0" value="0">
    </label>
    <label style="max-width: fit-content;">
      <i class="cci cci-difficulty i--m i--dark" style="vertical-align:middle;border:none"> </i> Difficulty:
      <input class="difficulty" type="number" min="0" value="0">
    </div>
</form>`
  return new Promise<number>((resolve, reject) => {
    new Dialog({
      title: "Accuracy and Difficulty",
      content: template,
      buttons: {
        submit: {
          icon: '<i class="fas fa-check"></i>',
          label: 'Submit',
          callback: async (dlg) => {
            let accuracy = <string>$(dlg).find('.accuracy').first().val();
            let difficulty = <string>$(dlg).find('.difficulty').first().val();
            let total = parseInt(accuracy) - parseInt(difficulty);
            console.log(`${lp} Dialog returned ${accuracy} accuracy and ${difficulty} resulting in a modifier of ${total}d6`);
            resolve(total);
          }
        }
      },
      default: "submit",
      close: () => resolve(0)
    }).render(true);
  });
}