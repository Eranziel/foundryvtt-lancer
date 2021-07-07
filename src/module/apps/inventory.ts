import { EntryType, LiveEntryTypes, Mech } from 'machine-mind';
import { AnyLancerActor, AnyMMActor, LancerActorType } from '../actor/lancer-actor';
import { LancerActorSheet } from '../actor/lancer-actor-sheet';
import { HANDLER_activate_general_controls, resolve_dotpath } from '../helpers/commons';
import { HANDLER_activate_native_ref_dragging, HANDLER_activate_ref_dragging, HANDLER_openRefOnClick } from '../helpers/refs';
import { LancerActorSheetData } from '../interfaces';

interface FilledCategory {
  label: string;
  items: any[];
}

/**
 * A helper Dialog subclass for editing an actors inventories
 * @extends {Dialog}
 */
export class InventoryDialog<O extends LancerActorType> extends Dialog {
  mm: LiveEntryTypes<O>;

  constructor(
    readonly sheet_data: LancerActorSheetData<O>,
    readonly categories: FilledCategory[],
    dialogData: DialogData = {},
    options: ApplicationOptions = {}
  ) {
    super(dialogData, options);
    this.mm = sheet_data.mm;
  }

  /* -------------------------------------------- */

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      template: "systems/lancer/templates/window/inventory.hbs",
      width: 600,
      height: "auto",
      classes: ["lancer"],
    });
  }

  /** @override
   * Expose our data. Note that everything should be ready by now
   */
  getData(): any {
    // Fill out our categories
    return {
      ...super.getData(),
      categories: this.categories // this.populate_categories()
    };
  }

  /*
  populate_categories(): FilledCategory[] {
    console.log(this.sheet_data, this.categories.map((c, i) => ({
      label: c.label,
      path: c.path,
      items: resolve_dotpath(this.sheet_data, c.path)
    })));
    return this.categories.map((c, i) => ({
      label: c.label,
      path: c.path,
      items: resolve_dotpath(this.sheet_data, c.path) ?? []
    }));
  }
  */

  /**
   * @override
   * Activate event listeners using the prepared sheet HTML
   * @param html {HTMLElement}   The prepared HTML object ready to be rendered into the DOM
   */
  activateListeners(html: JQuery<HTMLElement>) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    let getfunc = () => this.getData();
    let commitfunc = (_: any) => {};

    // Enable general controls, so items can be deleted and such
    HANDLER_activate_general_controls(html, getfunc, commitfunc);  
    
    // Enable ref dragging
    HANDLER_activate_ref_dragging(html);
    HANDLER_activate_native_ref_dragging(html);
    
    // Make refs clickable to open the item
    $(html).find(".ref.valid").on("click", HANDLER_openRefOnClick);
  }

  static async show_inventory<T>(
    data: LancerActorSheetData<LancerActorType>,
  ): Promise<void> {
    // Decide categories based on type
    let cats: FilledCategory[] = [];
    if(data.mm instanceof Mech) {
      cats = [
        {
          label: "Frames",
          items: data.mm.OwnedFrames
        },
        {
          label: "Weapons",
          items: data.mm.OwnedMechWeapons
        },
        {
          label: "Systems",
          items: data.mm.OwnedSystems
        },
        {
          label: "Mods",
          items: data.mm.OwnedWeaponMods
        },
        {
          label: "Statuses",
          items: data.mm.StatusesAndConditions
          // path: "mm.StatusesAndConditions"
        },
      ];
    } else {
      console.warn("Cannot yet show inventory for " + data.mm.Type);
    }
    console.log(data, cats);

    return new Promise((resolve, reject) => {
      const dlg = new this(data, cats, {
        title: `${data.mm.Name}'s inventory`,
        buttons: {},
        /*
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Close",
            callback: () => resolve(),
          },
        },
        default: "close",
        */
        close: () => resolve(),
      });
      dlg.render(true);
    });
  }
}