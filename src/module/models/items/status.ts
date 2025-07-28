import type { DeepPartial } from "fvtt-types/utils";
import { EntryType } from "../../enums";
import { restrict_choices } from "../../helpers/commons";
import type { SourceData } from "../../source-template";
import type { BaseData } from "../../base-data";
import type { PackedStatusData } from "../../util/unpacking/packed-types";
import { LancerDataModel, type UnpackContext } from "../shared";
import { template_universal_item } from "./shared";

import fields = foundry.data.fields;

type ActiveEffectData = ActiveEffect.InitializedData;

const defineStatusModelSchema = () => {
  return {
    effects: new fields.HTMLField(),
    type: new fields.StringField({ choices: ["status", "condition", "effect"], initial: "effect" }),
    ...template_universal_item(),
  };
};

type StatusModelSchema = ReturnType<typeof defineStatusModelSchema>;

export class StatusModel extends LancerDataModel<StatusModelSchema, Item.Implementation, BaseData.Status> {
  static DEFAULT_ICON = "systems/lancer/assets/icons/reticule.svg";
  static defineSchema() {
    return defineStatusModelSchema();
  }

  static migrateData(data: any) {
    if (data.type) data.type = data.type.toLowerCase(); // Fix "Condition" / "Status"
    return super.migrateData(data);
  }

  async _preCreate(
    ...[data, options, user]: Parameters<
      LancerDataModel<foundry.data.fields.DataSchema, Item.Implementation>["_preCreate"]
    >
  ) {
    const allowed = await super._preCreate(data as any, options, user);
    if (allowed === false) return false;
    // Apply the corresponding status instead of creating the item if it's being created as embedded
    if (this.parent.parent) {
      this.parent.parent.toggleStatusEffect(this.lid, { active: true });
      return false;
    }
  }
}

export function generateStunnedEffect({ name = "Stunned", description = "" }): Partial<ActiveEffectData> {
  return {
    name,
    description,
    changes: [
      {
        key: "system.evasion",
        mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        priority: null,
        value: "5",
      },
    ],
  };
}

// Converts an lcp bonus into our expected format
export function unpackStatus(
  data: PackedStatusData,
  _context: UnpackContext
): {
  name: string;
  type: EntryType.STATUS;
  img: string;
  effects: Partial<ActiveEffectData>[];
  system: DeepPartial<SourceData.Status>;
} {
  const lid = data.id || data.icon.replace("-", "") || data.name.toLowerCase();
  const img = `systems/lancer/assets/icons/white/${data.type.toLowerCase()}_${lid}.svg`;
  const effects = Array.isArray(data.effects) ? data.effects.join("<br>") : data.effects;
  let effect: Partial<ActiveEffectData> | undefined = undefined;
  // Special case for the one status/condition that actually modifies a stat
  if (lid === "stunned") {
    effect = generateStunnedEffect({ name: data.name, description: effects });
  }
  return {
    name: data.name,
    type: EntryType.STATUS,
    img,
    effects: effect ? [effect] : [],
    system: {
      lid,
      effects,
      terse: data.terse,
      type: restrict_choices(["status", "condition", "effect"], "effect", data.type) as
        | "status"
        | "condition"
        | "effect",
    },
  };
}
