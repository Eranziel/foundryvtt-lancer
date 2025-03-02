import { LANCER } from "../../config";
import { IContentPackManifest } from "../../util/unpacking/packed-types";
import { getOfficialData, LCPData, mergeOfficialDataAndLcpIndex } from "../../util/lcps";

const lp = LANCER.log_prefix;

let LCPManager: any;

type LCPManagerData = {
  lcpData: LCPData[];
};

async function attachLCPManager(target: HTMLElement, initialData: Promise<LCPManagerData | {}>) {
  if (!LCPManager) {
    LCPManager = (await import("./LCPManager.svelte")).default;
  }
  return new LCPManager({
    target,
    props: await initialData,
  });
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

// TODO: deprecate and remove LCPIndex
export class LCPIndex {
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
      if (m.name === manifest.name && m.author === manifest.author) {
        this.index.splice(i, 1);
        break;
      }
    }
    this.addManifest(manifest);
  }
}

class LCPManager2 extends Application {
  officialData: LCPData[];
  lcpIndex: LCPIndex;

  constructor(...args: any[]) {
    super(...args);
    this.lcpIndex = new LCPIndex(game.settings.get(game.system.id, LANCER.setting_lcps).index);
    this.officialData = [];
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: `systems/${game.system.id}/templates/lcp/lcp-manager-2.hbs`,
      title: "LANCER Compendium Manager",
      id: "lcp-manager",
      classes: ["lancer", "lcp-manager"],
      width: 1200,
      height: 800,
    });
  }

  async getData(): Promise<{}> {
    return {};
  }

  activateListeners(html: JQuery<HTMLElement>) {
    super.activateListeners(html);
    const mount = html.closest(".lcp-manager-mount");
    if (!mount || !mount.length) return;
    attachLCPManager(mount[0], this.getData());
  }
}
