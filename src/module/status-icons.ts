import { LANCER } from "./config";
import { StatusIconConfigOptions } from "./settings";

const lp = LANCER.log_prefix;

const defaultStatuses = [
  {
    id: "immobilized",
    label: "Immobilized",
    icon: `systems/lancer/assets/icons/white/condition_immobilized.svg`,
  },
  {
    id: "impaired",
    label: "Impaired",
    icon: `systems/lancer/assets/icons/white/condition_impaired.svg`,
  },
  {
    id: "jammed",
    label: "Jammed",
    icon: `systems/lancer/assets/icons/white/condition_jammed.svg`,
  },
  {
    id: "lockon",
    label: "Lock On",
    icon: `systems/lancer/assets/icons/white/condition_lockon.svg`,
  },
  {
    id: "shredded",
    label: "Shredded",
    icon: `systems/lancer/assets/icons/white/condition_shredded.svg`,
  },
  {
    id: "slowed",
    label: "Slowed",
    icon: `systems/lancer/assets/icons/white/condition_slow.svg`,
  },
  {
    id: "stunned",
    label: "Stunned",
    icon: `systems/lancer/assets/icons/white/condition_stunned.svg`,
  },
  {
    id: "dangerzone",
    label: "Danger Zone",
    icon: `systems/lancer/assets/icons/white/status_dangerzone.svg`,
  },
  {
    id: "downandout",
    label: "Down and Out",
    icon: `systems/lancer/assets/icons/white/status_downandout.svg`,
  },
  {
    id: "engaged",
    label: "Engaged",
    icon: `systems/lancer/assets/icons/white/status_engaged.svg`,
  },
  {
    id: "exposed",
    label: "Exposed",
    icon: `systems/lancer/assets/icons/white/status_exposed.svg`,
  },
  {
    id: "hidden",
    label: "Hidden",
    icon: `systems/lancer/assets/icons/white/status_hidden.svg`,
  },
  {
    id: "invisible",
    label: "Invisible",
    icon: `systems/lancer/assets/icons/white/status_invisible.svg`,
  },
  {
    id: "intangible",
    label: "Intangible",
    icon: `systems/lancer/assets/icons/white/status_intangible.svg`,
  },
  {
    id: "prone",
    label: "Prone",
    icon: `systems/lancer/assets/icons/white/status_prone.svg`,
  },
  {
    id: "shutdown",
    label: "Shut Down",
    icon: `systems/lancer/assets/icons/white/status_shutdown.svg`,
  },
  {
    id: "npc_tier_1",
    label: "Tier 1",
    icon: `systems/lancer/assets/icons/white/npc_tier_1.svg`,
  },
  {
    id: "npc_tier_2",
    label: "Tier 2",
    icon: `systems/lancer/assets/icons/white/npc_tier_2.svg`,
  },
  {
    id: "npc_tier_3",
    label: "Tier 3",
    icon: `systems/lancer/assets/icons/white/npc_tier_3.svg`,
  },
];

const cancerConditionsStatus = [
  {
    id: "burn",
    label: "Burn",
    icon: "systems/lancer/assets/icons/alt-status/cancercondstat/burn.webp",
  },
  {
    id: "dangerzone",
    label: "Danger Zone",
    icon: "systems/lancer/assets/icons/alt-status/cancercondstat/dangerzone.webp",
  },
  {
    id: "downandout",
    label: "Down and Out",
    icon: "systems/lancer/assets/icons/alt-status/cancercondstat/downandout.svg",
  },
  {
    id: "engaged",
    label: "Engaged",
    icon: "systems/lancer/assets/icons/alt-status/cancercondstat/engaged.webp",
  },
  {
    id: "exposed",
    label: "Exposed",
    icon: "systems/lancer/assets/icons/alt-status/cancercondstat/exposed.webp",
  },
  {
    id: "flying",
    label: "Flying",
    icon: "systems/lancer/assets/icons/alt-status/cancercondstat/flying.webp",
  },
  {
    id: "hidden",
    label: "Hidden",
    icon: "systems/lancer/assets/icons/alt-status/cancercondstat/hidden.webp",
  },
  {
    id: "immobilized",
    label: "Immobilized",
    icon: "systems/lancer/assets/icons/alt-status/cancercondstat/immobilized.svg",
  },
  {
    id: "impaired",
    label: "Impaired",
    icon: "systems/lancer/assets/icons/alt-status/cancercondstat/impaired.svg",
  },
  {
    id: "invisible",
    label: "Invisible",
    icon: "systems/lancer/assets/icons/alt-status/cancercondstat/invisible.svg",
  },
  {
    id: "jammed",
    label: "Jammed",
    icon: "systems/lancer/assets/icons/alt-status/cancercondstat/jammed.svg",
  },
  {
    id: "lockon",
    label: "Lock On",
    icon: "systems/lancer/assets/icons/alt-status/cancercondstat/lockon.svg",
  },
  {
    id: "prone",
    label: "Prone",
    icon: "systems/lancer/assets/icons/alt-status/cancercondstat/prone.webp",
  },
  {
    id: "shredded",
    label: "Shredded",
    icon: "systems/lancer/assets/icons/alt-status/cancercondstat/shredded.svg",
  },
  {
    id: "shutdown",
    label: "Shut Down",
    icon: "systems/lancer/assets/icons/alt-status/cancercondstat/shutdown.svg",
  },
  {
    id: "slowed",
    label: "Slowed",
    icon: "systems/lancer/assets/icons/alt-status/cancercondstat/slowed.svg",
  },
  {
    id: "stunned",
    label: "Stunned",
    icon: "systems/lancer/assets/icons/alt-status/cancercondstat/stunned.svg",
  },
];

