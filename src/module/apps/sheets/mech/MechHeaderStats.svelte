<script lang="ts">
  import { getContext } from "svelte";
  import type { Readable } from "svelte/store";
  import type { LancerActor } from "../../../actor/lancer-actor.js";
  import StatBar from "../../components/StatBar.svelte";
  import StrussCounter from "../../components/StrussCounter.svelte";

  const actor: Readable<LancerActor> = getContext("actor");
</script>

<div class="header-stats flexrow {$$props.class}">
  <!-- Evasion -->
  <div class="header-stat-group evasion">
    <i class="cci cci-evasion i--s"></i>
    <span>{$actor.system.evasion}</span>
  </div>
  <!-- Armor -->
  <div class="header-stat-group armor">
    <i class="mdi mdi-shield-outline i--s"></i>
    <span>{$actor.system.armor}</span>
  </div>
  <!-- HP bar -->
  <div class="header-stat-bar hp">
    <StatBar icon="mdi mdi-heart-outline" path="system.hp"/>
  </div>
  <!-- Structure counter -->
  <div class="header-struss-ctr structure">
    <StrussCounter icon="cci cci-structure" path="system.structure" />
  </div>
  <!-- Overshield -->
  <div class="header-stat-group os">
    <i class="mdi mdi-shield-star-outline i--s"></i>
    <span>{$actor.system.overshield.value}</span>
  </div>
  <!-- Burn -->
  <div class="header-stat-group burn">
    <i class="cci cci-burn i--s"></i>
    <span>{$actor.system.burn}</span>
  </div>
  <!-- E-def -->
  <div class="header-stat-group edef">
    <i class="cci cci-edef i--s"></i>
    <span>{$actor.system.edef}</span>
  </div>
  <!-- Heat bar -->
  <div class="header-stat-bar heat">
    <StatBar icon="cci cci-heat" path="system.heat"/>
  </div>
  <!-- Stress counter -->
  <div class="header-struss-ctr stress">
    <StrussCounter icon="cci cci-reactor" path="system.stress" />
  </div>
</div>

<style lang="scss">
  .header-stats {
    position: absolute;
    bottom: 0px;
    left: 0px;
    transition: all 0.5s;
    background-color: var(--secondary-theme-color);
    width: 100%;
    height: 100%;
    clip-path: polygon(0 0, calc(100% - 30px) 0, 100% 30px, 100% 100%, 0 100%);
    padding-right: 30px;

    display: grid;
    grid-template-columns: 1fr 1fr 1fr 4em 4em 4em 4em;
    grid-template-rows: 1fr 1fr;
    grid-template-areas: 
      "struct   hp    hp    evasion armor  os   burn" 
      "stress   heat  heat  edef    .      .    .";

    &:hover {
      height: 6em;
    }

    .header-stat-group {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .header-stat-bar {
      align-self: center;
    }
    .header-struss-ctr {
      align-self: center;
      justify-self: center;
    }
    .evasion {
      grid-area: evasion;
    }
    .armor {
      grid-area: armor;
    }
    .hp {
      grid-area: hp;
    }
    .structure {
      grid-area: struct;
    }
    .os {
      grid-area: os;
    }
    .burn {
      grid-area: burn;
    }
    .edef {
      grid-area: edef;
    }
    .heat {
      grid-area: heat;
    }
    .stress {
      grid-area: stress;
    }
  }
</style>