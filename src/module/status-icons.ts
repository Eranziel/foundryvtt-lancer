import { LANCER } from "./config";
import { StatusIconConfigOptions } from "./settings";

const lp = LANCER.log_prefix;

export const defaultStatuses = [
  {
    id: "immobilized",
    name: "lancer.statusIconsNames.immobilized",
    img: `systems/lancer/assets/icons/white/condition_immobilized.svg`,
  },
  {
    id: "impaired",
    name: "lancer.statusIconsNames.impaired",
    img: `systems/lancer/assets/icons/white/condition_impaired.svg`,
  },
  {
    id: "jammed",
    name: "lancer.statusIconsNames.jammed",
    img: `systems/lancer/assets/icons/white/condition_jammed.svg`,
  },
  {
    id: "lockon",
    name: "lancer.statusIconsNames.lockon",
    img: `systems/lancer/assets/icons/white/condition_lockon.svg`,
  },
  {
    id: "shredded",
    name: "lancer.statusIconsNames.shredded",
    img: `systems/lancer/assets/icons/white/condition_shredded.svg`,
  },
  {
    id: "slow",
    name: "lancer.statusIconsNames.slow",
    img: `systems/lancer/assets/icons/white/condition_slow.svg`,
  },
  {
    id: "stunned",
    name: "lancer.statusIconsNames.stunned",
    img: `systems/lancer/assets/icons/white/condition_stunned.svg`,
  },
  {
    id: "dangerzone",
    name: "lancer.statusIconsNames.dangerzone",
    img: `systems/lancer/assets/icons/white/status_dangerzone.svg`,
  },
  {
    id: "downandout",
    name: "lancer.statusIconsNames.downandout",
    img: `systems/lancer/assets/icons/white/status_downandout.svg`,
  },
  {
    id: "engaged",
    name: "lancer.statusIconsNames.engaged",
    img: `systems/lancer/assets/icons/white/status_engaged.svg`,
  },
  {
    id: "exposed",
    name: "lancer.statusIconsNames.exposed",
    img: `systems/lancer/assets/icons/white/status_exposed.svg`,
  },
  {
    id: "hidden",
    name: "lancer.statusIconsNames.hidden",
    img: `systems/lancer/assets/icons/white/status_hidden.svg`,
  },
  {
    id: "invisible",
    name: "lancer.statusIconsNames.invisible",
    img: `systems/lancer/assets/icons/white/status_invisible.svg`,
  },
  {
    id: "intangible",
    name: "lancer.statusIconsNames.intangible",
    img: `systems/lancer/assets/icons/white/status_intangible.svg`,
  },
  {
    id: "prone",
    name: "lancer.statusIconsNames.prone",
    img: `systems/lancer/assets/icons/white/status_prone.svg`,
  },
  {
    id: "shutdown",
    name: "lancer.statusIconsNames.shutdown",
    img: `systems/lancer/assets/icons/white/status_shutdown.svg`,
  },
  {
    id: "npc_tier_1",
    name: "lancer.statusIconsNames.npc_tier_1",
    img: `systems/lancer/assets/icons/white/npc_tier_1.svg`,
  },
  {
    id: "npc_tier_2",
    name: "lancer.statusIconsNames.npc_tier_2",
    img: `systems/lancer/assets/icons/white/npc_tier_2.svg`,
  },
  {
    id: "npc_tier_3",
    name: "lancer.statusIconsNames.npc_tier_3",
    img: `systems/lancer/assets/icons/white/npc_tier_3.svg`,
  },
];

