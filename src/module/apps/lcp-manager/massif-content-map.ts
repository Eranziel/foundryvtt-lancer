import { LANCER } from "../../config";
import { IContentPackManifest } from "../../util/unpacking/packed-types";
import { LCPIndex } from "../lcp-manager";

export type LCPData = {
  id: string;
  title: string;
  author: string;
  url?: string;
  currentVersion: string;
  availableVersion: string;
};

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
    },
    {
      id: "wallflower",
      pkg: await import("@massif/wallflower-data/package.json"),
      manifest: await import("@massif/wallflower-data/lib/lcp_manifest.json"),
    },
    {
      id: "ktb",
      pkg: await import("@massif/ktb-data/package.json"),
      manifest: await import("@massif/ktb-data/lib/lcp_manifest.json"),
    },
    {
      id: "osr",
      pkg: await import("@massif/osr-data/package.json"),
      manifest: await import("@massif/osr-data/lib/lcp_manifest.json"),
    },
    {
      id: "dustgrave",
      pkg: await import("@massif/dustgrave-data/package.json"),
      manifest: await import("@massif/dustgrave-data/lib/lcp_manifest.json"),
    },
    {
      id: "ssmr",
      pkg: await import("@massif/ssmr-data/package.json"),
      manifest: await import("@massif/ssmr-data/lib/lcp_manifest.json"),
    },
    {
      id: "sotw",
      pkg: await import("@massif/sotw-data/package.json"),
      manifest: await import("@massif/sotw-data/lib/lcp_manifest.json"),
    },
  ];
}

export async function getOfficialData(lcpIndex?: LCPIndex): Promise<LCPData[]> {
  const lancerDataPackage = await import("@massif/lancer-data/package.json");

  const coreData = {
    id: "core-data",
    title: "Lancer Core Data",
    author: "Massif Press",
    availableVersion: lancerDataPackage.version as string,
    currentVersion: game.settings.get("lancer", LANCER.setting_core_data) || "--",
    url: "https://massif-press.itch.io/corebook-pdf-free",
  };
  // TODO: add link to npc data?

  const massifContent = await massifContentPacks();
  const nonCoreContent = (
    await Promise.all(
      massifContent.map(async content => {
        // Skip anything that's broken
        if (!content.pkg || !content.manifest) return null;

        return {
          id: content.id,
          title: getTitle(content.manifest),
          author: getAuthor(content.manifest),
          availableVersion: getPackageVersion(content.pkg),
          currentVersion: lcpIndex ? getInstalledVersion(content.manifest, lcpIndex) : "--",
          url: getUrl(content.manifest),
        };
      })
    )
  ).filter(c => c !== null);

  return [coreData, ...nonCoreContent];
}
