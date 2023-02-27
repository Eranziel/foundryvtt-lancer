import { LancerMacro } from "./interfaces";

const encodedMacroWhitelist = [
  "prepareActivationMacro",
  "prepareAttackMacro",
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
  "rollAttackMacro",
  "rollTechMacro",
  "importIntegrated",
  "stabilizeMacro",
  "structureMacro",
  "overheatMacro",
  "fullRepairMacro",
];

/**
 * Verifies the given data, will print specific errors/warnings on validation.
 * @param data The data to verify.
 */
export function isValidEncodedMacro(data: LancerMacro.Invocation): boolean {
  if (!encodedMacroWhitelist.includes(data.fn)) {
    console.error(`Macro '${data.fn}' is not a whitelisted encoded macros.`);
    return false;
  }

  return !!(data.args && data.title);
}

export function encodeMacroData(data: LancerMacro.Invocation): string {
  return window.btoa(encodeURI(JSON.stringify(data)));
}

export function decodeMacroData(encoded: string): LancerMacro.Invocation {
  return JSON.parse(decodeURI(window.atob(encoded))) as LancerMacro.Invocation;
}

export async function runEncodedMacro(el: HTMLElement) {
  let data: LancerMacro.Invocation | null = null;
  let encoded = el.attributes.getNamedItem("data-macro")?.nodeValue;
  if (!encoded) {
    console.warn("No macro data available");
    return;
  }

  data = decodeMacroData(encoded) as LancerMacro.Invocation;

  if (!isValidEncodedMacro(data)) {
    console.error("Attempting to call invalid encoded macro");
    return;
  }

  let fn = game.lancer[data.fn];
  return (fn as Function).apply(null, data.args);
}
