<div class="spinner__container">
  <div class="spinner__spinner" />
  <slot />
</div>

<style lang="scss">
  .spinner__container {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    height: 100%;
  }
  .spinner__spinner {
    display: inline-block;
    flex: 0 0 auto;
    margin-left: 2em;
    margin-right: 2em;
    width: 50px;
    height: 50px;
    border: 3px solid var(--darken-3);
    border-radius: 50%;
    border-top-color: var(--primary-color);
    animation: spin 1s ease-in-out infinite;
    -webkit-animation: spin 1s ease-in-out infinite;
  }

  @keyframes spin {
    to {
      -webkit-transform: rotate(360deg);
    }
  }
  @-webkit-keyframes spin {
    to {
      -webkit-transform: rotate(360deg);
    }
  }
</style>
