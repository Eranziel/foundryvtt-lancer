import { npc_features } from "machine-mind";
import { LANCER } from "../config";
import { LancerNPCFeatureData, LancerNPCFeatureItemData } from "../interfaces";
const lp = LANCER.log_prefix;
import { LancerItemSheet } from "./item-sheet";
import { LancerItem } from "./lancer-item";

/**
 * Extend the generic Lancer item sheet
 * @extends {LancerItemSheet}
 */
export class LancerNPCClassSheet extends LancerItemSheet {
  /**
   * @override
   * Extend and override the default options used by the generic Lancer item sheet
   * @returns {Object}
   */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      width: 900,
      height: 750,
      dragDrop: [{dragSelector: ".item"}],
    });
  }

  base_feature_items!: LancerNPCFeatureItemData[];
  optional_feature_items!: LancerNPCFeatureItemData[];

  /** @override */
  _updateObject(event: any, formData: any) {
    formData["data.stats.hp"] = LancerNPCClassSheet.arrayifyStats(formData["data.stats.hp"]);
    formData["data.stats.heatcap"] = LancerNPCClassSheet.arrayifyStats(formData["data.stats.heatcap"]);
    formData["data.stats.structure"] = LancerNPCClassSheet.arrayifyStats(formData["data.stats.structure"]);
    formData["data.stats.stress"] = LancerNPCClassSheet.arrayifyStats(formData["data.stats.stress"]);
    formData["data.stats.armor"] = LancerNPCClassSheet.arrayifyStats(formData["data.stats.armor"]);
    formData["data.stats.evasion"] = LancerNPCClassSheet.arrayifyStats(formData["data.stats.evasion"]);
    formData["data.stats.edef"] = LancerNPCClassSheet.arrayifyStats(formData["data.stats.edef"]);
    formData["data.stats.speed"] = LancerNPCClassSheet.arrayifyStats(formData["data.stats.speed"]);
    formData["data.stats.sensor_range"] = LancerNPCClassSheet.arrayifyStats(formData["data.stats.sensor_range"]);
    formData["data.stats.save"] = LancerNPCClassSheet.arrayifyStats(formData["data.stats.save"]);
    formData["data.stats.activations"] = LancerNPCClassSheet.arrayifyStats(formData["data.stats.activations"]);
    formData["data.stats.size"] = LancerNPCClassSheet.arrayifyStats(formData["data.stats.size"]);
    formData["data.stats.hull"] = LancerNPCClassSheet.arrayifyStats(formData["data.stats.hull"]);
    formData["data.stats.agility"] = LancerNPCClassSheet.arrayifyStats(formData["data.stats.agility"]);
    formData["data.stats.systems"] = LancerNPCClassSheet.arrayifyStats(formData["data.stats.systems"]);
    formData["data.stats.engineering"] = LancerNPCClassSheet.arrayifyStats(formData["data.stats.engineering"]);

    formData["data.stats.size"] = (formData["data.stats.size"] as number[]).map(x => {
      if (x < 0.5) return 0.5;
      else if (x !== 0.5 && x % 1 < 1) return Math.floor(x);
      else return x; 
    });

    console.log(`${lp} Item sheet form data: `, formData);
    // Update the Item
    return this.object.update(formData);
  }

  static arrayifyStats(data: string[]) {
    return data.map(x => parseFloat(x));
  }

  getData(): ItemSheetData {
    let item = this.item as LancerItem;
    //Fetching local copies for use in drag-and-drop flow
    item.base_feature_items.then(features => this.base_feature_items = features);
    item.optional_feature_items.then(features => this.optional_feature_items = features);

    return super.getData();
  }

  activateListeners(html: JQuery) {
    super.activateListeners(html);

    const item = this.item as LancerItem;
    
    //These have to be refetched here despite also being fetched in getData because getData isn't allowed to be async in ItemSheets, thanks Foundry
    //So even if this looks like it's wrong, it's not
    item.base_feature_items.then(base_features => this._displayFeatures(base_features, html.find("#base_feature_items")));
    item.optional_feature_items.then(optional_features => this._displayFeatures(optional_features, html.find("#optional_feature_items")));
  }

  /** @override */
  _onDragStart(event: DragEvent) {
    const li = event.currentTarget as HTMLElement;
    const features = this.base_feature_items.concat(this.optional_feature_items);

    const selectedFeature = features.find( feature => feature._id === li.dataset["itemId"]);
    if (selectedFeature) {
      const dragData = {
        type: "Item",
        data: selectedFeature
      }
      
      if (event.dataTransfer) {
        event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
      }
    }
  }

  private _displayFeatures(features: LancerNPCFeatureItemData[], elementToReplace: JQuery<Element>) {
    let featureItems = features.map( feature => {
      switch (feature.data.feature_type) {
        case "Reaction":
          return this.reactionFeatureTemplate(feature);
        case "System":
          return this.systemFeatureTemplate(feature);
        case "Trait":
          return this.traitFeatureTemplate(feature);
        case "Tech":
          return this.techFeatureTemplate(feature);
        case "Weapon":
          return this.weaponFeatureTemplate(feature);
      }
    }).map( featureItem => {
      if (featureItem) {
        var element = jQuery(featureItem)
        element.each((i: number, item: any) => {
          item.setAttribute("draggable", "true");
          item.addEventListener("dragstart", (ev: DragEvent) => this._onDragStart(ev), false);
        })
        return element;
      }
      return jQuery("")
    }).map(element => element[0]);

    elementToReplace.replaceWith(featureItems);
  }


  /*
  ===========================================================
    NPC Feature Templates
  ===========================================================
  */

  // These need someone to run through and replace all the tier-based stuff with some other kind of display
  // Can't use the selectors and stuff because that would be massively too big.

  reactionFeatureTemplate(npc_feature: LancerNPCFeatureItemData): string {
      let template = Handlebars.compile(
        `<li class="card clipped npc-feature-compact item" style="min-width: 200px" data-item-id="{{_id}}">
        <div class="lancer-reaction-header clipped-top" style="grid-area: 1/1/2/3">
          <i class="cci cci-reaction i--m i--light"> </i>
          <span class="minor">{{name}}</span>
        </div>
        <div class="flexcol" style="margin: 10px;">
          <span class="medium flexrow">TRIGGER</span>
          <div class="effect-text" style="padding: 5px">{{{data.trigger}}}</div>
          <span class="medium flexrow">EFFECT</span>
          <div class="effect-text" style="padding: 5px">{{{data.effect}}}</div>
        </div>
        <div class="flexrow" style="justify-content: flex-end;">
          {{#each data.tags as |tag tkey|}}
          {{{compact-tag tag}}}
          {{/each}}
        </div>
        </li>`
      )
      return template(npc_feature);
  }

  systemFeatureTemplate(npc_feature: LancerNPCFeatureItemData) {
    let template = Handlebars.compile(
          `<li class="card clipped npc-feature-compact item" data-item-id="{{_id}}">
            <div class="lancer-system-header clipped-top" style="grid-area: 1/1/2/3">
              <i class="cci cci-system i--m i--light"> </i>
              <span class="minor">{{name}}</span>
            </div>
            <div class="flexcol" style="margin: 10px;">
              <span class="medium flexrow">EFFECT</span>
              <div class="effect-text" style="padding: 5px">{{{data.effect}}}</div>
            </div>
            <div class="flexrow" style="justify-content: flex-end;">
              {{#each data.tags as |tag tkey|}}
              {{{compact-tag tag}}}
              {{/each}}
            </div>
          </li>`
    )
    return template(npc_feature);
  }

  traitFeatureTemplate(npc_feature: LancerNPCFeatureItemData) {
    let template = Handlebars.compile(
      `<li class="card clipped npc-feature-compact item" data-item-id="{{_id}}">
      <div class="lancer-trait-header clipped-top" style="grid-area: 1/1/2/3">
        <i class="cci cci-trait i--m i--light"> </i>
        <span class="minor">{{name}}</span>
      </div>
      <div class="flexcol" style="margin: 10px;">
        <span class="medium flexrow">EFFECT</span>
        <div class="effect-text" style="padding: 5px">{{{data.effect}}}</div>
      </div>
      <div class="flexrow" style="justify-content: flex-end;">
        {{#each data.tags as |tag tkey|}}
        {{{compact-tag tag}}}
        {{/each}}
      </div>
      </li>`
    )
    return template(npc_feature);
  }

  techFeatureTemplate(npc_feature: LancerNPCFeatureItemData) {
    let template = Handlebars.compile(
      `<li class="card clipped npc-feature-compact tech item" style="max-height: fit-content;" data-item-id="{{_id}}">
      <div class="lancer-tech-header clipped-top" style="grid-area: 1/1/2/3">
        <i class="cci cci-tech-{{lower-case data.tech_type}} i--m i--light"> </i>
        <span class="minor">{{name}} // {{upper-case data.tech_type}} TECH</span>
      </div>
      <div class="lancer-tech-body">
        <div class="flexrow" style="grid-area: 1/2/2/3; text-align: left; white-space: nowrap;">
          {{#if data.attack_bonus}}
            {{#with (idx data.attack_bonus (dec ../data.tier_num)) as |atk|}}
              <div class="compact-acc">
              <i class="cci cci-reticule i--m i--dark"></i>
              <span class="medium">{{#if (ltpi atk "0")}}{{else}}+{{/if}}{{atk}} ATTACK BONUS</span>
            </div>
            {{/with}}
          {{/if}}
          <hr class="vsep">
          {{#if data.accuracy}}
            {{#with (idx data.accuracy (dec ../data.tier_num)) as |acc|}}
            {{#if (gtpi acc "0")}}
              <div class="compact-acc">
                <i class="cci cci-accuracy i--m i--dark"></i>
                <span class="medium">+{{acc}} ACCURACY</span>
              </div>
            {{/if}}
            {{#if (ltpi acc "0")}}
              <div class="compact-acc">
                <i class="cci cci-difficulty i--m i--dark"></i>
                <span class="medium">+{{neg acc}} DIFFICULTY</span>
              </div>
            {{/if}}
            {{/with}}
          {{/if}}
        </div>
        <div class="flexcol" style="grid-area: 3 / 1 / 4 / 3; text-align: left;">
          {{#if data.effect}}
          <div class="flexcol" style="height: fit-content; margin: 0px 10px;">
            <span class="medium flexrow">EFFECT</span>
            <div class="effect-text" style="padding: 5px">{{{data.effect}}}</div>
          </div>
          {{/if}}
        </div>
        <div class="flexrow" style="justify-content: flex-end; grid-area: 4/1/5/3">
          {{#each data.tags as |tag tkey|}}
          {{{compact-tag tag}}}
          {{/each}}
        </div>
      </div>
    </li>`
    )
    return template(npc_feature);
  }

  weaponFeatureTemplate(npc_feature: LancerNPCFeatureItemData) {
    let template = Handlebars.compile(
          `<li class="card clipped npc-feature-compact weapon item" data-item-id="{{_id}}">
          <div class="lancer-weapon-header clipped-top" style="grid-area: 1/1/2/3">
            <i class="cci cci-weapon i--m i--light"> </i>
            <span class="minor">{{name}} // {{upper-case data.weapon_type}}</span>
          </div>
          <div class="lancer-weapon-body">
            <div class="flexrow" style="grid-area: 1/2/2/3; text-align: left; white-space: nowrap;">
              {{#each data.range as |range rkey|}}
                {{> wpn-range range=range rkey=rkey}}
              {{/each}}
              <hr class="vsep">
              {{#each data.damage as |damage dkey|}}
                {{#with (idx damage.val (dec ../../data.tier_num)) as |dval|}}
                  {{> wpn-damage damage=damage dkey=dkey dval=dval}}
                {{/with}}
              {{/each}}
              <hr class="vsep">
              {{#if data.attack_bonus}}
                {{#with (idx data.attack_bonus (dec ../data.tier_num)) as |atk|}}
                  {{> npcf-atk atk=atk}}
                {{/with}}
              {{/if}}
              <hr class="vsep">
              {{#if data.accuracy}}
                {{#with (idx data.accuracy (dec ../data.tier_num)) as |acc|}}
                  {{> npcf-acc acc=acc}}
                {{/with}}
              {{/if}}
            </div>
            <div class="flexcol" style="grid-area: 3 / 1 / 4 / 3; text-align: left;">
              {{#if data.on_hit}}
              <div class="flexcol" style="height: fit-content; margin: 0px 10px;">
                <span class="medium flexrow">ON HIT</span>
                <div class="effect-text" style="padding: 5px">{{{data.on_hit}}}</div>
              </div>
              {{/if}}
              {{#if data.effect}}
              <div class="flexcol" style="height: fit-content; margin: 0px 10px;">
                <span class="medium flexrow">EFFECT</span>
                <div class="effect-text" style="padding: 5px">{{{data.effect}}}</div>
              </div>
              {{/if}}
            </div>
            <div class="flexrow" style="justify-content: flex-end; grid-area: 4/1/5/3">
              {{#each data.tags as |tag tkey|}}
              {{{compact-tag tag}}}
              {{/each}}
            </div>
          </div>
        </li>`
    )
    return template(npc_feature);
  }
}

