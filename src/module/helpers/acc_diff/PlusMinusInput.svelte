<script lang="ts">
  export let value: number = 0;
  export let id: string;
</script>

<button class="mod-minus-button dec-set" type="button" on:click={() => value = value - 1}>
  -
</button>
<input id={id} class="difficulty lancer-invisible-input dec-set"
       style="max-width: 2em;text-align: center;font-size: 1.2em"
       type="number" bind:value={value} min="0" />
<button class="mod-plus-button dec-set" type="button" on:click={() => value = value + 1}>
  +
</button>