export const cancerConditionsStatus = [
  {
    id: "burn",
    name: "lancer.statusIconsNames.burn",
    img: "systems/lancer/assets/icons/alt-status/cancercondstat/burn.webp",
  },
  {
    id: "dangerzone",
    name: "lancer.statusIconsNames.dangerzone",
    img: "systems/lancer/assets/icons/alt-status/cancercondstat/dangerzone.webp",
  },
  {
    id: "downandout",
    name: "lancer.statusIconsNames.downandout",
    img: "systems/lancer/assets/icons/alt-status/cancercondstat/downandout.svg",
  },
  {
    id: "engaged",
    name: "lancer.statusIconsNames.engaged",
    img: "systems/lancer/assets/icons/alt-status/cancercondstat/engaged.webp",
  },
  {
    id: "exposed",
    name: "lancer.statusIconsNames.exposed",
    img: "systems/lancer/assets/icons/alt-status/cancercondstat/exposed.webp",
  },
  {
    id: "flying",
    name: "lancer.statusIconsNames.flying",
    img: "systems/lancer/assets/icons/alt-status/cancercondstat/flying.webp",
  },
  {
    id: "hidden",
    name: "lancer.statusIconsNames.hidden",
    img: "systems/lancer/assets/icons/alt-status/cancercondstat/hidden.webp",
  },
  {
    id: "immobilized",
    name: "lancer.statusIconsNames.immobilized",
    img: "systems/lancer/assets/icons/alt-status/cancercondstat/immobilized.svg",
  },
  {
    id: "impaired",
    name: "lancer.statusIconsNames.impaired",
    img: "systems/lancer/assets/icons/alt-status/cancercondstat/impaired.svg",
  },
  {
    id: "invisible",
    name: "lancer.statusIconsNames.invisible",
    img: "systems/lancer/assets/icons/alt-status/cancercondstat/invisible.svg",
  },
  {
    id: "jammed",
    name: "lancer.statusIconsNames.jammed",
    img: "systems/lancer/assets/icons/alt-status/cancercondstat/jammed.svg",
  },
  {
    id: "lockon",
    name: "lancer.statusIconsNames.lockon",
    img: "systems/lancer/assets/icons/alt-status/cancercondstat/lockon.svg",
  },
  {
    id: "prone",
    name: "lancer.statusIconsNames.prone",
    img: "systems/lancer/assets/icons/alt-status/cancercondstat/prone.webp",
  },
  {
    id: "shredded",
    name: "lancer.statusIconsNames.shredded",
    img: "systems/lancer/assets/icons/alt-status/cancercondstat/shredded.svg",
  },
  {
    id: "shutdown",
    name: "lancer.statusIconsNames.shutdown",
    img: "systems/lancer/assets/icons/alt-status/cancercondstat/shutdown.svg",
  },
  {
    id: "slow",
    name: "lancer.statusIconsNames.slow",
    img: "systems/lancer/assets/icons/alt-status/cancercondstat/slowed.svg",
  },
  {
    id: "stunned",
    name: "lancer.statusIconsNames.stunned",
    img: "systems/lancer/assets/icons/alt-status/cancercondstat/stunned.svg",
  },
];

export const cancerNPCTemplates = [
  {
    id: "commander",
    name: "lancer.statusIconsNames.commander",
    img: "systems/lancer/assets/icons/alt-status/cancernpc/commander.webp",
  },
  {
    id: "elite",
    name: "lancer.statusIconsNames.elite",
    img: "systems/lancer/assets/icons/alt-status/cancernpc/elite.webp",
  },
  {
    id: "exotic",
    name: "lancer.statusIconsNames.exotic",
    img: "systems/lancer/assets/icons/alt-status/cancernpc/exotic.webp",
  },
  {
    id: "grunt",
    name: "lancer.statusIconsNames.grunt",
    img: "systems/lancer/assets/icons/alt-status/cancernpc/grunt.webp",
  },
  {
    id: "mercenary",
    name: "lancer.statusIconsNames.mercenary",
    img: "systems/lancer/assets/icons/alt-status/cancernpc/mercenary.webp",
  },
  {
    id: "pirate",
    name: "lancer.statusIconsNames.pirate",
    img: "systems/lancer/assets/icons/alt-status/cancernpc/pirate.webp",
  },
  {
    id: "rpv",
    name: "lancer.statusIconsNames.rpv",
    img: "systems/lancer/assets/icons/alt-status/cancernpc/rpv.webp",
  },
  {
    id: "ship",
    name: "lancer.statusIconsNames.ship",
    img: "systems/lancer/assets/icons/alt-status/cancernpc/ship.webp",
  },
  {
    id: "spacer",
    name: "lancer.statusIconsNames.spacer",
    img: "systems/lancer/assets/icons/alt-status/cancernpc/spacer.webp",
  },
  {
    id: "ultra",
    name: "lancer.statusIconsNames.ultra",
    img: "systems/lancer/assets/icons/alt-status/cancernpc/ultra.webp",
  },
  {
    id: "vehicle",
    name: "lancer.statusIconsNames.vehicle",
    img: "systems/lancer/assets/icons/alt-status/cancernpc/vehicle.webp",
  },
  {
    id: "veteran",
    name: "lancer.statusIconsNames.veteran",
    img: "systems/lancer/assets/icons/alt-status/cancernpc/veteran.webp",
  },
];

