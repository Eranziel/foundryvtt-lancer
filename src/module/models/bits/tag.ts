// @ts-nocheck
const fields = foundry.data.fields;

import { LIDField } from "../shared";

const PLACEHOLDER = "...";

// A single <lid, value> pairing for tags. Caches its name for quicker lookup
export class TagField extends fields.SchemaField {
  constructor(options = {}) {
    super(
      {
        lid: new LIDField(),
        val: new fields.StringField({nullable: false}),
      },
      options
    );
  }

  /** @override */
  initialize(model, name, value) {
    // Coerce to a range
    let rv = foundry.utils.duplicate(value);

    // Give default values for name and description
    rv["name"] = PLACEHOLDER;
    rv["description"] = PLACEHOLDER;

    // Look them up from the actual tag object
    let tag_pack = game.packs.get("world.tag")!;
    tag_pack?.getDocuments({lid: value.lid}).then(docs => {
        if(docs.length) {
            let doc = docs[0];
            rv["name"] = doc.name;
            rv["description"] = doc.system.description;
        } else {
            rv["name"] = "MISSINGTAG";
            rv["description"] = `Tag "${value.lid}" was not found in your tag compendium`;
        }
    });

    // Also make sure our value has a specifically accessible numeric value
    let parsed = Number.parseInt(value.val);
    if (Number.isNaN(parsed)) {
        rv["num_val"] = null;
    } else {
        rv["num_val"] = parsed;
    }
  }

  /** @override */
  _cast(value) {
      // Make sure num_val gets turned back into val
      if(value.num_val) {
        value["val"] = String(value.num_val);
      }
      return super._cast(value);
  }
}