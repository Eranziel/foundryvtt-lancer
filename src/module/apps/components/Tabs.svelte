
<script lang="ts">
    // Props
    export let tabs: Array<{
        label: string,
        key: string 
    }>;
    export let selected: string;


    const select = (key: string) => () => selected = key;
</script>

<div class="lancer-tabs">
    {#each tabs as tab}
        <div class="lancer-tab" class:active={selected == tab.key} on:click={select(tab.key)}>
            {tab.label}
        </div>
    {/each}
</div>

<style lang="scss">
.lancer-tabs {
  clip-path: polygon(0 0, 100% 0, calc(100% - 20px) 100%, 0 100%);
  -webkit-clip-path: polygon(0 0, 100% 0, calc(100% - 20px) 100%, 0 100%);
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: flex-start;
  background-color: var(--main-theme-color, fuchsia);
  color: white;
  padding: 3px 10px;
  min-height: max-content;
  align-items: center;
}

.lancer-tab {
  clip-path: polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%);
  -webkit-clip-path: polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%);
  padding: 10px;
  cursor: pointer;
}
</style>