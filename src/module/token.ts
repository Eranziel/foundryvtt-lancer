import { correctLegacyBarAttribute } from "./util/migrations";

declare global {
  interface DocumentClassConfig {
    Token: typeof LancerTokenDocument;
  }
  interface PlaceableObjectClassConfig {
    Token: typeof LancerToken;
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
          return { q: -c.s, r: -c.q, s: -c.r };
        })
    );
  }
}

function altOrientation(token: LancerToken): boolean {
  // @ts-expect-error
  const HSSisAltOrientation = game.modules.get("hex-size-support")?.api?.isAltOrientation;
  // @ts-expect-error
  if (!HSSisAltOrientation) return token.document.width === 2;
  return HSSisAltOrientation(token);
}

/**
 * Extend the base TokenDocument class to implement system-specific HP bar logic.
 * @extends {TokenDocument}
 */
export class LancerTokenDocument extends TokenDocument {
  // Called as part of foundry document initialization process. Fix malformed data.
  // When adding new code, do so at the bottom to reflect changes over time (in case order matters)
  static migrateData(source: any) {
    // Fix the standard bars individually
    if (source.bar1?.attribute?.includes("derived")) {
      source.bar1.attribute = correctLegacyBarAttribute(source.bar1.attribute);
    }
    if (source.bar2?.attribute?.includes("derived")) {
      source.bar2.attribute = correctLegacyBarAttribute(source.bar2.attribute);
    }

    // Fix bar brawlers
    if (source.flags?.barbrawl?.resourceBars) {
      let bb_data = source.flags.barbrawl;
      for (let bar of Object.values(bb_data.resourceBars) as Array<{ attribute: string | null }>) {
        if (bar.attribute?.includes("derived")) bar.attribute = correctLegacyBarAttribute(bar.attribute);
      }
    }

    // @ts-expect-error
    return super.migrateData(source);
  }
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
      if (canvas.grid?.isHex) {
        // @ts-expect-error
        const cube_space = HexagonalGrid.offsetToCube(
          // @ts-expect-error
          HexagonalGrid.pixelsToOffset(this.center, canvas.grid.grid.options),
          // @ts-expect-error
          canvas.grid.grid.options
        );
        const cubes = cubesBySize({
          // @ts-expect-error
          size: this.document.width,
          alt: altOrientation(this),
          columns: canvas.grid!.grid!.options.columns!,
        }).map(c => ({
          q: c.q + cube_space.q,
          r: c.r + cube_space.r,
          s: c.s + cube_space.s,
        }));
        this._spaces.spaces = cubes.map(c => {
          // @ts-expect-error
          const p = HexagonalGrid.offsetToPixels(
            // @ts-expect-error
            HexagonalGrid.cubeToOffset(c, canvas.grid.grid.options),
            // @ts-expect-error
            canvas.grid.grid.options
          );
          return { x: p.x + Math.floor(canvas.grid!.grid!.w / 2), y: p.y + Math.floor(canvas.grid!.grid!.h / 2) };
        });
      } else if (canvas.grid?.type === CONST.GRID_TYPES.SQUARE) {
        // @ts-expect-error
        for (let i = 0; i < this.document.width; ++i) {
          // @ts-expect-error
          for (let j = 0; j < this.document.height; ++j) {
            this._spaces.spaces.push({
              x: this.position.x + (i + 0.5) * canvas.grid.w,
              y: this.position.y + (j + 0.5) * canvas.grid.h,
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

// Make derived fields properly update their intended origin target
export function un_derive_attr_key(key: string) {
  // Cut the .derived, and also remove any trailing .value to resolve pseudo-bars
  let new_key = key.replace(/derived\./, "");
  return new_key.replace(/\.value$/, "");
}

// Makes calls to modify_token_attribute re-route to the appropriate field
export function fix_modify_token_attribute(data: any) {
  for (let key of Object.keys(data)) {
    // If starts with "data.derived", replace with just "data"
    if (key.includes("data.derived.")) {
      let new_key = un_derive_attr_key(key);
      data[new_key] = data[key];
      delete data[key];

      console.log(`Overrode assignment from ${key} to ${new_key}`);
    }
  }
}

declare global {
  interface FlagConfig {
    Token: {
      [game.system.id]?: {
        mm_size?: number | undefined;
      };
      "hex-size-support"?: {
        borderSize?: number;
        altSnapping?: boolean;
        evenSnap?: boolean;
        alwaysShowBorder?: boolean;
        alternateOrientation?: boolean;
        pivotx?: number;
        pivoty?: number;
      };
    };
  }
}
