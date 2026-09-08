<script lang="ts">
  interface Props {
    canImport: boolean; // Staged content; official rows, picked files, or language patches
    canClear: boolean;

    onImport: () => void;
    onClearCompendiums: () => void;

    disabled: boolean;
  }

  let {
    canImport,
    canClear,

    onImport,
    onClearCompendiums,

    disabled = false,
  }: Props = $props();
</script>

<div class="lcp-actions">
  <button
    type="button"
    class="lancer-button lcp-bulk-import"
    title={game.i18n.localize("lancer.lcpManager.importSelected.label")}
    tabindex="-1"
    disabled={disabled || !canImport}
    onclick={onImport}
  >
    <i class="cci cci-content-manager i--4"></i>
    {game.i18n.localize("lancer.lcpManager.importSelected.label")}
  </button>
  <button
    type="button"
    id="clear-button"
    class="lancer-button lcp-clear-all"
    title={game.i18n.localize("lancer.lcpManager.clearCompendiumData.label")}
    tabindex="-1"
    disabled={disabled || !canClear}
    onclick={onClearCompendiums}
  >
    <i class="fas fa-trash i--2"></i>
    {game.i18n.localize("lancer.lcpManager.clearCompendiumData.label")}
  </button>
</div>

<style lang="scss">
  @layer lancer {
    @layer applications {
      .lcp-actions {
        display: flex;
        flex-direction: column;
        flex-grow: 0;
        flex-shrink: 0;
        flex-basis: auto;
        gap: 5px;

        button {
          border-radius: 2px;
        }

        .lcp-bulk-import,
        .lcp-clear-all {
          width: 100%;
          max-height: 3em;
        }

        .lcp-clear-all {
          background-color: var(--background-color);
          border: 1px solid var(--lighten-5);
          &:hover {
            background-color: var(--color-level-error-bg) !important;
            border: 1px solid var(--color-level-error-border) !important;
          }
        }
      }
    }
  }
</style>
