import { LANCER } from "../config";
const lp = LANCER.log_prefix;
import { LancerItemSheet } from "./item-sheet";

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
    });
  }

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
}

