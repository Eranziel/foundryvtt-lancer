declare global {
  interface DocumentClassConfig {
    Token: typeof LancerTokenDocument;
  }
  interface PlaceableObjectClassConfig {
    Token: typeof LancerToken;
  }
}

/**
 * Extend the base TokenDocument class to implement system-specific HP bar logic.
 * @extends {TokenDocument}
 */
export class LancerTokenDocument extends TokenDocument {
  /** @inheritdoc */
  getBarAttribute(barName: string, { alternative }: { alternative?: string | undefined } | undefined = {}) {
    let result = super.getBarAttribute(barName, { alternative });
    if (result && !result.editable) {
      const attr = result.attribute;
      if (attr.includes("derived.")) {
        let new_key = un_derive_attr_key(attr);
        // Get the model, and see if it _should_ be editable
        const model = game.system.model.Actor[this.actor!.type];
        result.editable = hasProperty(model!, new_key);
      }
    }
    return result;
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
    if (Math.floor(pos.x) !== Math.floor(this._spaces.at.x) || Math.floor(pos.y) !== Math.floor(this._spaces.at.y)) {
      this._spaces.at = { ...pos };
      this._spaces.spaces = [];
    }

    if (this._spaces.spaces.length === 0 && canvas?.grid?.type !== CONST.GRID_TYPES.GRIDLESS) {
      let hitBox: PIXI.IHitArea;
      if (this.hitArea instanceof PIXI.Polygon) {
        let poly_points: number[] = [];
        for (let i = 0; i < this.hitArea.points.length - 1; i += 2) {
          poly_points.push(this.hitArea.points[i] + pos.x, this.hitArea.points[i + 1] + pos.y);
        }
        hitBox = new PIXI.Polygon(poly_points);
      } else if (this.hitArea instanceof PIXI.Rectangle) {
        hitBox = new PIXI.Rectangle(pos.x, pos.y, this.hitArea.width, this.hitArea.height);
      } else {
        // TODO, handle all possible hitArea shapes
        return this._spaces.spaces.map(p => ({ ...p }));
      }

      // Get token grid coordinate
      const [tx, ty] = canvas.grid!.grid?.getGridPositionFromPixels(pos.x, pos.y)!;

      // TODO: Gridless isn't handled, probably split this off to two utility
      // functions that handle gridded vs gridless properly
      for (let i = tx - 1; i <= tx + this.width + 1; i++) {
        for (let j = ty - 1; j <= ty + this.height + 1; j++) {
          let pos = { x: 0, y: 0 };
          [pos.x, pos.y] = canvas.grid!.grid!.getPixelsFromGridPosition(i, j);
          [pos.x, pos.y] = canvas.grid!.getCenter(pos.x + 1, pos.y + 1);
          if (hitBox.contains(pos.x, pos.y)) this._spaces.spaces.push(pos);
        }
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