export const hayleyConditionsStatus = [
  {
    id: "bolster",
    name: "lancer.statusIconsNames.bolster",
    img: "systems/lancer/assets/icons/alt-status/hayleycondstat/bolster.webp",
  },
  {
    id: "downandout",
    name: "lancer.statusIconsNames.downandout",
    img: "systems/lancer/assets/icons/alt-status/hayleycondstat/downandout.webp",
  },
  {
    id: "exposed",
    name: "lancer.statusIconsNames.exposed",
    img: "systems/lancer/assets/icons/alt-status/hayleycondstat/exposed.webp",
  },
  {
    id: "grappled",
    name: "lancer.statusIconsNames.grappled",
    img: "systems/lancer/assets/icons/alt-status/hayleycondstat/grappled.webp",
  },
  {
    id: "hidden",
    name: "lancer.statusIconsNames.hidden",
    img: "systems/lancer/assets/icons/alt-status/hayleycondstat/hidden.webp",
  },
  {
    id: "immobilized",
    name: "lancer.statusIconsNames.immobilized",
    img: "systems/lancer/assets/icons/alt-status/hayleycondstat/immobilized.webp",
  },
  {
    id: "impaired",
    name: "lancer.statusIconsNames.impaired",
    img: "systems/lancer/assets/icons/alt-status/hayleycondstat/impaired.webp",
  },
  {
    id: "invisible",
    name: "lancer.statusIconsNames.invisible",
    img: "systems/lancer/assets/icons/alt-status/hayleycondstat/invisible.webp",
  },
  {
    id: "jammed",
    name: "lancer.statusIconsNames.jammed",
    img: "systems/lancer/assets/icons/alt-status/hayleycondstat/jammed.webp",
  },
  {
    id: "lockon",
    name: "lancer.statusIconsNames.lockon",
    img: "systems/lancer/assets/icons/alt-status/hayleycondstat/lockon.webp",
  },
  {
    id: "prone",
    name: "lancer.statusIconsNames.prone",
    img: "systems/lancer/assets/icons/alt-status/hayleycondstat/prone.webp",
  },
  {
    id: "shredded",
    name: "lancer.statusIconsNames.shredded",
    img: "systems/lancer/assets/icons/alt-status/hayleycondstat/shredded.webp",
  },
  {
    id: "shutdown",
    name: "lancer.statusIconsNames.shutdown",
    img: "systems/lancer/assets/icons/alt-status/hayleycondstat/shutdown.webp",
  },
  {
    id: "slow",
    name: "lancer.statusIconsNames.slow",
    img: "systems/lancer/assets/icons/alt-status/hayleycondstat/slowed.webp",
  },
  {
    id: "stunned",
    name: "lancer.statusIconsNames.stunned",
    img: "systems/lancer/assets/icons/alt-status/hayleycondstat/stunned.webp",
  },
];

