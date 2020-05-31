import {LancerSkill,
	LancerTalent, 
	LancerCoreBonus,
	LancerPilotArmor,
	LancerPilotWeapon,
	LancerPilotGear} from './item/lancer-item'
import {LancerSkillData,
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
	LancerPilotGearEntityData,
	LancerFrameData,
	LancerMechSystemData,
	LancerMechWeaponData} from './interfaces'
import { PilotEquipType, ItemType } from './enums';
import data from 'lancer-data'

export const convertLancerData = async function(): Promise<any> {
	await buildSkillCompendium();
	await buildTalentCompendium();
	await buildCoreBonusCompendium();
	await buildPilotEquipmentCompendiums();
	await buildFrameCompendium();
	await buildMechSystemCompendium();
	await buildMechWeaponCompendium();
	return Promise.resolve();
}

async function findPack(pack_name: string, metaData: object): Promise<Compendium> {
	let pack: Compendium;
	
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

async function updateItem(pack: Compendium, data: any, type: string, img: string): Promise<Entity> {
	let entry: {_id: string; name: string;} = pack.index.find(e => e.name === data.name);
	// The item already exists in the pack, update its data.
	if (entry) {
		console.log(`LANCER | Updating ${type} ${entry.name} in compendium ${pack.collection}`);
		let e: Item = (await pack.getEntity(entry._id)) as Item;
		let d: ItemData = e.data;
		d.data = data;
		d.img = img;
		return await pack.updateEntity(d, {entity: e});
	}
	else {
		// The skill doesn't exist yet, create it
		const itemData: LancerSkillEntityData = {
			name: data.name,
			img: img,
			type: type,
			flags: {},
			data: data
		};
		console.log(`LANCER | Adding ${type} ${itemData.name} to compendium ${pack.collection}`);
		// Create an Item from the item data
		return await pack.createEntity(itemData);
	}
}

async function buildSkillCompendium() {
	const skills = data.skills;
	const img = "systems/lancer/assets/icons/accuracy.svg";
	const metaData: Object = {
		name: "skills",
		label: "Skill Triggers",
		system: "lancer",
		package: "lancer",
		path: "./packs/skills.db",
		entity: "Item"
	}
	let pack: Compendium = await findPack("skills", metaData);
	pack.locked = false;
	await pack.getIndex();

	// Iterate through the list of skills and add them each to the Compendium
	skills.forEach(async (skill: LancerSkillData) => {
		updateItem(pack, skill, "skill", img);
	});
	return Promise.resolve(); 
}

async function buildTalentCompendium() {
	const talents = data.talents;
	const img = "systems/lancer/assets/icons/chevron_3.svg";
	const metaData: Object = {
		name: "talents",
		label: "Talents",
		system: "lancer",
		package: "lancer",
		path: "./packs/talents.db",
		entity: "Item"
	}
	let pack: Compendium = await findPack("talents", metaData);
	pack.locked = false;
	await pack.getIndex();

	// Iterate through the list of talents and add them each to the Compendium
	talents.forEach(async (talent: LancerTalentData) => {
		updateItem(pack, talent, "talent", img);
	});
	return Promise.resolve(); 
}

async function buildCoreBonusCompendium() {
	const coreBonus = data.core_bonuses;
	const img = "systems/lancer/assets/icons/corebonus.svg";
	const metaData: Object = {
		name: "core_bonuses",
		label: "Core Bonuses",
		system: "lancer",
		package: "lancer",
		path: "./packs/core_bonuses.db",
		entity: "Item"
	}
	let pack: Compendium = await findPack("core_bonuses", metaData);
	pack.locked = false;
	await pack.getIndex();

	// Iterate through the list of core bonuses and add them each to the Compendium
	coreBonus.forEach(async (cbonus: LancerCoreBonusData) => {
		updateItem(pack, cbonus, "core_bonus", img);
	});
	return Promise.resolve(); 
}

async function buildPilotEquipmentCompendiums() {
	console.log("LANCER | Building Pilot Equipment compendiums.");
	const pilotGear = data.pilot_gear;
	const armImg = "systems/lancer/assets/icons/role_tank.svg";
	const weapImg = "systems/lancer/assets/icons/weapon.svg";
	const gearImg = "systems/lancer/assets/icons/trait.svg";
	const armorMeta: Object = {
		name: "pilot_armor",
		label: "Pilot Armor",
		system: "lancer",
		package: "lancer",
		path: "./packs/pilot_armor.db",
		entity: "Item"
	}
	let paPack: Compendium = await findPack("pilot_armor", armorMeta);
	const weaponMeta: Object = {
		name: "pilot_weapons",
		label: "Pilot Weapons",
		system: "lancer",
		package: "lancer",
		path: "./packs/pilot_weapons.db",
		entity: "Item"
	}
	let pwPack: Compendium = await findPack("pilot_weapons", weaponMeta);
	const gearMeta: Object = {
		name: "pilot_gear",
		label: "Pilot Gear",
		system: "lancer",
		package: "lancer",
		path: "./packs/pilot_gear.db",
		entity: "Item"
	}
	let pgPack: Compendium = await findPack("pilot_gear", gearMeta);
	paPack.locked = false;
	pwPack.locked = false;
	pgPack.locked = false;
	await paPack.getIndex();
	await pwPack.getIndex();
	await pgPack.getIndex();

	// Iterate through the list of talents and add them each to the Compendium
	pilotGear.forEach(async (equip: any) => {
		if (equip.type === PilotEquipType.PilotArmor) {
			delete equip.type;
			equip.item_type = ItemType.PilotArmor;
			updateItem(paPack, equip, "pilot_armor", armImg);
		}
		else if (equip.type === PilotEquipType.PilotWeapon) {
			delete equip.type;
			equip.item_type = ItemType.PilotWeapon;
			updateItem(pwPack, equip, "pilot_weapon", weapImg);
		}
		else if (equip.type === PilotEquipType.PilotGear) {
			delete equip.type;
			let gear: LancerPilotGearData = equip;
			gear.item_type = ItemType.PilotGear;
			if (gear.uses) {
				gear.current_uses = gear.uses;
			}
			updateItem(pgPack, gear, "pilot_gear", gearImg);
		}
		else {
			// Error - unknown type!
			throw TypeError(`Unknown pilot equipment type: ${equip.type}.`)
		}
	});
	return Promise.resolve(); 
}

async function buildFrameCompendium() {
	const frames = data.frames;
	const img = "systems/lancer/assets/icons/frame.svg";
	const metaData: Object = {
		name: "frames",
		label: "Frames",
		system: "lancer",
		package: "lancer",
		path: "./packs/frames.db",
		entity: "Item"
	}
	let pack: Compendium = await findPack("frames", metaData);
	pack.locked = false;
	await pack.getIndex();

	// Iterate through the list of core bonuses and add them each to the Compendium
	frames.forEach(async (frame: LancerFrameData) => {
		updateItem(pack, frame, "frame", img);
	});
	return Promise.resolve(); 
}

async function buildMechSystemCompendium() {
	const systems = data.systems;
	const img = "systems/lancer/assets/icons/system.svg";
	const metaData: Object = {
		name: "systems",
		label: "Systems",
		system: "lancer",
		package: "lancer",
		path: "./packs/systems.db",
		entity: "Item"
	}
	let pack: Compendium = await findPack("systems", metaData);
	pack.locked = false;
	await pack.getIndex();

	// Iterate through the list of core bonuses and add them each to the Compendium
	systems.forEach(async (system: LancerMechSystemData) => {
		updateItem(pack, system, "mech_system", img);
	});
	return Promise.resolve(); 
}

async function buildMechWeaponCompendium() {
	const weapons = data.weapons;
	const img = "systems/lancer/assets/icons/weapon.svg";
	const metaData: Object = {
		name: "weapons",
		label: "Weapons",
		system: "lancer",
		package: "lancer",
		path: "./packs/weapons.db",
		entity: "Item"
	}
	let pack: Compendium = await findPack("weapons", metaData);
	pack.locked = false;
	await pack.getIndex();

	// Iterate through the list of core bonuses and add them each to the Compendium
	weapons.forEach(async (weapon: LancerMechWeaponData) => {
		updateItem(pack, weapon, "mech_weapon", img);
	});
	return Promise.resolve(); 
}
