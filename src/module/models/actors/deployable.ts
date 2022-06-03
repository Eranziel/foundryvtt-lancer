import {
  template_heat,
  template_statuses,
  template_universal_actor,
} from "./shared";

import { LancerDataModel } from "../shared";

const fields: any = foundry.data.fields;

const deployable_schema = {
  destroyed: new fields.Boolean({initial: false}),
  meltdown_timer: new fields.NumberField({required: false, nullable: true, integer: true, min: 0}),
  notes: new fields.HTMLField(),

  ...template_universal_actor(),
  ...template_heat(),
  ...template_statuses(),
};

type DeployableSchema = typeof deployable_schema;
export class DeployableModel extends LancerDataModel<"DeployableModel"> {
  static defineSchema(): DeployableSchema {
    return deployable_schema;
  }
}
