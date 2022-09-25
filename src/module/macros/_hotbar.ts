// Import TypeScript modules
import { LANCER } from "../config";
// Import JSON data
import { EntryType, NpcFeatureType, OpCtx } from "machine-mind";
import { FoundryFlagData, FoundryReg } from "../mm-util/foundry-reg";
import { is_ref } from "../helpers/commons";

import { isValidEncodedMacro } from "./_encode";

const lp = LANCER.log_prefix;

function _chooseItemImage(data: any): string {
  switch (data.type) {
    case EntryType.SKILL:
      return `systems/${game.system.id}/assets/icons/macro-icons/skill.svg`;
    case EntryType.TALENT:
      return `systems/${game.system.id}/assets/icons/macro-icons/talent.svg`;
    case EntryType.CORE_BONUS:
      return `systems/${game.system.id}/assets/icons/macro-icons/corebonus.svg`;
    case EntryType.PILOT_GEAR:
      return `systems/${game.system.id}/assets/icons/macro-icons/generic_item.svg`;
    case EntryType.PILOT_WEAPON:
    case EntryType.MECH_WEAPON:
      return `systems/${game.system.id}/assets/icons/macro-icons/mech_weapon.svg`;
    case EntryType.MECH_SYSTEM:
      return `systems/${game.system.id}/assets/icons/macro-icons/mech_system.svg`;
    case EntryType.NPC_FEATURE:
      switch (data.FeatureType) {
        case NpcFeatureType.Reaction:
          return `systems/${game.system.id}/assets/icons/macro-icons/reaction.svg`;
        case NpcFeatureType.System:
          return `systems/${game.system.id}/assets/icons/macro-icons/mech_system.svg`;
        case NpcFeatureType.Trait:
          return `systems/${game.system.id}/assets/icons/macro-icons/trait.svg`;
        case NpcFeatureType.Tech:
          return `systems/${game.system.id}/assets/icons/macro-icons/tech_quick.svg`;
        case NpcFeatureType.Weapon:
          return `systems/${game.system.id}/assets/icons/macro-icons/mech_weapon.svg`;
      }
      break;
  }

  return `systems/${game.system.id}/assets/icons/macro-icons/d20-framed.svg`;
}

export async function onHotbarDrop(_bar: any, data: any, slot: number) {
  // We set an associated command & title based off the type
  // Everything else gets handled elsewhere

  let command = "";
  let title = "";
  let img = `systems/${game.system.id}/assets/icons/macro-icons/d20-framed.svg`;

  console.log(`${lp} Data dropped on hotbar:`, data);

  // Grab new encoded data ASAP
  if (data.fn && data.args && data.title) {
    // i.e., data instanceof LancerMacroData
    if (!isValidEncodedMacro(data)) {
      ui.notifications!.error("You are trying to drop an invalid macro");
      return;
    }

    command = `game.lancer.${data.fn}(${data.args.map((e: any) => JSON.stringify(e)).join(",")})`;
    img = data.iconPath ? data.iconPath : `systems/${game.system.id}/assets/icons/macro-icons/generic_item.svg`;
    title = data.title;
  } else if (data.pack) {
    // If we have a source pack, it's dropped from a compendium and there's no processing for us to do
    return;
  } else {
    let itemId = "error";

    // Determine if we're using old or new method
    let actorId: string;
    if ("actorId" in data) {
      title = data.title;
      itemId = data.itemId;
      actorId = data.actorId;

      // in theory this old method is entirely depreciated
      ui.notifications!.error(`You are trying to drop a broken drop source! ("${title}")`);
      return;
    } else if (is_ref(data)) {
      var item = await new FoundryReg().resolve(new OpCtx(), data);
      title = item.Name;

      if (!item) return;

      let orig_doc = (item.Flags as FoundryFlagData).orig_doc;
      // @ts-ignore This is probably changed in sohumb's branch anyway
      actorId = orig_doc.actor?.id ?? "error";
      itemId = data.id;

      img = _chooseItemImage(data);
      command = `game.lancer.prepareItemMacro("${actorId}", "${itemId}");`;
    } else {
      return;
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
