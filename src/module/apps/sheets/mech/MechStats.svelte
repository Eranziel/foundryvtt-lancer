<script lang="ts">
  import { getContext } from "svelte";
  import StatViewCard from "../../components/StatViewCard.svelte";
  import StatEditCard from "../../components/StatEditCard.svelte";
  import BoundedStatEditCard from "../../components/BoundedStatEditCard.svelte";
  import Card from "../../components/Card.svelte";
  import type { Readable } from "svelte/store";
  import type { LancerActor } from "../../../actor/lancer-actor.js";

  const actor: Readable<LancerActor> = getContext("actor");
</script>

<div class="grouped-stat-grid">
  <div style="grid-area: int">
    <Card clipped={true}>
      <span class="stat-header" slot="header">INTEGRITY</span>
    </Card>
    <BoundedStatEditCard path="system.hp" label="HP" icon="mdi mdi-heart-outline" />
    <BoundedStatEditCard path="system.heat" label="HEAT" icon="cci cci-heat" />
    <BoundedStatEditCard path="system.structure" label="STRUCT" icon="cci cci-structure" />
    <BoundedStatEditCard path="system.stress" label="STRESS" icon="cci cci-reactor" />
  </div>
  <div style="grid-area: com">
    <Card clipped={true}>
      <span class="stat-header" slot="header">STAT</span>
    </Card>
    <StatViewCard path="system.save" label="SAVE" icon="cci cci-save" />
    <StatEditCard path="system.burn" label="BURN" icon="cci cci-burn" />
    <StatEditCard path="system.overshield.value" label="O.SHIELD" icon="mdi mdi-shield-star-outline" />
    <StatViewCard path="system.armor" label="ARMOR" icon="mdi mdi-shield-outline" />

    <Card>
      <span slot="header">Core</span>
      <input
        name="system.core_energy"
        class="core-power-toggle mdi mdi-battery"
        style="margin: auto;"
        type="checkbox"
        data-dtype="Boolean"
        checked={false}
      />
    </Card>
  </div>
  <div style="grid-area: hull">
    <StatViewCard path="system.hull" label="HULL" clipped={true}/>
    <BoundedStatEditCard path="system.repairs" label="REPAIRS" icon="cci cci-repair" />
  </div>
  <div style="grid-area: agi">
    <StatViewCard path="system.agi" label="AGI" clipped={true}/>
    <StatViewCard path="system.speed" label="SPEED" icon="mdi mdi-arrow-right-bold-hexagon-outline" />
    <StatViewCard path="system.evasion" label="EVASION" icon="cci cci-evasion" />
  </div>
  <div style="grid-area: sys">
    <StatViewCard path="system.sys" label="SYS" clipped={true}/>
    <StatViewCard path="system.sensor_range" label="SENSORS" icon="cci cci-sensor" />
    <StatViewCard path="system.edef" label="E-DEF" icon="cci cci-edef" />
    <!--tech-flow-card "TECH ATK" "cci cci-tech-full" "system.tech_attack"-->
  </div>
  <div style="grid-area: eng">
    <StatViewCard path="system.sys" label="ENG" clipped={true}/>
  </div>
  <div style="grid-area: size">
    {#if $actor.system.size < 1}
      <i class="cci cci-size-half size-icon theme--main" />
    {:else}
      <i class="cci cci-size-<!--system.size--> size-icon theme--main" />
    {/if}
  </div>
  <!--overcharge-button actor "system.overcharge"-->
  <div style="grid-area: pilot">
    <div class="lancer-header">
      <span class="major">
        <!--localize "lancer.mech-sheet.core.label"-->
      </span>
    </div>
  </div>
  <!--stat-rollable-card "GRIT" "cci cci-armor" "system.grit"-->
  <!--pilot-slot "system.pilot" value=pilot-->
</div>

<style lang="scss">
  .stat-header {
    font-size: larger;
    font-weight: bolder;
  }
  .grouped-stat-grid {
    display: grid;
    grid-template-columns: 120px 120px 120px;
    grid-template-rows: 1fr 1fr 1fr;
    grid-template-areas:
      "int hull agi"
      "com sys eng"
      "size void pilot";
  }
</style>
