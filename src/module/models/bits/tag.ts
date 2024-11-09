import { LANCER } from "../../config";
import { PackedTagData, PackedTagTemplateData } from "../../util/unpacking/packed-types";
import { LIDField } from "../shared";

// @ts-ignore
const fields: any = foundry.data.fields;

// Stored on items
export interface TagData {
  lid: string;
  val: string;
}

// Stored in config
export interface TagTemplateData {
  lid: string;
  name: string;
  description: string;
  filter_ignore: boolean; // ??? No idea what this does tbh
  hidden: boolean; // Used to trigger hidden behaviors
}

const PLACEHOLDER = "...";

// TagData "Hydrated" with TagTemplateData.
export class Tag implements Readonly<TagData> {
  lid: string;
  val: string;

  name: string = PLACEHOLDER;
  description: string = "Tag not found";
  hidden: boolean = false; // Decent first guess

  constructor(data: TagData) {
    this.lid = data.lid;
    this.val = data.val;

    // Begin a job to look it up from the actual tag object
    let tagConfig = game.settings.get(game.system.id, LANCER.setting_tag_config) as Record<string, TagTemplateData>;
    let assocTag = tagConfig[data.lid];
    if (assocTag) {
      this.name = assocTag.name;
      this.description = assocTag.description;
      this.hidden = assocTag.hidden;
    }
  }

  get num_val(): number | null {
    // Make sure our value has a specifically accessible numeric value
    let parsed = Number.parseInt(this.val);
    if (Number.isNaN(parsed)) {
      return null;
    } else {
      return parsed;
    }
  }

  /**
   * Helper funciton to interpolate the correct value from tags with values matching
   * the pattern {number/number/number}
   * @param tag A tag with a value
   * @param tier The NPC tier to get the value for
   * @returns The string for the requested tier from the tag value
   */
  tierVal(tier: number): string {
    if (!this.val) return "";
    // This regex which matches {number/number/number} and returns each tier as a match group
    const tieredValRegex = /^{(\d*)\/(\d*)\/(\d*)}$/i;
    const matchTiers = this.val.match(tieredValRegex);
    // NOTE: we don't need to subtract 1 from the tier, because the first element of
    // matchTiers is the whole match, e.g. "{2/3/4}"
    if (!matchTiers || !matchTiers.length || !matchTiers[0] || !matchTiers[tier]) {
      // if it doesn't match the regex, just return the value
      return this.val;
    }
    // Select the appropriate group for the NPC's tier
    // parseInt the tier group and return
    return matchTiers[tier];
  }

  save(): TagData {
    return {
      lid: this.lid,
      val: this.val,
    };
  }

  copy(): Tag {
    return new Tag(this.save());
  }

  get should_show(): boolean {
    return !this.hidden;
  }
  get is_unique(): boolean {
    return this.lid === "tg_unique";
  }
  get is_ai(): boolean {
    return this.lid === "tg_ai";
  }
  get is_ap(): boolean {
    return this.lid === "tg_ap";
  }
  get is_limited(): boolean {
    return this.lid === "tg_limited";
  }
  get is_loading(): boolean {
    return this.lid === "tg_loading";
  }
  get is_recharge(): boolean {
    return this.lid === "tg_recharge";
  }
  get is_indestructible(): boolean {
    return this.lid === "tg_indestructible";
  }
  get is_smart(): boolean {
    return this.lid === "tg_smart";
  }
  get is_seeking(): boolean {
    return this.lid === "tg_seeking";
  }
  get is_overkill(): boolean {
    return this.lid === "tg_overkill";
  }
  get is_accurate(): boolean {
    return this.lid === "tg_accurate";
  }
  get is_inaccurate(): boolean {
    return this.lid === "tg_inaccurate";
  }
  get is_reliable(): boolean {
    return this.lid === "tg_reliable";
  }
  get is_selfheat(): boolean {
    return this.lid === "tg_heat_self";
  }
  get is_knockback(): boolean {
    return this.lid === "tg_knockback";
  }
  get is_overshield(): boolean {
    return this.lid === "tg_overshield";
  }
  get is_cascaderesistant(): boolean {
    return this.lid === "tg_no_cascade";
  }
  get is_ordnance(): boolean {
    return this.lid === "tg_ordnance";
  }

  static MergeTags(...tag_arrays: Tag[][]) {
    if (!tag_arrays.length) return [];

    // Create a cloned array of the first tag array
    let result: Tag[] = [];

    // Build a cache as we go so we don't have to .find constantly
    let cache: { [key: string]: Tag | undefined } = {};

    // And, go!
    for (let add_tag of tag_arrays.flat()) {
      // Find duplicate if it exists
      let clone = cache[add_tag.lid];

      if (!clone) {
        // If it doesn't, we always append
        let d = add_tag.copy();
        cache[add_tag.lid] = d;
        result.push(d);
      } else {
        // If it does, we merge as specified above
        if (add_tag.is_reliable || add_tag.is_selfheat || add_tag.is_knockback || add_tag.is_overshield) {
          clone.val = ((clone.num_val ?? 0) + (add_tag.num_val ?? 0)).toString();
        } else if (add_tag.is_accurate || add_tag.is_inaccurate) {
          result.push(add_tag.copy());
        } else if (add_tag.is_limited) {
          clone.val = Math.min(clone.num_val ?? 0, add_tag.num_val ?? 0).toString();
        } else if (add_tag.is_recharge) {
          clone.val = Math.max(clone.num_val ?? 0, add_tag.num_val ?? 0).toString();
        } else {
          // Discard it - we already have it and it doesn't have a special merger rule
        }
      }
    }

    return result;
  }
}

// Tag fields populate fuller metadata from the settings (or something? It's tbd), in spite of the field itself just being an lid value pair
export class TagField extends fields.SchemaField {
  constructor(options = {}) {
    super(
      {
        lid: new LIDField(),
        val: new fields.StringField({ nullable: false }),
      },
      options
    );
  }

  /** @override */
  initialize(value: TagData, model: unknown) {
    return new Tag(value);
  }

  /** @override */
  _cast(value: any) {
    // Make sure num_val gets turned back into val
    if (value.num_val) {
      value["val"] = String(value.num_val);
    }
    return super._cast(value);
  }

  migrateSource(sourceData: any, fieldData: any) {
    // Convert old style tags
    if (typeof fieldData?.tag == "object") {
      fieldData.lid = fieldData.tag.fallback_lid;
    }
    return super.migrateSource(sourceData, fieldData);
  }
}

export function unpackTagTemplate(data: PackedTagTemplateData): TagTemplateData {
  return {
    description: data.description,
    filter_ignore: data.filter_ignore ?? false,
    hidden: data.hidden ?? false,
    lid: data.id,
    name: data.name,
  };
}

export function unpackTag(data: PackedTagData): TagData {
  return {
    lid: data.id,
    val: (data.val ?? "").toString(),
  };
}
