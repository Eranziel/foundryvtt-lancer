// Import TypeScript modules
import { LANCER } from "../config";
import { EntryType, NpcFeatureType } from "../enums";
import { DroppableFlowType, handleDragging } from "../helpers/dragdrop";
import { LancerFlowState } from "./interfaces";

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
  // We set an associated command & title based off the type
  // Everything else gets handled elsewhere
  console.log(`${lp} Data dropped on hotbar:`, data, slot);
  // Validate that the data is from an actor or item, has a UUID, and flow type
  // if ((data.type !== "Actor" && data.type !== "Item") || !data.flowType || !data.uuid) {
  if (!data.lancerType || !data.flowType || !data.uuid) {
    // Not a flow, actor, or item, so this handler doesn't care about it.
    return;
  }

  let title = "";
  let command = "";
  let img = `systems/${game.system.id}/assets/icons/macro-icons/generic_item.svg`;

  // Check what type of action this is supposed to represent. A roll, attack, activation, etc.
  // Generate an appropriate macro for the item type and action.
  switch (data.flowType) {
    case DroppableFlowType.BASIC:
      if (data.lancerType !== EntryType.MECH && data.lancerType !== EntryType.NPC) {
        ui.notifications!.error("Basic flow drop on hotbar was not from a mech or NPC");
        throw new Error("Basic flow drop on hotbar was not from a mech or NPC");
      }
      if (!data.flowSubtype) {
        ui.notifications!.error("No flow subtype provided for basic flow drop on hotbar");
        throw new Error("No flow subtype provided for basic flow");
      }
      let flowInvocation = "";
      const BasicFlowType = LancerFlowState.BasicFlowType;
      switch (data.flowSubtype) {
        case BasicFlowType.FullRepair:
          img = `systems/${game.system.id}/assets/icons/macro-icons/repair.svg`;
          title = "Full Repair";
          flowInvocation = `actor.beginFullRepairFlow(${data.flowArgs?.title ?? ""});`;
          break;
        case BasicFlowType.Stabilize:
          break;
        case BasicFlowType.Overheat:
          break;
        case BasicFlowType.Structure:
          break;
        case BasicFlowType.Overcharge:
          break;
        case BasicFlowType.BasicAttack:
          break;
        case BasicFlowType.TechAttack:
          break;
      }
      if (flowInvocation) {
        command = `const actor = await fromUuid("${data.uuid}");\n${flowInvocation}`;
      }
      break;
    default:
      break;
  }

  console.log("Generated macro:", title, img);
  console.log(command);
  if (title && command) {
    Macro.create({
      command,
      name: title,
      type: "script",
      img: img,
    }).then(macro => game.user!.assignHotbarMacro(macro!, slot));
  }
  return false;
}
