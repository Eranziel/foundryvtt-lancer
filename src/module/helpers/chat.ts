import type { HelperOptions } from "handlebars";
import { DamageData } from "../models/bits/damage";
import { RangeData } from "../models/bits/range";

export function miniProfile(
  profile: { range: RangeData[]; damage?: DamageData[]; attack?: number; accuracy?: number },
  options: HelperOptions
): string {
  const attack = profile.attack
    ? `<span><i class="cci cci-reticule" data-tooltip="Attack Bonus"></i>${profile.attack}</span>`
    : "";
  const accuracy = profile.accuracy
    ? `${
        profile.accuracy < 0
          ? `<i class="cci cci-difficulty" data-tooltip="Difficulty"></i>`
          : `<i class="cci cci-accuracy" data-tooltip="Accuracy"></i>`
      }${Math.abs(profile.accuracy)}`
    : "";
  const ranges = profile.range
    .map(r => `<span><i class="cci cci-${r.type.toLowerCase()}" data-tooltip="${r.type}"></i>${r.val}</span>`)
    .join("");
  const damages = profile.damage
    ? profile.damage
        .map(
          d =>
            `<span><i class="cci cci-${d.type.toLowerCase()} damage--${d.type.toLowerCase()}" data-tooltip="${
              d.type
            }"></i>${d.val}</span>`
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
