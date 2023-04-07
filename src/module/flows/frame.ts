// Import TypeScript modules
import { LANCER } from "../config";
import { rollTextMacro } from "./text";
import { LancerActor, LancerMECH } from "../actor/lancer-actor";
import { LancerFlowState } from "./interfaces";

const lp = LANCER.log_prefix;

/**
 * Prepares a macro to present core active information for
 * @param actor  Actor/UUID to roll the macro as/for whom core info comes from
 */
export async function prepareCoreActiveMacro(actor: string | LancerActor) {
  // Determine which Actor to speak as
  actor = LancerActor.fromUuidSync(actor);
  if (!actor.is_mech()) return;

  if (actor.system.loadout.frame?.status != "resolved") return;

  if (!actor.system.core_energy) {
    ui.notifications!.warn(`No core power remaining on this frame!`);
    return;
  }

  let frame = actor.system.loadout.frame.value;
  let mData: LancerFlowState.TextRollData = {
    // docUUID: frame.uuid,
    title: frame.system.core_system.active_name,
    description: frame.system.core_system.active_effect,
    tags: frame.system.core_system.tags,
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
          da.update({ "system.core_energy": Math.max(da.system.core_energy - 1, 0) });
          console.log(`${lp} Automatically consumed core power for ${da.system.lid}`);
          if (actor) rollTextMacro(mData);
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
 * @param actor  Actor/UUID to roll the macro as/for whom core info comes from
 */
export async function prepareCorePassiveMacro(actor: string | LancerActor) {
  // Determine which Actor to speak as
  actor = LancerActor.fromUuidSync(actor);
  if (!actor.is_mech()) return;

  let frame = actor.system.loadout.frame?.value;
  if (!frame) return;

  let mData: LancerFlowState.TextRollData = {
    // docUUID: frame.uuid,
    title: frame.system.core_system.passive_name,
    description: frame.system.core_system.passive_effect,
    tags: frame.system.core_system.tags,
  };

  rollTextMacro(mData);
}

/**
 * Prepares a macro to present frame trait information
 * @param actor  Actor/UUID to roll the macro as/for whom core info comes from
 * @param index Index of the frame trait to roll
 */
export async function prepareFrameTraitMacro(actor: string | LancerActor, index: number) {
  // Determine which Actor to speak as
  actor = LancerActor.fromUuidSync(actor);
  if (!actor.is_mech()) return;

  let frame = actor.system.loadout.frame?.value;
  if (!frame) return;

  let trait = frame.system.traits[index];
  if (!trait) return;

  let mData: LancerFlowState.TextRollData = {
    // docUUID: frame.uuid,
    title: trait.name,
    description: trait.description,
  };

  rollTextMacro(mData);
}
