

function addLCPManager(app:Application, html:HTMLElement) {
  if (app.options.id == "compendium") {
    var footer = html[0].lastElementChild;
    var button = document.createElement("button");
    button.setAttribute("style","flex-basis: 100%;margin-top: 5px;")
    button.innerHTML = "<i class='fas fa-file-import'></i> LANCER Compendium Manager";
    footer.append(button);
    button.addEventListener("click", (ev:MouseEvent) => {
      let dialog = new LCPImportDialog().render(true)
    })
  }
}

class LCPManager extends Application {
  
}

class LCPImportDialog extends Dialog {
  constructor(dialogData?, ...args) {
    if (!dialogData) { dialogData = {} }
    super(mergeObject(dialogData, {
      title: "Import LCP File",
      content:
      `
      <form autocomplete="off" class="prototype">
      <div>
      <label>LCP Path:</label>
      <div class="form-fields flexrow" style="align-items: center">
        <input type="text" name="lcp-up" class="lcp-up" value="" placeholder="path/pack.lcp">
        <button type="button" class="lcp-file-picker" data-target="lcp-up" title="Browse Files" tabindex="-1" style="max-width: 100px">
          Browse
          <i class="fas fa-file-import fa-fw"></i>
        </button>
      </div>
      </div>
      </form>
      `,
      buttons: {
        import: {
          label: "Import",
          callback: async (html) => {
            console.log("You hit the import button");
            return;
            
            //LCPImport(file, fileName, compendiumName);
          }
        },
        cancel: {
          label: "Cancel"
        }
      },
      default: "import"
    }, ...args));
  }

  activateListeners(html) {
    super.activateListeners(html);
    document.getElementsByClassName("lcp-file-picker")[0].addEventListener("click", (ev:Event) => {
			this._onFilePickerButtonClick(<MouseEvent>ev);
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

function renderLCPManager() {
	
}

export {
  LCPManager,
  addLCPManager,
}
