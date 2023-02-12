import type { HelperOptions } from "handlebars";
import {
  Bonus,
  Damage,
  License,
  WeaponSize,
  WeaponType,
  Action,
  Deployable,
  Synergy,
  ActivationType,
  EntryType,
} from "machine-mind";
import { bonuses_display, damage_editor, range_editor, buildActionHTML, buildDeployableHTML } from "./item";
import { large_textbox_card, resolve_helper_dotpath, std_enum_select, std_num_input } from "./commons";
import { ref_commons, ref_params } from "./refs";

export function item_edit_arrayed_actions(path: string, title: string, helper: HelperOptions): string {
  let action_arr: Array<Action> = resolve_helper_dotpath(helper, path);

  let action_detail = "";

  if (action_arr) {
    for (let i = 0; i < action_arr.length; i++) {
      action_detail = action_detail.concat(
        buildActionHTML(action_arr[i], { editable: true, path: path.concat(`.${i}`), full: true, num: i })
      );
    }
  }

  return `
    <div class="card clipped double edi">
      <span class="lancer-header submajor ">
        ${title}
        <a class="gen-control fas fa-plus" data-action="append" data-path="${path}" data-action-value="(struct)action"></a>
      </span>
      <div class="editable-action-array">
        ${action_detail}
      </div>
    </div>`;
}

/**
 * The standard damage editor
 * @param path      Path to the Damage array
 * @param title     Title of our editor, in case we don't just want it to be DAMAGE
 * @param helper    Standard helper object
 * @returns         HTML for an editable damage area
 */
export function item_edit_arrayed_damage(path: string, title: string, helper: HelperOptions): string {
  let dam_arr: Array<Damage> = resolve_helper_dotpath(helper, path);

  let dam_detail = "";

  if (dam_arr) {
    for (let i = 0; i < dam_arr.length; i++) {
      dam_detail = dam_detail.concat(damage_editor(path.concat(`.${i}`), helper));
    }
  }

  return `
    <div class="card clipped double edi">
      <span class="lancer-header submajor ">
        ${title}
        <a class="gen-control fas fa-plus" data-action="append" data-path="${path}" data-action-value="(struct)damage"></a>
      </span>
      ${dam_detail}
    </div>`;
}

/**
 * The standard range editor
 * @param path      Path to the Range array
 * @param title     Title of our editor, in case we don't just want it to be RANGE
 * @param helper    Standard helper object
 * @returns         HTML for an editable range area
 */
export function item_edit_arrayed_range(path: string, title: string, helper: HelperOptions): string {
  let range_arr: Array<Range> = resolve_helper_dotpath(helper, path);

  let range_detail = "";

  if (range_arr) {
    for (let i = 0; i < range_arr.length; i++) {
      range_detail = range_detail.concat(range_editor(path.concat(`.${i}`), helper));
    }
  }

  return `
    <div class="card clipped double">
      <span class="lancer-header submajor ">
        ${title}
        <a class="gen-control fas fa-plus" data-action="append" data-path="${path}" data-action-value="(struct)range"></a>
      </span>
      ${range_detail}
    </div>`;
}

/**
 * The standard bonus editor
 * @param path      Path to the Bonus array
 * @param helper    Standard helper object
 * @returns         HTML for an editable bonus area
 */
export function item_edit_arrayed_bonuses(path: string, helper: HelperOptions): string {
  let arr: Bonus[] = resolve_helper_dotpath(helper, path);
  if (!arr) arr = [];
  return bonuses_display(path, arr, true);
}

export function item_edit_arrayed_counters(): string {
  console.log("TODO: Add arrayed counters editor");
  return `<span>TODO: Add arrayed counters editor</span>`;
}

/**
 * The standard deployable editor
 * @param path      Path to the Deployable array
 * @param title     Title of our editor
 * @param helper    Standard helper object
 * @returns         HTML for an editable deployable area
 */
export function item_edit_arrayed_deployables(path: string, title: string, helper: HelperOptions): string {
  let dep_arr: Array<Deployable> = resolve_helper_dotpath(helper, path);

  let depHTML = dep_arr
    .map((d: Deployable, i: number | undefined) => {
      return buildDeployableHTML(d, true, i);
    })
    .join("");

  return `
    <div class="card clipped">
      <span class="lancer-header submajor clipped-top">
        ${title}
      </span>
      ${depHTML}
    </div>`;
}

/**
 * The standard synergy editor
 * @param path      Path to the Synergy array
 * @param title     Title of our editor
 * @param helper    Standard helper object
 * @returns         HTML for an editable synergy area
 */
export function item_edit_arrayed_synergies(path: string, title: string, helper: HelperOptions): string {
  let syn_arr: Array<Synergy> = resolve_helper_dotpath(helper, path);

  let synHTML = syn_arr
    .map((d: Synergy, i: number | undefined) => {
      return ``;
    })
    .join("");

  return `
    <div class="card clipped">
      <span class="lancer-header submajor clipped-top">
        ${title}
      </span>
      ${synHTML}
    </div>`;
}

/**
 * Allows for control of an array of selectors, build from a given enum. No validation is performed
 * @param title         Title of the field
 * @param path          Path to the array
 * @param enum_name     Enum to use. Must be added here and in commons > control_structs
 *                       Currently supported:
 *                          * WeaponSize
 *                          * WeaponType
 *                          * Activation
 * @param helper        Standard helper object
 * @returns             HTML for an array of selectable, addable and removable items from the struct
 */
