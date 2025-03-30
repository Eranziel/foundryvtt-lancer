import type HexagonalGrid from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/grid/hexagonal.mjs";
import type { Point } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/types.mjs";
import { LANCER } from "./config";

declare global {
  interface DocumentClassConfig {
    Token: typeof LancerTokenDocument;
  }
  interface PlaceableObjectClassConfig {
    Token: typeof LancerToken;
  }
  interface FlagConfig {
    Token: {
      lancer: {
        manual_token_size?: boolean | undefined;
      };
    };
  }
}

/**
 * Get an array of cube coordinates corresponding to a token of size and
 * alternate orientation on grid type. Coordinates are relative to the space
 * that foundry considers the center of the token to be in. Even sized shapes
 * will be rotated according to whether the grid is columnar and whether the
 * token is on alternate orientation.
 */
// https://www.redblobgames.com/grids/hexagons/
function cubesBySize({
  size,
  alt,
  columns,
}: {
  size: number;
  alt: boolean;
  columns: boolean;
}): { q: number; r: number; s: number }[] {
  // Safeguard against infinite recursion due to non-integer sizes
  size = Math.ceil(size);
  if (size % 2 === 1) {
    let l = Math.floor(size / 2);
    let res = [];
    for (let q = -l; q <= l; ++q) {
      for (let r = Math.max(-l, -q - l); r <= Math.min(l, -q + l); ++r) {
        res.push({ q, r, s: -q - r });
      }
    }
    return res;
  } else {
    // Even size. Get the next larger size and remove spaces on the edge at and below the centerline
    return (
      cubesBySize({ size: size + 1, alt, columns })
        // non-negative r is the center line and below, edge is size/2 spaces from the "center"
        .filter(c => !(c.r >= 0 && (Math.abs(c.q) + Math.abs(c.r) + Math.abs(c.s)) / 2 === size / 2))
        // Rotate based on token and grid settings
        .map(c => {
          if (!alt && !columns) return c;
          if (!alt && columns) return { q: c.r, r: c.s, s: c.q };
          if (alt && columns) return { q: -c.r, r: -c.s, s: -c.q };
          return { q: -c.q, r: -c.r, s: -c.s };
        })
    );
  }
}

function altOrientation(token: LancerToken): boolean {
  // @ts-expect-error v12
  return (token.document.hexagonalShape & 1) === 1;
}

/**
 * Extend the base TokenDocument class to implement system-specific HP bar logic.
 * @extends {TokenDocument}
 */
export class LancerTokenDocument extends TokenDocument {
  async _preCreate(...[data, options, user]: Parameters<TokenDocument["_preCreate"]>) {
    if (
      game.settings.get(game.system.id, LANCER.setting_automation).token_size &&
      // @ts-expect-error Figure out how to define flags
      !this.getFlag(game.system.id, "manual_token_size")
    ) {
      const new_size = Math.max(1, this.actor?.system.size ?? 1);
      this.updateSource({ width: new_size, height: new_size });
    }
    return super._preCreate(data, options, user);
  }

  _onRelatedUpdate(update: any, options: any) {
    super._onRelatedUpdate(update, options);

    if (
      game.settings.get(game.system.id, LANCER.setting_automation).token_size &&
      // @ts-expect-error Figure out how to define flags
      !this.getFlag(game.system.id, "manual_token_size")
    ) {
      let new_size = this.actor ? Math.max(1, this.actor.system.size) : undefined;
      if (this.isOwner && this.id && new_size !== undefined && (this.width !== new_size || this.height !== new_size)) {
        this.update({ width: new_size, height: new_size });
      }
    }
  }

  /**
   * Calculate the range between this and other, accounting for occupied spaces
   * and size
   * @param other   Target to check against
   * @returns The range in grid units.
   */
  computeRange(other: LancerTokenDocument): number {
    const grid = this.parent?.grid ?? canvas.grid;
    if (!grid || !canvas.ready) throw new Error("Canvas not ready");
    if (!this.object || !other.object) throw new Error("Tokens not drawn to canvas");

    if (grid.isGridless) {
      const c2c = grid.measurePath([this.object.center, other.object.center], {}).distance;
      return c2c - (this.width! + other.width!) / 2 + 1;
    } else {
      const distances = this.object
        .getOccupiedSpaces()
        .flatMap(s => other.object!.getOccupiedSpaces().map(t => grid.measurePath([s, t], {}).spaces));
      return Math.min(...distances);
    }
  }
}

/**
 * Get a basis space for the token. For odd, the center, for even, a predicable space with the center as a vertex
 */
