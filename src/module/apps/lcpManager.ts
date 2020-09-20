import { LANCER } from "../config";
const lp = LANCER.log_prefix;
import { convertLancerData } from "../compBuilder";

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
  constructor(...args: any[]) {
    super(...args);
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
    data.core_update = "abc";
    return data;
  }

  activateListeners(html: HTMLElement | JQuery<HTMLElement>) {
    super.activateListeners(html);
    document.getElementsByClassName("lcp-file-picker")[0].addEventListener("click", (ev: Event) => {
      this._onFilePickerButtonClick(<MouseEvent>ev);
    });
    document.getElementsByClassName("lcp-core-update")[0].addEventListener("click", (ev: Event) => {
      this._onCoreUpdateButtonClick(<MouseEvent>ev);
    });
    document.getElementsByClassName("lcp-import")[0].addEventListener("click", (ev: Event) => {
      this._onImportButtonClick(<MouseEvent>ev);
    });
  }

  _onFilePickerButtonClick(ev: MouseEvent) {
    let button = <HTMLButtonElement>ev.target;
    let parent = <HTMLElement>button.parentElement;
    let dataTarget = button.getAttribute("data-target");
    if (!parent || !dataTarget) {
      console.log(`${lp} Failed to open file picker.`, parent, dataTarget);
      return;
    }
    let target = parent.getElementsByClassName(dataTarget)[0];
    let fp = new FilePicker({ field: target });
    // @ts-expect-error
    fp.extensions = [".lcp"];
    // @ts-expect-error
    fp.browse();
  }

  _onCoreUpdateButtonClick(ev: MouseEvent) {
    if (!ev.currentTarget) return;
    console.log(`You hit the core update button`);
    convertLancerData();
  }

  _onImportButtonClick(ev: MouseEvent) {
    if (!ev.currentTarget) return;
    let target = $(ev.currentTarget).closest(".lcp-up")[0];
    console.log(`You hit the import button`, target);
  }
}

export { LCPManager, addLCPManager };
