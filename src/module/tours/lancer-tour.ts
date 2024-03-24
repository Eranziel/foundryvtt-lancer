declare global {
  interface Game {
    tours: any;
  }
  class Tour {
    static fromJSON(json_file: string): Promise<Tour>;
    currentStep: TourStep;
    _preStep(): Promise<void>;
    _postStep(): Promise<void>;
  }
}

interface TourStep {
  id: string;
  selector: string;
  title: string;
  content: string;
  click?: boolean;
  sidebarTab?: string;
  inApp?: boolean;
}

import { LCPManager } from "../apps/lcp-manager";
import { LancerCombat } from "../combat/lancer-combat";

export class LancerTour extends Tour {
  async _preStep() {
    await super._preStep();
    if (this.currentStep?.sidebarTab) {
      ui.sidebar?.expand();
      ui.sidebar?.activateTab(this.currentStep.sidebarTab);
    }
  }

  async _postStep() {
    await super._postStep();
    if (this.currentStep?.click) {
      document.querySelector<HTMLElement>(this.currentStep.selector)?.click();
    }
  }
}

export class LancerLcpTour extends LancerTour {
  manager?: LCPManager;
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
      await new Promise(resolve => setTimeout(resolve, 30));
    }
    if (this.currentStep.inApp) {
      // @ts-expect-error Incorrectly labeled protected
      await this.manager._render(true);
    }
  }
}

export class LancerCombatTour extends LancerTour {
  combat?: LancerCombat;
  async _preStep() {
    await super._preStep();
    if (!this.combat || this.currentStep.id === "combatTab") this.combat = (await this._setupCombat())!;
    await this.combat.activate();
    if (!this.combat.started) await this.combat.startCombat();
    if (this.currentStep.id === "endTurn") {
      await this.combat.activateCombatant(
        this.combat.turns.find(t => t.getFlag(game.system.id, "tour") === "ultra")?.id ?? "",
        true
      );
      // Delay to avoid race condition
      await new Promise(resolve => setTimeout(resolve, 30));
    }
  }

  async _postStep() {
    await super._postStep();
    if (this.currentStep?.id === "combatSettings") {
      this.combat?.delete();
      this.combat = undefined;
    }
  }

  protected async _setupCombat() {
    return Combat.create({
      [`flags.${game.system.id}.tour`]: true,
      combatants: [
        ...get_player_data(),
        {
          name: "Assault (1)",
          img: `./systems/${game.system.id}/assets/retrograde-minis/Retrograde-Minis-Corpro-ASSAULT.png` as const,
          [`flags.${game.system.id}.tour` as const]: true,
          [`flags.${game.system.id}.disposition` as const]: -1,
        },
        {
          name: "Ultra Berserker (1)",
          img: `./systems/${game.system.id}/assets/retrograde-minis/Retrograde-Minis-Corpro-BERSERKER.png` as const,
          initiative: 10, // Force sort order
          [`flags.${game.system.id}.tour` as const]: "ultra",
          [`flags.${game.system.id}.activations.max` as const]: 2,
          [`flags.${game.system.id}.disposition` as const]: -1,
        },
        {
          name: "Support (1)",
          img: `./systems/${game.system.id}/assets/retrograde-minis/Retrograde-Minis-Corpro-SUPPORT.png` as const,
          [`flags.${game.system.id}.tour` as const]: true,
          [`flags.${game.system.id}.disposition` as const]: -1,
        },
      ].map(foundry.utils.expandObject),
    });
  }
}

function get_player_data() {
  // Fisher-Yates
  for (let i = demo_pilots.length - 1; i > 0; --i) {
    let j = Math.floor(Math.random() * (i + 1));
    [demo_pilots[i], demo_pilots[j]] = [demo_pilots[j], demo_pilots[i]];
  }
  return demo_pilots.slice(0, 3).map(p => ({
    name: p.name,
    img: `./systems/${game.system.id}/assets/retrograde-minis/Retrograde-Minis-${p.img}.png` as const,
    [`flags.${game.system.id}.tour` as const]: "player",
    [`flags.${game.system.id}.disposition` as const]: 2,
  }));
}
// Data subitted from the lancer-vtt channel in Pilot NET
const demo_pilots = [
  { name: "Catastrophe", img: "Horus-MANTICORE" }, // Rais
  { name: "Closing Crescendo", img: "IPS-N-RALEIGH" }, // traduiz
  { name: "Dragonspark", img: "HA-TOKUGAWA" }, // Tonysan
  { name: "Errant", img: "IPS-N-NELSON" }, // FactualInsanity
  { name: "Gale Storm", img: "Horus-BALOR" }, // Kirbo.exe
  { name: "Gale", img: "IPS-N-NELSON" }, // Lynn (4d6north)
  { name: "Instrument", img: "SSC-MONARCH" }, // Jazzman - Update to viceroy if we add an icon
  { name: "Owl", img: "SSC-DEATHS HEAD" }, // Jimothy
  { name: "Oxhorn", img: "HA-SHERMAN" }, // Bargo
  { name: "Raven", img: "SSC-DUSK WING" }, // Zenn
  { name: "Sunset", img: "SSC-MOURNING CLOAK" }, // Zemyla
  { name: "Timber", img: "IPS-N-BLACKBEARD" }, // Valkyrion
  { name: "Tyrant", img: "Horus-BALOR" }, // Night Parade in the Kitchen
  { name: "Verminspeaker", img: "Horus-HYDRA" }, // Cancermantis
  { name: "jellyfish", img: "SSC-ATLAS" }, // Marfew
  // { name: "Callsign", img: "GMS" },
];
