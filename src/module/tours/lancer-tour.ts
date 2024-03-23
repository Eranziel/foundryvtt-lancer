// @ts-nocheck Tours aren't typed yet

import { LCPManager } from "../apps/lcp-manager";

export class LancerTour extends Tour {
  async _preStep() {
    await super._preStep();
    if (this.currentStep?.click) {
      document.querySelector(this.currentStep.selector).click();
    }
    if (this.currentStep?.sidebarTab) {
      ui.sidebar?.expand();
      ui.sidebar?.activateTab(this.currentStep.sidebarTab);
    }
  }
}

export class LancerLcpTour extends LancerTour {
  manager: LCPManager | undefined;
  async _preStep() {
    await super._preStep();
    if (!this.manager) this.manager = new LCPManager();
    if (this.currentStep.id === "lcpImport") {
      // This is a fake lcp that contains no items
      const lcp_tribute = window.atob(
        "UEsDBBQAAAAIAANod1iaTB1/iQAAAMEAAAARABwAbGNwX21hbmlmZXN0Lmpzb25VVAkAA6UY/2Wl" +
          "GP9ldXgLAAEE6AMAAAToAwAANc27DsIwDAXQPV9hZUZRxcgIYmNgYEehdYlRXnLcUgnx76RALE/3" +
          "WNcvBXV0tAH1DvRxsSF7hNPhrDc/spO4xCvuk5fS4gFLz5SFUlzt4qhA3ZgExCHcGa1gEfB9Borf" +
          "7JnYDwba6WOqbEGYbpOgacUkGK6ZcaRlLR5nkUYzcvn/25rOdFq91QdQSwECHgMUAAAACAADaHdY" +
          "mkwdf4kAAADBAAAAEQAYAAAAAAABAAAApIEAAAAAbGNwX21hbmlmZXN0Lmpzb25VVAUAA6UY/2V1" +
          "eAsAAQToAwAABOgDAABQSwUGAAAAAAEAAQBXAAAA1AAAAAAA"
      );
      await this.manager._onLcpParsed(lcp_tribute);
      // Delay to avoid race condition
      await new Promise(resolve => {
        setTimeout(resolve, 30);
      });
    }
    if (this.currentStep?.inApp) {
      await this.manager._render(true);
    }
  }
}
