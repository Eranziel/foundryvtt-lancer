import { LANCER } from "../config";
const lp = LANCER.log_prefix;
import { buildCompendiums } from "../compBuilder";
import * as mm from "machine-mind";
import { IContentPackManifest } from "machine-mind";

function addLCPManager(app: Application, html: any) {
  if (app.options.id == "compendium") {
    var footer = html[0].lastElementChild;
    if (!footer) {
      ui.notifications.error("Unable to add LCP Manager button - Compendium Tab not found!", {
        permanent: true,
      });
      console.log(`${lp} Unable to add LCP Manager button - Compendium Tab not found!`, footer);
      return;
    }
    var button = document.createElement("button");
    button.setAttribute("style", "flex-basis: 100%;margin-top: 5px;");
    button.innerHTML = "<i class='fas fa-file-import'></i> LANCER Compendium Manager";
    footer.append(button);
    button.addEventListener("click", (ev: MouseEvent) => {
      let mgr = new LCPManager().render(true);
    });
  }
}

class LCPManager extends Application {
  lcpFile: File | null;
  coreVersion: string;
  coreUpdate: string | null;
  lcpIndex: IContentPackManifest[];

  constructor(...args: any[]) {
    super(...args);
    this.lcpFile = null;
    this.coreVersion = game.settings.get(LANCER.sys_name, LANCER.setting_core_data);
    // TODO: pull available core version from machine-mind
    this.coreUpdate = "2.0.35";
    console.log(`${lp} Lancer Data version:`, this.coreVersion);
    this.lcpIndex = game.settings.get(LANCER.sys_name, LANCER.setting_lcps);
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      template: "systems/lancer/templates/lcp/lcp-manager.html",
      title: "LANCER Compendium Manager",
      width: 800,
      height: 800,
    });
  }

  getData() {
    let data = super.getData();
    data.core_update = this.coreUpdate;
    return data;
  }

  activateListeners(html: HTMLElement | JQuery<HTMLElement>) {
    super.activateListeners(html);
    document.getElementsByClassName("lcp-core-update")[0].addEventListener("click", (ev: Event) => {
      this._onCoreUpdateButtonClick(<MouseEvent>ev);
    });
    let fileInput = document.getElementById("lcp-file");
    if (fileInput) {
      fileInput.onchange = (ev: Event) => {
        let files = (ev.target as HTMLInputElement).files;
        if (files) this.lcpFile = files[0];
        console.log(`${lp} Selected file changed`, this.lcpFile);
      };
    }
    document.getElementsByClassName("lcp-import")[0].addEventListener("click", (ev: Event) => {
      this._onImportButtonClick(<MouseEvent>ev);
    });
  }

  _onCoreUpdateButtonClick(ev: MouseEvent) {
    if (!game.user.isGM) {
      ui.notifications.warn(`Only GM can modify the Compendiums.`);
      return;
    }
    if (!ev.currentTarget) return;
    console.log(`${lp} Updating Lancer Core data to v${this.coreUpdate}`);
    buildCompendiums(mm.getBaseContentPack());
    game.settings.set(LANCER.sys_name, LANCER.setting_core_data, this.coreUpdate);
  }

  _onImportButtonClick(ev: MouseEvent) {
    if (!game.user.isGM) {
      ui.notifications.warn(`Only GM can modify the Compendiums.`);
      return;
    }
    if (!this.lcpFile) {
      ui.notifications.error(`Import error: no file selected.`);
      return;
    }
    const fr = new FileReader();
    fr.readAsBinaryString(this.lcpFile);
    fr.addEventListener("load", (ev: ProgressEvent) => {
      this._importLCP((ev.target as FileReader).result as string);
    });
  }

  async _importLCP(fileData: string | null) {
    if (!fileData) return;
    const icp = await mm.parseContentPack(fileData);
    const cp = new mm.ContentPack(icp);
    ui.notifications.info(`Starting import of ${cp.Name} v${cp.Version}. Please wait.`);
    console.log(`${lp} Starting import of ${cp.Name} v${cp.Version}.`);
    console.log(`${lp} Parsed content pack:`, cp);

    console.log(this.lcpIndex);
    await buildCompendiums(cp);
    ui.notifications.info(`Import of ${cp.Name} v${cp.Version} complete.`);
    console.log(`${lp} Import of ${cp.Name} v${cp.Version} complete.`);
    
    this.lcpIndex.push(icp.manifest);
    game.settings.set(LANCER.sys_name, LANCER.setting_lcps, this.lcpIndex);
  }
}

export { LCPManager, addLCPManager };
