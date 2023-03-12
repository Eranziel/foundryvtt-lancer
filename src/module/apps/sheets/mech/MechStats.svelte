<script lang="ts">
  import { getContext } from "svelte";
  import StatViewCard from "../../components/StatViewCard.svelte";
  import StatEditCard from "../../components/StatEditCard.svelte";
  import BoundedStatEditCard from "../../components/BoundedStatEditCard.svelte";
  import DocCheckboxField from "../../components/DocCheckboxField.svelte";
  import Card from "../../components/Card.svelte";
  import type { Readable } from "svelte/store";
  import type { LancerActor } from "../../../actor/lancer-actor.js";

  const actor: Readable<LancerActor> = getContext("actor");
</script>

<div class="grouped-stat-grid">
  <div class="misc">
    <StatViewCard path="system.grit" label="GRIT" icon="cci cci-armor" />
    <StatViewCard path="system.armor" label="ARMOR" icon="mdi mdi-shield-outline" />
    <StatEditCard path="system.overshield.value" label="O.SHIELD" icon="mdi mdi-shield-star-outline" />
    <BoundedStatEditCard path="system.hp" label="HP" icon="mdi mdi-heart-outline" />
    <StatEditCard path="system.burn" label="BURN" icon="cci cci-burn" />
    <div class="spacer"></div>
    <BoundedStatEditCard path="system.heat" label="HEAT" icon="cci cci-heat" />
    <StatViewCard path="system.save" label="SAVE" icon="cci cci-save" />
    <Card flat={true}>
      <span slot="header">Core</span>
      <DocCheckboxField path="system.core_energy" document={$actor} class="core-power-toggle mdi mdi-battery" style="margin: auto;" />
    </Card>
  </div>
  <div class="hull">
    <StatViewCard path="system.hull" label="HULL" clipped={true}/>
    <StatViewCard path="system.hp.max" label="MAX HP"/>
    <BoundedStatEditCard path="system.repairs" label="REPAIRS" icon="cci cci-repair" />
    <BoundedStatEditCard path="system.structure" label="STRUCT" icon="cci cci-structure" />
  </div>
  <div class="agi">
    <StatViewCard path="system.agi" label="AGI" clipped={true}/>
    <StatViewCard path="system.speed" label="SPEED" icon="mdi mdi-arrow-right-bold-hexagon-outline" />
    <StatViewCard path="system.evasion" label="EVASION" icon="cci cci-evasion" />
  </div>
  <div class="sys">
    <StatViewCard path="system.sys" label="SYS" clipped={true}/>
    <StatViewCard path="system.sensor_range" label="SENSORS" icon="cci cci-sensor" />
    <StatViewCard path="system.edef" label="E-DEF" icon="cci cci-edef" />
    <!--tech-flow-card "TECH ATK" "cci cci-tech-full" "system.tech_attack"-->
  </div>
  <div class="eng">
    <StatViewCard path="system.eng" label="ENG" clipped={true}/>
    <BoundedStatEditCard path="system.stress" label="STRESS" icon="cci cci-reactor" />
    <StatViewCard path="system.overcharge" label="O.CHARGE" />
  </div>
  <!--overcharge-button actor "system.overcharge"-->
  <div class="size">
    <i class="cci cci-size-{$actor.system.size >= 1 ? $actor.system.size : 'half'} size-icon theme--main" />
  </div>
  <div class="pilot">
    <!--pilot-slot "system.pilot" value=pilot-->
  </div>
</div>

<style lang="scss">
  .hull {
    grid-area: hull;
  }
  .agi {
    grid-area: agi;
  }
  .sys {
    grid-area: sys;
  }
  .eng {
    grid-area: eng;
  }
  .misc {
    grid-area: misc;
  }
  .size {
    grid-area: size;
  }
  .pilot {
    grid-area: pilot;
  }
  .stat-header {
    font-size: larger;
    font-weight: bolder;
  }
  .grouped-stat-grid {
    display: grid;
    grid-template-columns: 170px 170px 170px 170px;
    grid-template-rows: 1fr 1fr;
    grid-template-areas:
      "hull sys misc size"
      "agi eng misc pilot"
  }
  .spacer {
    height: 10px;
  }
</style>
