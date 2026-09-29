import { mechSystemView } from "../helpers/loadout";
import { LancerItem } from "../item/lancer-item";
import { createTranslationRef } from "../util/localization/llp-map";
import { TalentFlow } from "./talent";
import { SimpleHTMLFlow, SimpleTextFlow } from "./text";

/**
 * Select and begin a chat flow for the given item.
 * @param item The item to print to chat
 * @param data Additional data required by some flows
 * @returns Promise<boolean> Whether the flow completed successfully
 */
export async function beginItemChatFlow(item: LancerItem, data: any) {
  if (item.is_skill()) {
    const flow = new SimpleHTMLFlow(item, {
      flags: {
        localeData: {
          lid: item.system.lid,
          fields: {
            title: createTranslationRef(item, "name", "name"),
            description: createTranslationRef(item.system, "description", "system.description"),
          },
        },
      },
    });
    return await flow.begin();
  } else if (item.is_mech_weapon() || item.is_pilot_weapon()) {
    // TODO: build weapon card HTML, but non-interactive
    const flow = new SimpleHTMLFlow(item, {
      flags: {
        localeData: {
          lid: item.system.lid,
          fields: {
            title: createTranslationRef(item, "name", "name"),
            description: createTranslationRef(item.system, "description", "system.description"),
          },
        },
      },
    });
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
      const traitPath = `system.traits.${data.index}`;
      const flow = new SimpleTextFlow(item, {
        title: trait.name,
        description: trait.description,
        flags: {
          localeData: {
            lid: item.system.lid,
            fields: {
              title: createTranslationRef(trait, "name", `${traitPath}.name`),
              description: createTranslationRef(trait, "description", `${traitPath}.description`),
            },
          },
        },
      });
      return await flow.begin();
    }
    if (data.type === "passive") {
      const core = item.system.core_system;
      const flow = new SimpleTextFlow(item, {
        title: core.passive_name,
        description: core.passive_effect,
        flags: {
          localeData: {
            lid: item.system.lid,
            fields: {
              title: createTranslationRef(core, "passive_name", "system.core_system.passive_name"),
              description: createTranslationRef(core, "passive_effect", "system.core_system.passive_effect"),
            },
          },
        },
      });
      return await flow.begin();
    }
    throw new TypeError(`Invalid path provided for frame flow!`);
  } else if (item.is_pilot_gear()) {
    const flow = new SimpleTextFlow(item, {
      title: item.name!,
      description: item.system.description ?? "",
      tags: item.system.tags,
      flags: {
        localeData: {
          lid: item.system.lid,
          fields: {
            title: createTranslationRef(item, "name", "name"),
            description: createTranslationRef(item.system, "description", "system.description"),
          },
        },
      },
    });
    return await flow.begin();
  } else if (item.is_core_bonus()) {
    const flow = new SimpleTextFlow(item, {
      title: item.name!,
      description: item.system.effect,
      flags: {
        localeData: {
          lid: item.system.lid,
          fields: {
            title: createTranslationRef(item, "name", "name"),
            description: createTranslationRef(item.system, "effect", "system.effect"),
          },
        },
      },
    });
    return await flow.begin();
  } else if (item.is_reserve()) {
    const title = createTranslationRef(item, "name", "name");
    title.format = {
      key: "lancer.chatCard.title.reserve.label",
      data: {
        title: null,
      },
    };
    const description = createTranslationRef(item.system, "description", "system.description");
    description.format = {
      key: "lancer.chatCard.reserve.label",
      data: {
        label: item.system.label ?? "",
        description: null,
      },
    };
    const flow = new SimpleTextFlow(item, {
      title: item.name,
      description: item.system.description,
      flags: {
        localeData: {
          lid: item.system.lid,
          fields: {
            title: title,
            description: description,
          },
        },
      },
    });
    return await flow.begin();
  } else if (item.is_npc_feature()) {
    const flow = new SimpleTextFlow(item, {
      title: item.name!,
      description: item.system.effect,
      tags: item.system.tags,
      flags: {
        // TODO: test localization
        localeData: {
          lid: item.system.lid,
          fields: {
            title: createTranslationRef(item, "name", "name"),
            description: createTranslationRef(item.system, "effect", "system.effect"),
          },
        },
      },
    });
    return await flow.begin();
  } else {
    console.log("No macro exists for that item type");
    ui.notifications!.error(game.i18n.format("lancer.notifications.error.itemNoMacroForType", { type: item.type }));
    return false;
  }
}
