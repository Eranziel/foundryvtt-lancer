<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { parseContentPack, type ContentSummary, generateLCPSummary, generateMultiLCPSummary } from "../../util/lcps";
  import type { IContentPack, IContentPackManifest } from "../../util/unpacking/packed-types";

  interface Props {
    onImport: (p: IContentPack[] | null, s: ContentSummary | null) => void;

    disabled: boolean;
  }

  let {
    onImport,

    disabled = false,
  }: Props = $props();

  export const deselect = () => {
    selectedFiles = null;
    filenames = null;
    console.log("Deselecting file");
    onImport(null, null);
  };

  let selectedFiles = $state<FileList | null>(null);
  let filenames = $state<string | null>(null);
  let filesData = $state<
    {
      name: string;
      data: ArrayBuffer | null;
      loaded: boolean;
      cp: IContentPack | null;
    }[]
  >([]);
  let contentSummary = $state<ContentSummary | null>(null);

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
        ui.notifications.error(`${game.i18n.localize("lancer.notifications.error.lcpSelectorLoadFailed")} ${fd.name}`);
        return;
      }
      try {
        fd.cp = await parseContentPack(fd.data);
        onImport([fd.cp], generateLCPSummary(fd.cp));
        return;
      } catch (err: any) {
        ui.notifications.error(
          `${game.i18n.localize("lancer.notifications.error.lcpSelectorLoadFailed")} ${fd.name}: ${err.message || err}`,
          { permanent: true }
        );
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
          ui.notifications.error(
            `${game.i18n.localize("lancer.notifications.error.lcpSelectorLoadFailed")} '${fd.name}'`
          );
          return;
        }

        try {
          fd.cp = await parseContentPack(fd.data);
          const author = fd.cp.manifest.website
            ? `<a href="${fd.cp.manifest.website}">${fd.cp.manifest.author}</a>`
            : `<em>${fd.cp.manifest.author}</em>`;
          aggregateManifest.description += `<b>${fd.cp.manifest.name}</b> v${fd.cp.manifest.version} by ${author}<br />`;
        } catch (err: any) {
          ui.notifications.error(
            `${game.i18n.localize("lancer.notifications.error.lcpSelectorLoadFailed")} ${fd.name}: ${err.message || err}`,
            { permanent: true }
          );
        }
      })
    );
    const contentPacks = filesData.map(fd => fd.cp!).filter(cp => Boolean(cp));
    if (contentPacks.length) {
      contentSummary = generateMultiLCPSummary(aggregateManifest, contentPacks);
      onImport(contentPacks, contentSummary);
    }
  }
</script>

<div>
  <div class="lancer-header lancer-primary major clipped-top">
    {game.i18n.localize("lancer.lcpManager.header.importFromFile.label")}
  </div>
  <div class="file-select-container">
    <label class="lancer-file-input">
      <input
        id="lcp-file"
        type="file"
        multiple
        aria-label={game.i18n.localize("lancer.lcpManager.browse.label")}
        name="lcp-up"
        class="lcp-up"
        accept=".lcp"
        {disabled}
        bind:files={selectedFiles}
        onchange={filesSelected}
      >
      <span class="lancer-file-input-display">
        <div class="lancer-file-input__button">{game.i18n.localize("lancer.lcpManager.browse.label")}</div>
        <span class="lancer-file-input__filenames">{
          filenames || game.i18n.localize("lancer.lcpManager.browse.hint")
        }</span>
      </span>
    </label>
    <button
      class="lancer-button deselect-file"
      onclick={deselect}
      {disabled}
    >
      <i class="fas fa-broom"></i> {game.i18n.localize("lancer.lcpManager.clear.label")}
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
        min-height: 3rem;

        button,
        input,
        .lancer-file-input,
        .lancer-file-input-display,
        .lancer-file-input__button {
          border-radius: 2px;
          margin-left: unset;
        }

        .lancer-file-input__button {
          flex-grow: 0;
          flex-shrink: 0;
          flex-basis: auto;

          min-width: fit-content;
        }

        .lancer-file-input__filenames {
          flex-grow: 1;
          flex-shrink: 1;
          flex-basis: 0;
        }
      }

      .deselect-file {
        flex: 1 1;
        height: 2.5rem;
      }
    }
  }
</style>