function getBasis(token: LancerToken) {
  const symmetrical = token.document.width === token.document.height;
  const even = symmetrical && (token.document.width ?? 0) % 2 == 0;
  if (!symmetrical || !even) return token.center;
  const col: boolean = (<HexagonalGrid>canvas.grid)!.columns;
  const alt = altOrientation(token);
  const pt = { ...token.center };
  // @ts-expect-error v12
  if (col) pt.x = pt.x + ((alt ? -1 : 1) * canvas.grid.sizeX) / 2;
  // @ts-expect-error v12
  else pt.y = pt.y + ((alt ? -1 : 1) * canvas.grid.sizeY) / 2;
  return pt;
}

/**
 * Extend the base Token class to implement additional system-specific logic.
 * @extends {Token}
 */
export class LancerToken extends Token {
  constructor(document: LancerTokenDocument) {
    super(document);
    this._spaces = {
      at: { x: -1, y: -1 },
      spaces: [],
    };
  }

  /** @override */
  getShape() {
    // @ts-expect-error v12
    const size: { width: number; height: number } = this.getSize();
    if (canvas.grid!.isGridless && size.width === size.height) {
      return new PIXI.Circle(size.width / 2, size.height / 2, size.width / 2);
    }
    // @ts-expect-error v12
    return super.getShape() as PIXI.Polygon | PIXI.Rectangle;
  }

  /**
   * Cached occupied spaces
   */
  protected _spaces: { at: Point; spaces: Point[] };

  /**
   * Returns a Set of Points corresponding to the grid space center points that
   * the token occupies.
   */
  getOccupiedSpaces(): Point[] {
    let pos: { x: number; y: number } = { x: this.x, y: this.y };
    // Invalidate the cache if the position is different than when it was last calculated.
    // TODO Evaluate whether caching this is even needed now that PIXI isn't responsible for the calculation
    if (Math.floor(pos.x) !== Math.floor(this._spaces.at.x) || Math.floor(pos.y) !== Math.floor(this._spaces.at.y)) {
      this._spaces.at = { ...pos };
      this._spaces.spaces = [];
    }

    if (this._spaces.spaces.length === 0) {
      if (canvas.grid?.isHexagonal) {
        const regular = this.document.width === this.document.height;

        const basis = getBasis(this);
        // @ts-expect-error v12
        const base_cube = canvas.grid.pointToCube(basis);
        const cubes = cubesBySize({
          // @ts-expect-error
          size: regular ? this.document.width : 1,
          alt: altOrientation(this),
          // @ts-expect-error
          columns: canvas.grid!.columns,
        }).map(c => ({
          q: c.q + base_cube.q,
          r: c.r + base_cube.r,
          s: c.s + base_cube.s,
        }));
        // @ts-expect-error v12
        this._spaces.spaces = cubes.map(c => canvas.grid!.cubeToPoint(c));
      } else if (canvas.grid?.isSquare) {
        // @ts-expect-error
        for (let i = 0; i < this.document.width; ++i) {
          // @ts-expect-error
          for (let j = 0; j < this.document.height; ++j) {
            this._spaces.spaces.push({
              x: this.position.x + (i + 0.5) * canvas.grid.sizeX,
              y: this.position.y + (j + 0.5) * canvas.grid.sizeY,
            });
          }
        }
      } else {
        // Gridless needs to use different calcs
        this._spaces.spaces.push({ ...this.center });
      }
    }
    // Make a clone so the cache can't be mutated
    return this._spaces.spaces.map(p => ({ ...p }));
  }
}

export function extendTokenConfig(...[app, html, _data]: Parameters<Hooks.RenderApplication<TokenConfig>>) {
  const { token_size } = game.settings.get(game.system.id, LANCER.setting_automation);
  if (!token_size) return;
  const manual = (<LancerTokenDocument>app.object).getFlag(game.system.id, "manual_token_size") ?? false;
  html.find("[name=width]").closest(".form-group").before(`
    <div class="form-group slim">
      <label>${game.i18n.localize("lancer.tokenConfig.manual_token_size.label")}</label>
      <div class="form-fields">
        <input type="checkbox"
          name="flags.${game.system.id}.manual_token_size"
          ${manual ? "checked" : ""}
        >
      </div>
      <p class="hint">${game.i18n.localize("lancer.tokenConfig.manual_token_size.hint")}</p>
    </div>`);
  const toggle_inputs = (ev: JQuery.ChangeEvent<HTMLElement, undefined, HTMLElement, HTMLInputElement>) => {
    const checked = ev.target.checked;
    html.find("[name=width]").prop("disabled", !checked);
    html.find("[name=height]").prop("disabled", !checked);
  };
  html.find(`[name='flags.${game.system.id}.manual_token_size']`).on("change" as any, toggle_inputs);
  html.find("[name=width]").prop("disabled", !manual);
  html.find("[name=height]").prop("disabled", !manual);
  app.setPosition();
}
