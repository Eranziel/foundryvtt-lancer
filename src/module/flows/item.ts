import { mechSystemView } from "../helpers/loadout";
import { LancerItem } from "../item/lancer-item";
import { TalentFlow } from "./talent";
import { SimpleHTMLFlow, SimpleTextFlow } from "./text";

// TODO: refactor these to be "print to chat" flows instead of "use the item" flows
// Then we can attach this to all of the chat bubble buttons.
export async function beginItemChatFlow(item: LancerItem, data: any) {
  console.log("Selecting item flow with data and item: ", data, item);
  if (item.is_skill()) {
    const flow = new SimpleHTMLFlow(item, {});
    return await flow.begin();
  } else if (item.is_mech_weapon() || item.is_pilot_weapon()) {
    // TODO: build weapon card HTML, but non-interactive
    const flow = new SimpleHTMLFlow(item, {});
    return await flow.begin();
  } else if (item.is_mech_system()) {
    const html = mechSystemView(item, null, { div: true, vertical: true, nonInteractive: true });
    const flow = new SimpleHTMLFlow(item, { html });
    return await flow.begin();
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
