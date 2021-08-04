<script context="module">
 let counter = 0;
</script>

<script lang="ts">
 import type { Cover } from './index';
 export let cover: Cover;
 export let disabled: boolean = false;
 export let labelClass: string = '';
 let klass: string = ''; export { klass as class };

 let id = `accdiff-cover-input-${counter++}`;

  let inputs = [
    { slug: "no", human: "No Cover", value: 0 },
    { slug: "soft", human: "Soft Cover (-1)", value: 1 },
    { slug: "hard", human: "Hard Cover (-2)", value: 2 },
  ];
</script>

<div class="lancer-cover-radio {klass}" class:disabled={disabled}>
  {#each inputs as input}
    <input type="radio" id="{id}-{input.slug}" class="no-grow {input.slug}-cover"
           bind:group={cover} value={input.value} disabled={disabled} />
    <label for="{id}-{input.slug}" class="lancer-cover-radio-label {labelClass}">
      <i class="cci-{input.slug}-cover i--s" title={input.human}></i>
      <span class="no-grow">{input.human}</span>
    </label>
  {/each}
</div>

<style>
 i { border: none }
</style>
