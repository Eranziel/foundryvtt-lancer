import { HelperOptions } from "handlebars";
import { License, WeaponMod } from "machine-mind";
import { license_ref, manufacturer_ref } from "./item";

export function item_edit_arrayed_actions() {
    console.log("TODO: Add arrayed actions editor");
    return `<span>TODO: Add arrayed actions editor</span>`
}
export function item_edit_arrayed_damage() {
    console.log("TODO: Add arrayed damage editor");
    return `<span>TODO: Add arrayed damage editor</span>`
}
export function item_edit_arrayed_range() {
    console.log("TODO: Add arrayed range editor");
    return `<span>TODO: Add arrayed range editor</span>`
}
export function item_edit_arrayed_tags() {
    console.log("TODO: Add arrayed tags editor");
    return `<span>TODO: Add arrayed tags editor</span>`
}
export function item_edit_arrayed_bonuses() {
    console.log("TODO: Add arayed bonuses editor");
    return `<span>TODO: Add arayed bonuses editor</span>`
}
export function item_edit_arrayed_counters() {
    console.log("TODO: Add arrayed counters editor");
    return `<span>TODO: Add arrayed counters editor</span>`
}
export function item_edit_arrayed_deployables() {
    console.log("TODO: Add arrayed deployables editor");
    return `<span>TODO: Add arrayed deployables editor</span>`
}
export function item_edit_arrayed_synergies() {
    console.log("TODO: Add arrayed synergies editor");
    return `<span>TODO: Add arrayed synergies editor</span>`
}
export function item_edit_arrayed_enum() {
    console.log("TODO: Add arrayed enum editor");
    return `<span>TODO: Add arrayed enum editor</span>`
}
export function item_edit_effect() {
    console.log("TODO: Add effect editor");
    return `<span>TODO: Add effect editor</span>`
}
export function item_edit_arrayed_integrated() {
    console.log("TODO: Add integrated editor");
    return `<span>TODO: Add integrated editor</span>`
}


/**
 * Renders a license to be used in any editable item.
 * Rank is editable, license itself is editable via drag & drop.
 * TODO: Should probably abstract out license data to not be locked to the root
 * @param helper Standard helper from the template
 * @returns HTML for license in string format
 */
export function item_edit_license(helper: HelperOptions): string {
    let license: License | null = helper.data.root.license;
    let licenseInfo: string;


    if(!license) licenseInfo = "No license"
    else licenseInfo = `<div class="lancer-license-header medium clipped-top">
    <i class="cci cci-license i--m i--dark"> </i>
    <span class="major modifier-name">${license.Name} ${license.CurrentRank}</span>
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
export function item_edit_sp() {
    console.log("TODO: Add SP editor");
    return `<span>TODO: Add SP editor</span>`
}
export function item_edit_uses() {
    console.log("TODO: Add uses editor");
    return `<span>TODO: Add uses editor</span>`
}
