import { EntryType } from "../../enums";
import { restrict_choices, restrict_enum } from "../../helpers/commons";
import { dataTransfer } from "../../helpers/slidinghud/is-dragging";
import { SourceData } from "../../source-template";
import { PackedStatusData } from "../../util/unpacking/packed-types";
import { unpackDeployable } from "../actors/deployable";
import { unpackAction } from "../bits/action";
import { unpackBonus } from "../bits/bonus";
import { unpackCounter } from "../bits/counter";
import { unpackSynergy } from "../bits/synergy";
import { LancerDataModel, UnpackContext } from "../shared";
import { template_bascdt, template_universal_item } from "./shared";

const fields: any = foundry.data.fields;

// @ts-ignore
export class StatusModel extends LancerDataModel {
  static defineSchema() {
    return {
      effects: new fields.HTMLField(),
      type: new fields.StringField({ choices: ["Status", "Condition", "Effect"], initial: "Effect" }),
      ...template_universal_item(),
    };
  }
}

// Converts an lcp bonus into our expected format
export function unpackStatus(
  data: PackedStatusData,
  context: UnpackContext
): {
  name: string;
  type: EntryType.STATUS;
  img: string;
  system: DeepPartial<SourceData.Status>;
} {
  let img = `systems/lancer/assets/icons/white/${data.type.toLowerCase()}_${data.icon.replace("-", "")}.svg`;
  return {
    name: data.name,
    type: EntryType.STATUS,
    img,
    system: {
      lid: data.name,
      effects: Array.isArray(data.effects) ? data.effects.join("<br>") : data.effects,
      terse: data.terse,
      type: restrict_choices(["Status", "Condition", "Effect"], "Effect", data.type) as
        | "Status"
        | "Condition"
        | "Effect",
    },
  };
}
