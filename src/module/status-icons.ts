import { LANCER } from "./config";
import { StatusIconConfigOptions } from "./settings";

const lp = LANCER.log_prefix;

export const defaultStatuses = [
  {
    id: "immobilized",
    name: "Immobilized",
    icon: `systems/lancer/assets/icons/white/condition_immobilized.svg`,
  },
  {
    id: "impaired",
    name: "Impaired",
    icon: `systems/lancer/assets/icons/white/condition_impaired.svg`,
  },
  {
    id: "jammed",
    name: "Jammed",
    icon: `systems/lancer/assets/icons/white/condition_jammed.svg`,
  },
  {
    id: "lockon",
    name: "Lock On",
    icon: `systems/lancer/assets/icons/white/condition_lockon.svg`,
  },
  {
    id: "shredded",
    name: "Shredded",
    icon: `systems/lancer/assets/icons/white/condition_shredded.svg`,
  },
  {
    id: "slow",
    name: "Slowed",
    icon: `systems/lancer/assets/icons/white/condition_slow.svg`,
  },
  {
    id: "stunned",
    name: "Stunned",
    icon: `systems/lancer/assets/icons/white/condition_stunned.svg`,
  },
  {
    id: "dangerzone",
    name: "Danger Zone",
    icon: `systems/lancer/assets/icons/white/status_dangerzone.svg`,
  },
  {
    id: "downandout",
    name: "Down and Out",
    icon: `systems/lancer/assets/icons/white/status_downandout.svg`,
  },
  {
    id: "engaged",
    name: "Engaged",
    icon: `systems/lancer/assets/icons/white/status_engaged.svg`,
  },
  {
    id: "exposed",
    name: "Exposed",
    icon: `systems/lancer/assets/icons/white/status_exposed.svg`,
  },
  {
    id: "hidden",
    name: "Hidden",
    icon: `systems/lancer/assets/icons/white/status_hidden.svg`,
  },
  {
    id: "invisible",
    name: "Invisible",
    icon: `systems/lancer/assets/icons/white/status_invisible.svg`,
  },
  {
    id: "intangible",
    name: "Intangible",
    icon: `systems/lancer/assets/icons/white/status_intangible.svg`,
  },
  {
    id: "prone",
    name: "Prone",
    icon: `systems/lancer/assets/icons/white/status_prone.svg`,
  },
  {
    id: "shutdown",
    name: "Shut Down",
    icon: `systems/lancer/assets/icons/white/status_shutdown.svg`,
  },
  {
    id: "npc_tier_1",
    name: "Tier 1",
    icon: `systems/lancer/assets/icons/white/npc_tier_1.svg`,
  },
  {
    id: "npc_tier_2",
    name: "Tier 2",
    icon: `systems/lancer/assets/icons/white/npc_tier_2.svg`,
  },
  {
    id: "npc_tier_3",
    name: "Tier 3",
    icon: `systems/lancer/assets/icons/white/npc_tier_3.svg`,
  },
];

export const cancerConditionsStatus = [
  {
    id: "burn",
    name: "Burn",
    icon: "systems/lancer/assets/icons/alt-status/cancercondstat/burn.webp",
  },
  {
    id: "dangerzone",
    name: "Danger Zone",
    icon: "systems/lancer/assets/icons/alt-status/cancercondstat/dangerzone.webp",
  },
  {
    id: "downandout",
    name: "Down and Out",
    icon: "systems/lancer/assets/icons/alt-status/cancercondstat/downandout.svg",
  },
  {
    id: "engaged",
    name: "Engaged",
    icon: "systems/lancer/assets/icons/alt-status/cancercondstat/engaged.webp",
  },
  {
    id: "exposed",
    name: "Exposed",
    icon: "systems/lancer/assets/icons/alt-status/cancercondstat/exposed.webp",
  },
  {
    id: "flying",
    name: "Flying",
    icon: "systems/lancer/assets/icons/alt-status/cancercondstat/flying.webp",
  },
  {
    id: "hidden",
    name: "Hidden",
    icon: "systems/lancer/assets/icons/alt-status/cancercondstat/hidden.webp",
  },
  {
    id: "immobilized",
    name: "Immobilized",
    icon: "systems/lancer/assets/icons/alt-status/cancercondstat/immobilized.svg",
  },
  {
    id: "impaired",
    name: "Impaired",
    icon: "systems/lancer/assets/icons/alt-status/cancercondstat/impaired.svg",
  },
  {
    id: "invisible",
    name: "Invisible",
    icon: "systems/lancer/assets/icons/alt-status/cancercondstat/invisible.svg",
  },
  {
    id: "jammed",
    name: "Jammed",
    icon: "systems/lancer/assets/icons/alt-status/cancercondstat/jammed.svg",
  },
  {
    id: "lockon",
    name: "Lock On",
    icon: "systems/lancer/assets/icons/alt-status/cancercondstat/lockon.svg",
  },
  {
    id: "prone",
    name: "Prone",
    icon: "systems/lancer/assets/icons/alt-status/cancercondstat/prone.webp",
  },
  {
    id: "shredded",
    name: "Shredded",
    icon: "systems/lancer/assets/icons/alt-status/cancercondstat/shredded.svg",
  },
  {
    id: "shutdown",
    name: "Shut Down",
    icon: "systems/lancer/assets/icons/alt-status/cancercondstat/shutdown.svg",
  },
  {
    id: "slow",
    name: "Slowed",
    icon: "systems/lancer/assets/icons/alt-status/cancercondstat/slowed.svg",
  },
  {
    id: "stunned",
    name: "Stunned",
    icon: "systems/lancer/assets/icons/alt-status/cancercondstat/stunned.svg",
  },
];

