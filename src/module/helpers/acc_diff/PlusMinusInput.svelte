<script lang="ts">
  export let value: number = 0;
  export let id: string;
</script>

<button class="clicker-minus-button dec-set" type="button" on:click={() => (value = value - 1)}> ‒ </button>
<input
  {id}
  class="difficulty lancer-invisible-input dec-set"
  style="max-width: 2em;text-align: center;font-size: 1.2em"
  type="number"
  bind:value
  min="0"
/>
<button class="clicker-plus-button dec-set" type="button" on:click={() => (value = value + 1)}> + </button>
