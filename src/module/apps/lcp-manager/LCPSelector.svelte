<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import LcpDetails from "./LCPDetails.svelte";
  import { parseContentPack } from "../../util/lcp-parser";
  import { LANCER } from "../../config";
  const lp = LANCER.log_prefix;

  const dispatch = createEventDispatcher();

  let manifest: any = null;

  function fileSelected(event: any) {
    const file = event.target?.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.addEventListener("progress", (e: ProgressEvent<FileReader>) => {
      console.log("file load progress", e.loaded, e.total);
    });
    reader.addEventListener("loadend", (e: ProgressEvent<FileReader>) => {
      console.log("file load end", e.loaded, e.total);
      const data = reader.result as ArrayBuffer | null;
      if (!data) return;
      _onLcpLoaded(data);
    });
    reader.readAsArrayBuffer(file);
  }

  async function _onLcpLoaded(fileData: ArrayBuffer | null) {
    if (!fileData) return;
    let cp = await parseContentPack(fileData);
    manifest = {
      ...cp.manifest,
      item_prefix: "",
      skills: cp.data.skills?.length ?? 0,
      talents: cp.data.talents?.length ?? 0,
      gear: cp.data.pilotGear?.length ?? 0,
      frames: cp.data.frames?.length,
      systems: cp.data.systems?.length,
      weapons: cp.data.weapons?.length,
      mods: cp.data.mods?.length,
      npc_classes: cp.data.npcClasses?.length,
      npc_templates: cp.data.npcTemplates?.length,
      npc_features: cp.data.npcFeatures?.length,
    };
    console.log(`${lp} Manifest of selected LCP:`, manifest);
    // dispatch("lcpLoaded", { cp, manifest });
  }
</script>

<div style={$$restProps.style}>
  <div class="lancer-header lancer-primary major">Import From File</div>
  <!-- TODO: nice styling for the file selector -->
  <input id="lcp-file" type="file" name="lcp-up" class="lcp-up" accept=".lcp" on:change={fileSelected} />
  <!-- TODO: progress bar? -->

  <LcpDetails {manifest} style="grid-area: lcp-details" />
</div>

<style lang="scss">
  #lcp-file {
  }
</style>
