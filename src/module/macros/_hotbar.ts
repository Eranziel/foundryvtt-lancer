// Import TypeScript modules
import { LANCER } from "../config";
// Import JSON data
import {
  EntryType,
  NpcFeatureType,
  OpCtx,
} from "machine-mind";
import { FoundryFlagData, FoundryReg } from "../mm-util/foundry-reg";
import { is_ref } from "../helpers/commons";

import { encodedMacroWhitelist } from "./util"

const lp = LANCER.log_prefix;

export async function onHotbarDrop(_bar: any, data: any, slot: number) {
  // We set an associated command & title based off the type
  // Everything else gets handled elsewhere

  let command = "";
  let title = "";
  let img = `systems/${game.system.id}/assets/icons/macro-icons/d20-framed.svg`;

  // Grab new encoded data ASAP
  if (data.fn && data.args && data.title) {
    // i.e., data instanceof LancerMacroData
    if (encodedMacroWhitelist.indexOf(data.fn) < 0) {
      ui.notifications!.error("You are trying to drop an invalid macro");
      return;
    }
    command = `game.lancer.${data.fn}.apply(null, ${JSON.stringify(data.args)})`;
    img = data.iconPath ? data.iconPath : `systems/${game.system.id}/assets/icons/macro-icons/generic_item.svg`;
    title = data.title;
  } else if (data.pack) {
    // If we have a source pack, it's dropped from a compendium and there's no processing for us to do
    return;
  } else {
    let itemId = "error";

    console.log(`${lp} Data dropped on hotbar:`, data);

    // Determine if we're using old or new method
    let actorId: string;
    if ("actorId" in data) {
      title = data.title;
      itemId = data.itemId;
      actorId = data.actorId;
    } else if (is_ref(data)) {
      var item = await new FoundryReg().resolve(new OpCtx(), data);
      title = item.Name;

      if (!item) return;

      let orig_doc = (item.Flags as FoundryFlagData).orig_doc;
      // @ts-ignore This is probably changed in sohumb's branch anyway
      actorId = orig_doc.actor?.id ?? "error";
      itemId = data.id;
    } else {
      return;
    }

    switch (data.type) {
      case EntryType.SKILL:
        command = `game.lancer.prepareItemMacro("${actorId}", "${itemId}");`;
        img = `systems/${game.system.id}/assets/icons/macro-icons/skill.svg`;
        break;
      case EntryType.TALENT:
        command = `game.lancer.prepareItemMacro("${actorId}", "${itemId}", {rank: ${data.rank}});`;
        img = `systems/${game.system.id}/assets/icons/macro-icons/talent.svg`;
        break;
      case EntryType.CORE_BONUS:
        img = `systems/${game.system.id}/assets/icons/macro-icons/corebonus.svg`;
        break;
      case EntryType.PILOT_GEAR:
        command = `game.lancer.prepareItemMacro("${actorId}", "${itemId}");`;
        img = `systems/${game.system.id}/assets/icons/macro-icons/generic_item.svg`;
        break;
      case EntryType.PILOT_WEAPON:
      case EntryType.MECH_WEAPON:
        command = `game.lancer.prepareItemMacro("${actorId}", "${itemId}");`;
        img = `systems/${game.system.id}/assets/icons/macro-icons/mech_weapon.svg`;
        break;
      case EntryType.MECH_SYSTEM:
        command = `game.lancer.prepareItemMacro("${actorId}", "${itemId}");`;
        img = `systems/${game.system.id}/assets/icons/macro-icons/mech_system.svg`;
        break;
      case EntryType.NPC_FEATURE:
        switch (item.FeatureType) {
          case NpcFeatureType.Reaction:
            command = `game.lancer.prepareItemMacro("${actorId}", "${itemId}");`;
            img = `systems/${game.system.id}/assets/icons/macro-icons/reaction.svg`;
            break;
          case NpcFeatureType.System:
            command = `game.lancer.prepareItemMacro("${actorId}", "${itemId}");`;
            img = `systems/${game.system.id}/assets/icons/macro-icons/mech_system.svg`;
            break;
          case NpcFeatureType.Trait:
            command = `game.lancer.prepareItemMacro("${actorId}", "${itemId}");`;
            img = `systems/${game.system.id}/assets/icons/macro-icons/trait.svg`;
            break;
          case NpcFeatureType.Tech:
            command = `game.lancer.prepareItemMacro("${actorId}", "${itemId}");`;
            img = `systems/${game.system.id}/assets/icons/macro-icons/tech_quick.svg`;
            break;
          case NpcFeatureType.Weapon:
            command = `game.lancer.prepareItemMacro("${actorId}", "${itemId}");`;
            img = `systems/${game.system.id}/assets/icons/macro-icons/mech_weapon.svg`;
            break;
        }
        break;
    }

    // TODO: Figure out if I am really going down this route and, if so, switch to a switch
    if (data.type === "actor") {
      title = data.title;
    } else if (data.type === "pilot_weapon") {
      // Talent are the only ones (I think??) that we need to name specially
      if (data.type === EntryType.TALENT) {
        img = `systems/${game.system.id}/assets/icons/macro-icons/talent.svg`;
      }
      // Pick the image for the hotbar
    } else if (data.type === "Text") {
      command = `game.lancer.prepareTextMacro("${data.actorId}", "${data.title}", {rank: ${data.description}})`;
    } else if (data.type === "Core-Active") {
      command = `game.lancer.prepareCoreActiveMacro("${data.actorId}")`;
      img = `systems/${game.system.id}/assets/icons/macro-icons/corebonus.svg`;
    } else if (data.type === "Core-Passive") {
      command = `game.lancer.prepareCorePassiveMacro("${data.actorId}")`;
      img = `systems/${game.system.id}/assets/icons/macro-icons/corebonus.svg`;
    } else if (data.type === "overcharge") {
      command = `game.lancer.prepareOverchargeMacro("${data.actorId}")`;
      img = `systems/${game.system.id}/assets/icons/macro-icons/overcharge.svg`;
    }
  }

  let macro = game.macros!.contents.find((m: Macro) => m.name === title && m.data.command === command);
  if (!macro) {
    Macro.create({
      command,
      name: title,
      type: "script",
      img: img,
    }).then(macro => game.user!.assignHotbarMacro(macro!, slot));
  } else {
    game.user!.assignHotbarMacro(macro, slot);
  }
}