const cancerNPCTemplates = [
  {
    id: "commander",
    label: "Commander",
    icon: "systems/lancer/assets/icons/alt-status/cancernpc/commander.webp",
  },
  {
    id: "elite",
    label: "Elite",
    icon: "systems/lancer/assets/icons/alt-status/cancernpc/elite.webp",
  },
  {
    id: "exotic",
    label: "Exotic",
    icon: "systems/lancer/assets/icons/alt-status/cancernpc/exotic.webp",
  },
  {
    id: "grunt",
    label: "Grunt",
    icon: "systems/lancer/assets/icons/alt-status/cancernpc/grunt.webp",
  },
  {
    id: "mercenary",
    label: "Mercenary",
    icon: "systems/lancer/assets/icons/alt-status/cancernpc/mercenary.webp",
  },
  {
    id: "pirate",
    label: "Pirate",
    icon: "systems/lancer/assets/icons/alt-status/cancernpc/pirate.webp",
  },
  {
    id: "rpv",
    label: "RPV",
    icon: "systems/lancer/assets/icons/alt-status/cancernpc/rpv.webp",
  },
  {
    id: "ship",
    label: "Ship",
    icon: "systems/lancer/assets/icons/alt-status/cancernpc/ship.webp",
  },
  {
    id: "spacer",
    label: "Spacer",
    icon: "systems/lancer/assets/icons/alt-status/cancernpc/spacer.webp",
  },
  {
    id: "ultra",
    label: "Ultra",
    icon: "systems/lancer/assets/icons/alt-status/cancernpc/ultra.webp",
  },
  {
    id: "vehicle",
    label: "Vehicle",
    icon: "systems/lancer/assets/icons/alt-status/cancernpc/vehicle.webp",
  },
  {
    id: "veteran",
    label: "Veteran",
    icon: "systems/lancer/assets/icons/alt-status/cancernpc/veteran.webp",
  },
];

const hayleyConditionsStatus = [
  {
    id: "bolster",
    label: "Bolster",
    icon: "systems/lancer/assets/icons/alt-status/hayleycondstat/bolster.webp",
  },
  {
    id: "downandout",
    label: "Down and Out",
    icon: "systems/lancer/assets/icons/alt-status/hayleycondstat/downandout.webp",
  },
  {
    id: "exposed",
    label: "Exposed",
    icon: "systems/lancer/assets/icons/alt-status/hayleycondstat/exposed.webp",
  },
  {
    id: "grappled",
    label: "Grappled",
    icon: "systems/lancer/assets/icons/alt-status/hayleycondstat/grappled.webp",
  },
  {
    id: "hidden",
    label: "Hidden",
    icon: "systems/lancer/assets/icons/alt-status/hayleycondstat/hidden.webp",
  },
  {
    id: "immobilized",
    label: "Immobilized",
    icon: "systems/lancer/assets/icons/alt-status/hayleycondstat/immobilized.webp",
  },
  {
    id: "impaired",
    label: "Impaired",
    icon: "systems/lancer/assets/icons/alt-status/hayleycondstat/impaired.webp",
  },
  {
    id: "invisible",
    label: "Invisible",
    icon: "systems/lancer/assets/icons/alt-status/hayleycondstat/invisible.webp",
  },
  {
    id: "jammed",
    label: "Jammed",
    icon: "systems/lancer/assets/icons/alt-status/hayleycondstat/jammed.webp",
  },
  {
    id: "lockon",
    label: "Lock On",
    icon: "systems/lancer/assets/icons/alt-status/hayleycondstat/lockon.webp",
  },
  {
    id: "prone",
    label: "Prone",
    icon: "systems/lancer/assets/icons/alt-status/hayleycondstat/prone.webp",
  },
  {
    id: "shredded",
    label: "Shredded",
    icon: "systems/lancer/assets/icons/alt-status/hayleycondstat/shredded.webp",
  },
  {
    id: "shutdown",
    label: "Shut Down",
    icon: "systems/lancer/assets/icons/alt-status/hayleycondstat/shutdown.webp",
  },
  {
    id: "slowed",
    label: "Slowed",
    icon: "systems/lancer/assets/icons/alt-status/hayleycondstat/slowed.webp",
  },
  {
    id: "stunned",
    label: "Stunned",
    icon: "systems/lancer/assets/icons/alt-status/hayleycondstat/stunned.webp",
  },
];

