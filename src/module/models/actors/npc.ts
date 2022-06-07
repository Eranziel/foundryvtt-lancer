import {
  template_action_tracking,
  template_heat,
  template_statuses,
  template_struss,
  template_universal_actor,
} from "./shared";

import { LancerDataModel } from "../shared";

const fields: any = foundry.data.fields;

const npc_schema = {
  destroyed: new fields.Boolean({initial: false}),
  meltdown_timer: new fields.NumberField({required: false, nullable: true, integer: true, min: 0}),
  notes: new fields.HTMLField(),
  tier: new fields.NumberField({min: 1, max: 3, integer: true}),

  ...template_universal_actor(),
  ...template_action_tracking(),
  ...template_heat(),
  ...template_statuses(),
  ...template_struss(),
};

type NpcSchema = typeof npc_schema;
export class NpcModel extends LancerDataModel<"NpcModel"> {
  static defineSchema(): NpcSchema {
    return npc_schema;
  }
}
