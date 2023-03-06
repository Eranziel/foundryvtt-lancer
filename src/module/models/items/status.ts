import { EntryType } from "../../enums.js";
import { restrict_choices, restrict_enum } from "../../helpers/commons.js";
import type { SourceData } from "../../source-template.js";
import type { PackedStatusData } from "../../util/unpacking/packed-types.js";
import { LancerDataModel } from "../shared.js";
import type { UnpackContext } from "../shared.js";
import { template_universal_item } from "./shared.js";

const fields: any = foundry.data.fields;

// @ts-ignore
export class StatusModel extends LancerDataModel {
  static defineSchema() {
    return {
      effects: new fields.HTMLField(),
      type: new fields.StringField({ choices: ["status", "condition", "effect"], initial: "effect" }),
      ...template_universal_item(),
    };
  }
}

// Converts an lcp bonus into our expected format
export function unpackStatus(
  data: PackedStatusData,
  _context: UnpackContext
): {
  name: string;
  type: EntryType.STATUS;
  img: string;
  system: DeepPartial<SourceData.Status>;
} {
  let lid = data.icon.replace("-", "");
  let img = `systems/lancer/assets/icons/white/${data.type.toLowerCase()}_${lid}.svg`;
  return {
    name: data.name,
    type: EntryType.STATUS,
    img,
    system: {
      lid,
      effects: Array.isArray(data.effects) ? data.effects.join("<br>") : data.effects,
      terse: data.terse,
      type: restrict_choices(["status", "condition", "effect"], "effect", data.type) as
        | "status"
        | "condition"
        | "effect",
    },
  };
}
