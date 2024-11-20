import { EntryType } from "../../enums";
import {
  template_action_tracking,
  template_heat,
  template_statuses,
  template_struss,
  template_universal_actor,
} from "./shared";

import type { DeepPartial } from "@league-of-foundry-developers/foundry-vtt-types/src/types/utils.mjs";
import { SourceData } from "../../source-template";
import { LancerDataModel } from "../shared";

const fields = foundry.data.fields;

function npc_schema() {
  return {
    destroyed: new fields.BooleanField({ initial: false }),
    meltdown_timer: new fields.NumberField({ required: false, nullable: true, integer: true, min: 0 }),
    notes: new fields.HTMLField(),
    tier: new fields.NumberField({ min: 1, max: 3, initial: 1, integer: true }),

    ...template_universal_actor(),
    ...template_action_tracking(),
    ...template_heat(),
    ...template_statuses(),
    ...template_struss(),
  };
}

type NpcSchema = ReturnType<typeof npc_schema> & DataSchema;

export class NpcModel extends LancerDataModel<NpcSchema, Actor> {
  static defineSchema() {
    return npc_schema();
  }
}

export function generateNpcDataFromClass(npc_class: {
  name: string;
  type: EntryType.NPC_CLASS;
  img: string | undefined;
  system: DeepPartial<SourceData.NpcClass>;
}): {
  name: string;
  type: EntryType.NPC;
  img: string | undefined;
  system: DeepPartial<SourceData.Npc>;
} {
  return {
    name: npc_class.name,
    type: EntryType.NPC,
    img: npc_class.img ?? undefined,
    system: {},
  };
}