const hayleyPC = [
  {
    id: "aceso",
    label: "Aceso",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/aceso.webp",
  },
  {
    id: "camus_razor",
    label: "Camus' Razor",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/camus-razor.webp",
  },
  {
    id: "chains_of_prometheus",
    label: "Chains of Prometheus",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/chains-of-prometheus.webp",
  },
  {
    id: "clamp_bomb",
    label: "Clamp Bomb",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/clamp-bomb.webp",
  },
  {
    id: "dimensional_shackles",
    label: "Dimensional Shackles",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/dimensional-shackles.webp",
  },
  {
    id: "dominions_breadth",
    label: "Dominion's Breadth",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/dominions-breadth.webp",
  },
  {
    id: "duat_gate",
    label: "Duat Gate",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/duat-gate.webp",
  },
  {
    id: "excommunicate",
    label: "Excommunicate",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/excommunicate.webp",
  },
  {
    id: "fade_cloak",
    label: "Fade Cloak",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/fade-cloak.webp",
  },
  {
    id: "flaw_minus",
    label: "FLAW_minus",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/flaw-minus.webp",
  },
  {
    id: "flaw_plus",
    label: "FLAW_plus",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/flaw-plus.webp",
  },
  {
    id: "gravity",
    label: "Gravity",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/gravity.webp",
  },
  {
    id: "haste",
    label: "Haste",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/haste.webp",
  },
  {
    id: "hunter_lock",
    label: "Hunter Lock",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/hunter-lock.webp",
  },
  {
    id: "hyperdense_armor",
    label: "Hyperdense Armor",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/hyperdense-armor.webp",
  },
  {
    id: "imperial_eye",
    label: "Imperial Eye",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/imperial-eye.webp",
  },
  {
    id: "kraul_grapple",
    label: "Kraul Grapple",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/kraul-grapple.webp",
  },
  {
    id: "metahook",
    label: "Metahook",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/metahook.webp",
  },
  {
    id: "molten_puncture",
    label: "Molten Puncture",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/molten-puncture.webp",
  },
  {
    id: "retort_loop",
    label: "Retort Loop",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/retort-loop.webp",
  },
  {
    id: "shahnameh",
    label: "Shahnameh",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/shahnameh.webp",
  },
  {
    id: "stasis",
    label: "Stasis",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/stasis.webp",
  },
  {
    id: "supercharger",
    label: "Supercharger",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/supercharger.webp",
  },
  {
    id: "sympathetic_shield",
    label: "Sympathetic Shield",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/sympathetic-shield.webp",
  },
  {
    id: "tachyon_shield",
    label: "Tachyon Shield",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/tachyon-shield.webp",
  },
  {
    id: "terrify",
    label: "Terrify",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/terrify.webp",
  },
  {
    id: "tracking_bug",
    label: "Tracking Bug",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/tracking-bug.webp",
  },
  {
    id: "trueblack",
    label: "Trueblack Aegis",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/trueblack.webp",
  },
  {
    id: "unravel",
    label: "Unravel",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/unravel.webp",
  },
  {
    id: "viral_logic",
    label: "Viral Logic",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/viral-logic.webp",
  },
  {
    id: "walk_of_kings",
    label: "Walk of Kings",
    icon: "systems/lancer/assets/icons/alt-status/hayleypc/walk-of-kings.webp",
  },
];

