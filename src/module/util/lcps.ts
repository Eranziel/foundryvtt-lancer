import JSZip, { JSZipObject } from "jszip";
import { LANCER } from "../config";
import { LCPIndex } from "../apps/lcp-manager/lcp-manager-2";
// TODO: Don't use typed-lancerdata, or at least dynamically import it.
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

export type LCPData = {
  id: string;
  title: string;
  author: string;
  url?: string;
  currentVersion: string;
  availableVersion: string;
  cp?: IContentPack;
};

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

// Get the version from the npm package
function getPackageVersion(pkg: { version: string }) {
  return pkg.version;
}

function getTitle(manifest: IContentPackManifest) {
  return manifest.name;
}

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

async function massifContentPacks() {
  return [
    {
      id: "long-rim",
      pkg: await import("@massif/long-rim-data/package.json"),
      manifest: await import("@massif/long-rim-data/lib/lcp_manifest.json"),
      // @ts-expect-error Help welcome!
      cpData: (await import("@massif/long-rim-data")) as IContentPack["data"],
    },
    {
      id: "wallflower",
      pkg: await import("@massif/wallflower-data/package.json"),
      manifest: await import("@massif/wallflower-data/lib/lcp_manifest.json"),
      // @ts-expect-error
      cpData: (await import("@massif/wallflower-data")) as IContentPack["data"],
    },
    {
      id: "ktb",
      pkg: await import("@massif/ktb-data/package.json"),
      manifest: await import("@massif/ktb-data/lib/lcp_manifest.json"),
      // @ts-expect-error
      cpData: (await import("@massif/ktb-data")) as IContentPack["data"],
    },
    {
      id: "osr",
      pkg: await import("@massif/osr-data/package.json"),
      manifest: await import("@massif/osr-data/lib/lcp_manifest.json"),
      // @ts-expect-error
      cpData: (await import("@massif/osr-data")) as IContentPack["data"],
    },
    {
      id: "dustgrave",
      pkg: await import("@massif/dustgrave-data/package.json"),
      manifest: await import("@massif/dustgrave-data/lib/lcp_manifest.json"),
      // @ts-expect-error
      cpData: (await import("@massif/dustgrave-data")) as IContentPack["data"],
    },
    {
      id: "ssmr",
      pkg: await import("@massif/ssmr-data/package.json"),
      manifest: await import("@massif/ssmr-data/lib/lcp_manifest.json"),
      // @ts-expect-error
      cpData: (await import("@massif/ssmr-data")) as IContentPack["data"],
    },
    {
      id: "sotw",
      pkg: await import("@massif/sotw-data/package.json"),
      manifest: await import("@massif/sotw-data/lib/lcp_manifest.json"),
      // @ts-expect-error
      cpData: (await import("@massif/sotw-data")) as IContentPack["data"],
    },
  ];
}

export async function getOfficialData(lcpIndex?: LCPIndex): Promise<LCPData[]> {
  const lancerDataPackage = await import("@massif/lancer-data/package.json");

  const coreContentPack = getBaseContentPack();
  const coreData = {
    id: coreContentPack.id,
    title: coreContentPack.manifest.name,
    author: "Massif Press",
    availableVersion: lancerDataPackage.version as string,
    currentVersion: game.settings.get("lancer", LANCER.setting_core_data) || "--",
    url: "https://massif-press.itch.io/corebook-pdf-free",
    cp: getBaseContentPack(),
  };
  // HACK: base content pack should build this in itself
  coreData.cp.manifest.version = coreData.availableVersion;

  // TODO: add link to npc data?

  const massifContent = await massifContentPacks();
  const nonCoreContent: LCPData[] = (
    await Promise.all(
      massifContent.map(async content => {
        // Skip anything that's broken
        if (!content.pkg || !content.manifest) return null;

        const lcpData: LCPData = {
          id: content.id,
          title: getTitle(content.manifest),
          author: getAuthor(content.manifest),
          availableVersion: getPackageVersion(content.pkg),
          currentVersion: lcpIndex ? getInstalledVersion(content.manifest, lcpIndex) : "--",
          url: getUrl(content.manifest),
          cp: {
            id: content.id,
            active: true,
            manifest: content.manifest,
            data: content.cpData,
          },
        };
        return lcpData;
      })
    )
  ).filter(c => c !== null);

  return [coreData, ...nonCoreContent];
}

export function mergeOfficialDataAndLcpIndex(officialData: LCPData[], lcpIndex: LCPIndex): LCPData[] {
  const indexData: LCPData[] = lcpIndex.index
    // Filter out any LCPs that are in the index and in the official data
    .filter(lcp => !officialData.find(odLcp => lcp.name === odLcp.title && lcp.author && odLcp.author))
    .map(lcp => ({
      ...lcp,
      title: lcp.name,
      id: lcp.item_prefix || lcp.name.replace(/\s/g, "-").toLowerCase(),
      availableVersion: "",
      currentVersion: lcp.version,
    }));
  return [...officialData, ...indexData];
}
