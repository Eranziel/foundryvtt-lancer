import { LancerItem } from "../item/lancer-item.js";
import type { LancerMacro } from "./interfaces.js";
import { rollTextMacro } from "./text.js";

export async function preparePilotGearMacro(item: string | LancerItem) {
  item = LancerItem.fromUuidSync(item);
  if (!item.actor || !item.is_pilot_gear()) return;

  let gearData: LancerMacro.TextRoll = {
    docUUID: item.uuid,
    title: item.name!,
    description: item.system.description,
    tags: item.system.tags,
  };

  await rollTextMacro(gearData);
}

export async function prepareCoreBonusMacro(item: string | LancerItem) {
  item = LancerItem.fromUuidSync(item);
  if (!item.actor || !item.is_core_bonus()) return;

  let cbData: LancerMacro.TextRoll = {
    docUUID: item.uuid,
    title: item.name ?? "",
    description: item.system.effect,
  };
  await rollTextMacro(cbData);
}

export async function prepareReserveMacro(item: string | LancerItem) {
  item = LancerItem.fromUuidSync(item);
  if (!item.actor || !item.is_reserve()) return;

  let reserveData: LancerMacro.TextRoll = {
    docUUID: item.uuid,
    title: `RESERVE :: ${item.system.resource_name ?? item.name}`,
    description: (item.system.label ? `<b>${item.system.label}</b></br>` : "") + item.system.description,
  };
  if (item.system.resource_cost) {
    reserveData.description += `</br>${item.system.resource_cost}`;
  }
  // @ts-expect-error Should be fixed with v10 types
  if (item.system.resource_notes) {
    // @ts-expect-error Should be fixed with v10 types
    reserveData.description += `</br><b>Note:</b>${item.system.resource_notes}`;
  }
  await rollTextMacro(reserveData);
}
