declare global {
  // Extend tourstep
  interface TourStep {
    click?: boolean;
    sidebarTab?: string;
    inApp?: boolean;
  }
}

import { LancerActor } from "../actor/lancer-actor";
import { LCPManager } from "../apps/lcp-manager/lcp-manager";
import { LancerCombat } from "../combat/lancer-combat";
import { EntryType } from "../enums";
import { ContentSummary } from "../util/lcps";

/**
 * LANCER Extensions to the foundry Tour class. Adds sidebarTab and click as
 * optional parameters on tour steps. The sidebarTab parameter will open the
 * sidebar to the specified tab before the step. The click parameter will
 * simulate a click on the element before proceeding to the next step if set to
 * true.
 */
export class LancerTour extends Tour {
  exit() {
    super.exit();
    this._tearDown(false);
  }
  async complete() {
    await super.complete();
    this._tearDown(true);
  }

  /**
   * Clean up after the tour. Runs on exit or completion. This is never awaited.
   * @param _complete - True if exiting due to completion, false if exiting early
   */
  protected async _tearDown(_complete: boolean) {}

  protected async _preStep() {
    await super._preStep();
    if (this.currentStep?.sidebarTab) {
      ui.sidebar?.expand();
      ui.sidebar?.activateTab(this.currentStep.sidebarTab);
    }
  }

  protected async _postStep() {
    await super._postStep();
    if (this.currentStep?.click) {
      document.querySelector<HTMLElement>(this.currentStep.selector!)?.click();
    }
  }
}

/**
 * Tour for showcasing the LCP Manager
 */
export class LancerLcpTour extends LancerTour {
  manager?: LCPManager;
  protected async _preStep() {
    await super._preStep();
    if (!this.manager) this.manager = new LCPManager();
    if (this.currentStep?.inApp) {
      if (!this.manager.rendered) {
        await this.manager.render(true);
        await this.manager.renderPromise;
        // Wait for it to load the official packs from the server
        while (this.manager.component.loading) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }
    if (this.currentStep?.id === "lcpTable") {
      // This is a fake lcp that contains no items
      const lcp_tribute: ContentSummary = {
        item_prefix: "",
        author: "No Man",
        name: "Demo LCP",
        version: "1.0.0",
        bonds: 1,
        gear: 1,
        mods: 1,
        npc_classes: 1,
        npc_features: 1,
        npc_templates: 1,
        reserves: 1,
        skills: 1,
        systems: 1,
        talents: 1,
        frames: 1,
        weapons: 1,
      };
      this.manager.injectContentPack(lcp_tribute);
      // Delay to avoid race condition
      await new Promise(resolve => setTimeout(resolve, 30));
    }
  }

  protected async _tearDown(complete: boolean) {
    this.manager?.injectContentPack(null);
    super._tearDown(complete);
  }
}

/**
 * Tour of Pilot imports
 */
export class LancerPilotTour extends LancerTour {
  actor?: LancerActor;
  protected async _preStep() {
    // Clear selector for non-gm players since by default they don't have the button
    if (this.currentStep?.id === "folders" && !game.user?.isGM) this.currentStep.selector = null!;
    await super._preStep();
    if (!this.actor) {
      this.actor = await Actor.create(
        {
          name: "Test Pilot",
          type: EntryType.PILOT,
          system: { callsign: get_player_data()[0].name, hp: { value: 6 } },
        },
        { temporary: true }
      );
    }
    // @ts-expect-error Bypass protected
    await this.actor?.sheet?._render(true);
    // @ts-expect-error v11
    this.actor?.sheet?.activateTab("cloud");
  }

  protected async _tearDown() {
    this.actor?.sheet?.close({ submit: false });
    delete this.actor;
  }
}

/**
 * Tour of NPC creation
 */
export class LancerNPCTour extends LancerTour {
  npc?: LancerActor;
  protected async _preStep() {
    await super._preStep();
    if (!this.npc) {
      this.npc = await Actor.create(
        {
          name: "Test NPC",
          type: EntryType.NPC,
          items: [
            {
              _id: "0000000000000000",
              name: "Test Class",
              img: `systems/${game.system.id}/assets/icons/npc_class.svg`,
              type: EntryType.NPC_CLASS,
              system: { role: "TEST" },
            } as any,
            {
              _id: "0000000000000001",
              name: "Test Template",
              img: `systems/${game.system.id}/assets/icons/npc_template.svg`,
              type: EntryType.NPC_TEMPLATE,
            },
          ],
        },
        { temporary: true }
      );
    }
    // @ts-expect-error Bypass protected
    await this.npc?.sheet?._render(true);
    if (["baseFeatures", "optionalFeatures"].includes(this.currentStep?.id!)) {
      // @ts-expect-error Bypass protected
      await this.npc?.system?.class?.sheet?._render(true);
    }
  }
  protected async _postStep() {
    await super._postStep();
    // @ts-expect-error
    if (this.currentStep?.id === "optionalFeatures") await this.npc?.system?.class?.sheet?.close({ submit: false });
  }

