import { LANCER } from "../../config";
import { getBaseContentPack } from "../../util/lcp-parser";
import { IContentPack, IContentPackManifest } from "../../util/unpacking/packed-types";
import { data as LongRimData } from "../../util/lcp/long-rim-types";
import { LCPIndex } from "../lcp-manager";

// TODO: rename this file so it's about generic LCP helper logic

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
  skills: number;
  talents: number;
  gear: number;
  frames: number;
  systems: number;
  weapons: number;
  mods: number;
  npc_classes: number;
  npc_templates: number;
  npc_features: number;
};

export function generateLcpSummary(cp: any): ContentSummary {
  const data: IContentPack["data"] = cp.data ? cp.data : cp;
  return {
    ...cp.manifest,
    item_prefix: "",
    skills: data.skills?.length ?? 0,
    talents: data.talents?.length ?? 0,
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

async function massifContentPacks() {
  return [
    {
      id: "long-rim",
      pkg: await import("@massif/long-rim-data/package.json"),
      manifest: await import("@massif/long-rim-data/lib/lcp_manifest.json"),
      // @ts-expect-error
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
