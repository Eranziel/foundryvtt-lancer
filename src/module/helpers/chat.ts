import type { HelperOptions } from "handlebars";
import { LancerFlowState } from "../flows/interfaces";
import { lancerDiceRoll } from "./commons";
import { DamageData } from "../models/bits/damage";
import { RangeData } from "../models/bits/range";

export function miniProfile(
  profile: { range: RangeData[]; damage?: DamageData[]; attack?: number; accuracy?: number },
  options: HelperOptions
): string {
  const attack = profile.attack
    ? `<span data-tooltip="Attack Bonus"><i class="cci cci-reticule"></i>${profile.attack}</span>`
    : "";
  const accuracyTooltip = (profile.accuracy ?? 0) < 0 ? `data-tooltip="Difficulty"` : `data-tooltip="Accuracy"`;
  const accuracy = profile.accuracy
    ? `<span ${accuracyTooltip}>${
        profile.accuracy < 0 ? `<i class="cci cci-difficulty"></i>` : `<i class="cci cci-accuracy"></i>`
      }${Math.abs(profile.accuracy)}</span>`
    : "";
  const ranges = profile.range
    .map(r => `<span data-tooltip="${r.type}"><i class="cci cci-${r.type.toLowerCase()}"></i>${r.val}</span>`)
    .join("");
  const damages = profile.damage
    ? profile.damage
        .map(
          d =>
            `<span data-tooltip="${
              d.type
            }"><i class="cci cci-${d.type.toLowerCase()} damage--${d.type.toLowerCase()}"></i>${d.val}</span>`
        )
        .join("")
    : "";

  return `
    <div class="mini-weapon-profile flexrow">
      ${
        profile.attack || profile.accuracy
          ? `
        <div class="mini-weapon-profile-accuracy flexrow">
          ${attack}
          ${accuracy}
        </div>
        <span class="mini-weapon-profile-separator">//</span>
        `
          : ""
      }
      <div class="mini-weapon-profile-range flexrow">
        ${ranges}
      </div>
      ${
        profile.damage
          ? `
      <span class="mini-weapon-profile-separator">//</span>
      <div class="mini-weapon-profile-damage flexrow">
        ${damages}
      </div>`
          : ""
      }
    </div>`;
}

export function attackTarget(hit: LancerFlowState.HitResultWithRoll, options: HelperOptions): string {
  const hitChip = hit.crit
    ? `<span class="card clipped lancer-hit-chip crit">${game.i18n.format("lancer.chat-card.attack.crit", {
        total: hit.total,
      })}</span>`
    : hit.hit
    ? `<span class="card clipped lancer-hit-chip hit">${game.i18n.format("lancer.chat-card.attack.hit", {
        total: hit.total,
      })}</span>`
    : `<span class="card clipped lancer-hit-chip miss">${game.i18n.format("lancer.chat-card.attack.miss", {
        total: hit.total,
      })}</span>`;
  // @ts-expect-error v10 types
  const img = hit.target.document.texture.src;
  return `
    <div class="lancer-hit-target">
      <img class="lancer-hit-thumb" src="${img}" />
      <span class="lancer-hit-text-name"><b>${hit.target.name}</b></span>
      ${hitChip}
      <div class="lancer-hit-roll">
        ${lancerDiceRoll(hit.roll, hit.tt as string, "cci cci-reticule i--sm")}
      </div>
    </div>`;
}

export function damageTarget(
  target: LancerFlowState.DamageTargetResult,
  context: LancerFlowState.DamageRollData,
  options: HelperOptions
): string {
  // @ts-expect-error v11 types
  const statuses: Set<string> = target.target.actor?.statuses || new Set();
  const exposed = statuses.has("exposed");
  const select = context.configurable
    ? `
          <select class="lancer-damage-apply-select" title="Select damage multiplier">
            <option value="2"${exposed ? " selected" : ""}>Exposed</option>
            <option value="1"${!exposed ? " selected" : ""}>Normal</option>
            <option value="0.5">Resisted</option>
          </select>`
    : "";

  // Doesn't really matter whether we use damage_results or crit_damage_results here
  // We just need a consistent set of damage types
  const damageResults =
    !target.hit && !target.crit && context.reliable_results
      ? context.reliable_results
      : context.damage_results.length
      ? context.damage_results
      : context.crit_damage_results;
  const damageTypes = damageResults
    .map(d => `<i class="cci cci-${d.d_type.toLowerCase()} i--s damage--${d.d_type.toLowerCase()}"></i>`)
    .join("");

  const damageTags: string[] = [];
  if (context.ap && !context.paracausal)
    damageTags.push(
      `<span class="lancer-damage-tag" data-tooltip="Armor Piercing"><i class="mdi mdi-shield-off-outline"></i></span>`
    );
  if (context.paracausal)
    damageTags.push(`<span class="lancer-damage-tag" data-tooltip="Paracausal"><i class="mdi mdi-shimmer"></i></span>`);
  if (context.half_damage)
    damageTags.push(
      `<span class="lancer-damage-tag" data-tooltip="Half Damage"><i class="mdi mdi-fraction-one-half"></i></span>`
    );
  const damageTagsDisplay = `<div class="lancer-damage-tags">${damageTags.join("")}</div>`;
  // @ts-expect-error v10 types
  const img = target.target.document.texture.src;
  return `
    <div class="lancer-damage-target">
      <img class="lancer-hit-thumb" src="${img}" />
      <span class="lancer-hit-text-name"><b>${target.target.name}</b></span>
      <div
        class="lancer-damage-button-group"
        data-target="${target.target.document.uuid}"
        data-hit="${target.hit}"
        data-crit="${target.crit}"
        data-add-burn="${context.add_burn}"
      >
        ${select}
        <button
          class="lancer-button lancer-damage-apply"
          title="Apply damage"
        >${damageTypes}</button>
      </div>
      ${damageTagsDisplay}
    </div>`;
}