  protected async _tearDown() {
    this.npc?.sheet?.close({ submit: false });
    delete this.npc;
  }
}

/**
 * Tour of attack and check dialog
 * Here be $^&#@*&$^*&#
 */
export class LancerSlidingHudTour extends LancerTour {
  npc?: LancerActor;
  protected async _preStep() {
    await super._preStep();
    if (!this.npc) {
      const id = get_player_data()[0];
      this.npc = await Actor.create(
        {
          ...id,
          type: EntryType.NPC,
          items: [
            {
              name: "Test Weapon",
              type: EntryType.NPC_FEATURE,
              img: "systems/lancer/assets/icons/generic_item.svg",
              system: {
                type: "Weapon",
                weapon_type: "Launcher",
                damage: [
                  { type: "Kinetic", val: 5 },
                  { type: "Kinetic", val: 5 },
                  { type: "Kinetic", val: 5 },
                ],
                range: [
                  { type: "Range", val: 5 },
                  { type: "Blast", val: 1 },
                ],
              },
            } as any,
          ],
        },
        { temporary: true }
      );
    }
    this.npc?.itemTypes[EntryType.NPC_FEATURE][0].beginWeaponAttackFlow();
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  protected async _tearDown() {
    // Dismiss the dialogue to avoid an error from trying to roll
    document.querySelector<HTMLElement>("#hudzone #accdiff .dialog-buttons .cancel")?.click();
    delete this.npc;
  }
}

/**
 * Tour of combat tracker changes
 */
export class LancerCombatTour extends LancerTour {
  combat?: LancerCombat;
  protected async _preStep() {
    await super._preStep();
    if (!this.combat) this.combat = (await this._setupCombat())!;
    await this.combat.activate();
    if (!this.combat.started) await this.combat.startCombat();
    if (this.currentStep?.id === "endTurn") {
      const turn = this.combat.turns.find(t => t.getFlag(game.system.id, "tour") === "ultra")?.id ?? "";
      await this.combat.activateCombatant(turn, true);
      // Delay to avoid race condition
      await new Promise(resolve => setTimeout(resolve, 30));
    }
  }

  protected async _tearDown() {
    this.combat?.delete();
    delete this.combat;
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
  return demo_pilots.slice(0, 3).map((p, i) => ({
    name: p.name,
    img: `./systems/${game.system.id}/assets/retrograde-minis/Retrograde-Minis-${p.img}.png` as const,
    [`flags.${game.system.id}.tour` as const]: `player-${i + 1}` as const,
    [`flags.${game.system.id}.disposition` as const]: 2,
  }));
}
// Data subitted from the lancer-vtt channel in Pilot NET
const demo_pilots = [
  { name: "Bandana", img: "IPS-N-LANCASTER" }, // bulletkin
  { name: "Bulkhead", img: "IPS-N-DRAKE" }, // Golthan
  { name: "Catastrophe", img: "Horus-MANTICORE" }, // Rais
  { name: "Closing Crescendo", img: "IPS-N-RALEIGH" }, // traduiz
  { name: "Deathwish", img: "Horus-MANTICORE" }, // Dudemaster 47
  { name: "Dragonspark", img: "HA-TOKUGAWA" }, // Tonysan
  { name: "Errant", img: "IPS-N-NELSON" }, // FactualInsanity
  { name: "Gale Storm", img: "Horus-BALOR" }, // Kirbo.exe
  { name: "Gale", img: "IPS-N-NELSON" }, // Lynn (4d6north)
  { name: "Goldsmith", img: "SSC-DUSK WING" }, // Moxkete
  { name: "Good Kisser", img: "IPS-N-TORTUGA" }, // Cipher (cipher3227)
  { name: "Instrument", img: "SSC-MONARCH" }, // Jazzman - Update to viceroy if we add an icon
  { name: "Kinesthesia", img: "SSC-SWALLOWTAIL" }, // CawsForConcern
  { name: "Owl", img: "SSC-DEATHS HEAD" }, // Jimothy
  { name: "Oxhorn", img: "HA-SHERMAN" }, // Bargo
  { name: "Poundcakes", img: "IPS-N-CALIBAN" }, // AnatoleSerial
  { name: "Raven", img: "SSC-DUSK WING" }, // Zenn
  { name: "Salaryman", img: "SSC-MOURNING CLOAK" }, // Siege (s13g3)
  { name: "Scherzo", img: "IPS-N-KIDD" }, // spentrek
  { name: "Sunset", img: "SSC-MOURNING CLOAK" }, // Zemyla
  { name: "Superman", img: "GMS" }, // ZerReiMaru
  { name: "Timber", img: "IPS-N-BLACKBEARD" }, // Valkyrion
  { name: "Tyrant", img: "Horus-BALOR" }, // Night Parade in the Kitchen
  { name: "Verminspeaker", img: "Horus-HYDRA" }, // Cancermantis
  { name: "buck wild", img: "HA-ENKIDU" }, // rikerwashere
  { name: "jellyfish", img: "SSC-ATLAS" }, // Marfew
  // { name: "Callsign", img: "GMS" },
];
