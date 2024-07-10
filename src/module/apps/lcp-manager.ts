import { LANCER } from "../config";
const lp = LANCER.log_prefix;
import { importCP, clearCompendiumData, setAllLock } from "../comp-builder";
import { IContentPack, IContentPackManifest } from "../util/unpacking/packed-types";
import { getBaseContentPack, parseContentPack } from "../util/lcp-parser";
import * as lancerDataPackage from "@massif/lancer-data/package.json";

export const core_update = lancerDataPackage.version;

function addLCPManager(app: Application, html: any) {
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
      new LCPManager().render(true);
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

class LCPManager extends Application {
  lcpFile: File | null;
  cp: IContentPack | null;
  manifest: any;
  coreVersion: string;
  coreUpdate: string | null;
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
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: `systems/${game.system.id}/templates/lcp/lcp-manager.hbs`,
      title: "LANCER Compendium Manager",
      id: "lcp-manager",
      classes: ["lancer", "lcp-manager"],
      width: 800,
      height: 800,
    });
  }

  getData() {
    const data = {
      coreVersion: this.coreVersion,
      coreUpdate: this.coreUpdate,
      manifest: this.manifest,
      lcps: this.lcpIndex,
    };
    console.log(`${lp} LCP Manager template data:`, data);
    return data;
  }

  updateLcpIndex(manifest: IContentPackManifest) {
    if (!this.lcpIndex) this.lcpIndex = new LCPIndex(game.settings.get(game.system.id, LANCER.setting_lcps).index);
    else this.lcpIndex.updateManifest(manifest);
    game.settings.set(game.system.id, LANCER.setting_lcps, this.lcpIndex).then(() => this.render());
  }

  async clearCompendiums() {
    await clearCompendiumData();
    this.coreVersion = game.settings.get(game.system.id, LANCER.setting_core_data);
    this.lcpIndex = new LCPIndex(game.settings.get(game.system.id, LANCER.setting_lcps).index);
    this.render(true);
  }

  async clearV1Compendiums() {
    await clearCompendiumData({ v1: true });
  }

  activateListeners(html: JQuery<HTMLElement>) {
    super.activateListeners(html);
    document.getElementsByClassName("lcp-core-update")[0]?.addEventListener("click", (ev: Event) => {
      this._onCoreUpdateButtonClick(<MouseEvent>ev);
    });
    let fileInput = document.getElementById("lcp-file");
    if (fileInput) {
      fileInput.onchange = (ev: Event) => {
        this._onLcpPicked(ev);
      };
    }
    document.getElementsByClassName("lcp-import")[0]?.addEventListener("click", () => {
      this._onImportButtonClick();
    });
    document.getElementsByClassName("lcp-clear-all")[0]?.addEventListener("click", (ev: Event) => {
      this._onClearAllButtonClick(<MouseEvent>ev);
    });
  }

  async _onCoreUpdateButtonClick(ev: MouseEvent) {
    if (!game.user?.isGM) return ui.notifications!.warn(`Only GM can modify the Compendiums.`);
    if (!ev.currentTarget || !this.coreUpdate) return;

    await updateCore(this.coreUpdate, this);

    this.coreVersion = this.coreUpdate;
    this.render();
  }

  _onClearAllButtonClick(ev: MouseEvent) {
    if (!game.user?.isGM) return ui.notifications!.warn(`Only GM can modify the Compendiums.`);
    if (!ev.currentTarget) return;
    new Dialog({
      title: "Confirm Clearing LANCER Compendiums",
      content: `Are you sure you want to delete ALL data from the Compendiums created by the LCP Manager?`,
      buttons: {
        confirm: {
          label: "Confirm",
          callback: async () => {
            await this.clearCompendiums();
          },
        },
        cancel: {
          label: "Cancel",
        },
      },
      default: "Cancel",
    }).render(true);
  }

  _onLcpPicked(ev: Event) {
    let files = (ev.target as HTMLInputElement).files;
    if (files) this.lcpFile = files[0];
    if (!this.lcpFile) return;

    console.log(`${lp} Selected file changed`, this.lcpFile);
    const fr = new FileReader();
    fr.readAsBinaryString(this.lcpFile);
    fr.addEventListener("load", (ev: ProgressEvent) => {
      this._onLcpParsed((ev.target as FileReader).result as string);
    });
  }

  async _onLcpParsed(fileData: string | null) {
    if (!fileData) return;
    this.cp = await parseContentPack(fileData);
    this.manifest = {
      ...this.cp.manifest,
      item_prefix: "",
      skills: this.cp.data.skills?.length ?? 0,
      talents: this.cp.data.talents?.length ?? 0,
      gear: this.cp.data.pilotGear?.length ?? 0,
      frames: this.cp.data.frames?.length,
      systems: this.cp.data.systems?.length,
      weapons: this.cp.data.weapons?.length,
      mods: this.cp.data.mods?.length,
      tags: this.cp.data.tags?.length,
      statuses: this.cp.data.statuses?.length,
      npc_classes: this.cp.data.npcClasses?.length,
      npc_templates: this.cp.data.npcTemplates?.length,
      npc_features: this.cp.data.npcFeatures?.length,
    };
    console.log(`${lp} Manifest of selected LCP:`, this.manifest);
    this.render();
  }

  async _onImportButtonClick() {
    if (!game.user?.isGM) {
      ui.notifications!.warn(`Only GM can modify the Compendiums.`);
      return;
    }
    if (!this.coreVersion) {
      ui.notifications!.warn(`Please update the Core data before importing LCPs.`);
      return;
    }
    if (!this.lcpFile) {
      ui.notifications!.error(`You must select an LCP file before importing.`);
      return;
    }

    const cp = this.cp;
    const manifest = this.manifest;
    if (!cp || !manifest) return;

    ui.notifications!.info(`Starting import of ${cp.manifest.name} v${cp.manifest.version}. Please wait.`);
    this.updateProgressBar(0, 1);
    console.log(`${lp} Starting import of ${cp.manifest.name} v${cp.manifest.version}.`);
    console.log(`${lp} Parsed content pack:`, cp);
    await importCP(cp, (x, y) => this.updateProgressBar(x, y));
    this.updateProgressBar(1, 1);
    console.log(`${lp} Import of ${cp.manifest.name} v${cp.manifest.version} complete.`);

    this.updateLcpIndex(manifest);
  }

  updateProgressBar(done: number, outOf: number) {
    let percent = Math.ceil((done / outOf) * 100);
    // @ts-expect-error v9
    SceneNavigation.displayProgressBar({ label: "Importing...", pct: percent });
  }
}

export { LCPManager, addLCPManager, LCPIndex };

export async function updateCore(version: string, manager?: LCPManager) {
  let progress_func = (done: any, outOf: any) => {
    // If we're passing a manager, let it do things as well
    if (manager) manager.updateProgressBar(done, outOf);
  };

  ui.notifications!.info(`Updating Lancer Core data to v${version}. Please wait.`);

  console.log(`${lp} Updating Lancer Core data to v${version}`);
  try {
    await importCP(getBaseContentPack(), progress_func);
  } catch (err) {
    console.error(err);

    ui.notifications!.warn(
      `Lancer Core data update ran into an issue... Please open the compendium manager and attempt an update after clearing LCPs.`
    );
    await setAllLock(true);
    return;
  }

  // @ts-expect-error v9
  SceneNavigation.displayProgressBar({ label: "DONE", pct: 100 });
  await game.settings.set(game.system.id, LANCER.setting_core_data, version);
}
