<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { slide } from "svelte/transition";

  import { DamageType } from "../../enums";
  import { DamageData } from "../../models/bits/damage";

  const dispatch = createEventDispatcher();
  const damageSelectOptions = Object.entries(DamageType);

  export let damage: DamageData;
  export let deletable: boolean = true;

  function selected(type: DamageType) {
    return damage.type === type;
  }

  function dispatchDelete() {
    dispatch("delete");
  }
</script>

<div class="damage-input-container" in:slide={{ delay: 100, duration: 300 }} out:slide={{ duration: 100 }}>
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
  {#if deletable}
    <button
      class="lancer-button damage-delete"
      type="button"
      on:click={dispatchDelete}
      data-tooltip="Remove this damage type"
    >
      <i class="fas fa-trash" />
    </button>
  {/if}
</div>

<style lang="scss">
  select,
  input {
    color: unset;
  }

  .damage-input-container {
    display: grid;
    grid-template-columns: min-content min-content 1fr min-content;
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
    margin: 0;
    max-width: 10em;
  }

  .damage-delete {
    line-height: 1.5em;
    max-height: 1.5em;
    max-width: 1.5em;
    width: 1.5em;
    height: 1.5em;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0;

    i {
      margin: 0;
    }
  }
</style>
