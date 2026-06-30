<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { parseContentPack, type ContentSummary, generateLcpSummary, generateMultiLcpSummary } from "../../util/lcps";
  import type { IContentPack, IContentPackManifest } from "../../util/unpacking/packed-types";

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
  let filesData: {
    name: string;
    data: ArrayBuffer | null;
    loaded: boolean;
    cp: IContentPack | null;
  }[] = [];
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
      try {
        fd.cp = await parseContentPack(fd.data);
        dispatch("lcpLoaded", {
          contentPacks: [fd.cp],
          contentSummary: generateLcpSummary(fd.cp),
        });
        return;
      } catch (err: any) {
        ui.notifications.error(`Could not load ${fd.name}: ${err.message || err}`, { permanent: true });
        return;
      }
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

        try {
          fd.cp = await parseContentPack(fd.data);
          const author = fd.cp.manifest.website
            ? `<a href="${fd.cp.manifest.website}">${fd.cp.manifest.author}</a>`
            : `<em>${fd.cp.manifest.author}</em>`;
          aggregateManifest.description += `<b>${fd.cp.manifest.name}</b> v${fd.cp.manifest.version} by ${author}<br />`;
        } catch (err: any) {
          ui.notifications.error(`Could not load ${fd.name}: ${err.message || err}`, { permanent: true });
        }
      })
    );
    const contentPacks = filesData.map(fd => fd.cp!).filter(cp => Boolean(cp));
    if (contentPacks.length) {
      contentSummary = generateMultiLcpSummary(aggregateManifest, contentPacks);
      dispatch("lcpLoaded", { contentPacks, contentSummary });
    }
  }
</script>

<div style={$$restProps.style}>
  <div class="lancer-header lancer-primary major">Import From File</div>
  <div class="file-select-container">
    <label class="lancer-file-input">
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
      >

      <span class="lancer-file-input-display">
        <div class="lancer-file-input__button">Browse</div>
        <span class="lancer-file-input__filenames">{filenames || "Choose file..."}</span>
      </span>
    </label>
    <button class="lancer-button deselect-file" {disabled} on:click={deselect}>
      <i class="fas fa-broom"></i> Unselect File
    </button>
  </div>
</div>

<style lang="scss">
  @layer lancer {
    @layer components {
      .file-select-container {
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
      }
      .deselect-file {
        margin: 0.25rem;
        flex: 1 1;
        height: 2.5rem;
      }
    }
  }
</style>
