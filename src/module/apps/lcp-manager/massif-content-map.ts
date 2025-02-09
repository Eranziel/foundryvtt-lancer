import { LANCER } from "../../config";
import { LCPIndex } from "../lcp-manager";

type LCPManifest = {
  name: string;
  website: string;
  // And other stuff too, but we don't care about the rest here
};

// Get the version from the npm package
function getPackageVersion(pkg: { version: string }) {
  return pkg.version;
}

function getTitle(manifest: LCPManifest) {
  return manifest.name;
}

// Find the installed version in the LCP index
function getInstalledVersion(manifest: LCPManifest, lcpIndex: LCPIndex) {
  return lcpIndex.index?.find(m => m.name === manifest.name)?.version || "--";
}

// Get the URL from the LCP manifest
function getUrl(manifest: LCPManifest) {
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

export async function getOfficialData(lcpIndex?: LCPIndex) {
  const lancerDataPackage = await import("@massif/lancer-data/package.json");

  const coreData = {
    id: "core-data",
    title: "Lancer Core Data",
    availableVersion: lancerDataPackage.version as string,
    currentVersion: game.settings.get("lancer", LANCER.setting_core_data) || "--",
    url: "https://massif-press.itch.io/corebook-pdf-free",
  };
  // TODO: add link to npc data?

  const massifContent = await massifContentPacks();
  const nonCoreContent = await Promise.all(
    massifContent.map(async content => {
      // Skip anything that's broken
      if (!content.pkg || !content.manifest) return null;

      return {
        id: content.id,
        title: getTitle(content.manifest),
        availableVersion: getPackageVersion(content.pkg),
        currentVersion: lcpIndex ? getInstalledVersion(content.manifest, lcpIndex) : "--",
        url: getUrl(content.manifest),
      };
    })
  );

  return [coreData, ...nonCoreContent.filter(c => c !== null)];
}
