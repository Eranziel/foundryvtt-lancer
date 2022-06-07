import { EntryType } from "machine-mind";
import { compendium_lookup_lid } from "../../util/lid";
import { LIDField } from "../shared";

// @ts-ignore
const fields: any = foundry.data.fields;

const PLACEHOLDER = "...";

export interface TagFieldSourceData {
  lid: string;
  val: string;
}

export interface TagFieldSystemData extends TagFieldSourceData {
  name: string;
  description: string;
  num_val: number | null;
}

// A single <lid, value> pairing for tags. Caches its name for quicker lookup
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
  initialize(model: any, name: string, value: TagFieldSourceData) {
    // make sure our value has a specifically accessible numeric value
    let parsed = Number.parseInt(value.val);
    let num_val: number | null;
    if (Number.isNaN(parsed)) {
      num_val = null;
    } else {
      num_val = parsed;
    }

    // Turn it into our expanded format
    let rv: TagFieldSystemData = {
      ...foundry.utils.duplicate(value),
      name: PLACEHOLDER,
      description: PLACEHOLDER,
      num_val,
    };

    // Begin a job to look it up from the actual tag object
    compendium_lookup_lid(value.lid, EntryType.TAG).then(doc => {
      if (doc) {
        rv["name"] = doc.name;
        rv["description"] = doc.data.data.description;
      } else {
        rv["name"] = "MISSINGTAG";
        rv["description"] = `Tag "${value.lid}" was not found in your tag compendium`;
      }
    });

    // That's it
    return rv;
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
