<script lang="ts">
  import { getContext } from "svelte";
  import type { Readable } from "svelte/store";
  import type { LancerActor } from "../../../actor/lancer-actor.js";
  import StatBar from "../../components/StatBar.svelte";
  import StatViewCard from "../../components/StatViewCard.svelte";

  const actor: Readable<LancerActor> = getContext("actor");
</script>

<div class="header-stats flexrow {$$props.class}">
  <!-- Armor -->
  <div class="header-stat-group">
    <i class="mdi mdi-shield-outline i--s"></i>
    <span>{$actor.system.armor}</span>
  </div>
  <!-- Overshield -->
  <div class="header-stat-group">
    <i class="mdi mdi-shield-star-outline i--s"></i>
    <span>{$actor.system.overshield.value}</span>
  </div>
  <StatBar icon="mdi mdi-heart-outline" path="system.hp"/>
  <!-- Burn -->
  <div class="header-stat-group">
    <i class="cci cci-burn i--s"></i>
    <span>{$actor.system.burn}</span>
  </div>
  <StatBar icon="cci cci-heat" path="system.heat"/>
</div>

<style lang="scss">
  .header-stats {
    background-color: var(--secondary-theme-color);
    width: 100%;
    height: 100%;
    clip-path: polygon(0 0, calc(100% - 30px) 0, 100% 100%, 0 100%);
    padding-right: 30px;

    .header-stat-group {
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
</style>