export const hayleyPC = [
  {
    id: "aceso",
    name: "lancer.statusIconsNames.aceso",
    img: "systems/lancer/assets/icons/alt-status/hayleypc/aceso.webp",
  },
  {
    id: "camus_razor",
    name: "lancer.statusIconsNames.camus_razor",
    img: "systems/lancer/assets/icons/alt-status/hayleypc/camus-razor.webp",
  },
  {
    id: "chains_of_prometheus",
    name: "lancer.statusIconsNames.chains_of_prometheus",
    img: "systems/lancer/assets/icons/alt-status/hayleypc/chains-of-prometheus.webp",
  },
  {
    id: "clamp_bomb",
    name: "lancer.statusIconsNames.clamp_bomb",
    img: "systems/lancer/assets/icons/alt-status/hayleypc/clamp-bomb.webp",
  },
  {
    id: "dimensional_shackles",
    name: "lancer.statusIconsNames.dimensional_shackles",
    img: "systems/lancer/assets/icons/alt-status/hayleypc/dimensional-shackles.webp",
  },
  {
    id: "dominions_breadth",
    name: "lancer.statusIconsNames.dominions_breadth",
    img: "systems/lancer/assets/icons/alt-status/hayleypc/dominions-breadth.webp",
  },
  {
    id: "duat_gate",
    name: "lancer.statusIconsNames.duat_gate",
    img: "systems/lancer/assets/icons/alt-status/hayleypc/duat-gate.webp",
  },
  {
    id: "excommunicate",
    name: "lancer.statusIconsNames.excommunicate",
    img: "systems/lancer/assets/icons/alt-status/hayleypc/excommunicate.webp",
  },
  {
    id: "fade_cloak",
    name: "lancer.statusIconsNames.fade_cloak",
    img: "systems/lancer/assets/icons/alt-status/hayleypc/fade-cloak.webp",
  },
  {
    id: "flaw_minus",
    name: "lancer.statusIconsNames.flaw_minus",
    img: "systems/lancer/assets/icons/alt-status/hayleypc/flaw-minus.webp",
  },
  {
    id: "flaw_plus",
    name: "lancer.statusIconsNames.flaw_plus",
    img: "systems/lancer/assets/icons/alt-status/hayleypc/flaw-plus.webp",
  },
  {
    id: "gravity",
    name: "lancer.statusIconsNames.gravity",
    img: "systems/lancer/assets/icons/alt-status/hayleypc/gravity.webp",
  },
  {
    id: "haste",
    name: "lancer.statusIconsNames.haste",
    img: "systems/lancer/assets/icons/alt-status/hayleypc/haste.webp",
  },
  {
    id: "hunter_lock",
    name: "lancer.statusIconsNames.hunter_lock",
    img: "systems/lancer/assets/icons/alt-status/hayleypc/hunter-lock.webp",
  },
  {
    id: "hyperdense_armor",
    name: "lancer.statusIconsNames.hyperdense_armor",
    img: "systems/lancer/assets/icons/alt-status/hayleypc/hyperdense-armor.webp",
  },
  {
    id: "imperial_eye",
    name: "lancer.statusIconsNames.imperial_eye",
    img: "systems/lancer/assets/icons/alt-status/hayleypc/imperial-eye.webp",
  },
  {
    id: "kraul_grapple",
    name: "lancer.statusIconsNames.kraul_grapple",
    img: "systems/lancer/assets/icons/alt-status/hayleypc/kraul-grapple.webp",
  },
  {
    id: "metahook",
    name: "lancer.statusIconsNames.metahook",
    img: "systems/lancer/assets/icons/alt-status/hayleypc/metahook.webp",
  },
  {
    id: "molten_puncture",
    name: "lancer.statusIconsNames.molten_puncture",
    img: "systems/lancer/assets/icons/alt-status/hayleypc/molten-puncture.webp",
  },
  {
    id: "retort_loop",
    name: "lancer.statusIconsNames.retort_loop",
    img: "systems/lancer/assets/icons/alt-status/hayleypc/retort-loop.webp",
  },
  {
    id: "shahnameh",
    name: "lancer.statusIconsNames.shahnameh",
    img: "systems/lancer/assets/icons/alt-status/hayleypc/shahnameh.webp",
  },
  {
    id: "stasis",
    name: "lancer.statusIconsNames.stasis",
    img: "systems/lancer/assets/icons/alt-status/hayleypc/stasis.webp",
  },
  {
    id: "supercharger",
    name: "lancer.statusIconsNames.supercharger",
    img: "systems/lancer/assets/icons/alt-status/hayleypc/supercharger.webp",
  },
  {
    id: "sympathetic_shield",
    name: "lancer.statusIconsNames.sympathetic_shield",
    img: "systems/lancer/assets/icons/alt-status/hayleypc/sympathetic-shield.webp",
  },
  {
    id: "tachyon_shield",
    name: "lancer.statusIconsNames.tachyon_shield",
    img: "systems/lancer/assets/icons/alt-status/hayleypc/tachyon-shield.webp",
  },
  {
    id: "terrify",
    name: "lancer.statusIconsNames.terrify",
    img: "systems/lancer/assets/icons/alt-status/hayleypc/terrify.webp",
  },
  {
    id: "tracking_bug",
    name: "lancer.statusIconsNames.tracking_bug",
    img: "systems/lancer/assets/icons/alt-status/hayleypc/tracking-bug.webp",
  },
  {
    id: "trueblack",
    name: "lancer.statusIconsNames.trueblack",
    img: "systems/lancer/assets/icons/alt-status/hayleypc/trueblack.webp",
  },
  {
    id: "unravel",
    name: "lancer.statusIconsNames.unravel",
    img: "systems/lancer/assets/icons/alt-status/hayleypc/unravel.webp",
  },
  {
    id: "viral_logic",
    name: "lancer.statusIconsNames.viral_logic",
    img: "systems/lancer/assets/icons/alt-status/hayleypc/viral-logic.webp",
  },
  {
    id: "walk_of_kings",
    name: "lancer.statusIconsNames.walk_of_kings",
    img: "systems/lancer/assets/icons/alt-status/hayleypc/walk-of-kings.webp",
  },
];

