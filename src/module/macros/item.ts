// Import TypeScript modules
import { LANCER } from "../config";
import type {
  LancerStatMacroData,
  LancerTalentMacroData,
  LancerTextMacroData,
  LancerReactionMacroData,
} from "../interfaces";
import {
  EntryType,
  NpcFeatureType,
} from "machine-mind";
import { applyCollapseListeners } from "../helpers/collapse";
import { getMacroSpeaker, ownedItemFromString } from "./_util";
import { prepareAttackMacro } from "./attack";
import { rollReactionMacro } from "./reaction";
import { rollSystemMacro } from "./system";
import { rollTalentMacro } from "./talent";
import { prepareTechMacro } from "./tech";
import { rollTextMacro } from "./text";
import { rollTriggerMacro } from "./trigger";

const lp = LANCER.log_prefix;

/**
 * Generic macro preparer for any item.
 * Given an actor and item, will prepare data for the macro then roll it.
 * @param a The actor id to speak as
 * @param i The item id that is being rolled
 * @param options Ability to pass through various options to the item.
 *      Talents can use rank: value.
 *      Weapons can use accBonus or damBonus
 */
export async function prepareItemMacro(a: string, i: string, options?: any) {
  // Determine which Actor to speak as
  let actor = getMacroSpeaker(a);
  if (!actor) return;

  const item = ownedItemFromString(i, actor);
  if (!item) return;

  // Make a macro depending on the type
  switch (item.data.type) {
    // Skills
    case EntryType.SKILL:
      let skillData: LancerStatMacroData = {
        title: item.name!,
        bonus: item.data.data.rank * 2,
      };
      await rollTriggerMacro(actor, skillData);
      break;
    // Pilot OR Mech weapon
    case EntryType.PILOT_WEAPON:
    case EntryType.MECH_WEAPON:
      await prepareAttackMacro({ actor, item, options });
      break;
    // Systems
    case EntryType.MECH_SYSTEM:
      await rollSystemMacro(actor, item.data.data.derived.mm!);
      break;
    // Talents
    case EntryType.TALENT:
      // If we aren't passed a rank, default to current rank
      let rank = options.rank ? options.rank : item.data.data.curr_rank;

      let talData: LancerTalentMacroData = {
        talent: item.data.data,
        rank: rank,
      };

      await rollTalentMacro(actor, talData);
      break;
    // Gear
    case EntryType.PILOT_GEAR:
      let gearData: LancerTextMacroData = {
        title: item.name!,
        description: item.data.data.description,
        tags: item.data.data.tags,
      };

      await rollTextMacro(actor, gearData);
      break;
    // Core bonuses can just be text, right?
    /*
    case EntryType.CORE_BONUS:
      let CBdata: LancerTextMacroData = {
        title: item.name,
        description: item.data.data.effect,
      };

      await rollTextMacro(actor, CBdata);
      break;
      */
    case EntryType.NPC_FEATURE:
      switch (item.data.data.type) {
        case NpcFeatureType.Weapon:
          await prepareAttackMacro({ actor, item, options });
          break;
        case NpcFeatureType.Tech:
          await prepareTechMacro(a, i);
          break;
        case NpcFeatureType.System:
        case NpcFeatureType.Trait:
          let sysData: LancerTextMacroData = {
            title: item.name!,
            description: item.data.data.effect,
            tags: item.data.data.tags,
          };

          await rollTextMacro(actor, sysData);
          break;
        case NpcFeatureType.Reaction:
          let reactData: LancerReactionMacroData = {
            title: item.name!,
            trigger: item.data.data.trigger,
            effect: item.data.data.effect,
            tags: item.data.data.tags,
          };

          await rollReactionMacro(actor, reactData);
          break;
      }
      break;
    default:
      console.log("No macro exists for that item type");
      return ui.notifications!.error(`Error - No macro exists for that item type`);
  }

  applyCollapseListeners();
}
