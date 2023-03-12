// Import TypeScript modules
import type { LancerToken } from "../token";

/**
 * Sets user targets to tokens that are within the highlighted spaces of the
 * MeasuredTemplate
 * @param templateId - The id of the template to use
 */
export function targetsFromTemplate(templateId: string): void {
  const highlight = canvas?.grid?.getHighlightLayer(`MeasuredTemplate.${templateId}`);
  const grid = canvas?.grid;
  if (highlight === undefined || canvas === undefined || grid === undefined || canvas.ready !== true) return;
  const test_token = (token: LancerToken) => {
    return Array.from(token.getOccupiedSpaces()).reduce((a, p) => a || highlight.geometry.containsPoint(p), false);
  };

  // Get list of tokens and dispositions to ignore.
  let ignore = canvas.templates!.get(templateId)!.document.getFlag(game.system.id, "ignore");

  // Test if each token occupies a targeted space and target it if true
  const targets = canvas
    .tokens!.placeables.filter(t => {
      // @ts-expect-error v10
      let skip = ignore.tokens.includes(t.id) || ignore.dispositions.includes(t.document.disposition);
      return !skip && test_token(t);
    })
    .map(t => t.id);
  game.user!.updateTokenTargets(targets);
  game.user!.broadcastActivity({ targets });
}
