import type { HelperOptions } from "handlebars";
import { bonusesDisplay, damageEditor, rangeEditor, buildActionArrayHTML, buildDeployablesArrayHBS } from "./item";
import {
  drilldownDocument,
  extendHelper as extendHelper,
  helper_root_doc,
  large_textbox_card,
  resolveHelperDotpath,
  std_checkbox,
  std_enum_select,
  std_num_input,
} from "./commons";
import { LancerItem, LancerLICENSE } from "../item/lancer-item";
import { ActionData } from "../models/bits/action";
import { BonusData } from "../models/bits/bonus";
import { SynergyData } from "../models/bits/synergy";
import { ActivationType, EntryType, ReserveType, WeaponSize, WeaponType } from "../enums";
import { RangeData } from "../models/bits/range";
import { ref_params } from "./refs";

export function item_edit_arrayed_actions(path: string, title: string, options: HelperOptions): string {
  let doc = helper_root_doc(options);
  let dd = drilldownDocument(doc, path);

  let action_detail = "";

  if (dd.terminus) {
    action_detail = buildActionArrayHTML(dd.sub_doc, dd.sub_path, { editable: true });
  }

  return `
    <div class="card clipped double edi">
      <span class="lancer-header lancer-primary submajor ">
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
 * @param options    Standard helper object
 * @returns         HTML for an editable damage area
 */
export function item_edit_arrayed_damage(path: string, title: string, options: HelperOptions): string {
  let dam_arr = resolveHelperDotpath<ActionData[]>(options, path);

  let dam_detail = "";

  if (dam_arr) {
    for (let i = 0; i < dam_arr.length; i++) {
      dam_detail = dam_detail.concat(damageEditor(path.concat(`.${i}`), options));
    }
  }

  return `
    <div class="card clipped double edi">
      <span class="lancer-header lancer-primary submajor ">
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
 * @param options    Standard helper object
 * @returns         HTML for an editable range area
 */
export function item_edit_arrayed_range(path: string, title: string, options: HelperOptions): string {
  let range_arr = resolveHelperDotpath<RangeData[]>(options, path);

  let range_detail = "";

  if (range_arr) {
    for (let i = 0; i < range_arr.length; i++) {
      range_detail = range_detail.concat(rangeEditor(path.concat(`.${i}`), options));
    }
  }

  return `
    <div class="card clipped double">
      <span class="lancer-header lancer-primary submajor ">
        ${title}
        <a class="gen-control fas fa-plus" data-action="append" data-path="${path}" data-action-value="(struct)range"></a>
      </span>
      ${range_detail}
    </div>`;
}

/**
 * The standard bonus editor
 * @param path      Path to the Bonus array
 * @param options    Standard helper object
 * @returns         HTML for an editable bonus area
 */
export function item_edit_arrayed_bonuses(path: string, options: HelperOptions): string {
  let arr = resolveHelperDotpath<BonusData[]>(options, path, []);
  return bonusesDisplay(path, true, options);
}

export function item_edit_arrayed_counters(): string {
  console.log("TODO: Add arrayed counters editor");
  return `<span>TODO: Add arrayed counters editor</span>`;
}

/**
 * The standard deployable editor
 * @param path      Path to the Deployable array
 * @param title     Title of our editor
 * @param options    Standard helper object
 * @returns         HTML for an editable deployable area
 */
export function item_edit_arrayed_deployables(path: string, title: string, options: HelperOptions): string {
  let root = helper_root_doc(options);
  let dd = drilldownDocument(root, path);

  if (!(dd.sub_doc instanceof LancerItem)) return "";
  let depHTML = buildDeployablesArrayHBS(dd.sub_doc, dd.sub_path, extendHelper(options, { full: true }));

  return `
    <div class="card clipped">
      <span class="lancer-header lancer-primary submajor clipped-top">
        ${title}
      </span>
      ${depHTML}
    </div>`;
}

/**
 * The standard synergy editor
 * @param path      Path to the Synergy array
 * @param title     Title of our editor
 * @param options    Standard helper object
 * @returns         HTML for an editable synergy area
 */
export function item_edit_arrayed_synergies(path: string, title: string, options: HelperOptions): string {
  let syn_arr = resolveHelperDotpath<SynergyData[]>(options, path, []);

  let synHTML = syn_arr
    .map((d, i) => {
      return ``;
    })
    .join("");

  return `
    <div class="card clipped">
      <span class="lancer-header lancer-primary submajor clipped-top">
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
 * @param options        Standard helper object
 * @returns             HTML for an array of selectable, addable and removable items from the struct
 */
export function item_edit_arrayed_enum(title: string, path: string, enum_name: string, options: HelperOptions): string {
  let resolved_enum = resolve_enum(enum_name);

  let enum_arr = resolveHelperDotpath<Array<typeof resolve_enum>>(options, path, []);

  let selector_detail = "";

  if (enum_arr) {
    for (let i = 0; i < enum_arr.length; i++) {
      selector_detail = selector_detail.concat(`
            <div class="flexrow">
                ${std_enum_select(path.concat(`.${i}`), resolved_enum, options)}
                <a class="gen-control fas fa-trash" data-action="splice" data-path="${path.concat(`.${i}`)}"></a>
            </div>`);
    }
  }

  return `
    <div class="card clipped item-edit-arrayed">
      <span class="lancer-header lancer-primary submajor ">
        ${title}
        <a class="gen-control fas fa-plus" data-action="append" data-path="${path}" data-action-value="(struct)${enum_name}"></a>
      </span>
        ${selector_detail}
    </div>`;
}

export function item_edit_checkboxes_object(title: string, path: string, options: HelperOptions): string {
  let checkbox_obj = resolveHelperDotpath<Record<string, boolean>>(options, path, {});
  let selector_detail = "";
  for (let [k, v] of Object.entries(checkbox_obj)) {
    selector_detail += `<div class="flexrow">
        ${std_checkbox(path.concat(`.${k}`), extendHelper(options, { label: k }))}
    </div>`;
  }

  return `
    <div class="card clipped item-edit-arrayed">
      <span class="lancer-header lancer-primary submajor ">
        ${title}
      </span>
      ${selector_detail}
    </div>`;
}

export function item_edit_enum(path: string, enum_name: string, options: HelperOptions) {
  let resolved_enum = resolve_enum(enum_name);
  // Resolve the enum name

  return std_enum_select(path, resolved_enum, options);
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
      return ReserveType;
    default:
      console.debug("Using default enum with enum_name of ".concat(enum_name));
      return none_enum;
  }
}

/**
 * The edit field to be used for any items
 * @param path      Path of the effect
 * @param options    Standard helper
 * @returns         HTML for effect editor
 */
export function item_edit_effect(path: string, options: HelperOptions): string {
  // TODO: We can do better than this
  return large_textbox_card("EFFECT", path, options);
}

/**
 * The standard integrated item editor
 * @param path      Path to the Integrated array
 * @param title     Title of our editor
 * @param options    Standard helper object
 * @returns         HTML for an editable integrated area
 */
export function item_edit_arrayed_integrated(path: string, title: string, options: HelperOptions): string {
  let int_arr = resolveHelperDotpath<Array<string>>(options, path, []);

  let intHTML = int_arr
    .map((s: string, i: number | undefined) => {
      return `INTEGRATED ITEM: ${s}`;
    })
    .join("");

  return `
    <div class="card clipped item-edit-arrayed">
      <span class="lancer-header lancer-primary submajor ">
        INTEGRATED ITEMS
      </span>
        ${intHTML}
    </div>`;
}

/**
 * Renders a license to be used in any editable item.
 * Rank is editable, (TODO: license itself is editable via drag & drop).
 * TODO: Should probably abstract out license data to not be locked to the root
 * @param options    Standard helper from the template
 * @returns         HTML for license in string format
 */
export function item_edit_license(options: HelperOptions): string {
  let license: LancerLICENSE | null = options.data.root?.license || null;
  let licenseInfo: string;
  let rankInfo: string;
  if (!license) {
    licenseInfo = `<div class="lancer-license medium">
      <span class="major modifier-name">No License</span>
    </div>`;
    rankInfo = ``;
  } else {
    licenseInfo = `<div class="${EntryType.LICENSE} ref lancer-license medium" ${ref_params(license)}>
      <i class="cci cci-license i--m i--dark"> </i>
      <span class="major modifier-name">${license.name}</span>
    </div>`;
    rankInfo = `<div class="flexrow rank-wrapper">
    <span>Rank</span>
    <input name="system.license_level" value="${options.data.root.data.system.license_level}" type="number" data-dtype="Number" />
</div>`;
  }

  return `      
    <div class="flexrow edit-license-wrapper">
        ${licenseInfo}
        ${rankInfo}
    </div>`;
}

/**
 * A standard SP editor
 * @param path      Path where we store our SP cost
 * @param options    Standard helper
 * @returns         HTML for our SP editor
 */
export function item_edit_sp(path: string, options: HelperOptions): string {
  options.hash["label"] = "SP:";
  return std_num_input(path, options);
}

/**
 * Standard uses editor, for Uses at the root of the given document
 * @param cur_uses_path  Data path to the current uses
 * @param max_uses_path  Data path to the maximum uses
 * @param options         Standard helper from the template for a given document
 * @returns              HTML to edit Uses and Max Uses
 */
export function item_edit_uses(cur_uses_path: string, max_uses_path: string, options: HelperOptions): string {
  let cur_uses = resolveHelperDotpath(options, cur_uses_path);
  let max_uses = resolveHelperDotpath(options, max_uses_path);

  // If we don't have max uses, it's not already limited--so we should add the tag
  if (!max_uses) return ``;

  return ` 
    <div class="flexcol uses-editor clipped-top">
        <span class="major">Uses</span>
        <div class="flexrow flex-center no-wrap">
            <input class="lancer-stat" type="number" name="${cur_uses_path}" value="${cur_uses}" data-dtype="Number" style="justify-content: left"/>
            <span>/</span>
            <span class="lancer-stat" style="justify-content: left">${max_uses}</span>
        </div>
    </div>`;
}
