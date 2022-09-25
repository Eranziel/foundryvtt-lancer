import { LANCER } from "../config";
import type { LancerMacroData, LancerTalentMacroData } from "../interfaces";
import { is_item_type, LancerItem } from "../item/lancer-item";
import { is_actor_type, LancerActor } from "../actor/lancer-actor";

const lp = LANCER.log_prefix;

const encodedMacroWhitelist = [
  "prepareActivationMacro",
  "prepareEncodedAttackMacro",
  "prepareTechMacro",
  "prepareStatMacro",
  "prepareItemMacro",
  "prepareTalentMacro",
  "prepareCoreActiveMacro",
  "prepareFrameTraitMacro",
  "prepareOverchargeMacro",
  "prepareStructureSecondaryRollMacro",
  "prepareOverheatMacro",
  "prepareStructureMacro",
  "stabilizeMacro",
  "structureMacro",
  "overheatMacro",
  "fullRepairMacro",
];

/**
 * Verifies the given data, will print specific errors/warnings on validation.
 * @param data The data to verify.
 */
export function isValidEncodedMacro(data: LancerMacroData): boolean {
  if (encodedMacroWhitelist.indexOf(data.fn) < 0) {
    console.error(`Macro '${data.fn}' is not a whitelisted encoded macros.`);
    return false;
  }

  return true;
}

export function encodeMacroData(data: LancerMacroData): string {
  return window.btoa(encodeURI(JSON.stringify(data)));
}

export async function runEncodedMacro(el: HTMLElement | LancerMacroData) {
  console.log(el);
  let data: LancerMacroData | null = null;

  if (el instanceof HTMLElement) {
    let encoded = el.attributes.getNamedItem("data-macro")?.nodeValue;
    if (!encoded) {
      console.warn("No macro data available");
      return;
    }

    data = JSON.parse(decodeURI(window.atob(encoded))) as LancerMacroData;
  } else {
    data = el as LancerMacroData;
  }

  if (!isValidEncodedMacro(data)) {
    console.error("Attempting to call invalid encoded macro");
    return;
  }

  let fn = game.lancer[data.fn];
  return (fn as Function).apply(null, data.args);
}
