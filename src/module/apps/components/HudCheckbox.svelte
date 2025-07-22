<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { slide } from "svelte/transition";

  const dispatch = createEventDispatcher();

  export let style = "";
  export let label = "";
  export let quickReference = "";
  export let icon = "";
  export let tooltip: string | null = null;
  export let checked: boolean | null = null;
  export let value = false;
  export let partial = false;
  export let disabled = false;
  export let visible = true;

  if (checked !== null) {
    value = checked; // Initialize value with checked state
  }
</script>

<label transition:slide|local class="container" class:invisible={!visible} {style} data-tooltip={tooltip}>
  <input
    type="checkbox"
    bind:checked={value}
    {disabled}
    class={partial ? "partial" : ""}
    on:change={() => dispatch("change", value)}
  />
  {#if icon}<i class="{icon} i--s" />{/if}
  <span class="human-label" style="text-wrap: nowrap;">{label}</span>
  {#if quickReference !== ""}
    <span style="text-wrap: nowrap; "> ({quickReference})</span>
  {/if}
</label>

<style lang="scss">
  :global(.lancer-hud) {
    & .container {
      display: flex;
      position: relative;
      font-size: 0.9em;
      user-select: none;
      align-items: center;
      cursor: pointer;

      i:has(+ span) {
        margin-right: 0.2em;
      }
    }

    & .container:has(+ .container) {
      margin: 0 0 0.25em 0;
    }

    & .container.invisible {
      display: none;
    }

    & .container:has(input[disabled]) {
      cursor: unset;
      opacity: 0.5;
    }

    & input[type="checkbox"] {
      /* Hide the browser's default checkbox */
      appearance: none;
      height: 20px;
      width: 20px;
      min-width: 20px;
      background-color: #a9a9a9;
      cursor: pointer;
      display: inline-block;
      border-radius: 0;
      vertical-align: text-bottom;
      position: relative;
      margin: 0;
      margin-right: 0.2rem;
      &.partial,
      &:checked {
        background-color: var(--primary-color, fuchsia);
      }
      &:hover {
        box-shadow: 0px 0px 8px var(--primary-color);
      }
      &::before {
        content: "";
        position: relative;
        margin: auto;
        overflow: hidden;
        width: 20px;
        height: 20px;
      }
      &.partial::before,
      &:checked::before {
        // These states use a free icon, it says pro because that's the only version provided
        // Don't change the weight unless you have a pro license or the new value is free as well
        // xmark (free for solid weight)
        font-family: "Font Awesome 6 Pro";
        // fa-solid (free)
        font-weight: 900;
        line-height: 20px;
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: 20px;
        color: var(--light-text);
      }
      &.partial::before {
        content: "\f068";
      }
      &:checked::before {
        content: "\f00d";
      }
    }

    & input[type="checkbox"][disabled] {
      cursor: unset;
      &:hover {
        box-shadow: none;
      }
    }

    .human-label {
      text-overflow: ellipsis;
      overflow: hidden;
      max-width: 25ch;
    }
    // @media only screen and (max-width: 1100px) {
    //   .human-label {
    //     max-width: 14ch;
    //   }
    // }
  }
</style>
