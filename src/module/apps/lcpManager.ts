import { LANCER } from "../config";
const lp = LANCER.log_prefix;
import { import_cp, clearCompendiumData, set_all_lock } from "../compBuilder";
import * as mm from "machine-mind";
import type { IContentPack, IContentPackManifest } from "machine-mind";
import { migrateAllActors } from "../migration";

export const core_update = "3.0.31"; // typed_lancer_data.info.version;

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
    button.setAttribute("style", "flex-basis: 100%;margin-top: 5px;");
    button.innerHTML = "<i class='cci cci-content-manager i--s'></i> LANCER Compendium Manager";
    buttons.append(button);
    button.addEventListener("click", () => {
      new LCPManager().render(true);
    });

    button = document.createElement("button");
    button.setAttribute("style", "flex-basis: 100%;margin-top: 5px;");
    button.innerHTML = "<i class='fas fa-users'></i>Migrate Actors";
    buttons.append(button);
    button.addEventListener("click", () => {
      migrateAllActors();
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
    this.coreVersion = game.settings.get(LANCER.sys_name, LANCER.setting_core_data);
    // TODO: pull available core version from machine-mind
    this.coreUpdate = core_update;
    console.log(`${lp} Lancer Data version:`, this.coreVersion);
    this.lcpIndex = new LCPIndex(game.settings.get(LANCER.sys_name, LANCER.setting_lcps).index);
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      template: "systems/lancer/templates/lcp/lcp-manager.hbs",
      title: "LANCER Compendium Manager",
      width: 800,
      height: 800,
    });
  }

  getData() {
    const data = {
      core_version: this.coreVersion,
      core_update: this.coreUpdate,
      manifest: this.manifest,
      lcps: this.lcpIndex,
    };
    console.log(`${lp} LCP Manager template data:`, data);
    return data;
  }

  updateLcpIndex(manifest: IContentPackManifest) {
    if (!this.lcpIndex) this.lcpIndex = new LCPIndex(game.settings.get(LANCER.sys_name, LANCER.setting_lcps).index);
    else this.lcpIndex.updateManifest(manifest);
    game.settings.set(LANCER.sys_name, LANCER.setting_lcps, this.lcpIndex).then(() => this.render());
  }

  async clearCompendiums() {
    await clearCompendiumData();
    this.coreVersion = game.settings.get(LANCER.sys_name, LANCER.setting_core_data);
    this.lcpIndex = new LCPIndex(game.settings.get(LANCER.sys_name, LANCER.setting_lcps).index);
    this.render(true);
  }

  activateListeners(html: JQuery<HTMLElement>) {
    super.activateListeners(html);
    document.getElementsByClassName("lcp-core-update")[0]?.addEventListener("click", (ev: Event) => {
      this._onCoreUpdateButtonClick(<MouseEvent>ev).then();
    });
    let fileInput = document.getElementById("lcp-file");
    if (fileInput) {
      fileInput.onchange = (ev: Event) => {
        this._onLcpPicked(ev);
      };
    }
    document.getElementsByClassName("lcp-import")[0]?.addEventListener("click", () => {
      this._onImportButtonClick().then();
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
      this._onLcpParsed((ev.target as FileReader).result as string).then();
    });
  }

  async _onLcpParsed(fileData: string | null) {
    if (!fileData) return;
    this.cp = await mm.funcs.parseContentPack(fileData);
    this.manifest = {
      ...this.cp.manifest,
      item_prefix: "",
      skills: this.cp.data.skills?.length ?? 0,
      talents: this.cp.data.talents.length ?? 0,
      gear: this.cp.data.pilotGear.length ?? 0,
      frames: this.cp.data.frames.length,
      systems: this.cp.data.systems.length,
      weapons: this.cp.data.weapons.length,
      // mods: this.cp.WeaponMods.length,
      npc_classes: this.cp.data.npcClasses.length,
      npc_templates: this.cp.data.npcTemplates.length,
      npc_features: this.cp.data.npcFeatures.length,
    };
    console.log(`${lp} Manifest of selected LCP:`, this.manifest);
    this.render();
  }

  async _onImportButtonClick() {
    if (!game.user?.isGM) {
      ui.notifications!.warn(`Only GM can modify the Compendiums.`);
      return;
    }
    if (!this.lcpFile) {
      ui.notifications!.error(`Import error: no file selected.`);
      return;
    }

    const cp = this.cp;
    const manifest = this.manifest;
    if (!cp || !manifest) return;

    ui.notifications!.info(`Starting import of ${cp.manifest.name} v${cp.manifest.version}. Please wait.`);
    console.log(`${lp} Starting import of ${cp.manifest.name} v${cp.manifest.version}.`);
    console.log(`${lp} Parsed content pack:`, cp);
    await import_cp(cp, (x, y) => this.update_progress_bar(x, y));
    ui.notifications!.info(`Import of ${cp.manifest.name} v${cp.manifest.version} complete.`);
    console.log(`Import of ${cp.manifest.name} v${cp.manifest.version} complete.`);

    this.updateLcpIndex(manifest);
  }

  update_progress_bar(done: number, out_of: number) {
    $(this.element).find(".lcp-progress").prop("value", done);
    $(this.element).find(".lcp-progress").prop("max", out_of);
  }
}

export { LCPManager, addLCPManager, LCPIndex };

export async function updateCore(version: string, manager?: LCPManager) {
  var progress = 1;
  let progress_func = (x: any, y: any) => {
    // If we're passing a manager, let it do things as well
    if (manager) manager.update_progress_bar(x, y);
    // Provide updates every 10%
    const denom = 10;
    let incr = Math.ceil(y / denom);
    if (x >= incr * progress) {
      ui.notifications!.info(`${progress * (100 / denom)}% of Lancer Core data updated`);
      progress += 1;
    }
  };

  ui.notifications!.info(`Updating Lancer Core data to v${version}. Please wait.`);

  console.log(`${lp} Updating Lancer Core data to v${version}`);
  try {
    await import_cp(mm.funcs.get_base_content_pack(), progress_func);
  } catch (err) {
    console.error(err);

    ui.notifications!.warn(
      `Lancer Core data update ran into an issue... Please open the compendium manager and attempt an update after clearing LCPs.`
    );
    // await set_all_lock(true);
    return;
  }

  ui.notifications!.info(`Lancer Core data update complete.`);
  await set_all_lock(true);
  await game.settings.set(LANCER.sys_name, LANCER.setting_core_data, version);
}
