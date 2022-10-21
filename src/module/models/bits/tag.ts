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
  readonly lid: string;
  readonly val: string;

  readonly num_val: number | null;

  name: string = PLACEHOLDER;
  description: string = PLACEHOLDER;

  constructor(data: TagData) {
    this.lid = data.lid;
    this.val = data.val;

    // Make sure our value has a specifically accessible numeric value
    let parsed = Number.parseInt(data.val);
    if (Number.isNaN(parsed)) {
      this.num_val = null;
    } else {
      this.num_val = parsed;
    }

    // Begin a job to look it up from the actual tag object
    compendium_lookup_lid(data.lid, EntryType.TAG).then(doc => {
      if (doc && doc instanceof LancerItem && doc.is_tag()) {
        this.name = doc.name || "";
        this.description = doc.system.description;
      } else {
        this.name = "MISSINGTAG";
        this.description = `Tag "${data.lid}" was not found in your tag compendium`;
      }
    });
  }

  save(): TagData {
    return {
      lid: this.lid,
      val: this.val,
    };
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
