import JSZip, { JSZipObject } from "jszip";
import * as lancerData from "./typed-lancerdata";
import {
  AnyPackedNpcFeatureData,
  IContentPack,
  IContentPackManifest,
  PackedBondData,
  PackedCoreBonusData,
  PackedFrameData,
  PackedMechSystemData,
  PackedMechWeaponData,
  PackedNpcClassData,
  PackedNpcTemplateData,
  PackedPilotEquipmentData,
  PackedSkillData,
  PackedTagTemplateData,
  PackedStatusData,
  PackedTalentData,
  PackedWeaponModData,
  PackedReserveData,
} from "./unpacking/packed-types";

export const CORE_BREW_ID = "core";

function isValidManifest(obj: any): obj is IContentPackManifest {
  return (
    typeof obj == "object" &&
    "name" in obj &&
    typeof obj.name === "string" &&
    "author" in obj &&
    typeof obj.author === "string" &&
    "version" in obj &&
    typeof obj.version === "string"
  );
}

async function readZipJSON<T>(zip: JSZip, filename: string): Promise<T | null> {
  const file: JSZipObject | null = zip.file(filename);
  if (!file) return null;
  const text = await file.async("text");
  return JSON.parse(text);
}

async function getPackID(manifest: IContentPackManifest): Promise<string> {
  return `${manifest.author}/${manifest.name}`;
}

async function getZipData<T>(zip: JSZip, filename: string): Promise<T[]> {
  let readResult: T[] | null;
  try {
    readResult = await readZipJSON<T[]>(zip, filename);
  } catch (e) {
    console.error(`Error reading file ${filename} from package, skipping. Error follows:`);
    console.trace(e);
    readResult = null;
  }
  return readResult || [];
}

export async function parseContentPack(binString: ArrayBuffer | string): Promise<IContentPack> {
  const zip = await JSZip.loadAsync(binString);

  const manifest = await readZipJSON<IContentPackManifest>(zip, "lcp_manifest.json");
  if (!manifest) throw new Error("Content pack has no manifest");
  if (!isValidManifest(manifest)) throw new Error("Content manifest is invalid");

  const generateItemID = (type: string, name: string): string => {
    const sanitizedName = name
      .replace(/[ \/-]/g, "_")
      .replace(/[^A-Za-z0-9_]/g, "")
      .toLowerCase();
    if (manifest.item_prefix) {
      // return `${manifest.item_prefix}__${type}_${sanitizedName}`;
      // return `${manifest.item_prefix}__${sanitizedName}`;
    }
    return sanitizedName;
    // return `${type}_${sanitizedName}`;
  };

  function generateIDs<T extends { id: string; name: string }>(data: T[], dataPrefix?: string): T[] {
    if (dataPrefix) {
      for (let d of data) {
        d.id = d.id || generateItemID(dataPrefix, d.name);
      }
    }
    return data;
  }

  // const manufacturers = await getZipData<PackedManufacturerData>(zip, "manufacturers.json");
  // const factions = await getZipData<PackedFactionData>(zip, "factions.json");
  const coreBonuses = generateIDs(await getZipData<PackedCoreBonusData>(zip, "core_bonuses.json"), "cb");
  const frames = generateIDs(await getZipData<PackedFrameData>(zip, "frames.json"), "mf");
  const weapons = generateIDs(await getZipData<PackedMechWeaponData>(zip, "weapons.json"), "mw");
  const systems = generateIDs(await getZipData<PackedMechSystemData>(zip, "systems.json"), "ms");
  const mods = generateIDs(await getZipData<PackedWeaponModData>(zip, "mods.json"), "wm");
  const pilotGear = generateIDs(await getZipData<PackedPilotEquipmentData>(zip, "pilot_gear.json"), "pg");
  const skills = generateIDs(await getZipData<PackedSkillData>(zip, "skills.json"), "sk");
  const talents = generateIDs(await getZipData<PackedTalentData>(zip, "talents.json"), "t");
  const bonds = generateIDs(await getZipData<PackedBondData>(zip, "bonds.json"), "bond");
  const reserves = generateIDs(await getZipData<PackedReserveData>(zip, "reserve.json"), "res");
  const tags = generateIDs(await getZipData<PackedTagTemplateData>(zip, "tags.json"), "tg");
  const statuses = generateIDs(
    (await getZipData<PackedStatusData>(zip, "statuses.json")).map(status => ({
      id: status.name.toLowerCase(),
      ...status,
    })),
    ""
  );

  const npcClasses = (await readZipJSON<PackedNpcClassData[]>(zip, "npc_classes.json")) || [];
  const npcFeatures = (await readZipJSON<AnyPackedNpcFeatureData[]>(zip, "npc_features.json")) || [];
  const npcTemplates = (await readZipJSON<PackedNpcTemplateData[]>(zip, "npc_templates.json")) || [];

  const id = await getPackID(manifest);

  return {
    id,
    active: false,
    manifest,
    data: {
      // manufacturers,
      // factions,
      coreBonuses,
      frames,
      weapons,
      systems,
      mods,
      pilotGear,
      skills,
      talents,
      bonds,
      reserves,
      tags,
      statuses,
      npcClasses,
      npcFeatures,
      npcTemplates,
    },
  };
}

// So we don't have to treat it separately
export function getBaseContentPack(): IContentPack {
  // lancerData.
  return {
    active: true,
    id: CORE_BREW_ID,
    manifest: {
      author: "Massif Press",
      item_prefix: "", // Don't want one
      name: "Lancer Core Book Data",
      version: "1.X",
    },
    data: {
      // yeet all of the unresolved items
      coreBonuses: lancerData.core_bonuses.filter(m => m.id != "missing_corebonus"),
      // factions: lancerData.factions,
      frames: lancerData.frames.filter(m => m.id != "missing_frame"),
      // manufacturers: lancerData.manufacturers,
      mods: lancerData.mods.filter(m => m.id != "missing_weaponmod"),
      npcClasses: lancerData.npc_classes,
      npcFeatures: lancerData.npc_features,
      npcTemplates: lancerData.npc_templates,
      pilotGear: lancerData.pilot_gear.filter(
        m => !["missing_pilotweapon", "missing_pilotarmor", "missing_pilotgear"].includes(m.id)
      ),
      systems: lancerData.systems.filter(m => m.id != "missing_mechsystem"),
      tags: lancerData.tags,
      talents: lancerData.talents.filter(m => m.id != "missing_frame"),
      weapons: lancerData.weapons.filter(m => m.id != "missing_mechweapon"),

      environments: lancerData.environments,
      reserves: lancerData.reserves,
      sitreps: lancerData.sitreps,
      skills: lancerData.skills,
      statuses: lancerData.statuses,
    },
  };
}
