<script lang="ts">
    import { setContext } from 'svelte';
    import { scale } from 'svelte/transition';
    import type { Readable } from "svelte/store";

    // @ts-ignore
    import { TJSApplicationShell } from '@typhonjs-fvtt/runtime/svelte/component/core';
    import MechStats from "./MechStats.svelte";
    import Tabs from "../../components/Tabs.svelte";

    import type { LancerActor, LancerMECH } from '../../../actor/lancer-actor.js';
    export let elementRoot = void 0;

    export let actor: Readable<LancerMECH>;
    setContext("actor", actor);


    // Tab data
    const tabs = [
      {
        key: "stats",
        label: game.i18n.localize("lancer.mech-sheet.tabs.stats")
      },
      {
        key: "loadout",
        label: game.i18n.localize("lancer.mech-sheet.tabs.loadout")
      },
      {
        key: "talents",
        label: game.i18n.localize("lancer.mech-sheet.tabs.talents")
      },
      {
        key: "effects",
        label: game.i18n.localize("lancer.mech-sheet.tabs.effects")
      },
    ];
    let tab = "stats";

    export let inactive: boolean;
    $: inactive = $actor.system.pilot?.value.system.active_mech?.value != $actor;

</script>


<svelte:options accessors={true}/>

<TJSApplicationShell bind:elementRoot transition={scale} transitionOptions={{duration: 1000}}>
   <div>
    <header class="sheet-header card clipped-bot" class:inactive-mech="{inactive}">
      <div>
        <h1 class="charname">
          <input class="header-field" name="name" type="text" value="{$actor.name}" placeholder="{game.i18n.localize('lancer.placeholder.name')}" />
        </h1>
        {#if inactive}
        <span>WARNING: INACTIVE MECH - PILOT BONUSES NOT TRACKED</span>
        {/if}
      </div>
      <!--ref-portrait-img actor.img "img" actor-->
    </header>

    <!-- Sheet Tab Navigation -->
    <Tabs tabs={tabs} bind:selected={tab}></Tabs>
  </div>

  <!-- Sheet Body ---->
  <section class="sheet-body scroll-body">
    <div class="tab stats" style:display="{tab == 'stats' ? 'inherit' : 'none'}" >
     <MechStats /> 
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