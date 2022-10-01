import { LANCER } from "./config";

export function measureDistances(
  this: SquareGrid,
  ...[segments, options = {}]: Parameters<SquareGrid["measureDistances"]>
): ReturnType<SquareGrid["measureDistances"]> {
  if (!options?.gridSpaces) return BaseGrid.prototype.measureDistances.call(this, segments, options);

  const mode = game.settings.get(game.system.id, LANCER.setting_square_grid_diagonals);
  // @ts-expect-error Should be fixed with v10 types
  const grid_distance = canvas.scene?.grid.distance ?? 0;
  let diag_parity = 0; // Track the parity of the diagonals so that 121 can't be cheesed

  return segments.map(s => {
    const dx = Math.abs(Math.ceil(s.ray.dx / (canvas.dimensions?.size ?? 1)));
    const dy = Math.abs(Math.ceil(s.ray.dy / (canvas.dimensions?.size ?? 1)));

    switch (mode) {
      case "111": // Diagonal movement costs 1
        return Math.max(dx, dy) * grid_distance;
      case "121": // Diagonal movement cost 1 then 2 then 1…
        const d = Math.max(dx, dy) + Math.floor((Math.min(dx, dy) + diag_parity) / 2);
        diag_parity = (diag_parity + Math.min(dx, dy)) % 2;
        return d * grid_distance;
      case "222": // Diagonal movement costs 2, there is no diagonal movement
        return (dx + dy) * grid_distance;
      case "euc": // Movement costs the straight line distance rounded to the nearest space
        return Math.round(Math.hypot(dx, dy)) * grid_distance;
    }
  });
}
