<script lang="ts">
  import type { DamageData } from "../../models/bits/damage";
  import type { RangeData } from "../../models/bits/range";

  export let profile: { range: RangeData[]; damage?: DamageData[]; accuracy?: number; attack?: number };
</script>

<div class="mini-weapon-profile flexrow">
  {#if profile.attack || profile.accuracy}
    <div class="mini-weapon-profile-accuracy flexrow">
      {#if profile.attack}
        <span data-tooltip="Attack bonus"
          ><i class="cci cci-reticule" />{profile.attack < 0 ? "-" : "+"}{profile.attack}</span
        >
      {/if}
      {#if profile.accuracy}
        <span data-tooltip={(profile.accuracy ?? 0) > 0 ? "Accuracy" : "Difficulty"}
          ><i class="cci cci-{(profile.accuracy ?? 0) > 0 ? 'accuracy' : 'difficulty'}" />{Math.abs(
            profile.accuracy
          )}</span
        >
      {/if}
    </div>
    <span class="mini-weapon-profile-separator">//</span>
  {/if}
  <div class="mini-weapon-profile-range flexrow">
    {#each profile.range as range}
      <span data-tooltip={range.type}><i class="cci cci-{range.type.toLowerCase()}" />{range.val}</span>
    {/each}
  </div>
  {#if profile.damage}
    <span class="mini-weapon-profile-separator">//</span>
    <div class="mini-weapon-profile-damage flexrow">
      {#each profile.damage as damage}
        <span data-tooltip={damage.type}
          ><i class="cci cci-{damage.type.toLowerCase()} damage--{damage.type.toLowerCase()}" />{damage.val}</span
        >
      {/each}
    </div>
  {/if}
</div>
