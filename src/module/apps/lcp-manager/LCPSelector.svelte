<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { parseContentPack } from "../../util/lcp-parser";
  import { LANCER } from "../../config";
  import { ContentSummary, generateLcpSummary } from "./massif-content-map";
  const lp = LANCER.log_prefix;

  const dispatch = createEventDispatcher();

  let contentSummary: ContentSummary | null = null;

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
    if (!cp.data) {
      ui.notifications.error(`Failed to parse LCP`);
      return;
    }
    contentSummary = generateLcpSummary(cp);
    console.log(`${lp} Contents of selected LCP:`, contentSummary);
    dispatch("lcpLoaded", { cp, contentSummary });
  }
</script>

<div style={$$restProps.style}>
  <div class="lancer-header lancer-primary major">Import From File</div>
  <!-- TODO: nice styling for the file selector -->
  <input id="lcp-file" type="file" name="lcp-up" class="lcp-up" accept=".lcp" on:change={fileSelected} />
  <!-- TODO: progress bar? -->
</div>

<style lang="scss">
  #lcp-file {
  }
</style>