export const cancerNPCTemplates = [
  {
    id: "commander",
    name: "Commander",
    icon: "systems/lancer/assets/icons/alt-status/cancernpc/commander.webp",
  },
  {
    id: "elite",
    name: "Elite",
    icon: "systems/lancer/assets/icons/alt-status/cancernpc/elite.webp",
  },
  {
    id: "exotic",
    name: "Exotic",
    icon: "systems/lancer/assets/icons/alt-status/cancernpc/exotic.webp",
  },
  {
    id: "grunt",
    name: "Grunt",
    icon: "systems/lancer/assets/icons/alt-status/cancernpc/grunt.webp",
  },
  {
    id: "mercenary",
    name: "Mercenary",
    icon: "systems/lancer/assets/icons/alt-status/cancernpc/mercenary.webp",
  },
  {
    id: "pirate",
    name: "Pirate",
    icon: "systems/lancer/assets/icons/alt-status/cancernpc/pirate.webp",
  },
  {
    id: "rpv",
    name: "RPV",
    icon: "systems/lancer/assets/icons/alt-status/cancernpc/rpv.webp",
  },
  {
    id: "ship",
    name: "Ship",
    icon: "systems/lancer/assets/icons/alt-status/cancernpc/ship.webp",
  },
  {
    id: "spacer",
    name: "Spacer",
    icon: "systems/lancer/assets/icons/alt-status/cancernpc/spacer.webp",
  },
  {
    id: "ultra",
    name: "Ultra",
    icon: "systems/lancer/assets/icons/alt-status/cancernpc/ultra.webp",
  },
  {
    id: "vehicle",
    name: "Vehicle",
    icon: "systems/lancer/assets/icons/alt-status/cancernpc/vehicle.webp",
  },
  {
    id: "veteran",
    name: "Veteran",
    icon: "systems/lancer/assets/icons/alt-status/cancernpc/veteran.webp",
  },
];

export const hayleyConditionsStatus = [
  {
    id: "bolster",
    name: "Bolster",
    icon: "systems/lancer/assets/icons/alt-status/hayleycondstat/bolster.webp",
  },
  {
    id: "downandout",
    name: "Down and Out",
    icon: "systems/lancer/assets/icons/alt-status/hayleycondstat/downandout.webp",
  },
  {
    id: "exposed",
    name: "Exposed",
    icon: "systems/lancer/assets/icons/alt-status/hayleycondstat/exposed.webp",
  },
  {
    id: "grappled",
    name: "Grappled",
    icon: "systems/lancer/assets/icons/alt-status/hayleycondstat/grappled.webp",
  },
  {
    id: "hidden",
    name: "Hidden",
    icon: "systems/lancer/assets/icons/alt-status/hayleycondstat/hidden.webp",
  },
  {
    id: "immobilized",
    name: "Immobilized",
    icon: "systems/lancer/assets/icons/alt-status/hayleycondstat/immobilized.webp",
  },
  {
    id: "impaired",
    name: "Impaired",
    icon: "systems/lancer/assets/icons/alt-status/hayleycondstat/impaired.webp",
  },
  {
    id: "invisible",
    name: "Invisible",
    icon: "systems/lancer/assets/icons/alt-status/hayleycondstat/invisible.webp",
  },
  {
    id: "jammed",
    name: "Jammed",
    icon: "systems/lancer/assets/icons/alt-status/hayleycondstat/jammed.webp",
  },
  {
    id: "lockon",
    name: "Lock On",
    icon: "systems/lancer/assets/icons/alt-status/hayleycondstat/lockon.webp",
  },
  {
    id: "prone",
    name: "Prone",
    icon: "systems/lancer/assets/icons/alt-status/hayleycondstat/prone.webp",
  },
  {
    id: "shredded",
    name: "Shredded",
    icon: "systems/lancer/assets/icons/alt-status/hayleycondstat/shredded.webp",
  },
  {
    id: "shutdown",
    name: "Shut Down",
    icon: "systems/lancer/assets/icons/alt-status/hayleycondstat/shutdown.webp",
  },
  {
    id: "slow",
    name: "Slowed",
    icon: "systems/lancer/assets/icons/alt-status/hayleycondstat/slowed.webp",
  },
  {
    id: "stunned",
    name: "Stunned",
    icon: "systems/lancer/assets/icons/alt-status/hayleycondstat/stunned.webp",
  },
];

