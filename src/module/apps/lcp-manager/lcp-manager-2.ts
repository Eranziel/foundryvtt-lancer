import { LANCER } from "../../config";
import { IContentPackManifest } from "../../util/unpacking/packed-types";
import type ApplicationV2 from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/client-esm/applications/api/application.mjs";
import { DeepPartial } from "@league-of-foundry-developers/foundry-vtt-types/src/types/utils.mjs";
const { ApplicationV2: AppV2, HandlebarsApplicationMixin } = foundry.applications.api;

const lp = LANCER.log_prefix;

let LCPManager: any;

async function mountLCPManager(target: HTMLElement) {
  if (!LCPManager) {
    LCPManager = (await import("./LCPManager.svelte")).default;
  }
  return new LCPManager({
    target,
    props: {},
  });
}

/**
 * Insert a button into the compendium sidebar for opening the LCP Manager.
 * @param app Application to insert the button into. This should be the compendium sidebar!
 * @param html The rendered HTML of the target application.
 */
export function addLCPManagerButton(app: Application, html: any) {
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

class LCPManager2 extends HandlebarsApplicationMixin(AppV2) {
  constructor(options: Partial<ApplicationV2.Configuration> = {}) {
    super(options);
  }

  static DEFAULT_OPTIONS = {
    id: "lcp-manager",
    window: {
      title: "LANCER Compendium Manager",
      icon: "cci cci-content-manager i--sm",
      resizable: false,
    },
    classes: ["lancer", "lcp-manager"],
    position: {
      width: 1200,
      height: 800,
    },
  };

  static PARTS = {
    lcpManager: {
      template: `systems/lancer/templates/lcp/lcp-manager-2.hbs`,
    },
  };

  async _prepareContext(_options: any): Promise<{}> {
    return {};
  }

  _onFirstRender(context: {}, options: DeepPartial<ApplicationV2.RenderOptions>): void {
    super._onRender(context, options);
    const mount = $(this.element).find(".svelte-app-mount");
    if (!mount || !mount.length) return;
    mountLCPManager(mount[0]);
  }
}
