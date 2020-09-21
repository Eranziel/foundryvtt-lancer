import { LANCER } from "../config";
const lp = LANCER.log_prefix;
import { buildCompendiums } from "../compBuilder";
import * as mm from "machine-mind";

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

  constructor(...args: any[]) {
    super(...args);
    this.lcpFile = null;
    // TODO: current core version to be stored in a Foundry system setting
    this.coreVersion = "1.0.0";
    // TODO: pull available core version from machine-mind
    this.coreUpdate = "1.0.1";
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
    if (!ev.currentTarget) return;
    console.log(`${lp} Updating Lancer Core data to v`);
    buildCompendiums(mm.getBaseContentPack());
  }

  _onImportButtonClick(ev: MouseEvent) {
    if (!this.lcpFile) {
      ui.notifications.error(`Import error: no file selected.`);
      return;
    }
    ui.notifications.info(`Starting import of "${this.lcpFile.name}". Please wait.`);
    console.log(`${lp} Starting import of "${this.lcpFile.name}"`);

    const fr = new FileReader();
    fr.readAsBinaryString(this.lcpFile);
    fr.addEventListener("load", (ev: ProgressEvent) => {
      console.log(ev);
      this._importLCP((ev.target as FileReader).result as string);
    });
  }

  async _importLCP(fileData: string | null) {
    if (!fileData) return;
    const icp = await mm.parseContentPack(fileData);
    const cp = new mm.ContentPack(icp);
    console.log(`${lp} Parsed content pack:`, cp);
    buildCompendiums(cp);
  }
}

export { LCPManager, addLCPManager };