export const hayleyPC = [
  {
    id: "aceso",
    name: "Aceso",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/aceso.webp",
  },
  {
    id: "camus_razor",
    name: "Camus' Razor",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/camus-razor.webp",
  },
  {
    id: "chains_of_prometheus",
    name: "Chains of Prometheus",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/chains-of-prometheus.webp",
  },
  {
    id: "clamp_bomb",
    name: "Clamp Bomb",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/clamp-bomb.webp",
  },
  {
    id: "dimensional_shackles",
    name: "Dimensional Shackles",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/dimensional-shackles.webp",
  },
  {
    id: "dominions_breadth",
    name: "Dominion's Breadth",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/dominions-breadth.webp",
  },
  {
    id: "duat_gate",
    name: "Duat Gate",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/duat-gate.webp",
  },
  {
    id: "excommunicate",
    name: "Excommunicate",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/excommunicate.webp",
  },
  {
    id: "fade_cloak",
    name: "Fade Cloak",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/fade-cloak.webp",
  },
  {
    id: "flaw_minus",
    name: "FLAW_minus",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/flaw-minus.webp",
  },
  {
    id: "flaw_plus",
    name: "FLAW_plus",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/flaw-plus.webp",
  },
  {
    id: "gravity",
    name: "Gravity",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/gravity.webp",
  },
  {
    id: "haste",
    name: "Haste",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/haste.webp",
  },
  {
    id: "hunter_lock",
    name: "Hunter Lock",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/hunter-lock.webp",
  },
  {
    id: "hyperdense_armor",
    name: "Hyperdense Armor",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/hyperdense-armor.webp",
  },
  {
    id: "imperial_eye",
    name: "Imperial Eye",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/imperial-eye.webp",
  },
  {
    id: "kraul_grapple",
    name: "Kraul Grapple",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/kraul-grapple.webp",
  },
  {
    id: "metahook",
    name: "Metahook",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/metahook.webp",
  },
  {
    id: "molten_puncture",
    name: "Molten Puncture",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/molten-puncture.webp",
  },
  {
    id: "retort_loop",
    name: "Retort Loop",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/retort-loop.webp",
  },
  {
    id: "shahnameh",
    name: "Shahnameh",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/shahnameh.webp",
  },
  {
    id: "stasis",
    name: "Stasis",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/stasis.webp",
  },
  {
    id: "supercharger",
    name: "Supercharger",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/supercharger.webp",
  },
  {
    id: "sympathetic_shield",
    name: "Sympathetic Shield",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/sympathetic-shield.webp",
  },
  {
    id: "tachyon_shield",
    name: "Tachyon Shield",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/tachyon-shield.webp",
  },
  {
    id: "terrify",
    name: "Terrify",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/terrify.webp",
  },
  {
    id: "tracking_bug",
    name: "Tracking Bug",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/tracking-bug.webp",
  },
  {
    id: "trueblack",
    name: "Trueblack Aegis",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/trueblack.webp",
  },
  {
    id: "unravel",
    name: "Unravel",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/unravel.webp",
  },
  {
    id: "viral_logic",
    name: "Viral Logic",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/viral-logic.webp",
  },
  {
    id: "walk_of_kings",
    name: "Walk of Kings",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/walk-of-kings.webp",
  },
];

