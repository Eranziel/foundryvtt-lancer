// Import TypeScript modules

export { onHotbarDrop } from "./flows/hotbar";
export { targetsFromTemplate } from "./flows/_template";
export { encodeMacroData, runEncodedMacro } from "./flows/encode";
export { renderTemplateStep as renderMacroTemplate, createChatMessageStep as renderMacroHTML } from "./flows/_render";
// export { prepareActivationMacro } from "./flows/activation";
// export { prepareAttackMacro, rollAttackMacro } from "./flows/attack";
// export { prepareCoreActiveMacro, prepareCorePassiveMacro, prepareFrameTraitMacro } from "./flows/frame";
// export { prepareItemMacro } from "./flows/item";

// HACK ALERT: For some reason, removing all exports from ./flows/npc causes the built
// output to fail - it puts some Flow child class declarations before the Flow class declaration itself.
export { registerNPCSteps } from "./flows/npc";

// export { prepareOverchargeMacro } from "./flows/overcharge";
// export { prepareStatMacro } from "./flows/stat";
// export { prepareTalentMacro } from "./flows/talent";
// export { prepareTechMacro, rollTechMacro } from "./flows/tech";
export { prepareTextMacro } from "./flows/text";
// export { prepareStabilizeMacro as stabilizeMacro } from "./flows/stabilize";
// export { beginStructureFlow, beginSecondaryStructureFlow } from "./flows/structure";
// export { beginOverheatFlow } from "./flows/overheat";
// export { prepareFullRepairMacro as fullRepairMacro } from "./flows/full-repair";
