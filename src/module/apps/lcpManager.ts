

function addLCPManager(app:Application, html:HTMLElement) {
  if (app.options.id == "compendium") {
    var footer = html[0].lastElementChild;
    var button = document.createElement("button");
    button.setAttribute("style","flex-basis: 100%;margin-top: 5px;")
    button.innerHTML = "<i class='fas fa-file-import'></i> LANCER Compendium Manager";
    footer.append(button);
    button.addEventListener("click", (ev:MouseEvent) => {
      let mgr = new LCPManager().render(true)
    })
  }
}

class LCPManager extends Application {
  constructor(...args) {
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

    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);
    document.getElementsByClassName("lcp-file-picker")[0].addEventListener("click", (ev:Event) => {
			this._onFilePickerButtonClick(<MouseEvent>ev);
    });
    document.getElementsByClassName("lcp-import")[0].addEventListener("click", (ev:Event) => {
			this._onImportButtonClick(<MouseEvent>ev);
    });
  }
  
  _onFilePickerButtonClick(ev:MouseEvent) {
    let button = <HTMLButtonElement>ev.target;
    let target  = <HTMLElement>button.parentElement.getElementsByClassName(button.getAttribute("data-target"))[0];
    let fp = new FilePicker({field: target})
    // @ts-expect-error
    fp.extensions = [".lcp"]
    // @ts-expect-error
    fp.browse();
  }

  _onImportButtonClick(ev:MouseEvent) {
    let target = $(ev.currentTarget).closest('.lcp-up')[0]
    console.log(`You hit the import button`, target);
  }
}

export {
  LCPManager,
  addLCPManager,
}
