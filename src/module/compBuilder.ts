import { LancerLicense } from './item/lancer-item'
import { LancerSkillData,
	LancerTalentData, 
	LancerCoreBonusData,
	LancerPilotGearData,
	LancerFrameData,
	LancerMechSystemData,
	LancerMechWeaponData,
	TagData,
	LancerLicenseData} from './interfaces'
import { PilotEquipType, ItemType, DamageType } from './enums';
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

async function updateItem(pack: Compendium, newData: any, type: string, img: string): Promise<Entity> {
	newData.name = (newData.name as string).toUpperCase();
	let entry: {_id: string; name: string;} = pack.index.find(e => e.name === newData.name);

	// The item already exists in the pack, update its data.
	if (entry) {
		console.log(`LANCER | Updating ${type} ${entry.name} in compendium ${pack.collection}`);
		let e: Item = (await pack.getEntity(entry._id)) as Item;
		let d: ItemData = e.data;
		d.name = newData.name;
		d.img = img;
		d.data = newData;
		return await pack.updateEntity(d, {entity: e});
	}
	else {
		// The item doesn't exist yet, create it
		const itemData: ItemData = {
			name: newData.name,
			img: img,
			type: type,
			flags: {},
			data: newData
		};
		console.log(`LANCER | Adding ${type} ${itemData.name} to compendium ${pack.collection}`);
		// Create an Item from the item data
		return await pack.createEntity(itemData);
	}
}

async function buildSkillCompendium() {
	const skills = data.skills;
	const img = "systems/lancer/assets/icons/skill.svg";
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
	const img = "systems/lancer/assets/icons/talent.svg";
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
	const armImg = "systems/lancer/assets/icons/role_defender.svg";
	const weapImg = "systems/lancer/assets/icons/weapon.svg";
	const gearImg = "systems/lancer/assets/icons/generic_item.svg";
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

	const licImg = "systems/lancer/assets/icons/license.svg";
	const licMetaData: Object = {
		name: "licenses",
		label: "Licenses",
		system: "lancer",
		package: "lancer",
		path: "./packs/licenses.db",
		entity: "Item"
	}
	let licPack: Compendium = await findPack("licenses", licMetaData);
	licPack.locked = false;
	await licPack.getIndex();

	// Iterate through the list of core bonuses and add them each to the Compendium
	frames.forEach(async (frameRaw: any) => {
		// Remove Comp/Con-specific data
		delete frameRaw.data_type;
		delete frameRaw.aptitude;
		delete frameRaw.y_pos;
		delete frameRaw.other_art;

		// Re-type and set missing data
		let frame: LancerFrameData = frameRaw;
		frame.license = frame.name;
		frame.license_level = 2;
		frame.item_type = ItemType.Frame;
		frame.note = "";
		frame.flavor_name = "";
		frame.flavor_description = "";
		updateItem(pack, frame, "frame", img);

		// Create license data
		let license: LancerLicenseData = {
			name: frame.name,
			source: frame.source,
			rank: 1
		};
		let lItem: LancerLicense = (await updateItem(licPack, license, "license", licImg)) as LancerLicense;
		// TODO: If the frame already exists in the license, update it instead of adding another
		// Add the frame to the license
		// lItem.createEmbeddedEntity(frame.name, frame);
	});
	return Promise.resolve(); 
}

async function buildMechSystemCompendium() {
	const systems = data.systems;
	const img = "systems/lancer/assets/icons/mech_system.svg";
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

	// Find the licenses pack
	let lPack: Compendium = await game.packs.get("lancer.licenses");
	if (!lPack) {
		// System compendium doesn't exist, attempt to find a world compendium
		lPack = await game.packs.get("world.licenses");
	}
	// Make sure the index is up-to-date
	if (lPack) {
		await lPack.getIndex();
	}

	// Iterate through the list of core bonuses and add them each to the Compendium
	systems.forEach(async (systemRaw: any) => {
		// Remove Comp/Con specific data
		delete systemRaw.aptitude;
		systemRaw.system_type = systemRaw.type;
		delete systemRaw.type;

		// Re-type and set missing data
		let system: LancerMechSystemData = systemRaw;
		system.item_type = ItemType.MechSystem;
		system.note = "";
		system.flavor_name = "";
		system.flavor_description = "";
		system.destroyed = false;
		system.cascading = false;
		system.loaded = true;
		if (!system.sp) system.sp = 0;
		// Special stats for tags
		if (system.tags) {
			system.tags.forEach( (tag: TagData) => {
				if (tag.id == "tg_limited") {
					system.uses = tag.val as any;
					system.max_uses = tag.val as any;
				}
			});
		}
		else system.tags = [];
		updateItem(pack, system, "mech_system", img);

		// If the Licenses pack exists, add the system to the relevant license
		if (lPack) {
			let entry: {_id: string; name: string;} = pack.index.find(e => e.name === system.license);
			if (entry) {
				let license: LancerLicense = (await lPack.getEntity(entry._id)) as LancerLicense;
				// license.createEmbeddedEntity(system.name, system);
			}
		}
	});
	return Promise.resolve(); 
}

async function buildMechWeaponCompendium() {
	const weapons = data.weapons;
	const img = "systems/lancer/assets/icons/mech_weapon.svg";
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

	// Find the licenses pack
	let lPack: Compendium = await game.packs.get("lancer.licenses");
	if (!lPack) {
		// System compendium doesn't exist, attempt to find a world compendium
		lPack = await game.packs.get("world.licenses");
	}
	// Make sure the index is up-to-date
	if (lPack) {
		await lPack.getIndex();
	}

	// Iterate through the list of core bonuses and add them each to the Compendium
	weapons.forEach(async (weaponRaw: any) => {
		// Remove Comp/Con specific data
		delete weaponRaw.aptitude;
		weaponRaw.weapon_type = weaponRaw.type;
		delete weaponRaw.type;

		// Re-type and set missing data
		let weapon: LancerMechWeaponData = weaponRaw;
		weapon.item_type = ItemType.MechWeapon;
		weapon.note = "";
		weapon.flavor_name = "";
		weapon.flavor_description = "";
		weapon.destroyed = false;
		weapon.cascading = false;
		weapon.loaded = true;
		weapon.mod = null;
		weapon.custom_damage_type = null;
		if (!weapon.sp) weapon.sp = 0;
		// Special stats for tags
		if (weapon.tags) {
			weapon.tags.forEach( (tag: TagData) => {
				if (tag.id == "tg_set_max_uses") {
					weapon.max_use_override = 3;
				}
				else if (tag.id == "tg_limited") {
					weapon.uses = tag.val as any;
					weapon.max_uses = tag.val as any;
				}
				else if (tag.id == "tg_set_damage_type") {
					weapon.custom_damage_type = DamageType.Kinetic;
				}
			});
		}
		else weapon.tags = [];
		updateItem(pack, weapon, "mech_weapon", img);

		// If the Licenses pack exists, add the system to the relevant license
		if (lPack) {
			let entry: {_id: string; name: string;} = pack.index.find(e => e.name === weapon.license);
			if (entry) {
				let license: LancerLicense = (await lPack.getEntity(entry._id)) as LancerLicense;
				// license.createEmbeddedEntity(weapon.name, weapon);
			}
		}
	});
	return Promise.resolve(); 
}
