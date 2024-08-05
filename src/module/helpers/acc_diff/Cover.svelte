<script context="module">
  let counter = 0;
</script>

<script lang="ts">
  import { crossfade } from "svelte/transition";
  import type { Cover } from "./index";
  export let cover: Cover;
  export let disabled: boolean = false;
  export let labelClass: string = "";
  let klass: string = "";
  export { klass as class };

  let id = `accdiff-cover-input-${counter++}`;

  let inputs = [
    { slug: "no", human: "No Cover", value: 0, icon: "shield-outline" },
    { slug: "soft", human: "Soft Cover (-1)", value: 1, icon: "shield-half-full" },
    { slug: "hard", human: "Hard Cover (-2)", value: 2, icon: "shield" },
  ];

  let [send, recv] = crossfade({});
</script>

<div class="lancer-cover-radio {klass}" class:disabled>
  {#each inputs as input}
    <input
      type="radio"
      id="{id}-{input.slug}"
      class="no-grow {input.slug}-cover"
      bind:group={cover}
      value={input.value}
      {disabled}
    />
    <label for="{id}-{input.slug}" class="lancer-cover-radio-label {labelClass}">
      <i class="mdi mdi-{input.icon} i--s" title={input.human} />
      <span class="no-grow">{input.human}</span>
      {#if input.value == cover}
        <div class="cover-arrow" in:send|local={{ key: id }} out:recv|local={{ key: id }} />
      {/if}
    </label>
  {/each}
</div>

<style lang="scss">
  i {
    border: none;
  }

  input {
    opacity: 0;
    position: fixed;
    width: 0;
  }

  label {
    display: inline-block;
    padding-left: 5px;
    position: relative;
    .flexrow & {
      padding: 0px;
    }
    &:has(.cover-arrow) {
      text-shadow: 0px 0px 5px var(--primary-color);
    }
  }

  .cover-arrow,
  :not(.disabled) label:hover::after {
    content: "";
    position: absolute;
    right: 98%;
    top: calc(50% - 4px);
    background-color: var(--primary-color);
    width: 8px;
    height: 8px;
    clip-path: polygon(0 0, 0 100%, 100% 50%);
    :global(.card) & {
      right: unset;
      top: unset;
      bottom: 90%;
      left: calc(50% - 3px);
      width: 6px;
      height: 6px;
      clip-path: polygon(0 0, 100% 0, 50% 100%);
    }
  }

  :not(.disabled) label:hover::after {
    opacity: 40%;
  }

  .disabled {
    opacity: 0.4;
  }
</style>
