// Import TypeScript modules
// import { prepareAttackMacro } from "./attack";
import { prepareSystemMacro } from "./system";
import { prepareTalentMacro } from "./talent";
import { EntryType } from "../enums";
import { LancerItem } from "../item/lancer-item";
import { prepareSkillMacro, rollStatMacro } from "./stat";
import { prepareCoreBonusMacro, preparePilotGearMacro, prepareReserveMacro } from "./gear";
import { prepareNPCFeatureMacro } from "./npc";

/**
 * Generic macro preparer for any item.
 * Given an item, will prepare data for the macro then roll it.
 * @param item The item/uuid that is being rolled
 * @param options Ability to pass through various options to the item.
 *      Talents can use rank: value.
 */
export async function prepareItemMacro(
  item: string | LancerItem,
  options?: {
    rank?: number; // Rank override for talents
    title?: string; // TODO - more wide support. Use this as a title
    display?: boolean; // TODO - more wide support. Print this item instead of rolling it
  }
) {
  item = LancerItem.fromUuidSync(item);
  if (!item.actor) return;

  // Make a macro depending on the type
  switch (item.type) {
    case EntryType.SKILL:
      return prepareSkillMacro(item);
    // Pilot OR Mech weapon
    case EntryType.PILOT_WEAPON:
    case EntryType.MECH_WEAPON:
      // TODO refactor to trigger appropriate flow
      // return prepareAttackMacro(item, options);
      return;
    case EntryType.MECH_SYSTEM:
      return prepareSystemMacro(item);
    case EntryType.TALENT:
      return prepareTalentMacro(item, options);
    case EntryType.PILOT_GEAR:
      return preparePilotGearMacro(item);
    case EntryType.CORE_BONUS:
      return prepareCoreBonusMacro(item);
    case EntryType.RESERVE:
      return prepareReserveMacro(item);
    case EntryType.NPC_FEATURE:
      return prepareNPCFeatureMacro(item, options);
    default:
      console.log("No macro exists for that item type");
      return ui.notifications!.error(`Error - No macro exists for that item type`);
  }
}
