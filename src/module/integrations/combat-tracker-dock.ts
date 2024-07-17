import type { LancerActor } from "../actor/lancer-actor";
import type { LancerCombatant } from "../combat/lancer-combat";
// Import our customized CSS
import "./lancer-combat-tracker-dock.scss";

/**
 * Creates a short description to be displayed under the name of the combatant
 * in the tooltip. Not particularly useful atm as is only displays to players
 * with ownership/observer permissions.
 */
export function generateDescription(actor: LancerActor) {
  if (actor.is_deployable()) {
    const deployer = actor.system.owner?.value?.name ?? null;
    if (deployer !== null) return `Deployer: ${deployer}`;
  }
  if (actor.is_npc()) {
    return (
      (actor.system.class?.system.role?.toUpperCase() ?? "UNKNOWN") +
      ": " +
      [actor.system.class?.name, ...actor.itemTypes.npc_template.map(t => t.name?.toUpperCase())].join(" // ")
    );
  }
}

/**
 * Parameters for the initiative display. Use this to display the total
 * activations instead of the initiative value.
 */
export function getInitiativeDisplay(combatant: LancerCombatant) {
  // rollIcon should never show up, so if it does, something broke and display an error icon
  return { value: combatant?.activations.max, icon: "cci cci-activate", rollIcon: "fas fa-triangle-exclamation" };
}

function getColorByDispo(d: number) {
  const app = game.settings.get(game.system.id, "combat-tracker-appearance");
  if (d === 2) return app.player_color;
  else if (d === 1) return app.friendly_color;
  else if (d === 0) return app.neutral_color;
  else if (d === -1) return app.enemy_color;
  else return null;
}

interface SystemIcon {
  icon: string;
  fontSize: string;
  color?: string | null | undefined;
  enabled?: boolean;
  visible?: boolean;
  // I legitimately do not know what the type on event is as it's not documented.
  callback?: (event: unknown, combatant: LancerCombatant, iconIndex: number, iconId: string) => unknown;
  id?: string;
}

/**
 * Get an array of icons to be displayed on the card when the option is
 * enabled. Displays an activation button for each remaining activation and a
 * deactivate button if the combatant is the current turn.
 */
export function getSystemIcons(combatant: LancerCombatant) {
  const icons: SystemIcon[] = [];
  for (let i = 0; i < (combatant.activations.value ?? 0); ++i) {
    icons.push({
      icon: "cci cci-activate",
      color: getColorByDispo(combatant.disposition),
      fontSize: "1.5rem",
      visible: true,
      enabled: true,
      callback: (_e, combatant) => combatant.parent?.activateCombatant(combatant.id!),
    });
  }
  // @ts-expect-error
  if (combatant.parent?.current.combatantId === combatant.id) {
    icons.push({
      icon: "cci cci-deactivate",
      fontSize: "1.5rem",
      visible: true,
      enabled: combatant?.isOwner,
      callback: (_e, combatant) => combatant.parent?.deactivateCombatant(combatant.id!),
    });
  }
  return icons;
}
