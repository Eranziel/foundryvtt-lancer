<script context="module">
  let counter = 0;
</script>

<script lang="ts">
  import { crossfade } from "svelte/transition";
  import type { HitQuality } from "./index";
  export let quality: HitQuality;
  export let disabled: boolean = false;
  export let labelClass: string = "";
  let klass: string = "";
  export { klass as class };

  let id = `damage-quality-input-${counter++}`;

  let inputs = [
    { slug: "crit", human: "Crit", value: 2, icon: "fas fa-explosion" },
    { slug: "hit", human: "Hit", value: 1, icon: "fas fa-crosshairs" },
    { slug: "miss", human: "Miss", value: 0, icon: "mdi mdi-call-missed" },
  ];

  let [send, recv] = crossfade({});
</script>

<div class="lancer-hit-quality-radio {klass}" class:disabled>
  {#each inputs as input}
    <input
      type="radio"
      id="{id}-{input.slug}"
      class="no-grow {input.slug}-cover"
      bind:group={quality}
      value={input.value}
      {disabled}
    />
    <label for="{id}-{input.slug}" class="lancer-hit-quality-radio-label {labelClass}" data-tooltip={input.human}>
      <i class="{input.icon} i--s" /><span class="no-grow">{input.human}</span>
      {#if input.value == quality}
        <div class="hit-quality-arrow" in:send|local={{ key: id }} out:recv|local={{ key: id }} />
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

    &:has(.hit-quality-arrow) {
      text-shadow: 0px 0px 5px var(--primary-color);
    }
  }

  .hit-quality-arrow,
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
