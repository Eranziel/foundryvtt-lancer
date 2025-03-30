import JSZip, { JSZipObject } from "jszip";
import { LANCER } from "../config";
import { LCPIndex } from "../apps/lcp-manager/lcp-manager";
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
  PackedActionData,
  PackedSitrepData,
  PackedEnvironmentData,
} from "./unpacking/packed-types";
import { EntryType, EntryTypeLidPrefix } from "../enums";

export const CORE_BREW_ID = "core";

/**
 * Type for Lancer data provided by npm packages. This includes the original lancer-data as
 * well as all of the content packs since - Long Rim, Wallflower, KTB, etc.
 */
export type NpmLancerData = {
  // Only lancer-data includes info, the rest use lcp_manifest instead
  info?: {
    name: string;
    author: string;
    version: string;
    description: string;
    website: string;
    active: true;
  };
  // lancer-data doesn't include a manifest, has info instead
  lcp_manifest?: IContentPackManifest;
  glossary?: {
    name: string;
    description: string; // v-html
  }[];
  actions?: PackedActionData[];
  // backgrounds?: PackedBackground[];
  bonds?: PackedBondData[];
  core_bonuses?: PackedCoreBonusData[];
  environments?: PackedEnvironmentData[];
  // factions?: PackedFactionData[];
  frames?: PackedFrameData[];
  // manufacturers?: PackedManufacturerData[];
  mods?: PackedWeaponModData[];
  npc_classes?: PackedNpcClassData[];
  npc_features?: AnyPackedNpcFeatureData[];
  npc_templates?: PackedNpcTemplateData[];
  pilot_gear?: PackedPilotEquipmentData[];
  reserves?: PackedReserveData[];
  sitreps?: PackedSitrepData[];
  skills?: PackedSkillData[];
  statuses?: PackedStatusData[];
  systems?: PackedMechSystemData[];
  tags?: PackedTagTemplateData[];
  talents?: PackedTalentData[];
  weapons?: PackedMechWeaponData[];
  // rules?: Rules[];
};

/**
 * Data regarding an LCP, suitable for use in the LCP Manager app.
 */
export type LCPData = {
  id: string;
  title: string;
  author: string;
  url?: string;
  currentVersion: string;
  availableVersion: string;
  cp?: IContentPack;
};

/**
 * Summary of an LCP's contents, for use in the LCP Manager app.
 */
export type ContentSummary = IContentPackManifest & {
  aggregate?: boolean;
  item_prefix: string;
  bonds: number;
  skills: number;
  talents: number;
  reserves: number;
  gear: number;
  frames: number;
  systems: number;
  weapons: number;
  mods: number;
  npc_classes: number;
  npc_templates: number;
  npc_features: number;
};

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

export function generateLcpSummary(cp: any): ContentSummary {
  const data: IContentPack["data"] = cp.data ? cp.data : cp;
  return {
    ...cp.manifest,
    item_prefix: "",
    bonds: data.bonds?.length ?? 0,
    skills: data.skills?.length ?? 0,
    talents: data.talents?.length ?? 0,
    reserves: data.reserves?.length ?? 0,
    gear: data.pilotGear?.length ?? 0,
    frames: data.frames?.length ?? 0,
    systems: data.systems?.length ?? 0,
    weapons: data.weapons?.length ?? 0,
    mods: data.mods?.length ?? 0,
    npc_classes: data.npcClasses?.length ?? 0,
    npc_templates: data.npcTemplates?.length ?? 0,
    npc_features: data.npcFeatures?.length ?? 0,
  };
}

export function generateMultiLcpSummary(manifest: IContentPackManifest, cps: IContentPack[]): ContentSummary {
  return cps.reduce(
    (acc, lcp) => {
      if (!lcp.data) return acc;
      acc.bonds += lcp.data.bonds?.length ?? 0;
      acc.skills += lcp.data.skills?.length ?? 0;
      acc.talents += lcp.data.talents?.length ?? 0;
      acc.reserves += lcp.data.reserves?.length ?? 0;
      acc.gear += lcp.data.pilotGear?.length ?? 0;
      acc.frames += lcp.data.frames?.length ?? 0;
      acc.systems += lcp.data.systems?.length ?? 0;
      acc.weapons += lcp.data.weapons?.length ?? 0;
      acc.mods += lcp.data.mods?.length ?? 0;
      acc.npc_classes += lcp.data.npcClasses?.length ?? 0;
      acc.npc_templates += lcp.data.npcTemplates?.length ?? 0;
      acc.npc_features += lcp.data.npcFeatures?.length ?? 0;
      return acc;
    },
    {
      ...manifest,
      bonds: 0,
      skills: 0,
      talents: 0,
      reserves: 0,
      gear: 0,
      frames: 0,
      systems: 0,
      weapons: 0,
      mods: 0,
      npc_classes: 0,
      npc_templates: 0,
      npc_features: 0,
    } as ContentSummary
  );
}

