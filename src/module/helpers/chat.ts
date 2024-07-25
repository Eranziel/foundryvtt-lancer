import type { HelperOptions } from "handlebars";
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
