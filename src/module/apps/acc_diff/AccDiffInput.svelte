<script lang="ts">
  export let value: number = 0;
  export let id: string;
</script>

<button
  class="lancer-button dec-set"
  type="button"
  data-tooltip="Add global accuracy"
  on:click={() => (value = value + 1)}
>
  <i class="cci cci-accuracy i--sm" />
</button>
<label for={id} class="flexcol" data-tooltip="Global Accuracy/Difficulty Adjustment">
  <strong>Manual Adjust</strong>
  <strong class="accdiff-value">
    <span>{Math.abs(value)}</span>
    <i class="i--sm cci" class:cci-accuracy={value >= 0} class:cci-difficulty={value < 0} />
  </strong>
</label>
<input {id} class="difficulty lancer-invisible-input dec-set" style="display: none" type="number" bind:value />
<button
  class="lancer-button dec-set"
  type="button"
  data-tooltip="Add global difficulty"
  on:click={() => (value = value - 1)}
>
  <i class="cci cci-difficulty i--sm" />
</button>

<style lang="scss">
  .lancer-button {
    width: 5em;
    align-self: center;
  }

  label {
    text-align: center;
    margin: 0 0.5em;
    height: 3em;
  }

  .accdiff-value {
    height: 2em;
    vertical-align: middle;
  }
</style>
