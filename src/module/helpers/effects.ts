import type { HelperOptions } from "handlebars";
import { LancerActor } from "../actor/lancer-actor";
import { LancerActiveEffect } from "../effects/lancer-active-effect";

/**
 * Handlebars helper for a single effect
 */
export function effect_view(
  actor: LancerActor,
  index: number,
  effect: LancerActiveEffect,
  options: HelperOptions
): string {
  return `<div class="active-effect">
                <span>
                    ${effect.getFlag(game.system.id, "ephemeral") ? "[Readonly]: " : ""}${effect.name}
                </span>
                <a class="lancer-context-menu" data-active-effect-index="${index}" data-uuid="${actor.uuid}">
                    <i class="fas fa-ellipsis-v"></i>
                </a>
            </div>`;
}

/**
 * Handlebars helper for an entire smattering of effects
 */
export function effect_categories_view(
  actor: LancerActor,
  effects: ReturnType<typeof LancerActiveEffect["prepareActiveEffectCategories"]>,
  options: HelperOptions
) {
  let categories = [] as string[];
  for (let cat of effects) {
    // if(!cat.effects.length) continue;
    categories.push(`
        <div class="card clipped">
            <span class="lancer-header submajor">${cat.label}</span>
            <div class="flexcol">
                ${cat.effects.map(([index, effect]) => effect_view(actor, index, effect, options)).join("")}
            </div>
        </div>
        `);
  }
  return `<div class="flexcol">${categories.join("")} </div>`;
}
