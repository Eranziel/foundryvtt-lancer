import type { HelperOptions } from "handlebars";
import { LancerFlowState } from "../flows/interfaces";
import { DamageData } from "../models/bits/damage";
import { RangeData } from "../models/bits/range";
import { lancerDiceRoll } from "./commons";

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
    ? `<span class="card clipped lancer-hit-chip crit">${game.i18n.format("lancer.chat-card.attack.crit")}</span>`
    : hit.hit
    ? `<span class="card clipped lancer-hit-chip hit">${game.i18n.format("lancer.chat-card.attack.hit")}</span>`
    : `<span class="card clipped lancer-hit-chip miss">${game.i18n.format("lancer.chat-card.attack.miss")}</span>`;
  const img = hit.target.actor?.img;
  const uuid = hit.target.document.uuid;
  return `
    <div class="lancer-hit-target" data-uuid=${uuid}>
      <img class="lancer-hit-thumb" src="${img}" />
      <span class="lancer-hit-text-name" data-tooltip="${hit.target.name}"><b>${hit.target.name}</b></span>
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
  const statuses = target.target.actor?.statuses || new Set();
  const exposed = statuses.has("exposed");
  const resists = {
    energy: statuses.has("resistance_energy"),
    explosive: statuses.has("resistance_explosive"),
    kinetic: statuses.has("resistance_kinetic"),
    burn: statuses.has("resistance_burn"),
    heat: statuses.has("resistance_heat"),
  };
  const select = context.configurable
    ? `
          <select class="lancer-damage-apply-select" title="Select damage multiplier">
            <option value="2">2×</option>
            <option value="1" selected>1×</option>
            <option value="0.5">Resist</option>
          </select>`
    : "";

  // Doesn't really matter whether we use damage_results or crit_damage_results here
  // We just need a consistent set of damage types
  let damageResults;
  if (target.crit) damageResults = context.crit_damage_results;
  else if (target.hit) damageResults = context.damage_results;
  else damageResults = context.reliable_results || [];

  const damageTypes = new Set(
    damageResults
      .filter(d => !d.target || d.target?.document.uuid === target.target.document.uuid)
      .map(d => d.d_type.toLowerCase())
  );
  const damageIcons = Array.from(damageTypes)
    .map(d => `<i class="cci cci-${d} i--s damage--${d}"></i>`)
    .join("");

  const bonusDamage: LancerFlowState.DamageResult[] = damageResults.filter(
    d => d.bonus && d.target?.document.uuid === target.target.document.uuid
  );

  const bonusRolls: string[] = bonusDamage.map(
    bd =>
      `<div class="flexrow"><span class="lancer-damage-tag" style="flex-grow: 0" data-tooltip="This row is bonus damage">BONUS</span>${lancerDiceRoll(
        bd.roll,
        bd.tt as string,
        `cci cci-${bd.d_type.toLowerCase()} damage--${bd.d_type.toLowerCase()} i--m`
      )}</div>`
  );

  const damageTags: string[] = [];
  for (const [type, resist] of Object.entries(resists)) {
    if (resist) {
      damageTags.push(
        `<span class="lancer-damage-tag" data-tooltip="Resist ${type.capitalize()}"><i class="mdi mdi-shield-half-full i--xs"></i></span>`
      );
    }
  }
  if (exposed) {
    damageTags.push(
      `<span class="lancer-damage-tag" data-tooltip="Exposed"><i class="cci cci-status-exposed i--xs"></i></span>`
    );
  }
  if ((context.ap && !context.paracausal) || (target.ap && !(target.paracausal || context.paracausal)))
    damageTags.push(
      `<span class="lancer-damage-tag" data-tooltip="Armor Piercing"><i class="mdi mdi-shield-off-outline i--xs"></i></span>`
    );
  if (context.paracausal || target.paracausal)
    damageTags.push(
      `<span class="lancer-damage-tag" data-tooltip="Cannot Be Reduced"><i class="cci cci-large-beam i--xs"></i></span>`
    );
  if (context.half_damage || target.half_damage)
    damageTags.push(
      `<span class="lancer-damage-tag" data-tooltip="Half Damage"><i class="mdi mdi-fraction-one-half i--xs"></i></span>`
    );
  const damageTagsDisplay = damageTags.length ? `<div class="lancer-damage-tags">${damageTags.join("")}</div>` : "";
  const img = target.target.actor?.img;
  const uuid = target.target.document.uuid;
  return `
    <div class="lancer-damage-target" data-uuid=${uuid}>
      <img class="lancer-hit-thumb" src="${img}" />
      <span class="lancer-hit-text-name" data-tooltip="${target.target.name}"><b>${target.target.name}</b></span>
      <div
        class="lancer-damage-button-group"
        data-target="${uuid}"
        data-hit="${target.hit}"
        data-crit="${target.crit}"
        data-add-burn="${context.add_burn}"
      >
        ${select}
        <button
          class="lancer-button lancer-damage-apply"
          title="Apply damage"
        >${damageIcons}</button>
      </div>
      <div class="lancer-damage-rolls-tags flexrow">
        <div class="lancer-target-bonus-damage flexcol">${bonusRolls.join("")}</div>
        ${damageTagsDisplay}
      </div>
    </div>`;
}