export function item_edit_arrayed_enum(title: string, path: string, enum_name: string, helper: HelperOptions): string {
  let resolved_enum = resolve_enum(enum_name);

  let enum_arr: Array<typeof resolved_enum> = resolve_helper_dotpath(helper, path);

  let selector_detail = "";

  if (enum_arr) {
    for (let i = 0; i < enum_arr.length; i++) {
      selector_detail = selector_detail.concat(`
            <div class="flexrow">
                ${std_enum_select(path.concat(`.${i}`), resolved_enum, helper)}
                <a class="gen-control fas fa-trash" data-action="splice" data-path="${path.concat(`.${i}`)}"></a>
            </div>`);
    }
  }

  return `
    <div class="card clipped item-edit-arrayed">
      <span class="lancer-header submajor ">
        ${title}
        <a class="gen-control fas fa-plus" data-action="append" data-path="${path}" data-action-value="(struct)${enum_name}"></a>
      </span>
        ${selector_detail}
    </div>`;
}

export function item_edit_enum(path: string, enum_name: string, helper: HelperOptions) {
  let resolved_enum = resolve_enum(enum_name);
  // Resolve the enum name

  return std_enum_select(path, resolved_enum, helper);
}

function resolve_enum(enum_name: string): any {
  enum none_enum {
    None = "None",
  }
  switch (enum_name) {
    case "WeaponSize":
      return WeaponSize;
    case "WeaponType":
      return WeaponType;
    case "ActivationType":
      return ActivationType;
    case "ReserveType":
      // machine-mind and C/C don't seem to fully agree, so we're making our own for now.
      return {
        Resource: "Resources",
        Tactical: "Tactical",
        Mech: "Mech",
        Project: "Project",
        Organization: "Organization",
        Bonus: "Bonus",
      };
    default:
      console.debug("Using default enum with enum_name of ".concat(enum_name));
      return none_enum;
  }
}

/**
 * The edit field to be used for any items
 * @param path      Path of the effect
 * @param helper    Standard helper
 * @returns         HTML for effect editor
 */
export function item_edit_effect(path: string, helper: HelperOptions): string {
  // TODO: We can do better than this
  return large_textbox_card("EFFECT", path, helper);
}

/**
 * The standard integrated item editor
 * @param path      Path to the Integrated array
 * @param title     Title of our editor
 * @param helper    Standard helper object
 * @returns         HTML for an editable integrated area
 */
export function item_edit_arrayed_integrated(path: string, title: string, helper: HelperOptions): string {
  let int_arr: Array<string> = resolve_helper_dotpath(helper, path);

  let intHTML = int_arr
    .map((s: string, i: number | undefined) => {
      return `INTEGRATED ITEM: ${s}`;
    })
    .join("");

  return `
    <div class="card clipped item-edit-arrayed">
      <span class="lancer-header submajor ">
        INTEGRATED ITEMS
        <a class="gen-control fas fa-plus" data-action="append" data-path="${path}" data-action-value="(struct)string"></a>
      </span>
        ${intHTML}
    </div>`;
}

/**
 * Renders a license to be used in any editable item.
 * Rank is editable, license itself is editable via drag & drop.
 * TODO: Should probably abstract out license data to not be locked to the root
 * @param helper    Standard helper from the template
 * @returns         HTML for license in string format
 */
export function item_edit_license(helper: HelperOptions): string {
  let license: License | null = helper.data.root.license;
  let licenseInfo: string;
  let cd = ref_commons(license);

  if (!cd || !license) licenseInfo = "No license";
  else
    licenseInfo = `<div class="valid ${EntryType.LICENSE} ref lancer-license-header medium clipped-top" ${ref_params(
      cd.ref,
      cd.uuid
    )}>
    <i class="cci cci-license i--m i--dark"> </i>
    <span class="major modifier-name">${license.Name}</span>
  </div>`;

  return `      
    <div class="flexcol edit-license-wrapper">
        ${licenseInfo}
        <div class="flexrow rank-wrapper">
            <span>Rank</span>
            <input name="mm.LicenseLevel" value="${helper.data.root.mm.LicenseLevel}" type="number" data-dtype="Number" />
        </div>
    </div>`;
}

/**
 * A standard SP editor
 * @param path      Path where we store our SP cost
 * @param helper    Standard helper
 * @returns         HTML for our SP editor
 */
export function item_edit_sp(path: string, helper: HelperOptions): string {
  console.log("TODO: Using temporary SP editor");
  helper.hash["label"] = "SP:";
  return std_num_input(path, helper);
}

/**
 * Standard uses editor, for Uses at the root of the given document
 * @param cur_uses_path  Data path to the current uses
 * @param max_uses_path  Data path to the maximum uses
 * @param helper         Standard helper from the template for a given document
 * @returns              HTML to edit Uses and Max Uses
 */
export function item_edit_uses(cur_uses_path: string, max_uses_path: string, helper: HelperOptions): string {
  let cur_uses = resolve_helper_dotpath(helper, cur_uses_path);
  let max_uses = resolve_helper_dotpath(helper, max_uses_path);

  // If we don't have max uses, it's not already limited--so we should add the tag
  if (!max_uses) return ``;

  return ` 
    <div class="flexcol uses-editor clipped-top">
        <span class="major">Uses</span>
        <div class="flexrow flex-center no-wrap">
            <input class="lancer-stat lancer-stat" type="number" name="${cur_uses_path}" value="${cur_uses}" data-dtype="Number" style="justify-content: left"/>
            <span>/</span>
            <span class="lancer-stat" style="justify-content: left">${max_uses}</span>
        </div>
    </div>`;
}
