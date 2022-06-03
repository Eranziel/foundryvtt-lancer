import {
  template_heat,
  template_statuses,
  template_universal_actor,
} from "./shared";

import { LancerDataModel } from "../shared";

const fields: any = foundry.data.fields;

const deployable_schema = {
  armor: new fields.NumberField({ min: 0, integer: true, nullable: false, initial: 0 }),
  destroyed: new fields.Boolean({initial: false}),
  edef: new fields.NumberField({ min: 0, integer: true, nullable: false, initial: 8 }),
  evasion: new fields.NumberField({ min: 0, integer: true, nullable: false, initial: 5 }),
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
