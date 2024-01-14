import { LancerFlowState } from "./interfaces";

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
  "beginStructureFlow",
  "prepareOverheatMacro",
  "beginSecondaryStructureFlow",
  "rollAttackMacro",
  "rollTechMacro",
  "importIntegrated",
  "stabilizeMacro",
  "structureMacro",
  "overheatMacro",
  "fullRepairMacro",
  "importActor",
];

/**
 * Verifies the given data, will print specific errors/warnings on validation.
 * @param data The data to verify.
 */
export function isValidEncodedMacro(data: LancerFlowState.InvocationData): boolean {
  if (!encodedMacroWhitelist.includes(data.fn)) {
    console.error(`Macro '${data.fn}' is not a whitelisted encoded macros.`);
    return false;
  }

  return !!(data.args && data.title);
}

export function encodeMacroData(data: LancerFlowState.InvocationData): string {
  return window.btoa(encodeURI(JSON.stringify(data)));
}

export function decodeMacroData(encoded: string): LancerFlowState.InvocationData {
  return JSON.parse(decodeURI(window.atob(encoded))) as LancerFlowState.InvocationData;
}

export async function runEncodedMacro(el: HTMLElement) {
  let data: LancerFlowState.InvocationData | null = null;
  let encoded = el.attributes.getNamedItem("data-macro")?.nodeValue;
  if (!encoded) {
    throw new Error("No macro data available");
  }

  data = decodeMacroData(encoded) as LancerFlowState.InvocationData;

  if (!isValidEncodedMacro(data)) {
    throw new Error("Attempting to call invalid encoded macro");
  }

  let fn = game.lancer[data.fn];
  return (fn as Function).apply(null, data.args);
}