const hayleyNPC = [
  {
    id: "abjure",
    label: "Abjure",
    icon: "systems/lancer/assets/icons/alt-status/hayleynpc/abjure.webp",
  },
  {
    id: "chain",
    label: "Chain",
    icon: "systems/lancer/assets/icons/alt-status/hayleynpc/chain.webp",
  },
  {
    id: "echo_edge",
    label: "Echo Edge",
    icon: "systems/lancer/assets/icons/alt-status/hayleynpc/echo-edge.webp",
  },
  {
    id: "dispersal_shield_1",
    label: "Dispersal Shield 1",
    icon: "systems/lancer/assets/icons/alt-status/hayleynpc/dispersal-shield-1.webp",
  },
  {
    id: "dispersal_shield_2",
    label: "Dispersal Shield 2",
    icon: "systems/lancer/assets/icons/alt-status/hayleynpc/dispersal-shield-2.webp",
  },
  {
    id: "dispersal_shield_3",
    label: "Dispersal Shield 3",
    icon: "systems/lancer/assets/icons/alt-status/hayleynpc/dispersal-shield-3.webp",
  },
  {
    id: "focus_down",
    label: "Focus Down",
    icon: "systems/lancer/assets/icons/alt-status/hayleynpc/focus-down.webp",
  },
  {
    id: "follower_count",
    label: "Follower Count",
    icon: "systems/lancer/assets/icons/alt-status/hayleynpc/follower-count.webp",
  },
  {
    id: "grind_maniple",
    label: "Grind Maniple",
    icon: "systems/lancer/assets/icons/alt-status/hayleynpc/grind-maniple.webp",
  },
  {
    id: "illusionary_subroutines",
    label: "Illusionary Subroutines",
    icon: "systems/lancer/assets/icons/alt-status/hayleynpc/illusionary-subroutines.webp",
  },
  {
    id: "investiture",
    label: "Investiture",
    icon: "systems/lancer/assets/icons/alt-status/hayleynpc/investiture.webp",
  },
  {
    id: "latch_drone",
    label: "Latch Drone",
    icon: "systems/lancer/assets/icons/alt-status/hayleynpc/latch-drone.webp",
  },
  {
    id: "marked",
    label: "Marked",
    icon: "systems/lancer/assets/icons/alt-status/hayleynpc/marked.webp",
  },
  {
    id: "pain_transference",
    label: "Pain Transference",
    icon: "systems/lancer/assets/icons/alt-status/hayleynpc/pain-transference.webp",
  },
  {
    id: "petrify",
    label: "Petrify",
    icon: "systems/lancer/assets/icons/alt-status/hayleynpc/petrify.webp",
  },
  {
    id: "sanctuary",
    label: "Sanctuary",
    icon: "systems/lancer/assets/icons/alt-status/hayleynpc/sanctuary.webp",
  },
  {
    id: "spike",
    label: "Spike",
    icon: "systems/lancer/assets/icons/alt-status/hayleynpc/spike.webp",
  },
  {
    id: "tear_down",
    label: "Tear Down",
    icon: "systems/lancer/assets/icons/alt-status/hayleynpc/tear-down.webp",
  },
  {
    id: "warp_sensors",
    label: "Warp Sensors",
    icon: "systems/lancer/assets/icons/alt-status/hayleynpc/warp-sensors.webp",
  },
];

const hayleyUtility = [
  {
    id: "blind",
    label: "Blind",
    icon: "systems/lancer/assets/icons/alt-status/hayleyutil/blind.webp",
  },
  {
    id: "burn",
    label: "Burn",
    icon: "systems/lancer/assets/icons/alt-status/hayleyutil/burn.webp",
  },
  {
    id: "flying",
    label: "Flying",
    icon: "systems/lancer/assets/icons/alt-status/hayleyutil/flying.webp",
  },
  {
    id: "overshield",
    label: "Overshield",
    icon: "systems/lancer/assets/icons/alt-status/hayleyutil/overshield.webp",
  },
  {
    id: "reactor_meltdown",
    label: "Reactor Meltdown",
    icon: "systems/lancer/assets/icons/alt-status/hayleyutil/reactor-meltdown.webp",
  },
];

