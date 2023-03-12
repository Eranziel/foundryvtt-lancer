// Import TypeScript modules
import { LANCER } from "../config";
import { EntryType, NpcFeatureType } from "../enums";
// Import JSON data

import { isValidEncodedMacro } from "./encode";

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

export function onHotbarDrop(_bar: any, data: any, slot: number) {
  if (data.uuid) {
    // Is a compendium drop - we don't care about it
    return;
  }

  // We set an associated command & title based off the type
  // Everything else gets handled elsewhere
  console.log(`${lp} Data dropped on hotbar:`, data);

  // Grab new encoded data ASAP
  if (isValidEncodedMacro(data)) {
    let command = `game.lancer.${data.fn}(${data.args.map((e: any) => JSON.stringify(e)).join(",")})`;
    let img = data.iconPath ? data.iconPath : `systems/${game.system.id}/assets/icons/macro-icons/generic_item.svg`;
    let title = data.title;

    let macro = game.macros!.contents.find(m => m.name === title && m.data.command === command);
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
    return false;
  }
}
