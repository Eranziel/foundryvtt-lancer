import { LancerItem } from "../item/lancer-item";
import { LancerFlowState } from "./interfaces";
import { rollTextMacro } from "./text";

export async function preparePilotGearMacro(item: string | LancerItem) {
  item = LancerItem.fromUuidSync(item);
  if (!item.actor || !item.is_pilot_gear()) return;

  let gearData: LancerFlowState.TextRollData = {
    // docUUID: item.uuid,
    title: item.name!,
    description: item.system.description,
    tags: item.system.tags,
  };

  await rollTextMacro(gearData);
}

export async function prepareCoreBonusMacro(item: string | LancerItem) {
  item = LancerItem.fromUuidSync(item);
  if (!item.actor || !item.is_core_bonus()) return;

  let cbData: LancerFlowState.TextRollData = {
    // docUUID: item.uuid,
    title: item.name ?? "",
    description: item.system.effect,
  };
  await rollTextMacro(cbData);
}

export async function prepareReserveMacro(item: string | LancerItem) {
  item = LancerItem.fromUuidSync(item);
  if (!item.actor || !item.is_reserve()) return;

  let reserveData: LancerFlowState.TextRollData = {
    // docUUID: item.uuid,
    title: `RESERVE :: ${item.name}`,
    description: (item.system.label ? `<b>${item.system.label}</b></br>` : "") + item.system.description,
  };
  // resource_cost and resource_notes are in the lancer-data spec but not used currently
  // if (item.system.resource_cost) {
  //   reserveData.description += `</br>${item.system.resource_cost}`;
  // }
  // // @ts-expect-error Should be fixed with v10 types
  // if (item.system.resource_notes) {
  //   // @ts-expect-error Should be fixed with v10 types
  //   reserveData.description += `</br><b>Note:</b>${item.system.resource_notes}`;
  // }
  await rollTextMacro(reserveData);
}
