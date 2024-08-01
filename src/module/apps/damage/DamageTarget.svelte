<script lang="ts">
  import { DamageHudTarget } from "./data";

  export let target: DamageHudTarget;
</script>

<div class="damage-hud-target-card card clipped">
  {target.target.name}
</div>

<style lang="scss">
  .damage-hud-target-card {
    background-color: var(--dark-gray-color);
  }
</style>