export const hayleyNPC = [
  {
    id: "abjure",
    name: "Abjure",
    icon: "systems/lancer/assets/icons/alt-status/hayleynpc/abjure.webp",
  },
  {
    id: "chain",
    name: "Chain",
    icon: "systems/lancer/assets/icons/alt-status/hayleynpc/chain.webp",
  },
  {
    id: "echo_edge",
    name: "Echo Edge",
    icon: "systems/lancer/assets/icons/alt-status/hayleynpc/echo-edge.webp",
  },
  {
    id: "dispersal_shield_1",
    name: "Dispersal Shield 1",
    icon: "systems/lancer/assets/icons/alt-status/hayleynpc/dispersal-shield-1.webp",
  },
  {
    id: "dispersal_shield_2",
    name: "Dispersal Shield 2",
    icon: "systems/lancer/assets/icons/alt-status/hayleynpc/dispersal-shield-2.webp",
  },
  {
    id: "dispersal_shield_3",
    name: "Dispersal Shield 3",
    icon: "systems/lancer/assets/icons/alt-status/hayleynpc/dispersal-shield-3.webp",
  },
  {
    id: "focus_down",
    name: "Focus Down",
    icon: "systems/lancer/assets/icons/alt-status/hayleynpc/focus-down.webp",
  },
  {
    id: "follower_count",
    name: "Follower Count",
    icon: "systems/lancer/assets/icons/alt-status/hayleynpc/follower-count.webp",
  },
  {
    id: "grind_maniple",
    name: "Grind Maniple",
    icon: "systems/lancer/assets/icons/alt-status/hayleynpc/grind-maniple.webp",
  },
  {
    id: "illusionary_subroutines",
    name: "Illusionary Subroutines",
    icon: "systems/lancer/assets/icons/alt-status/hayleynpc/illusionary-subroutines.webp",
  },
  {
    id: "investiture",
    name: "Investiture",
    icon: "systems/lancer/assets/icons/alt-status/hayleynpc/investiture.webp",
  },
  {
    id: "latch_drone",
    name: "Latch Drone",
    icon: "systems/lancer/assets/icons/alt-status/hayleynpc/latch-drone.webp",
  },
  {
    id: "marked",
    name: "Marked",
    icon: "systems/lancer/assets/icons/alt-status/hayleynpc/marked.webp",
  },
  {
    id: "pain_transference",
    name: "Pain Transference",
    icon: "systems/lancer/assets/icons/alt-status/hayleynpc/pain-transference.webp",
  },
  {
    id: "petrify",
    name: "Petrify",
    icon: "systems/lancer/assets/icons/alt-status/hayleynpc/petrify.webp",
  },
  {
    id: "sanctuary",
    name: "Sanctuary",
    icon: "systems/lancer/assets/icons/alt-status/hayleynpc/sanctuary.webp",
  },
  {
    id: "spike",
    name: "Spike",
    icon: "systems/lancer/assets/icons/alt-status/hayleynpc/spike.webp",
  },
  {
    id: "tear_down",
    name: "Tear Down",
    icon: "systems/lancer/assets/icons/alt-status/hayleynpc/tear-down.webp",
  },
  {
    id: "warp_sensors",
    name: "Warp Sensors",
    icon: "systems/lancer/assets/icons/alt-status/hayleynpc/warp-sensors.webp",
  },
];

export const hayleyUtility = [
  {
    id: "blind",
    name: "Blind",
    icon: "systems/lancer/assets/icons/alt-status/hayleyutil/blind.webp",
  },
  {
    id: "burn",
    name: "Burn",
    icon: "systems/lancer/assets/icons/alt-status/hayleyutil/burn.webp",
  },
  {
    id: "flying",
    name: "Flying",
    icon: "systems/lancer/assets/icons/alt-status/hayleyutil/flying.webp",
  },
  {
    id: "overshield",
    name: "Overshield",
    icon: "systems/lancer/assets/icons/alt-status/hayleyutil/overshield.webp",
  },
  {
    id: "reactor_meltdown",
    name: "Reactor Meltdown",
    icon: "systems/lancer/assets/icons/alt-status/hayleyutil/reactor-meltdown.webp",
  },
];

