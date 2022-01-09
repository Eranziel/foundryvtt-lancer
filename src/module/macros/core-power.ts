// Import TypeScript modules
import { LANCER } from "../config";
import type { LancerTextMacroData } from "../interfaces";
import { getMacroSpeaker } from "./util"
import { rollTextMacro } from "./text"

const lp = LANCER.log_prefix;

/**
 * Prepares a macro to present core active information for
 * @param a     String of the actor ID to roll the macro as, and who we're getting core info for
 */
 export async function prepareCoreActiveMacro(a: string) {
  // Determine which Actor to speak as
  let mech = getMacroSpeaker(a);
  if (!mech || !mech.is_mech()) return;

  var ent = await mech.data.data.derived.mm_promise;
  if (!ent.Frame) return;

  if (!ent.CurrentCoreEnergy) {
    ui.notifications!.warn(`No core power remaining on this frame!`);
    return;
  }

  let mData: LancerTextMacroData = {
    title: ent.Frame.CoreSystem.ActiveName,
    description: ent.Frame.CoreSystem.ActiveEffect,
    tags: ent.Frame.CoreSystem.Tags,
  };

  // TODO--setting for this?
  new Dialog({
    title: "Consume Core Power?",
    content: "Consume your mech's core power?",
    buttons: {
      submit: {
        icon: '<i class="fas fa-check"></i>',
        label: "Yes",
        callback: async _dlg => {
          mech?.update({ "data.core_energy": Math.max(ent.CurrentCoreEnergy - 1, 0) });
          console.log(`Automatically consumed core power for ${ent.LID}`);
          if (mech) rollTextMacro(mech, mData);
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
  let mech = getMacroSpeaker(a);
  if (!mech || !mech.is_mech()) return;

  var ent = await mech.data.data.derived.mm_promise;
  if (!ent.Frame) return;

  let mData: LancerTextMacroData = {
    title: ent.Frame.CoreSystem.PassiveName,
    description: ent.Frame.CoreSystem.PassiveEffect,
    tags: ent.Frame.CoreSystem.Tags,
  };

  rollTextMacro(mech, mData).then();
}
