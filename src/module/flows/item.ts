import { LancerItem } from "../item/lancer-item";
import { LancerFlowState } from "./interfaces";
import { TalentFlow } from "./talent";
import { SimpleTextFlow } from "./text";

export async function beginItemFlow(item: LancerItem, data: any) {
  console.log("Selecting item flow with data and item: ", data, item);
  if (item.is_skill()) {
    // TODO
    // return prepareSkillMacro(item);
  } else if (item.is_mech_weapon() || item.is_pilot_weapon()) {
    // TODO
    // return prepareAttackMacro(item, options);
  } else if (item.is_mech_system()) {
    // TODO
    // return prepareSystemMacro(item);
  } else if (item.is_talent()) {
    const lvl = data.rank ?? item.system.curr_rank;
    const flow = new TalentFlow(item, {
      title: item.name!,
      rank: item.system.ranks[lvl],
      lvl,
    });
    return await flow.begin();
  } else if (item.is_frame()) {
    // Trait and core passive flows require a type
    if (!data.type) throw new TypeError(`No type provided for frame flow!`);
    if (data.type === "trait") {
      if (!data.index) throw new TypeError(`No index provided for trait flow!`);
      const trait = item.system.traits[data.index];
      if (!trait) throw new TypeError(`No trait found at path ${data.path}!`);
      const flow = new SimpleTextFlow(item, { title: trait.name, description: trait.description });
      return await flow.begin();
    }
    if (data.type === "passive") {
      const core = item.system.core_system;
      const flow = new SimpleTextFlow(item, { title: core.passive_name, description: core.passive_effect });
      return await flow.begin();
    }
    throw new TypeError(`Invalid path provided for frame flow!`);
  } else if (item.is_pilot_gear()) {
    const flow = new SimpleTextFlow(item, {
      title: item.name!,
      description: item.system.description,
      tags: item.system.tags,
    });
    return await flow.begin();
  } else if (item.is_core_bonus()) {
    const flow = new SimpleTextFlow(item, { title: item.name!, description: item.system.effect });
    return await flow.begin();
  } else if (item.is_reserve()) {
    const flow = new SimpleTextFlow(item, {
      title: `RESERVE :: ${item.name}`,
      description: (item.system.label ? `<b>${item.system.label}</b></br>` : "") + item.system.description,
    });
    return await flow.begin();
  } else if (item.is_npc_feature()) {
    // TODO
    // return prepareNPCFeatureMacro(item, options);
  } else {
    console.log("No macro exists for that item type");
    return ui.notifications!.error(`Error - No macro exists for item type "${item.type}"`);
  }
}
