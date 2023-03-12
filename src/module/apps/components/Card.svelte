<script lang="ts">
  // Props
  export let clipped: boolean = false;
  export let style: string = "";
</script>

<div class="card" class:clipped style="{style}">
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
  }
  .card {
    background-color: rgba(0, 0, 0, 0.07);
    margin: 4px;
    text-align: center;
    padding-bottom: 1px;
    display: flex;
    flex-direction: column;
  }
</style>
