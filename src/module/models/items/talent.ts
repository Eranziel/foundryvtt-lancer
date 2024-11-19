import type { DeepPartial } from "@league-of-foundry-developers/foundry-vtt-types/src/types/utils.mjs";
import { EntryType } from "../../enums";
import { SourceData } from "../../source-template";
import { PackedTalentData } from "../../util/unpacking/packed-types";
import { unpackDeployable } from "../actors/deployable";
import { ActionField, unpackAction } from "../bits/action";
import { BonusField, unpackBonus } from "../bits/bonus";
import { CounterField, unpackCounter } from "../bits/counter";
import { SynergyField, unpackSynergy } from "../bits/synergy";
import { LIDField, LancerDataModel, UnpackContext } from "../shared";
import { template_universal_item } from "./shared";

const fields = foundry.data.fields;

export class TalentModel extends LancerDataModel<DataSchema, Item> {
  static defineSchema() {
    return {
      curr_rank: new fields.NumberField({ nullable: false, initial: 1, min: 1, max: 3 }),
      description: new fields.HTMLField(),
      terse: new fields.StringField(),

      ranks: new fields.ArrayField(
        new fields.SchemaField({
          name: new fields.StringField(),
          description: new fields.HTMLField(),
          exclusive: new fields.BooleanField({ initial: false }),
          // @ts-expect-error
          actions: new fields.ArrayField(new ActionField()),
          // @ts-expect-error
          bonuses: new fields.ArrayField(new BonusField()),
          // @ts-expect-error
          synergies: new fields.ArrayField(new SynergyField()),
          deployables: new fields.ArrayField(new LIDField()),
          // @ts-expect-error
          counters: new fields.ArrayField(new CounterField()),
          integrated: new fields.ArrayField(new LIDField()),
        })
      ),

      ...template_universal_item(),
    };
  }
}

// Converts an lcp bonus into our expected format
export function unpackTalent(
  data: PackedTalentData,
  context: UnpackContext
): {
  name: string;
  type: EntryType.TALENT;
  system: DeepPartial<SourceData.Talent>;
} {
  return {
    name: data.name,
    type: EntryType.TALENT,
    system: {
      lid: data.id,
      curr_rank: undefined,
      description: data.description,
      ranks: data.ranks.map(r => ({
        actions: r.actions?.map(unpackAction) ?? [],
        bonuses: r.bonuses?.map(unpackBonus) ?? [],
        counters: r.counters?.map(unpackCounter) ?? [],
        deployables: r.deployables?.map(d => unpackDeployable(d, context)) ?? [],
        description: r.description,
        exclusive: r.exclusive,
        integrated: r.integrated!,
        name: r.name,
        synergies: r.synergies?.map(unpackSynergy) ?? [],
      })),
      terse: data.terse,
    },
  };
}
