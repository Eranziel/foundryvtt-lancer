<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { parseContentPack, ContentSummary, generateLcpSummary, generateMultiLcpSummary } from "../../util/lcps";
  import { IContentPack, IContentPackManifest } from "../../util/unpacking/packed-types";

  const dispatch = createEventDispatcher();

  export let disabled: boolean = false;
  export const deselect = () => {
    selectedFiles = null;
    filenames = null;
    console.log("Deselecting file");
    dispatch("lcpLoaded", null);
  };

  let selectedFiles: FileList | null = null;
  let filenames: string | null = null;
  let filesData: { name: string; data: ArrayBuffer | null; loaded: boolean; cp: IContentPack | null }[] = [];
  let contentSummary: ContentSummary | null = null;

  function filesSelected(event: any) {
    const files: FileList = event.target?.files;
    if (!files) return;
    filenames = "";
    filesData = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`Selected file: ${file.name}`);
      filenames += file.name;
      if (i < files.length - 1) filenames += ", ";
      // Create an object in the filesData array to track the file's data and loading status
      filesData.push({ name: file.name, data: null, loaded: false, cp: null });

      // Start loading the file's data
      const reader = new FileReader();
      reader.addEventListener("loadend", (e: ProgressEvent<FileReader>) => {
        const data = reader.result as ArrayBuffer | null;
        const fd = filesData.find(fd => fd.name === file.name);
        // Once loading is done, mark the file as loaded and store the data
        if (!fd) return;
        fd.loaded = true;
        if (data) {
          fd.data = data;
        }
      });
      reader.readAsArrayBuffer(file);
    }
    waitAndDispatchLcpLoaded();
  }

  async function waitAndDispatchLcpLoaded() {
    if (!filesData || !filesData.length) return;
    // Wait for all files to load
    while (filesData.some(fd => !fd.loaded)) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    // If there's only one pack, parse it and dispatch the loaded event
    if (filesData.length === 1) {
      const fd = filesData[0];
      if (!fd.data) {
        ui.notifications.error(`Failed to load LCP ${fd.name}`);
        return;
      }
      fd.cp = await parseContentPack(fd.data);
      dispatch("lcpLoaded", { contentPacks: [fd.cp], contentSummary: generateLcpSummary(fd.cp) });
      return;
    }

    // Parse the content packs
    const aggregateManifest: IContentPackManifest = {
      name: "Selected LCPs",
      author: "Various",
      item_prefix: "",
      version: "",
      description: "",
    };
    await Promise.all(
      filesData.map(async fd => {
        if (!fd.data) {
          ui.notifications.error(`Failed to load LCP ${fd.name}`);
          return;
        }
        fd.cp = await parseContentPack(fd.data);
        const author = fd.cp.manifest.website
          ? `<a href="${fd.cp.manifest.website}">${fd.cp.manifest.author}</a>`
          : `<em>${fd.cp.manifest.author}</em>`;
        aggregateManifest.description += `<b>${fd.cp.manifest.name}</b> v${fd.cp.manifest.version} by ${author}<br />`;
      })
    );
    const contentPacks = filesData.map(fd => fd.cp!).filter(cp => Boolean(cp));
    contentSummary = generateMultiLcpSummary(aggregateManifest, contentPacks);
    dispatch("lcpLoaded", { contentPacks, contentSummary });
  }
</script>

<div style={$$restProps.style}>
  <div class="lancer-header lancer-primary major">Import From File</div>
  <div class="file-select-container">
    <label class="file">
      <input
        id="lcp-file"
        type="file"
        multiple
        aria-label="Select LCP file"
        name="lcp-up"
        class="lcp-up"
        accept=".lcp"
        {disabled}
        bind:files={selectedFiles}
        on:change={filesSelected}
      />

      <span class="file-custom"
        ><div class="file-custom__button">Browse</div>
        <span class="file-custom__filenames">{filenames || "Choose file..."}</span></span
      >
    </label>
    <button class="lancer-button deselect-file" {disabled} on:click={deselect}>
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
    &:hover .file-custom {
      border-color: var(--lighten-5);
      transition: background-color 0.5s, border-color 0.5s;
    }
    &:hover .file-custom__button {
      color: var(--light-text);
      background-color: var(--primary-color);
      filter: brightness(1.1);
      box-shadow: inset 0 0 10em var(--lighten-1);
      transition: background-color 0.5s, border-color 0.5s;
    }
  }
  .file input {
    width: 100%;
    margin: 0;
    // Hide the actual file input
    opacity: 0;

    &:disabled {
      cursor: not-allowed;
    }
    &:disabled + .file-custom,
    &:disabled + .file-custom__button {
      cursor: not-allowed;
      text-shadow: none;
      box-shadow: none;
      filter: brightness(0.7);
    }
  }
  .file-custom {
    position: absolute;
    top: 0;
    right: 0;
    left: 0;
    z-index: 5;
    height: 2.5rem;
    padding: 0.5rem 1em;
    line-height: 1.6;
    color: var(--dark-text);
    background-color: var(--darken-1);
    border: 0.075rem solid var(--darken-4);
    border-radius: 0.25rem;
    box-shadow: var(--button-shadow);
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;

    .file-custom__filenames {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      width: 80%;
    }
  }
  .file-custom__button {
    position: absolute;
    right: 0;
    top: 0;
    z-index: 6;
    display: block;
    padding: 0.5rem 1rem;
    line-height: 1.5;
    width: 20%;
    color: var(--dark-text);
    background-color: var(--light-gray-color);
    border-left: 1px solid var(--darken-4);
    border-radius: 0 0.25rem 0.25rem 0;
  }
</style>
