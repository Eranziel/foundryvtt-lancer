<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { parseContentPack, ContentSummary, generateLcpSummary } from "../../util/lcps";

  const dispatch = createEventDispatcher();

  export const deselect = () => {
    selectedFiles = null;
    filename = null;
    console.log("Deselecting file");
    dispatch("lcpLoaded", null);
  };

  let selectedFiles: FileList | null = null;
  let filename: string | null = null;
  let contentSummary: ContentSummary | null = null;

  function fileSelected(event: any) {
    const file = event.target?.files[0];
    if (!file) return;
    filename = file.name;

    const reader = new FileReader();
    reader.addEventListener("loadend", (e: ProgressEvent<FileReader>) => {
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
    dispatch("lcpLoaded", { cp, contentSummary });
  }
</script>

<div style={$$restProps.style}>
  <div class="lancer-header lancer-primary major">Import From File</div>
  <div class="file-select-container">
    <label class="file">
      <input
        id="lcp-file"
        type="file"
        aria-label="Select LCP file"
        name="lcp-up"
        class="lcp-up"
        accept=".lcp"
        bind:files={selectedFiles}
        on:change={fileSelected}
      />

      <span class="file-custom"
        ><div class="file-custom__button">Browse</div>
        {filename || "Choose file..."}</span
      >
    </label>
    <button class="lancer-button deselect-file" on:click={deselect}>
      <i class="fas fa-broom" /> Unselect File
    </button>
  </div>
</div>

<style lang="scss">
  .file-select-container {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
  }
  .deselect-file {
    margin: 0.25rem;
    flex: 1 1;
  }
  // Custom file input styling
  // Adapted from https://github.com/mdo/wtf-forms/, MIT License, Copyright (c) 2014 Mark Otto
  .file {
    position: relative;
    display: inline-block;
    cursor: pointer;
    height: 2.5rem;
    margin: 0.25rem;
    flex: 4 1;
  }
  .file input {
    width: 100%;
    margin: 0;
    // Hide the actual file input
    opacity: 0;
  }
  .file-custom {
    position: absolute;
    top: 0;
    right: 0;
    left: 0;
    z-index: 5;
    height: 2.5rem;
    padding: 0.5rem 1rem;
    line-height: 1.5;
    color: var(--dark-text);
    background-color: var(--darken-1);
    border: 0.075rem solid var(--darken-4);
    border-radius: 0.25rem;
    box-shadow: var(--button-shadow);
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }
  .file-custom__button {
    position: absolute;
    right: 0;
    top: 0;
    z-index: 6;
    display: block;
    padding: 0.5rem 1rem;
    line-height: 1.5;
    color: var(--dark-text);
    background-color: var(--light-gray-color);
    border-left: 1px solid var(--darken-4);
    border-radius: 0 0.25rem 0.25rem 0;
  }
</style>