// Get the version from the npm package
function getPackageVersion(manifest: IContentPackManifest) {
  return manifest.version;
}

// Get the title from the LCP manifest
function getTitle(manifest: IContentPackManifest) {
  return manifest.name;
}

// Get the author from the LCP manifest
function getAuthor(manifest: IContentPackManifest) {
  return manifest.author;
}

// Find the installed version in the LCP index
function getInstalledVersion(manifest: IContentPackManifest, lcpIndex: LCPIndex) {
  return lcpIndex.index?.find(m => m.name === manifest.name)?.version || "--";
}

// Get the URL from the LCP manifest
function getUrl(manifest: IContentPackManifest) {
  return manifest.website || "";
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

export function generateItemID(type: string, name: string, manifest?: IContentPackManifest): string {
  const sanitizedName = name
    .replace(/[ \/-]/g, "_")
    .replace(/[^A-Za-z0-9_]/g, "")
    .toLowerCase();
  if (manifest?.item_prefix) {
    return `${manifest.item_prefix}__${type}_${sanitizedName}`;
  }
  return `${type}__${sanitizedName}`;
}

export async function parseContentPack(binString: ArrayBuffer | string): Promise<IContentPack> {
  const zip = await JSZip.loadAsync(binString);

  const manifest = await readZipJSON<IContentPackManifest>(zip, "lcp_manifest.json");
  if (!manifest) throw new Error("Content pack has no manifest");
  if (!isValidManifest(manifest)) throw new Error("Content manifest is invalid");

  function generateIDs<T extends { id: string; name: string }>(data: T[], dataPrefix?: string): T[] {
    if (dataPrefix) {
      for (let d of data) {
        d.id = d.id || generateItemID(dataPrefix, d.name);
      }
    }
    return data;
  }

  const coreBonuses = generateIDs(
    await getZipData<PackedCoreBonusData>(zip, "core_bonuses.json"),
    EntryTypeLidPrefix(EntryType.CORE_BONUS)
  );
  const frames = generateIDs(
    await getZipData<PackedFrameData>(zip, "frames.json"),
    EntryTypeLidPrefix(EntryType.FRAME)
  );
  const weapons = generateIDs(
    await getZipData<PackedMechWeaponData>(zip, "weapons.json"),
    EntryTypeLidPrefix(EntryType.MECH_WEAPON)
  );
  const systems = generateIDs(
    await getZipData<PackedMechSystemData>(zip, "systems.json"),
    EntryTypeLidPrefix(EntryType.MECH_SYSTEM)
  );
  const mods = generateIDs(
    await getZipData<PackedWeaponModData>(zip, "mods.json"),
    EntryTypeLidPrefix(EntryType.WEAPON_MOD)
  );
  const pilotGear = generateIDs(
    await getZipData<PackedPilotEquipmentData>(zip, "pilot_gear.json"),
    EntryTypeLidPrefix(EntryType.PILOT_GEAR)
  );
  const skills = generateIDs(
    await getZipData<PackedSkillData>(zip, "skills.json"),
    EntryTypeLidPrefix(EntryType.SKILL)
  );
  const talents = generateIDs(
    await getZipData<PackedTalentData>(zip, "talents.json"),
    EntryTypeLidPrefix(EntryType.TALENT)
  );
  const bonds = generateIDs(await getZipData<PackedBondData>(zip, "bonds.json"), EntryTypeLidPrefix(EntryType.BOND));
  const reserves = generateIDs(
    await getZipData<PackedReserveData>(zip, "reserves.json"),
    EntryTypeLidPrefix(EntryType.RESERVE)
  );
  const tags = generateIDs(await getZipData<PackedTagTemplateData>(zip, "tags.json"), "tg_");
  const statuses = generateIDs(
    (await getZipData<PackedStatusData>(zip, "statuses.json")).map(status => ({
      id: status.name.toLowerCase(),
      ...status,
    })),
    EntryTypeLidPrefix(EntryType.STATUS)
  );

  const npcClasses = generateIDs(
    (await readZipJSON<PackedNpcClassData[]>(zip, "npc_classes.json")) || [],
    EntryTypeLidPrefix(EntryType.NPC_CLASS)
  );
  const npcFeatures = generateIDs(
    (await readZipJSON<AnyPackedNpcFeatureData[]>(zip, "npc_features.json")) || [],
    EntryTypeLidPrefix(EntryType.NPC_FEATURE)
  );
  const npcTemplates = generateIDs(
    (await readZipJSON<PackedNpcTemplateData[]>(zip, "npc_templates.json")) || [],
    EntryTypeLidPrefix(EntryType.NPC_TEMPLATE)
  );

  const id = await getPackID(manifest);

  return {
    id,
    active: false,
    manifest,
    data: {
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

/**
 * The key names that we expect in an IContentPack are slightly different than what we get from
 * the npm packages. This function converts the npm package keys to the format we expect.
 * It also removes any placeholder items (IDs starting with "missing_"), which Comp/Con uses for missing items.
 * @param data The data from the npm package
 * @param id An id string for the content pack
 * @param manifest Optional manifest to use as a fallback if the npm package doesn't have one. Necessary
 *   for the core book data, i.e. lancer-data.
 * @returns Content pack object suitable for use in the LCP Manager app.
 */
function convertNpmDataToContentPack(data: NpmLancerData, id: string, manifest?: IContentPackManifest): IContentPack {
  if (!data.lcp_manifest && !manifest) {
    throw new Error("No manifest provided for content pack.");
  }
  // Filter function to remove the placeholders for missing items.
  const removePlaceholders = (x: any) => !x.id || !x.id.startsWith("missing_");
  return {
    id,
    active: true,
    manifest: (data.lcp_manifest || manifest) as IContentPackManifest,
    data: {
      coreBonuses: data.core_bonuses?.filter(removePlaceholders),
      frames: data.frames?.filter(removePlaceholders),
      weapons: data.weapons?.filter(removePlaceholders),
      systems: data.systems?.filter(removePlaceholders),
      mods: data.mods?.filter(removePlaceholders),
      pilotGear: data.pilot_gear?.filter(removePlaceholders),
      skills: data.skills?.filter(removePlaceholders),
      talents: data.talents?.filter(removePlaceholders),
      bonds: data.bonds?.filter(removePlaceholders),
      reserves: data.reserves?.filter(removePlaceholders),
      tags: data.tags?.filter(removePlaceholders),
      statuses: data.statuses?.filter(removePlaceholders),
      npcClasses: data.npc_classes?.filter(removePlaceholders),
      npcFeatures: data.npc_features?.filter(removePlaceholders),
      npcTemplates: data.npc_templates?.filter(removePlaceholders),
    },
  };
}

/**
 * The core book data is packaged slightly differently from the other content packs, so this
 * function converts it to a consistent structure.
 * @returns The base content pack for the Lancer Core Book, i.e. lancer-data.
 */
export async function getBaseContentPack(): Promise<LCPData> {
  const lancerDataPackage = await import("@massif/lancer-data/package.json");
  const lancerData = (await import("@massif/lancer-data")) as NpmLancerData;
  const author = "Massif Press";
  const name = "Lancer Core Book Data";
  const version = lancerDataPackage.version;
  const url = "https://massif-press.itch.io/corebook-pdf-free";
  const manifest = {
    author,
    item_prefix: "", // Don't want one
    name,
    version,
    website: url,
    image_url: "https://img.itch.zone/aW1hZ2UvNDIyNjI3LzI1MDY2NTMuanBn/347x500/6cEGFF.jpg",
  };
  return {
    id: CORE_BREW_ID,
    title: name,
    author,
    availableVersion: version,
    currentVersion: game.settings.get("lancer", LANCER.setting_core_data) || "--",
    url,
    cp: convertNpmDataToContentPack(lancerData, CORE_BREW_ID, manifest),
  };
}

/**
 * Dynamically import the Massif content packs. This allows initial page load to be lighter when
 * the user is not dealing with compendium management.
 * @returns An array of objects, each containing the ID, manifest, and data for a content pack.
 */
async function massifContentPacks(): Promise<{ id: string; manifest: IContentPackManifest; cpData: NpmLancerData }[]> {
  return [
    {
      id: "long-rim",
      manifest: await import("@massif/long-rim-data/lib/lcp_manifest.json"),
      // @ts-expect-error Help welcome!
      cpData: (await import("@massif/long-rim-data")) as NpmLancerData,
    },
    {
      id: "wallflower",
      manifest: await import("@massif/wallflower-data/lib/lcp_manifest.json"),
      // @ts-expect-error
      cpData: (await import("@massif/wallflower-data")) as NpmLancerData,
    },
    {
      id: "ktb",
      manifest: await import("@massif/ktb-data/lib/lcp_manifest.json"),
      // @ts-expect-error
      cpData: (await import("@massif/ktb-data")) as NpmLancerData,
    },
    {
      id: "osr",
      manifest: await import("@massif/osr-data/lib/lcp_manifest.json"),
      // @ts-expect-error
      cpData: (await import("@massif/osr-data")) as NpmLancerData,
    },
    {
      id: "dustgrave",
      manifest: await import("@massif/dustgrave-data/lib/lcp_manifest.json"),
      // @ts-expect-error
      cpData: (await import("@massif/dustgrave-data")) as NpmLancerData,
    },
    {
      id: "ssmr",
      manifest: await import("@massif/ssmr-data/lib/lcp_manifest.json"),
      // @ts-expect-error
      cpData: (await import("@massif/ssmr-data")) as NpmLancerData,
    },
    {
      id: "ows",
      manifest: await import("@massif/ows-data/lib/lcp_manifest.json"),
      // @ts-expect-error
      cpData: (await import("@massif/ows-data")) as NpmLancerData,
    },
    {
      id: "sotw",
      manifest: await import("@massif/sotw-data/lib/lcp_manifest.json"),
      // @ts-expect-error
      cpData: (await import("@massif/sotw-data")) as NpmLancerData,
    },
  ];
}

/**
 * Get all of the official data for Lancer, including the core book and all content packs.
 * The objects in the final array are in the correct format for the LCP Manager app to consume.
 * @param lcpIndex An optional LCP index. This is used to determine the installed version of each LCP.
 * @returns An array of LCPData objects, one for each content pack.
 */
export async function getOfficialData(lcpIndex?: LCPIndex): Promise<LCPData[]> {
  const coreData: LCPData = await getBaseContentPack();
  const massifContent = await massifContentPacks();
  const nonCoreContent: LCPData[] = (
    await Promise.all(
      massifContent.map(async content => {
        // Skip anything that's broken
        if (!content.manifest || !content.cpData) return null;

        const lcpData: LCPData = {
          id: content.id,
          title: getTitle(content.manifest),
          author: getAuthor(content.manifest),
          availableVersion: getPackageVersion(content.manifest),
          currentVersion: lcpIndex ? getInstalledVersion(content.manifest, lcpIndex) : "--",
          url: getUrl(content.manifest),
          cp: convertNpmDataToContentPack(content.cpData, content.id, content.manifest),
        };
        return lcpData;
      })
    )
  ).filter(c => c !== null) as LCPData[]; // Don't know why this "as" is necessary, there won't be any nulls.

  return [coreData, ...nonCoreContent];
}

/**
 * Merge the official data with the LCP index data, so that installed 3rd party LCPs are included in the result.
 * @param officialData Array of official content packs
 * @param lcpIndex Index of the currently installed content packs
 * @returns An array of LCPData objects, one for each content pack, with the official data merged with the index data
 */
export function mergeOfficialDataAndLcpIndex(officialData: LCPData[], lcpIndex: LCPIndex): LCPData[] {
  const indexData: LCPData[] = lcpIndex.index
    // Filter out any LCPs that are in the index and in the official data
    .filter(lcp => !officialData.find(odLcp => lcp.name === odLcp.title && lcp.author === odLcp.author))
    .map(lcp => ({
      ...lcp,
      title: lcp.name,
      id: lcp.name.replace(/\s/g, "-").toLowerCase(),
      availableVersion: "",
      currentVersion: lcp.version,
    }));
  return [...officialData, ...indexData];
}