const tommyConditionsStatus = [
  {
    id: "bolster",
    label: "Bolster",
    icon: "systems/lancer/assets/icons/alt-status/tommystat/Bolstered.webp",
  },
  {
    id: "dangerzone",
    label: "Danger Zone",
    icon: "systems/lancer/assets/icons/alt-status/tommystat/Danger Zone.webp",
  },
  {
    id: "downandout",
    label: "Down and Out",
    icon: "systems/lancer/assets/icons/alt-status/tommystat/Down and Out.webp",
  },
  {
    id: "engaged",
    label: "Engaged",
    icon: "systems/lancer/assets/icons/alt-status/tommystat/Engaged.webp",
  },
  {
    id: "exposed",
    label: "Exposed",
    icon: "systems/lancer/assets/icons/alt-status/tommystat/Exposed.webp",
  },
  {
    id: "flying",
    label: "Flying",
    icon: "systems/lancer/assets/icons/alt-status/tommystat/Flying.webp",
  },
  {
    id: "hidden",
    label: "Hidden",
    icon: "systems/lancer/assets/icons/alt-status/tommystat/Hidden.webp",
  },
  {
    id: "hiddeninvis",
    label: "Hidden and Invisible",
    icon: "systems/lancer/assets/icons/alt-status/tommystat/Hidden and Invisible.webp",
  },
  {
    id: "immobilized",
    label: "Immobilized",
    icon: "systems/lancer/assets/icons/alt-status/tommystat/Immobilized.webp",
  },
  {
    id: "impaired",
    label: "Impaired",
    icon: "systems/lancer/assets/icons/alt-status/tommystat/Impaired.webp",
  },
  {
    id: "invisible",
    label: "Invisible",
    icon: "systems/lancer/assets/icons/alt-status/tommystat/Invisible.webp",
  },
  {
    id: "jammed",
    label: "Jammed",
    icon: "systems/lancer/assets/icons/alt-status/tommystat/Jammed.webp",
  },
  {
    id: "lockon",
    label: "Lock On",
    icon: "systems/lancer/assets/icons/alt-status/tommystat/Lockon.webp",
  },
  {
    id: "prone",
    label: "Prone",
    icon: "systems/lancer/assets/icons/alt-status/tommystat/Prone.webp",
  },
  {
    id: "shredded",
    label: "Shredded",
    icon: "systems/lancer/assets/icons/alt-status/tommystat/Shredded.webp",
  },
  {
    id: "shutdown",
    label: "Shut Down",
    icon: "systems/lancer/assets/icons/alt-status/tommystat/Shut Down.webp",
  },
  {
    id: "slowed",
    label: "Slowed",
    icon: "systems/lancer/assets/icons/alt-status/tommystat/Slowed.webp",
  },
  {
    id: "stunned",
    label: "Stunned",
    icon: "systems/lancer/assets/icons/alt-status/tommystat/Stunned.webp",
  },
  {
    id: "tier1",
    label: "Tier 1",
    icon: "systems/lancer/assets/icons/alt-status/tommystat/Tier 1.webp",
  },
  {
    id: "tier2",
    label: "Tier 2",
    icon: "systems/lancer/assets/icons/alt-status/tommystat/Tier 2.webp",
  },
  {
    id: "tier3",
    label: "Tier 3",
    icon: "systems/lancer/assets/icons/alt-status/tommystat/Tier 3.webp",
  },
  {
    id: "tiercust",
    label: "Custom Tier",
    icon: "systems/lancer/assets/icons/alt-status/tommystat/Tier Custom.webp",
  },
];

/** Set up system status icons */
export function configureStatusIcons(): void {
  const statusIconConfig = game.settings.get(game.system.id, LANCER.setting_status_icons) as StatusIconConfigOptions;
  let statuses: { id: string; label: string; icon: string }[] = [];
  // If no sets are selected, enable the default set
  if (
    !statusIconConfig.defaultConditionsStatus &&
    !statusIconConfig.cancerConditionsStatus &&
    !statusIconConfig.cancerNPCTemplates &&
    !statusIconConfig.hayleyConditionsStatus &&
    !statusIconConfig.hayleyPC &&
    !statusIconConfig.hayleyNPC &&
    !statusIconConfig.hayleyUtility &&
    !statusIconConfig.tommyConditionsStatus
  ) {
    statusIconConfig.defaultConditionsStatus = true;
    if (game.ready) {
      game.settings.set(game.system.id, LANCER.setting_status_icons, statusIconConfig);
    }
  }
  if (statusIconConfig.defaultConditionsStatus) {
    statuses = statuses.concat(defaultStatuses);
  }
  if (statusIconConfig.cancerConditionsStatus) {
    statuses = statuses.concat(cancerConditionsStatus);
  }
  if (statusIconConfig.cancerNPCTemplates) {
    statuses = statuses.concat(cancerNPCTemplates);
  }
  if (statusIconConfig.hayleyConditionsStatus) {
    statuses = statuses.concat(hayleyConditionsStatus);
  }
  if (statusIconConfig.hayleyPC) {
    statuses = statuses.concat(hayleyPC);
  }
  if (statusIconConfig.hayleyNPC) {
    statuses = statuses.concat(hayleyNPC);
  }
  if (statusIconConfig.hayleyUtility) {
    statuses = statuses.concat(hayleyUtility);
  }
  if (statusIconConfig.tommyConditionsStatus) {
    statuses = statuses.concat(tommyConditionsStatus);
  }
  console.log(`Lancer | ${statuses.length} status icons configured`);
  CONFIG.statusEffects = statuses;
}

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
