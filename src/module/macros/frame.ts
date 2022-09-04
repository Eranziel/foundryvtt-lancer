// Import TypeScript modules
import { LANCER } from "../config";
import type { LancerTextMacroData } from "../interfaces";
import { getMacroSpeaker } from "./_util";
import { rollTextMacro } from "./text";
import { LancerMECH } from "../actor/lancer-actor";

const lp = LANCER.log_prefix;

/**
 * Prepares a macro to present core active information for
 * @param a     String of the actor ID to roll the macro as, and who we're getting core info for
 */
export async function prepareCoreActiveMacro(a: string) {
  // Determine which Actor to speak as
  let actor = getMacroSpeaker(a);
  if (!actor || !actor.is_mech()) return;

  if (!actor.data.data.loadout.frame?.value) return;

  if (!actor.data.data.core_energy) {
    ui.notifications!.warn(`No core power remaining on this frame!`);
    return;
  }

  let frame = actor.data.data.loadout.frame;
  let mData: LancerTextMacroData = {
    title: frame.data.data.core_system.active_name,
    description: frame.data.data.core_system.active_effect,
    tags: frame.data.data.core_system.tags,
  };

  // TODO--setting for this?
  let da = actor as LancerMECH;
  new Dialog({
    title: "Consume Core Power?",
    content: "Consume your mech's core power?",
    buttons: {
      submit: {
        icon: '<i class="fas fa-check"></i>',
        label: "Yes",
        callback: async _dlg => {
          da.update({ "data.core_energy": Math.max(da.data.data.core_energy - 1, 0) });
          console.log(`${lp} Automatically consumed core power for ${da.data.data.lid}`);
          if (actor) rollTextMacro(actor, mData);
        },
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: "No",
      },
    },
    default: "submit",
  }).render(true);
}

/**
 * Prepares a macro to present core passive information for
 * Checks whether they have a passive since that could get removed on swap
 * @param a     String of the actor ID to roll the macro as, and who we're getting core info for
 */
export async function prepareCorePassiveMacro(a: string) {
  // Determine which Actor to speak as
  let actor = getMacroSpeaker(a);
  if (!actor || !actor.is_mech()) return;

  let mech = await actor.data.data.derived.mm_promise;
  if (!mech.Frame) return;

  let mData: LancerTextMacroData = {
    title: mech.Frame.CoreSystem.PassiveName,
    description: mech.Frame.CoreSystem.PassiveEffect,
    tags: mech.Frame.CoreSystem.Tags,
  };

  rollTextMacro(actor, mData).then();
}

/**
 * Prepares a macro to present frame trait information
 * @param a     String of the actor ID to roll the macro as, and who we're getting frame trait for
 * @param index Index of the frame trait to roll
 */
 export async function prepareFrameTraitMacro(a: string, index: number) {
  // Determine which Actor to speak as
  let mech = getMacroSpeaker(a);
  if (!mech || !mech.is_mech()) return;

  var ent = await mech.data.data.derived.mm_promise;
  if (!ent.Frame) return;

  let trait = ent.Frame.Traits[index];
  if (!trait) return;

  let mData: LancerTextMacroData = {
    title: trait.Name,
    description: trait.Description
  };

  rollTextMacro(mech, mData).then();
}
