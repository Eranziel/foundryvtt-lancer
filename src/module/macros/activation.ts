// Import TypeScript modules
import { LANCER } from "../config";
import { getAutomationOptions } from "../settings";
import type { LancerItem } from "../item/lancer-item";
import type { LancerActor } from "../actor/lancer-actor";
import { is_reg_mech } from "../actor/lancer-actor";
import type {
  LancerMacroData,
  LancerTechMacroData,
} from "../interfaces";
import {
  ActivationType,
  EntryType,
  Mech,
  MechSystem,
  Npc,
  NpcFeature,
  Pilot,
  Talent,
} from "machine-mind";
import { is_limited, is_tagged } from "machine-mind/dist/funcs";
import type { AccDiffDataSerialized } from "../helpers/acc_diff";
import { buildActionHTML, buildDeployableHTML } from "../helpers/item";
import { ActivationOptions } from "../enums";
import { getMacroSpeaker } from "./util"
import { renderMacroHTML } from "./render"
import { rollTechMacro } from "./tech"

const lp = LANCER.log_prefix;


export async function prepareActivationMacro(
  a: string,
  i: string,
  type: ActivationOptions,
  index: number,
  rerollData?: AccDiffDataSerialized
) {
  // Determine which Actor to speak as
  let actor = getMacroSpeaker(a);
  if (!actor) return;

  // Get the item
  let item: LancerItem | undefined;
  item = actor.items.get(i);
  if (!item && actor.is_mech()) {
    let pilot = game.actors!.get(actor.data.data.pilot?.id ?? "");
    item = pilot?.items.get(i);
  }

  if (!item || (!actor.is_mech() && !actor.is_pilot())) {
    return ui.notifications!.error(
      `Error preparing tech attack macro - could not find Item ${i} owned by Actor ${a}! Did you add the Item to the token, instead of the source Actor?`
    );
  } else if (!item.isOwned) {
    return ui.notifications!.error(`Error rolling tech attack macro - ${item.name} is not owned by an Actor!`);
  } else if (!item.is_mech_system() && !item.is_npc_feature() && !item.is_talent()) {
    return ui.notifications!.error(`Error rolling tech attack macro - ${item.name} is not a System or Feature!`);
  }

  let itemEnt: MechSystem | NpcFeature | Talent = await item.data.data.derived.mm_promise;
  let actorEnt: Mech | Pilot = await actor.data.data.derived.mm_promise;

  if (getAutomationOptions().limited_loading && is_tagged(itemEnt) && is_limited(itemEnt) && itemEnt.Uses <= 0) {
    ui.notifications!.error(`Error using item--you have no uses left!`);
    return;
  }

  // TODO--handle NPC Activations
  if (itemEnt.Type === EntryType.NPC_FEATURE) return;

  switch (type) {
    case ActivationOptions.ACTION:
      switch (itemEnt.Actions[index].Activation) {
        case ActivationType.FullTech:
        case ActivationType.Invade:
        case ActivationType.QuickTech:
          let partialMacroData = {
            title: "Reroll activation",
            fn: "prepareActivationMacro",
            args: [a, i, type, index],
          };
          _prepareTechActionMacro(actorEnt, itemEnt, index, partialMacroData, rerollData);
          break;
        default:
          _prepareTextActionMacro(actorEnt, itemEnt, index);
      }
    case ActivationOptions.DEPLOYABLE:
      _prepareDeployableMacro(actorEnt, itemEnt, index);
  }

  // Wait until the end to deduct a use so we're sure it completed succesfully
  if (getAutomationOptions().limited_loading && is_tagged(itemEnt) && is_limited(itemEnt)) {
    itemEnt.Uses = itemEnt.Uses - 1;
    await itemEnt.writeback();
  }

  return;
}

async function _prepareTextActionMacro(
  actorEnt: Mech | Pilot | Npc,
  itemEnt: Talent | MechSystem | NpcFeature,
  index: number
) {
  // Support this later...
  // TODO: pilot gear and NPC features
  if (itemEnt.Type !== EntryType.MECH_SYSTEM && itemEnt.Type !== EntryType.TALENT) return;

  let action = itemEnt.Actions[index];
  let tags = itemEnt.Type === EntryType.MECH_SYSTEM ? itemEnt.Tags : [];
  await renderMacroHTML(actorEnt.Flags.orig_doc, buildActionHTML(action, { full: true, tags: tags }));
}

async function _prepareTechActionMacro(
  actorEnt: Mech | Pilot,
  itemEnt: Talent | MechSystem | NpcFeature,
  index: number,
  partialMacroData: LancerMacroData,
  rerollData?: AccDiffDataSerialized
) {
  // Support this later...
  // TODO: pilot gear and NPC features
  if (itemEnt.Type !== EntryType.MECH_SYSTEM && itemEnt.Type !== EntryType.TALENT) return;

  let action = itemEnt.Actions[index];

  let mData: LancerTechMacroData = {
    title: action.Name,
    t_atk: is_reg_mech(actorEnt) ? actorEnt.TechAttack : 0,
    acc: 0,
    action: action.Name.toUpperCase(),
    effect: action.Detail,
    tags: itemEnt.Type === EntryType.MECH_SYSTEM ? itemEnt.Tags : [],
  };

  /*
  if (item.is_npc_feature()) {
    const tData = item.data.data as RegNpcTechData;
    let tier: number;
    if (item.actor === null) {
      tier = actor.data.data.tier_num - 1;
    } else {
      tier = item.actor.data.data.tier_num - 1;
    }
    mData.t_atk =
      tData.attack_bonus && tData.attack_bonus.length 6> tier ? tData.attack_bonus[tier] : 0;
    mData.acc = tData.accuracy && tData.accuracy.length > tier ? tData.accuracy[tier] : 0;
    mData.tags = await SerUtil.process_tags(new FoundryReg(), new OpCtx(), tData.tags);
    mData.detail = tData.effect ? tData.effect : "";
  } */

  await rollTechMacro(actorEnt.Flags.orig_doc, mData, partialMacroData, rerollData);
}

async function _prepareDeployableMacro(
  actorEnt: Mech | Pilot | Npc,
  itemEnt: Talent | MechSystem | NpcFeature,
  index: number
) {
  // Support this later...
  // TODO: pilot gear (and NPC features later?)
  if (itemEnt.Type !== EntryType.MECH_SYSTEM && itemEnt.Type !== EntryType.TALENT) return;

  let dep = itemEnt.Deployables[index];

  await renderMacroHTML(actorEnt.Flags.orig_doc, buildDeployableHTML(dep, true));
}
