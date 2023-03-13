// Import TypeScript modules
import { LANCER } from "../config";
import { buildSystemHTML } from "../helpers/item";
import { createChatMessageStep } from "./_render";
import { LancerItem } from "../item/lancer-item";

const lp = LANCER.log_prefix;

export async function prepareSystemMacro(item: string | LancerItem) {
  item = LancerItem.fromUuidSync(item);
  if (!item.actor || !item.is_mech_system()) return;
  // Construct the template
  const html = buildSystemHTML(item);
  return createChatMessageStep(item.actor, html);
}
