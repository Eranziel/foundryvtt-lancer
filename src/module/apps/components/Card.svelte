<script lang="ts">
  // Props
  export let clipped: boolean = false;
  export let style: string = "";
  export let flat: boolean = false;
</script>

<div class="card" class:clipped class:flat style="{style}">
  <div class="lancer-header">
    <slot name="header">
    </slot>
  </div>
  <slot></slot>
</div>

<style lang="scss">
  .lancer-header {
    display: flex;
    flex-direction: row;
    align-items: center;
    text-align: center;
    justify-content: flex-start;
    padding-left: 10px;
    padding-right: 10px;
  }
  .card {
    background-color: rgba(0, 0, 0, 0.07);
    margin: 4px;
    text-align: center;
    padding-bottom: 1px;

    display: grid;
    grid-template: 1fr 1fr / 1fr;
    flex-direction: column;
    align-items: center;
  }

  .card.flat {
    grid-template: 2em / 2fr 1fr;
  }
</style>
