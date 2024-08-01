<script lang="ts">
  import { DamageType } from "../../enums";
  import { DamageData } from "../../models/bits/damage";

  const damageSelectOptions = Object.entries(DamageType);

  export let damage: DamageData;

  function selected(type: DamageType) {
    return damage.type === type;
  }
</script>

<div class="damage-input-container">
  <i class="i--sm cci cci-{damage.type.toLowerCase()} damage--{damage.type.toLowerCase()}" data-tooltip={damage.type} />
  <select class="damage-input-type" bind:value={damage.type}>
    {#each damageSelectOptions as damageOption}
      <option value={damageOption[1]} selected={selected(damageOption[1])}>
        {damageOption[0]}
      </option>
    {/each}
  </select>
  <input
    class="lancer-input damage-input-val"
    type="text"
    data-dtype="string"
    bind:value={damage.val}
    placeholder="0"
  />
</div>

<style lang="scss">
  select,
  input {
    color: unset;
  }

  .damage-input-container {
    display: grid;
    grid-template-columns: min-content min-content 1fr;
    grid-template-rows: auto;
    align-items: center;
    justify-items: center;
  }

  .damage-input-type {
    background-color: var(--darken-1);

    & option {
      color: var(--tooltip-text);
      background-color: var(--tooltip-background);
    }
  }

  .damage-input-val {
    background-color: var(--darken-1);
  }
</style>
