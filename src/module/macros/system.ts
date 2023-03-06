// Import TypeScript modules
import { LANCER } from "../config.js";
import { buildSystemHTML } from "../helpers/item.js";
import { renderMacroHTML } from "./_render.js";
import { LancerItem } from "../item/lancer-item.js";

const lp = LANCER.log_prefix;

export async function prepareSystemMacro(item: string | LancerItem) {
  item = LancerItem.fromUuidSync(item);
  if (!item.actor || !item.is_mech_system()) return;
  // Construct the template
  const html = buildSystemHTML(item);
  return renderMacroHTML(item.actor, html);
}
