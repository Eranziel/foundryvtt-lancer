<script lang="ts">
  import { createPopperActions } from 'svelte-popperjs';
  const placement = "right";
  const [popperRef, popperContent] = createPopperActions({
    placement,
    strategy: "fixed",
  });
  const extraOpts = {
    modifiers: [{ name: "offset", options: { offset: [0, 0] } }],
  };
  let showTooltip = false;

  let fadeDelay: ReturnType<typeof setTimeout> | null = null;
</script>

<div
  data-popper-placement={placement}
  on:mouseleave={() => showTooltip = false}
  on:mouseenter={() => showTooltip = true}
>
  <slot name="anchor" popperRef={popperRef}></slot>

  {#if showTooltip}
    <div use:popperContent={extraOpts} class="popover">
      <slot name="content"></slot>
    </div>
  {/if}
</div>

<style lang="scss">
  .popover {
    background: #c4c4c4;
    border: 2px solid #444;
    padding: 0.3rem;
    border-left: 5px solid #444;
    z-index: 9999;
    position: absolute;
  }
</style>
