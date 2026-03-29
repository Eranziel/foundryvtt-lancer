export class LancerTerrain extends foundry.data.TerrainData {
  static resolveTerrainEffects(effects: { name: string; difficulty?: number }[]) {
    let difficulty = 0;
    for (const effect of effects) {
      if (effect.name === "difficulty") difficulty = Math.max(difficulty, effect.difficulty ?? 0);
    }
    if (difficulty === 0) return null;
    return new this({ difficulty });
  }
}
