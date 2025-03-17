import type { DeepPartial } from "@league-of-foundry-developers/foundry-vtt-types/src/types/utils.mjs";
import { EntryType } from "../../enums";
import { restrict_choices } from "../../helpers/commons";
import { SourceData } from "../../source-template";
import { PackedStatusData } from "../../util/unpacking/packed-types";
import { LancerDataModel, UnpackContext } from "../shared";
import { template_universal_item } from "./shared";

const fields = foundry.data.fields;

export class StatusModel extends LancerDataModel<DataSchema, Item> {
  static defineSchema() {
    return {
      effects: new fields.HTMLField(),
      type: new fields.StringField({ choices: ["status", "condition", "effect"], initial: "effect" }),
      ...template_universal_item(),
    };
  }

  static migrateData(data: any) {
    if (data.type) data.type = data.type.toLowerCase(); // Fix "Condition" / "Status"
    return super.migrateData(data);
  }

  async _preCreate(...[data, options, user]: Parameters<LancerDataModel<DataSchema, Item>["_preCreate"]>) {
    const allowed = await super._preCreate(data as any, options, user);
    if (allowed === false) return false;
    // Apply the corresponding status instead of creating the item if it's being created as embedded
    if (this.parent.parent) {
      // @ts-expect-error
      this.parent.parent.toggleStatusEffect(this.lid, { active: true });
      return false;
    }
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
  let lid = data.id || data.icon.replace("-", "") || data.name.toLowerCase();
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
