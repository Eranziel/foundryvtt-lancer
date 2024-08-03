<script lang="ts">
  export let style = "";
  export let label = "";
  export let tooltip: string | null = null;
  export let value = false;
  export let disabled = false;
</script>

<label class="container" {style} data-tooltip={tooltip}>
  <input type="checkbox" bind:checked={value} {disabled} />
  {label.replace(" ", " ")}
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
      margin: 0.25em 0;
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
      &:checked::before {
        // This is a free icon, it says pro because that's the only version provided
        // Don't change the weight unless you have a pro license or the new value is free as well
        // xmark (free for solid weight)
        content: "\f00d";
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
    }

    & input[type="checkbox"][disabled] {
      cursor: unset;
      &:hover {
        box-shadow: none;
      }
    }
  }
</style>
