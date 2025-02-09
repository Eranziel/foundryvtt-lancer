import { LANCER } from "../../config";
const lp = LANCER.log_prefix;
import { IContentPack, IContentPackManifest } from "../../util/unpacking/packed-types";
import type LCPManager from "./LCPManager.svelte";
import * as lancerDataPackage from "@massif/lancer-data/package.json";
import * as longRimPackage from "@massif/long-rim-data/package.json";
import * as wallflowerPackage from "@massif/wallflower-data/package.json";
import * as ktbPackage from "@massif/ktb-data/package.json";
import * as osrPackage from "@massif/osr-data/package.json";
import * as dustgravePackage from "@massif/dustgrave-data/package.json";
import * as ssmrPackage from "@massif/ssmr-data/package.json";
import * as sotwPackage from "@massif/sotw-data/package.json";

export const core_update = lancerDataPackage.version;

let lcpManager: LCPManager;

type LCPManagerData = {
  coreVersion: string;
  coreUpdate: string | null;
  officialData: { id: string; name: string; url?: string; currentVersion: string; availableVersion: string }[];
  manifest: any;
  lcps: LCPIndex;
};

async function attachLCPManager(target: HTMLElement, initialData: LCPManagerData) {
  if (!lcpManager) {
    let LCPManager = (await import("./LCPManager.svelte")).default;
    lcpManager = new LCPManager({
      target,
      props: initialData,
    });
  }
  return lcpManager;
}

export function addLCPManager2(app: Application, html: any) {
  if (app.options.id == "compendium") {
    const buttons = $(html).find(".header-actions");
    if (!buttons) {
      ui.notifications!.error("Unable to add LCP Manager button - Compendium Tab buttons not found!", {
        permanent: true,
      });
      console.log(`${lp} Unable to add LCP Manager button - Compendium Tab buttons not found!`, buttons);
      return;
    }
    let button = document.createElement("button");
    button.setAttribute("id", "lcp-manager-button");
    button.setAttribute("style", "flex-basis: 100%;margin-top: 5px;");
    button.innerHTML = "<i class='cci cci-content-manager i--s'></i> LANCER Compendium Manager";
    buttons.append(button);
    button.addEventListener("click", () => {
      console.log("clicky click");
      new LCPManager2().render(true);
    });
  }
}

class LCPIndex {
  index: IContentPackManifest[];

  constructor(index: IContentPackManifest[] | null) {
    if (index) {
      this.index = index;
    } else {
      this.index = [];
    }
  }

  addManifest(manifest: IContentPackManifest) {
    this.index.push(manifest);
  }

  updateManifest(manifest: IContentPackManifest) {
    for (let i = 0; i < this.index.length; i++) {
      const m = this.index[i];
      // if (Array.isArray(m) && m.length === 0) {
      //   this.index.splice(i, 1);
      // }
      if (m.name === manifest.name && m.author === manifest.author) {
        this.index.splice(i, 1);
        break;
      }
    }
    this.addManifest(manifest);
  }
}

class LCPManager2 extends Application {
  lcpFile: File | null;
  cp: IContentPack | null;
  manifest: any;
  coreVersion: string;
  coreUpdate: string | null;
  officialData: { id: string; name: string; url?: string; currentVersion: string; availableVersion: string }[];
  lcpIndex: LCPIndex;

  constructor(...args: any[]) {
    super(...args);
    this.lcpFile = null;
    this.cp = null;
    this.manifest = null;
    this.coreVersion = game.settings.get(game.system.id, LANCER.setting_core_data);
    this.coreUpdate = core_update;
    console.log(`${lp} Lancer Data version:`, this.coreVersion);
    this.lcpIndex = new LCPIndex(game.settings.get(game.system.id, LANCER.setting_lcps).index);
    this.officialData = [
      {
        id: "core-data",
        name: "Lancer Core Data",
        availableVersion: lancerDataPackage.version,
        currentVersion: game.settings.get(game.system.id, LANCER.setting_core_data) || "--",
        url: "https://massif-press.itch.io/corebook-pdf-free",
      },
      {
        id: "long-rim",
        // itchName: "The Long Rim: a Lancer Setting",
        name: "Lancer Long Rim Data",
        availableVersion: longRimPackage.version,
        currentVersion: this.lcpIndex.index?.find(m => m.name === "Lancer Long Rim Data")?.version || "--",
        url: "https://massif-press.itch.io/the-long-rim",
      },
      {
        id: "wallflower",
        // itchName: "No Room for a Wallflower: Act 1",
        name: "Lancer Wallflower Data",
        availableVersion: wallflowerPackage.version,
        currentVersion: this.lcpIndex.index?.find(m => m.name === "Lancer Wallflower Data")?.version || "--",
        url: "https://massif-press.itch.io/no-room-for-a-wallflower-act-1",
      },
      {
        id: "ktb",
        // itchName: "The Karrakin Trade Baronies: a Lancer Setting",
        name: "Lancer KTB Data",
        availableVersion: ktbPackage.version,
        currentVersion: this.lcpIndex.index?.find(m => m.name === "Lancer KTB Data")?.version || "--",
        url: "https://massif-press.itch.io/field-guide-the-karrakin-trade-baronies",
      },
      {
        id: "osr",
        // itchName: "Operation Solstice Rain",
        name: "Operation Solstice Rain Data",
        availableVersion: osrPackage.version,
        currentVersion: this.lcpIndex.index?.find(m => m.name === "Operation Solstice Rain Data")?.version || "--",
        url: "https://massif-press.itch.io/operation-solstice-rain",
      },
      {
        id: "dustgrave",
        // itchName: "Dustgrave",
        name: "LANCER: Dustgrave",
        availableVersion: dustgravePackage.version,
        currentVersion: this.lcpIndex.index?.find(m => m.name === "LANCER: Dustgrave")?.version || "--",
        url: "https://massif-press.itch.io/dustgrave",
      },
      {
        id: "ssmr",
        // itchName: "Siren's Song: A Mountain's Remorse",
        name: "Siren's Song, A Mountain's Remorse",
        availableVersion: ssmrPackage.version,
        currentVersion:
          this.lcpIndex.index?.find(m => m.name === "Siren's Song, A Mountain's Remorse")?.version || "--",
        url: "https://massif-press.itch.io/sirens-song",
      },
      {
        id: "sotw",
        // itchName: "Shadow of the Wolf",
        name: "Shadow of the Wolf",
        availableVersion: sotwPackage.version,
        currentVersion: this.lcpIndex.index?.find(m => m.name === "Shadow of the Wolf")?.version || "--",
        url: "https://massif-press.itch.io/shadow-of-the-wolf",
      },
    ];
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      template: `systems/${game.system.id}/templates/lcp/lcp-manager-2.hbs`,
      title: "LANCER Compendium Manager",
      id: "lcp-manager",
      classes: ["lancer", "lcp-manager"],
      width: 1200,
      height: 800,
    });
  }

  getData(): LCPManagerData {
    const data = {
      coreVersion: this.coreVersion,
      coreUpdate: this.coreUpdate,
      officialData: this.officialData,
      manifest: this.manifest,
      lcps: this.lcpIndex,
    };
    return data;
  }

  activateListeners(html: JQuery<HTMLElement>) {
    super.activateListeners(html);
    const mount = html.closest(".lcp-manager-mount");
    if (!mount || !mount.length) return;
    attachLCPManager(mount[0], this.getData());
  }
}
