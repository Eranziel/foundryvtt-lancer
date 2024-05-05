// Import TypeScript modules
import { LancerActor } from "../actor/lancer-actor";
import { LANCER } from "../config";
import { EntryType, NpcFeatureType } from "../enums";
import { DroppableFlowType, handleDragging } from "../helpers/dragdrop";
import { LancerItem } from "../item/lancer-item";
import { LancerFlowState } from "./interfaces";

const lp = LANCER.log_prefix;

function _chooseItemImage(item: LancerItem): string {
  switch (item.type) {
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
      // Just a type narrower
      if (!item.is_npc_feature()) break;
      switch (item.system.type) {
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

  const actorOrItem = fromUuidSync(data.uuid);
  if (!actorOrItem) {
    ui.notifications!.error("Invalid UUID for flow drop on hotbar");
    throw new Error("Invalid UUID for flow drop on hotbar");
  }
  let title = "";
  let command = "";
  let img = `systems/${game.system.id}/assets/icons/macro-icons/generic_item.svg`;
  let actor: LancerActor;
  let item: LancerItem;
  const getActor = `const actor = await fromUuid("${data.uuid}");\n`;
  const getItem = `const item = await fromUuid("${data.uuid}");\n`;

  // Check what type of action this is supposed to represent. A roll, attack, activation, etc.
  // Generate an appropriate macro for the item type and action.
  switch (data.flowType) {
    case DroppableFlowType.BASIC:
      if (!(actorOrItem instanceof LancerActor)) {
        ui.notifications!.error("Basic flow drop on hotbar was not from an actor");
        throw new Error("Basic flow drop on hotbar was not from an actor");
      }
      actor = actorOrItem;
      if (!data.flowSubtype) {
        ui.notifications!.error("No flow subtype provided for basic flow drop on hotbar");
        throw new Error("No flow subtype provided for basic flow");
      }
      const BasicFlowType = LancerFlowState.BasicFlowType;

      let flowInvocation = "";
      switch (data.flowSubtype) {
        case BasicFlowType.FullRepair:
          img = `systems/${game.system.id}/assets/icons/macro-icons/repair.svg`;
          title = `Full Repair - ${actor.name}`;
          flowInvocation = `actor.beginFullRepairFlow(${data.flowArgs?.title ?? ""});`;
          break;
        case BasicFlowType.Stabilize:
          img = `systems/${game.system.id}/assets/icons/macro-icons/marker.svg`;
          title = `Stabilize - ${actor.name}`;
          flowInvocation = `actor.beginStabilizeFlow(${data.flowArgs?.title ?? ""});`;
          break;
        case BasicFlowType.Overheat:
          img = `systems/${game.system.id}/assets/icons/macro-icons/heat.svg`;
          title = `Overheat - ${actor.name}`;
          flowInvocation = `actor.beginOverheatFlow();`;
          break;
        case BasicFlowType.Structure:
          img = `systems/${game.system.id}/assets/icons/macro-icons/shredded.svg`;
          title = `Structure - ${actor.name}`;
          flowInvocation = `actor.beginStructureFlow();`;
          break;
        case BasicFlowType.Overcharge:
          img = `systems/${game.system.id}/assets/icons/macro-icons/overcharge.svg`;
          title = `Overcharge - ${actor.name}`;
          flowInvocation = `actor.beginOverchargeFlow();`;
          break;
        case BasicFlowType.BasicAttack:
          img = `systems/${game.system.id}/assets/icons/macro-icons/weapon.svg`;
          title = `Basic Attack - ${actor.name}`;
          flowInvocation = `actor.beginBasicAttackFlow(${data.flowArgs?.title ?? ""});`;
          break;
        case BasicFlowType.TechAttack:
          img = `systems/${game.system.id}/assets/icons/macro-icons/tech_quick.svg`;
          title = `Tech Attack - ${actor.name}`;
          flowInvocation = `actor.beginBasicTechAttackFlow(${data.flowArgs?.title ?? ""});`;
          break;
      }
      if (flowInvocation) {
        command = `${getActor}${flowInvocation}`;
      }
      break;
    case DroppableFlowType.STAT:
      if (!(actorOrItem instanceof LancerActor)) {
        ui.notifications!.error("Stat flow drop on hotbar was not from an actor");
        throw new Error("Stat flow drop on hotbar was not from an actor");
      }
      if (!data.args?.statPath) {
        ui.notifications!.error("Stat flow drop on hotbar was missing a stat path");
        throw new Error("Stat flow drop on hotbar was missing a stat path");
      }
      actor = actorOrItem;
      img = `systems/${game.system.id}/assets/icons/macro-icons/d20-framed.svg`;
      // Determine the title for the macro
      switch (data.args?.statPath) {
        case "system.grit":
          title = `Grit - ${actor.name}`;
          break;
        case "system.tier":
          title = `Tier - ${actor.name}`;
          break;
        case "system.hull":
          title = `Hull - ${actor.name}`;
          break;
        case "system.agi":
          title = `Agility - ${actor.name}`;
          break;
        case "system.sys":
          title = `System - ${actor.name}`;
          break;
        case "system.eng":
          title = `Engineering - ${actor.name}`;
          break;
      }
      command = `${getActor}actor.beginStatFlow("${data.args?.statPath}");`;
    case DroppableFlowType.ATTACK:
      if (!(actorOrItem instanceof LancerItem)) {
        ui.notifications!.error("Attack flow drop on hotbar was not from an item");
        throw new Error("Attack flow drop on hotbar was not from an item");
      }
      if (
        data.lancerType !== EntryType.MECH_WEAPON &&
        data.lancerType !== EntryType.PILOT_WEAPON &&
        data.lancerType !== EntryType.NPC_FEATURE
      ) {
        ui.notifications!.error("Attack flow drop on hotbar was not from a weapon");
        throw new Error("Attack flow drop on hotbar was not from a weapon");
      }
      item = actorOrItem;
      img = _chooseItemImage(item);
      title = `${item.name}${item.actor?.name ? ` - ${item.actor.name}` : ""}`;
      command = `${getItem}item.beginWeaponAttackFlow();`;
      break;
    case DroppableFlowType.TECH_ATTACK:
      if (!(actorOrItem instanceof LancerItem)) {
        ui.notifications!.error("Tech attack flow drop on hotbar was not from an item");
        throw new Error("Tech attack flow drop on hotbar was not from an item");
      }
      if (data.lancerType !== EntryType.MECH_SYSTEM && data.lancerType !== EntryType.NPC_FEATURE) {
        ui.notifications!.error("Tech attack flow drop on hotbar was not from a system or NPC feature");
        throw new Error("Tech attack flow drop on hotbar was not from a system or NPC feature");
      }
      item = actorOrItem;
      img = _chooseItemImage(item);
      title = `${item.name}${item.actor?.name ? ` - ${item.actor.name}` : ""}`;
      command = `${getItem}item.beginTechAttackFlow();`;
      break;
    case DroppableFlowType.CHAT:
      if (!(actorOrItem instanceof LancerItem)) {
        ui.notifications!.error("Chat flow drop on hotbar was not from an item");
        throw new Error("Chat flow drop on hotbar was not from an item");
      }
      if (!data.args) {
        ui.notifications!.error("Chat flow drop on hotbar was missing required data");
        throw new Error("Chat flow drop on hotbar was missing required data");
      }
      item = actorOrItem;
      img = _chooseItemImage(item);
      // TODO: the title could be improved for various items. Talent rank, frame trait/core active, etc...
      title = `${item.name}${item.actor?.name ? ` - ${item.actor.name}` : ""}`;
      command = `${getItem}game.lancer.beginItemChatFlow(item, ${JSON.stringify(data.args)});`;
      break;
    case DroppableFlowType.SKILL:
      if (!(actorOrItem instanceof LancerItem)) {
        ui.notifications!.error("Skill flow drop on hotbar was not from an item");
        throw new Error("Skill flow drop on hotbar was not from an item");
      }
      item = actorOrItem;
      if (!item.is_skill()) {
        ui.notifications!.error("Skill flow drop on hotbar was not from a skill item");
        throw new Error("Skill flow drop on hotbar was not from a skill item");
      }
      img = _chooseItemImage(item);
      title = `${item.name}${item.actor?.name ? ` - ${item.actor.name}` : ""}`;
      command = `${getItem}item.beginSkillFlow();`;
      break;
    case DroppableFlowType.BOND_POWER:
      if (!(actorOrItem instanceof LancerItem)) {
        ui.notifications!.error("Bond power flow drop on hotbar was not from an item");
        throw new Error("Bond power flow drop on hotbar was not from an item");
      }
      item = actorOrItem;
      if (!item.is_bond()) {
        ui.notifications!.error("Bond power flow drop on hotbar was not from a bond power item");
        throw new Error("Bond power flow drop on hotbar was not from a bond power item");
      }
      if (!data.args?.powerIndex) {
        ui.notifications!.error("Bond power flow drop on hotbar was missing a power index");
        throw new Error("Bond power flow drop on hotbar was missing a power index");
      }
      img = _chooseItemImage(item);
      title = `${item.system.powers[data.args.powerIndex].name}${item.actor?.name ? ` - ${item.actor.name}` : ""}`;
      command = `${getItem}item.beginBondPowerFlow(${data.args.powerIndex});`;
      break;
    case DroppableFlowType.EFFECT:
      break;
    case DroppableFlowType.ACTIVATION:
      break;
    case DroppableFlowType.CORE_ACTIVE:
      break;
    default:
      ui.notifications!.error("Unknown flow type for flow drop on hotbar!");
      throw new Error("Unknown flow type for flow drop on hotbar!");
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
