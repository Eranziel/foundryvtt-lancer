import { EntryType, TagTemplate } from "machine-mind";
import { LancerItem } from "../../item/lancer-item";
import { SourceTemplates } from "../../source-template";
import { SystemTemplates } from "../../system-template";
import { compendium_lookup_lid } from "../../util/lid";
import { LIDField } from "../shared";

// @ts-ignore
const fields: any = foundry.data.fields;

export interface TagData {
  lid: string;
  val: string;
}

const PLACEHOLDER = "...";

// "Hydrated" TagData.
export class Tag implements Readonly<TagData> {
  lid: string;
  val: string;

  name: string = PLACEHOLDER;
  description: string = PLACEHOLDER;
  hidden: boolean = false; // Decent first guess

  constructor(data: TagData) {
    this.lid = data.lid;
    this.val = data.val;

    // Begin a job to look it up from the actual tag object
    /*
    compendium_lookup_lid(data.lid, EntryType.TAG).then(doc => {
      if (doc && doc instanceof LancerItem && doc.is_tag()) {
        this.name = doc.name || "";
        this.description = doc.system.description;
      } else {
        this.name = "MISSINGTAG";
        this.description = `Tag "${data.lid}" was not found in your tag compendium`;
      }
    });*/
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
    // TODO: Finalize this so it actually behaves as expected
    super(
      {
        lid: new LIDField(),
        val: new fields.StringField({ nullable: false }),
      },
      options
    );
  }

  /** @override */
  initialize(model: unknown, name: unknown, value: TagData) {
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
}
