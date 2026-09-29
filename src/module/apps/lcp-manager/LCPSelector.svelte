<script lang="ts">
  import { readContentPacks } from "../../util/lcps";
  import { readLanguagePatches } from "../../util/localization/llp-import";
  import { groupFilesByExtension } from "../../util/files";
  import type { IContentPack, PackedLanguagePatchWrapper } from "../../util/unpacking/packed-types";
  import { LANCER } from "../../config";
  const lp = LANCER.log_prefix;

  interface Props {
    onLCPsLoaded: (packs: IContentPack[]) => void;
    onLLPsLoaded: (patches: PackedLanguagePatchWrapper[]) => void;

    disabled: boolean;
  }

  let {
    onLCPsLoaded,
    onLLPsLoaded,

    disabled = false,
  }: Props = $props();

  const deselect = () => {
    selectedFiles = null;
    filenames = null;
    onLCPsLoaded([]);
    onLLPsLoaded([]);
  };

  let selectedFiles = $state<FileList | null>(null);
  let filenames = $state<string | null>(null);
  let reading = $state(false);

  async function filesSelected(event: any) {
    const files: File[] = Array.from(event.target?.files ?? []);
    if (!files.length) return;
    console.log(`${lp} Selected files:`, files);
    filenames = files.map(file => file.name).join(", ");

    const { supported, unsupported } = groupFilesByExtension(files, ["lcp", "llp"]);
    for (const file of unsupported) {
      console.error(`${lp} Unsupported file type on '${file.name}'`);
      ui.notifications.error(
        game.i18n.format("lancer.notifications.error.lcpManagerUnsupportedFileType", { file: file.name })
      );
    }

    // Each format reads and summarizes itself; the two never share a summary type
    reading = true;
    const [packs, patches] = await Promise.all([readContentPacks(supported.lcp), readLanguagePatches(supported.llp)]);
    reading = false;

    onLCPsLoaded(packs);
    onLLPsLoaded(patches);
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
        accept=".lcp, .llp"
        disabled={disabled || reading}
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
      disabled={disabled || reading}
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