export const hayleyNPC = [
  {
    id: "abjure",
    name: "lancer.statusIconsNames.abjure",
    img: "systems/lancer/assets/icons/alt-status/hayleynpc/abjure.webp",
  },
  {
    id: "chain",
    name: "lancer.statusIconsNames.chain",
    img: "systems/lancer/assets/icons/alt-status/hayleynpc/chain.webp",
  },
  {
    id: "echo_edge",
    name: "lancer.statusIconsNames.echo_edge",
    img: "systems/lancer/assets/icons/alt-status/hayleynpc/echo-edge.webp",
  },
  {
    id: "dispersal_shield_1",
    name: "lancer.statusIconsNames.dispersal_shield_1",
    img: "systems/lancer/assets/icons/alt-status/hayleynpc/dispersal-shield-1.webp",
  },
  {
    id: "dispersal_shield_2",
    name: "lancer.statusIconsNames.dispersal_shield_2",
    img: "systems/lancer/assets/icons/alt-status/hayleynpc/dispersal-shield-2.webp",
  },
  {
    id: "dispersal_shield_3",
    name: "lancer.statusIconsNames.dispersal_shield_3",
    img: "systems/lancer/assets/icons/alt-status/hayleynpc/dispersal-shield-3.webp",
  },
  {
    id: "focus_down",
    name: "lancer.statusIconsNames.focus_down",
    img: "systems/lancer/assets/icons/alt-status/hayleynpc/focus-down.webp",
  },
  {
    id: "follower_count",
    name: "lancer.statusIconsNames.follower_count",
    img: "systems/lancer/assets/icons/alt-status/hayleynpc/follower-count.webp",
  },
  {
    id: "grind_maniple",
    name: "lancer.statusIconsNames.grind_maniple",
    img: "systems/lancer/assets/icons/alt-status/hayleynpc/grind-maniple.webp",
  },
  {
    id: "illusionary_subroutines",
    name: "lancer.statusIconsNames.illusionary_subroutines",
    img: "systems/lancer/assets/icons/alt-status/hayleynpc/illusionary-subroutines.webp",
  },
  {
    id: "investiture",
    name: "lancer.statusIconsNames.investiture",
    img: "systems/lancer/assets/icons/alt-status/hayleynpc/investiture.webp",
  },
  {
    id: "latch_drone",
    name: "lancer.statusIconsNames.latch_drone",
    img: "systems/lancer/assets/icons/alt-status/hayleynpc/latch-drone.webp",
  },
  {
    id: "marked",
    name: "lancer.statusIconsNames.marked",
    img: "systems/lancer/assets/icons/alt-status/hayleynpc/marked.webp",
  },
  {
    id: "pain_transference",
    name: "lancer.statusIconsNames.pain_transference",
    img: "systems/lancer/assets/icons/alt-status/hayleynpc/pain-transference.webp",
  },
  {
    id: "petrify",
    name: "lancer.statusIconsNames.petrify",
    img: "systems/lancer/assets/icons/alt-status/hayleynpc/petrify.webp",
  },
  {
    id: "sanctuary",
    name: "lancer.statusIconsNames.sanctuary",
    img: "systems/lancer/assets/icons/alt-status/hayleynpc/sanctuary.webp",
  },
  {
    id: "spike",
    name: "lancer.statusIconsNames.spike",
    img: "systems/lancer/assets/icons/alt-status/hayleynpc/spike.webp",
  },
  {
    id: "tear_down",
    name: "lancer.statusIconsNames.tear_down",
    img: "systems/lancer/assets/icons/alt-status/hayleynpc/tear-down.webp",
  },
  {
    id: "warp_sensors",
    name: "lancer.statusIconsNames.warp_sensors",
    img: "systems/lancer/assets/icons/alt-status/hayleynpc/warp-sensors.webp",
  },
];

