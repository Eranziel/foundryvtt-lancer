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

 input {
     opacity: 0;
     position: fixed;
     width: 0;
 }

 label {
     display: inline-block;
     padding-left: 5px;
 }
 .flexrow label {
     padding: 0px;
 }

 div:not(.disabled) label:hover {
     background-color: #dfd;
 }

 .card input:checked + label {
     background-color: #aaa;
 }

 input:checked + label {
     background-color: #ddd;
 }

 .disabled {
     opacity: 0.4;
 }

 .cci-no-cover:before {
     content: '\25cb';
 }
 .cci-soft-cover:before {
     content: '\25d1';
 }
 .cci-hard-cover:before {
     content: '\25cf';
 }
</style>
