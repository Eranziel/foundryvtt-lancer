import { HelperOptions } from "handlebars";
import { Bonus, Damage, License, WeaponMod } from "machine-mind";
import { license_ref, manufacturer_ref, bonuses_display, damage_editor, range_editor } from './item';
import { large_textbox_card, resolve_helper_dotpath } from './commons';

export function item_edit_arrayed_actions(): string {
    console.log("TODO: Add arrayed actions editor");
    return `<span>TODO: Add arrayed actions editor</span>`
}

/**
 * The standard damage editor
 * @param path      Path to the Damage array
 * @param title     Title of our editor, in case we don't just want it to be DAMAGE
 * @param helper    Standard helper object
 * @returns         HTML for an editable damage area
 */
export function item_edit_arrayed_damage(path: string, title: string, helper: HelperOptions): string {
    let dam_arr: Array<Damage> = resolve_helper_dotpath(helper,path);

    let dam_detail = "";

    if(dam_arr) {
        for (let i = 0; i < dam_arr.length; i++) {
            dam_detail = dam_detail.concat(damage_editor(path.concat(`.${i}`),helper));
        }
    }

    return `
    <div class="card clipped double">
      <span class="lancer-header submajor ">
        ${title}
        <a class="gen-control fas fa-plus" data-action="append" data-path="${path}" data-action-value="(struct)damage"></a>
      </span>
      ${dam_detail}
    </div>`
}

/**
 * The standard range editor
 * @param path      Path to the Range array
 * @param title     Title of our editor, in case we don't just want it to be RANGE
 * @param helper    Standard helper object
 * @returns         HTML for an editable range area
 */
export function item_edit_arrayed_range(path: string, title: string, helper: HelperOptions): string {
    let range_arr: Array<Range> = resolve_helper_dotpath(helper,path);

    let range_detail = "";

    if(range_arr) {
        for (let i = 0; i < range_arr.length; i++) {
            range_detail = range_detail.concat(range_editor(path.concat(`.${i}`),helper));
        }
    }

    return `
    <div class="card clipped double">
      <span class="lancer-header submajor ">
        ${title}
        <a class="gen-control fas fa-plus" data-action="append" data-path="mm.ent.Profiles.{{prof_index}}.BaseRange" data-action-value="(struct)range"></a>
      </span>
      ${range_detail}
    </div>`
}

export function item_edit_arrayed_tags(): string {
    console.log("TODO: Add arrayed tags editor");
    return `<span>TODO: Add arrayed tags editor</span>`
}
export function item_edit_arrayed_bonuses(path: string, helper: HelperOptions): string {
    let arr: Bonus[] = resolve_helper_dotpath(helper,path);
    if(!arr) arr = []
    return bonuses_display(path, arr, true);
}

export function item_edit_arrayed_counters(): string {
    console.log("TODO: Add arrayed counters editor");
    return `<span>TODO: Add arrayed counters editor</span>`
}
export function item_edit_arrayed_deployables(): string {
    console.log("TODO: Add arrayed deployables editor");
    return `<span>TODO: Add arrayed deployables editor</span>`
}
export function item_edit_arrayed_synergies(): string {
    console.log("TODO: Add arrayed synergies editor");
    return `<span>TODO: Add arrayed synergies editor</span>`
}
export function item_edit_arrayed_enum(title: string, path: string, enum_name: string, helper: HelperOptions): string {
    console.log("TODO: Add arrayed enum editor");
    return `<span>TODO: Add arrayed enum editor</span>`
}

/**
 * The edit field to be used for any items
 * @param path      Path of the effect
 * @param helper    Standard helper
 * @returns         HTML for effect editor
 */
export function item_edit_effect(path: string, helper: HelperOptions): string {
    // TODO: We can do better than this
    return large_textbox_card("EFFECT",path,helper);
}


export function item_edit_arrayed_integrated(): string {
    console.log("TODO: Add integrated editor");
    return `<span>TODO: Add integrated editor</span>`
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


    if(!license) licenseInfo = "No license"
    else licenseInfo = `<div class="lancer-license-header medium clipped-top">
    <i class="cci cci-license i--m i--dark"> </i>
    <span class="major modifier-name">${license.Name}</span>
  </div>`;

    return `      
    <div class="flexcol edit-license-wrapper">
        ${licenseInfo}
        <div class="flexrow rank-wrapper">
            <span>Rank</span>
            <input name="mm.ent.LicenseLevel" value="${helper.data.root.mm.ent.LicenseLevel}" type="number" data-dtype="Number" />
        </div>
    </div>`
}
export function item_edit_sp(): string {
    console.log("TODO: Add SP editor");
    return `<span>TODO: Add SP editor</span>`
}
export function item_edit_uses(helper: HelperOptions): string {
    let cur_uses_path = "mm.ent.Uses"
    let max_uses_path = "data.max_uses"
    let cur_uses = resolve_helper_dotpath(helper,cur_uses_path);
    let max_uses = resolve_helper_dotpath(helper,max_uses_path);

    return ` 
    <div class="flexcol uses-editor clipped-top">
        <span class="major">Uses</span>
        <div class="flexrow flex-center no-wrap">
            <input class="lancer-stat lancer-stat" type="number" name="${cur_uses_path}" value="${cur_uses}" data-dtype="Number" style="justify-content: left"/>
            <span>/</span>
            <input class="lancer-stat lancer-stat" type="number" name="${max_uses_path}" value="${max_uses}" data-dtype="Number" style="justify-content: left"/>
        </div>
    </div>`;
}