export const hayleyUtility = [
  {
    id: "blind",
    name: "lancer.statusIconsNames.blind",
    img: "systems/lancer/assets/icons/alt-status/hayleyutil/blind.webp",
  },
  {
    id: "burn",
    name: "lancer.statusIconsNames.burn",
    img: "systems/lancer/assets/icons/alt-status/hayleyutil/burn.webp",
  },
  {
    id: "flying",
    name: "lancer.statusIconsNames.flying",
    img: "systems/lancer/assets/icons/alt-status/hayleyutil/flying.webp",
  },
  {
    id: "overshield",
    name: "lancer.statusIconsNames.overshield",
    img: "systems/lancer/assets/icons/alt-status/hayleyutil/overshield.webp",
  },
  {
    id: "reactor_meltdown",
    name: "lancer.statusIconsNames.reactor_meltdown",
    img: "systems/lancer/assets/icons/alt-status/hayleyutil/reactor-meltdown.webp",
  },
];

export const tommyConditionsStatus = [
  {
    id: "bolster",
    name: "lancer.statusIconsNames.bolster",
    img: "systems/lancer/assets/icons/alt-status/tommystat/Bolstered.webp",
  },
  {
    id: "dangerzone",
    name: "lancer.statusIconsNames.dangerzone",
    img: "systems/lancer/assets/icons/alt-status/tommystat/Danger Zone.webp",
  },
  {
    id: "destroyed",
    name: "lancer.statusIconsNames.destroyed",
    icon: "systems/lancer/assets/icons/alt-status/tommystat/Destroyed.webp",
  },
  {
    id: "downandout",
    name: "lancer.statusIconsNames.downandout",
    img: "systems/lancer/assets/icons/alt-status/tommystat/Down and Out.webp",
  },
  {
    id: "engaged",
    name: "lancer.statusIconsNames.engaged",
    img: "systems/lancer/assets/icons/alt-status/tommystat/Engaged.webp",
  },
  {
    id: "exposed",
    name: "lancer.statusIconsNames.exposed",
    img: "systems/lancer/assets/icons/alt-status/tommystat/Exposed.webp",
  },
  {
    id: "grappled",
    name: "lancer.statusIconsNames.grappled",
    icon: "systems/lancer/assets/icons/alt-status/tommystat/Grappled.webp",
  },
  {
    id: "flying",
    name: "lancer.statusIconsNames.flying",
    img: "systems/lancer/assets/icons/alt-status/tommystat/Flying.webp",
  },
  {
    id: "hidden",
    name: "lancer.statusIconsNames.hidden",
    img: "systems/lancer/assets/icons/alt-status/tommystat/Hidden.webp",
  },
  {
    id: "hiddeninvis",
    name: "lancer.statusIconsNames.hiddeninvis",
    img: "systems/lancer/assets/icons/alt-status/tommystat/Hidden and Invisible.webp",
  },
  {
    id: "immobilized",
    name: "lancer.statusIconsNames.immobilized",
    img: "systems/lancer/assets/icons/alt-status/tommystat/Immobilized.webp",
  },
  {
    id: "impaired",
    name: "lancer.statusIconsNames.impaired",
    img: "systems/lancer/assets/icons/alt-status/tommystat/Impaired.webp",
  },
  {
    id: "invisible",
    name: "lancer.statusIconsNames.invisible",
    img: "systems/lancer/assets/icons/alt-status/tommystat/Invisible.webp",
  },
  {
    id: "intangible",
    name: "lancer.statusIconsNames.intangible",
    icon: `systems/lancer/assets/icons/alt-status/tommystat/Intangible.webp`,
  },
  {
    id: "jammed",
    name: "lancer.statusIconsNames.jammed",
    img: "systems/lancer/assets/icons/alt-status/tommystat/Jammed.webp",
  },
  {
    id: "lockon",
    name: "lancer.statusIconsNames.lockon",
    img: "systems/lancer/assets/icons/alt-status/tommystat/Lockon.webp",
  },
  {
    id: "prone",
    name: "lancer.statusIconsNames.prone",
    img: "systems/lancer/assets/icons/alt-status/tommystat/Prone.webp",
  },
  {
    id: "shredded",
    name: "lancer.statusIconsNames.shredded",
    img: "systems/lancer/assets/icons/alt-status/tommystat/Shredded.webp",
  },
  {
    id: "shutdown",
    name: "lancer.statusIconsNames.shutdown",
    img: "systems/lancer/assets/icons/alt-status/tommystat/Shut Down.webp",
  },
  {
    id: "slow",
    name: "lancer.statusIconsNames.slow",
    img: "systems/lancer/assets/icons/alt-status/tommystat/Slowed.webp",
  },
  {
    id: "stunned",
    name: "lancer.statusIconsNames.stunned",
    img: "systems/lancer/assets/icons/alt-status/tommystat/Stunned.webp",
  },
  {
    id: "npc_tier_1",
    name: "lancer.statusIconsNames.npc_tier_1",
    img: "systems/lancer/assets/icons/alt-status/tommystat/Tier 1.webp",
  },
  {
    id: "npc_tier_2",
    name: "lancer.statusIconsNames.npc_tier_2",
    img: "systems/lancer/assets/icons/alt-status/tommystat/Tier 2.webp",
  },
  {
    id: "npc_tier_3",
    name: "lancer.statusIconsNames.npc_tier_3",
    img: "systems/lancer/assets/icons/alt-status/tommystat/Tier 3.webp",
  },
  {
    id: "tiercust",
    name: "lancer.statusIconsNames.tiercust",
    img: "systems/lancer/assets/icons/alt-status/tommystat/Tier Custom.webp",
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