export const tommyConditionsStatus = [
  {
    id: "bolster",
    name: "Bolster",
    icon: "systems/lancer/assets/icons/alt-status/tommystat/Bolstered.webp",
  },
  {
    id: "dangerzone",
    name: "Danger Zone",
    icon: "systems/lancer/assets/icons/alt-status/tommystat/Danger Zone.webp",
  },
  {
    id: "downandout",
    name: "Down and Out",
    icon: "systems/lancer/assets/icons/alt-status/tommystat/Down and Out.webp",
  },
  {
    id: "engaged",
    name: "Engaged",
    icon: "systems/lancer/assets/icons/alt-status/tommystat/Engaged.webp",
  },
  {
    id: "exposed",
    name: "Exposed",
    icon: "systems/lancer/assets/icons/alt-status/tommystat/Exposed.webp",
  },
  {
    id: "flying",
    name: "Flying",
    icon: "systems/lancer/assets/icons/alt-status/tommystat/Flying.webp",
  },
  {
    id: "hidden",
    name: "Hidden",
    icon: "systems/lancer/assets/icons/alt-status/tommystat/Hidden.webp",
  },
  {
    id: "hiddeninvis",
    name: "Hidden and Invisible",
    icon: "systems/lancer/assets/icons/alt-status/tommystat/Hidden and Invisible.webp",
  },
  {
    id: "immobilized",
    name: "Immobilized",
    icon: "systems/lancer/assets/icons/alt-status/tommystat/Immobilized.webp",
  },
  {
    id: "impaired",
    name: "Impaired",
    icon: "systems/lancer/assets/icons/alt-status/tommystat/Impaired.webp",
  },
  {
    id: "invisible",
    name: "Invisible",
    icon: "systems/lancer/assets/icons/alt-status/tommystat/Invisible.webp",
  },
  {
    id: "jammed",
    name: "Jammed",
    icon: "systems/lancer/assets/icons/alt-status/tommystat/Jammed.webp",
  },
  {
    id: "lockon",
    name: "Lock On",
    icon: "systems/lancer/assets/icons/alt-status/tommystat/Lockon.webp",
  },
  {
    id: "prone",
    name: "Prone",
    icon: "systems/lancer/assets/icons/alt-status/tommystat/Prone.webp",
  },
  {
    id: "shredded",
    name: "Shredded",
    icon: "systems/lancer/assets/icons/alt-status/tommystat/Shredded.webp",
  },
  {
    id: "shutdown",
    name: "Shut Down",
    icon: "systems/lancer/assets/icons/alt-status/tommystat/Shut Down.webp",
  },
  {
    id: "slow",
    name: "Slowed",
    icon: "systems/lancer/assets/icons/alt-status/tommystat/Slowed.webp",
  },
  {
    id: "stunned",
    name: "Stunned",
    icon: "systems/lancer/assets/icons/alt-status/tommystat/Stunned.webp",
  },
  {
    id: "tier1",
    name: "Tier 1",
    icon: "systems/lancer/assets/icons/alt-status/tommystat/Tier 1.webp",
  },
  {
    id: "tier2",
    name: "Tier 2",
    icon: "systems/lancer/assets/icons/alt-status/tommystat/Tier 2.webp",
  },
  {
    id: "tier3",
    name: "Tier 3",
    icon: "systems/lancer/assets/icons/alt-status/tommystat/Tier 3.webp",
  },
  {
    id: "tiercust",
    name: "Custom Tier",
    icon: "systems/lancer/assets/icons/alt-status/tommystat/Tier Custom.webp",
  },
];

export async function migrateLancerConditions() {
  // Migrate settings from the module
  console.log(`${lp} Migrating settings from Lancer Condition Icons`);
  if (game.modules.get("lancer-conditions")?.active) {
    const iconSettings: StatusIconConfigOptions = {
      defaultConditionsStatus: (await game.settings.get("lancer-conditions", "keepStockIcons")) as boolean,
      cancerConditionsStatus: (await game.settings.get("lancer-conditions", "cancerConditionsStatus")) as boolean,
      cancerNPCTemplates: (await game.settings.get("lancer-conditions", "cancerNPCTemplates")) as boolean,
      hayleyConditionsStatus: (await game.settings.get("lancer-conditions", "hayleyConditionsStatus")) as boolean,
      hayleyPC: (await game.settings.get("lancer-conditions", "hayleyPC")) as boolean,
      hayleyNPC: (await game.settings.get("lancer-conditions", "hayleyNPC")) as boolean,
      hayleyUtility: (await game.settings.get("lancer-conditions", "hayleyUtility")) as boolean,
      tommyConditionsStatus: (await game.settings.get("lancer-conditions", "tommyConditionsStatus")) as boolean,
    };
    game.settings.set(game.system.id, LANCER.setting_status_icons, iconSettings);

    // Disable the module
    const mods = game.settings.get("core", "moduleConfiguration");
    mods["lancer-conditions"] = false;
    game.settings.set("core", "moduleConfiguration", mods);

    // Show a dialog to let the user know what happened
    const text = `
    <p>The icons and functionality from Lancer Condition Icons has been integrated with the system,
    and your settings have been migrated. Lancer Condition Icons will now be disabled, and you can
    feel free to uninstall it if no other worlds are using it.</p>
    <p>The page must now be refreshed for the module change to take effect.</p>`;
    new Dialog(
      {
        title: `Lancer Condition Icons is Integrated`,
        content: text,
        buttons: {
          ok: { label: "Refresh", callback: () => window.location.reload() },
        },
        default: "No",
      },
      {
        width: 350,
      }
    ).render(true);
  }
}
