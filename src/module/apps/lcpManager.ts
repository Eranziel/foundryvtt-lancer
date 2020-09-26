import { LANCER } from "../config";
const lp = LANCER.log_prefix;
import { buildCompendiums } from "../compBuilder";
import * as mm from "machine-mind";
import { ContentPack, IContentPackManifest } from "machine-mind";

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

class LCPIndex {
  index: IContentPackManifest[]
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
    let existing: boolean = false;
    for (var i = 0; i < this.index.length; i++) {
      const m = this.index[i];
      // if (Array.isArray(m) && m.length === 0) {
      //   this.index.splice(i, 1);
      // }
      if (m.name === manifest.name && m.author === manifest.author) {
        existing = true;
        this.index.splice(i, 1);
        break;
      }
    }
    this.index.push(manifest);
  }
}

class LCPManager extends Application {
  lcpFile: File | null;
  cp: ContentPack | null;
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
    this.coreUpdate = "2.0.35";
    console.log(`${lp} Lancer Data version:`, this.coreVersion);
    this.lcpIndex = new LCPIndex(game.settings.get(LANCER.sys_name, LANCER.setting_lcps).index);
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
    data.manifest = this.manifest;
    data.lcps = this.lcpIndex;
    console.log(`${lp} LCP Manager template data:`, data);
    return data;
  }

  updateLcpIndex(manifest: IContentPackManifest) {
    this.lcpIndex.updateManifest(manifest);
    game.settings.set(LANCER.sys_name, LANCER.setting_lcps, this.lcpIndex);
    this.render();
  }

  activateListeners(html: HTMLElement | JQuery<HTMLElement>) {
    super.activateListeners(html);
    document.getElementsByClassName("lcp-core-update")[0].addEventListener("click", (ev: Event) => {
      this._onCoreUpdateButtonClick(<MouseEvent>ev);
    });
    let fileInput = document.getElementById("lcp-file");
    if (fileInput) {
      fileInput.onchange = (ev: Event) => {
        this._onLcpPicked(ev);
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
    const icp = await mm.parseContentPack(fileData);
    this.cp = new mm.ContentPack(icp);
    this.manifest = {
      name: this.cp.Name,
      author: this.cp.Author,
      item_prefix: "",
      version: this.cp.Version,
      description: this.cp.Description,
      image_url: this.cp.ImageURL,
      website: this.cp.Website,
      skills: this.cp.Skills.length,
      talents: this.cp.Talents.length,
      gear: this.cp.PilotEquipment.length,
      frames: this.cp.Frames.length,
      systems: this.cp.MechSystems.length,
      weapons: this.cp.MechWeapons.length,
      mods: this.cp.WeaponMods.length,
      npc_classes: this.cp.NpcClasses.length,
      npc_templates: this.cp.NpcTemplates.length,
      npc_features: this.cp.NpcFeatures.length
    }
    console.log(`${lp} Manifest of selected LCP:`, this.manifest);
    this.render();
  }

  async _onImportButtonClick(ev: MouseEvent) {
    if (!game.user.isGM) {
      ui.notifications.warn(`Only GM can modify the Compendiums.`);
      return;
    }
    if (!this.lcpFile) {
      ui.notifications.error(`Import error: no file selected.`);
      return;
    }

    const cp = this.cp
    const manifest = this.manifest
    if (!cp || !manifest) return;

    ui.notifications.info(`Starting import of ${cp.Name} v${cp.Version}. Please wait.`);
    console.log(`${lp} Starting import of ${cp.Name} v${cp.Version}.`);
    console.log(`${lp} Parsed content pack:`, cp);
    await buildCompendiums(cp);
    ui.notifications.info(`Import of ${cp.Name} v${cp.Version} complete.`);
    console.log(`${lp} Import of ${cp.Name} v${cp.Version} complete.`);

    this.updateLcpIndex(manifest);
  }
}

export { LCPManager, addLCPManager, LCPIndex };
