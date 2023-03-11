<script lang="ts">
  import { setContext } from 'svelte';
  import { scale } from 'svelte/transition';
  import type { Readable } from "svelte/store";

  // @ts-ignore
  import { TJSApplicationShell } from '@typhonjs-fvtt/runtime/svelte/component/core';

  import type { LancerActor, LancerMECH } from '../../actor/lancer-actor.js';
  export let elementRoot = void 0;

  export let actor: Readable<LancerMECH>;

  setContext("actor", $actor)

  export let is_active = false;

  function clicker() {
     alert("Foo");
  }
</script>


<svelte:options accessors={true}/>

<TJSApplicationShell bind:elementRoot transition={scale} transitionOptions={{duration: 1000}}>
   <div>
    <header class="sheet-header card clipped-bot" class:inactive-mech="{is_active}">
      <div>
        <h1 class="charname">
          <input class="header-field" name="name" type="text" value="{$actor.name}" placeholder="{game.i18n.localize('lancer.placeholder.name')}" />
        </h1>
        {#if is_active}
         <span>WARNING: INACTIVE MECH - PILOT BONUSES NOT TRACKED</span>
        {/if}
      </div>
      <!--ref-portrait-img actor.img "img" actor-->
    </header>

    <!--!-- Sheet Tab Navigation ---->
    <nav class="lancer-tabs" data-group="primary">
      <a class="item lancer-tab medium" data-tab="stats"><!--localize "lancer.mech-sheet.tabs.stats"--></a>
      <a class="item lancer-tab medium" data-tab="loadout"><!--localize "lancer.mech-sheet.tabs.loadout"--></a>
      <a class="item lancer-tab medium" data-tab="talents"><!--localize "lancer.mech-sheet.tabs.talents"--></a>
      <a class="item lancer-tab medium" data-tab="effects"><!--localize "lancer.mech-sheet.tabs.effects"--></a>
    </nav>
  </div>

  <!--!-- Sheet Body ---->
  <section class="sheet-body scroll-body">
    <div class="tab stats" data-group="primary" data-tab="stats">
      <div class="stat-grid">
        <!--stat-edit-max-card "HP" "mdi mdi-heart-outline" "system.hp.value" "system.hp.max"-->
        <!--stat-edit-max-card "HEAT" "cci cci-heat" "system.heat.value" "system.heat.max"-->
        <!--stat-view-card "EVASION" "cci cci-evasion" "system.evasion"-->
        <!--stat-view-card "ARMOR" "mdi mdi-shield-outline" "system.armor"-->
        <!--stat-edit-max-card "STRUCTURE" "cci cci-structure" "system.structure.value" "system.structure.max"-->
        <!--stat-edit-max-card "STRESS" "cci cci-reactor" "system.stress.value" "system.stress.max"-->
        <!--stat-view-card "E-DEF" "cci cci-edef" "system.edef"-->
        <!--stat-view-card "SPEED" "mdi mdi-arrow-right-bold-hexagon-outline" "system.speed"-->
        <!--stat-view-card "SAVE" "cci cci-save" "system.save"-->
        <!--stat-view-card "SENSORS" "cci cci-sensor" "system.sensor_range"-->
        <!--tech-flow-card "TECH ATK" "cci cci-tech-full" "system.tech_attack"-->
        <!--stat-edit-card "BURN" "cci cci-burn" "system.burn"-->
        <!--stat-edit-card "O.SHIELD" "mdi mdi-shield-star-outline" "system.overshield.value"-->
        <!--stat-edit-max-card "REPAIRS" "cci cci-repair" "system.repairs.value" "system.repairs.max"-->
        <div class="size-card">
          <!--#if (eq system.size 0.5)-->
          <i class="cci cci-size-half size-icon theme--main"></i>
          <!--else-->
          <i class="cci cci-size-<!--system.size--> size-icon theme--main"></i>
          <!--/if-->
        </div>
        <!--overcharge-button actor "system.overcharge"-->
        <div class="flexcol card clipped">
          <div class="lancer-header">
            <span class="major">
              <!--localize "lancer.mech-sheet.core.label"-->
            </span>
          </div>
          <div class="flexrow stat-container">
            <input name="system.core_energy" class="core-power-toggle mdi mdi-battery" style="margin: auto;"
              type="checkbox" data-dtype="Boolean" checked="{$actor.system.core_energy > 0}" />
          </div>
        </div>
        <!--stat-rollable-card "GRIT" "cci cci-armor" "system.grit"-->
        <!--pilot-slot "system.pilot" value=pilot-->

        <div class="wraprow double hase">
          <!--stat-rollable-card "HUL" "" "system.hull"-->
          <!--stat-rollable-card "AGI" "" "system.agi"-->
          <!--stat-rollable-card "SYS" "" "system.sys"-->
          <!--stat-rollable-card "ENG" "" "system.eng"-->
        </div>
        <div class="inventory" style="flex: inherit;margin:3px 10px">
          <button type="button" style="padding: 8px 16px"> View Inventory </button>
        </div>
      </div>
      <div class="pilot-frame-wrapper flexrow">
        <div class="card">
          <span class="lancer-header submajor clipped-top">
            <!--localize "lancer.mech-sheet.macros.label" -->
          </span>
          <div class="lancer-macro-grid">
            <!--macro-button "STABILIZE" "stabilizeMacro" -->
            <!--macro-button "FULL REPAIR" "fullRepairMacro" -->
            <div style="margin:0px 8px;border-left: 2px solid #a2a2a2;"></div>
            <!--macro-button "STRUCTURE" "prepareStructureMacro" -->
            <!--macro-button "OVERHEAT" "prepareOverheatMacro" -->
          </div>
        </div>
        <!--#if (is-combatant actor)-->
        <div style="min-width:560px" class="card">
          <span class="lancer-header submajor clipped-top">
            <!--localize "lancer.mech-sheet.actions.label"-->
          </span>
          <div class="lancer-action-grid">
            <!--action-button "Protocol" "system.action_tracker.protocol" "protocol"-->
            <!--action-button "Movement" "system.action_tracker.move" "move"-->
            <!--action-button "Full Action" "system.action_tracker.full" "full"-->
            <!--action-button "Quick Action" "system.action_tracker.quick" "quick"-->
            <!--action-button "Reaction" "system.action_tracker.reaction" "reaction"-->
          </div>
        </div>
        <!--/if-->
      </div>
    </div>

    <div class="tab loadout" data-group="primary" data-tab="loadout">
      <!--mech-frame "system.loadout.frame.value"-->
      <div class="card clipped">
        <span class="lancer-header submajor">BASIC ATTACKS</span>
        <div class="lancer-macro-grid">
          <!--macro-button "MELEE/RANGED" "prepareAttackMacro" -->
          <!--macro-button "TECH" "prepareTechMacro" -->
        </div>
      </div>
      <div class="card">
        <span class="lancer-header major">
          <!--localize "lancer.mech-sheet.system.label" total=system.loadout.sp.value max=system.loadout.sp.max-->
        </span>
        <!--mech-loadout-->
      </div>
    </div>

    <div class="tab talents" data-group="primary" data-tab="talents">
      <!--!-- Talents ---->
      <!--#if system.pilot.value-->
      <div class="card clipped">
        <h2 class="lancer-title clipped"><!--localize "lancer.pilot-sheet.abilities.talents"--></h2>
        <!--#each system.pilot.value.itemTypes.talent as |talent index|-->
          <!--item-preview (concat "system.pilot.value.itemTypes.talent." index) null -->
        <!--/each-->
      </div>
      <!--/if-->
    </div>

    <div class="tab effects" data-group="primary" data-tab="effects">
      <!--effect-categories-view effect_categories--> 
    </div>
  </section>
</TJSApplicationShell>

<style lang="scss">

</style>