interface TerrainType {
  id: string;
  name: string;
  usesHeight: boolean;
  textRotation: boolean;
  lineType: 0 | 1 | 2;
  lineWidth: number;
  lineColor: string;
  lineOpacity: number;
  lineDashSize: number;
  lineGapSize: number;
  fillType: number;
  fillColor: string;
  fillOpacity: number;
  fillTexture: string;
  textFormat: string;
  font: string;
  textSize: number;
  textColor: string;
  textOpacity: number;
}

/**
 * Represents a line segment, from `p1` to `p2`.
 * LineSegments are considered equal regardless of 'direction'. I.E. p1 vs p2 order does not matter.
 */
declare class LineSegment {
  constructor(p1: Point | { x: number; y: number }, p2: Point | { x: number; y: number });

  /**
   * Creates a LineSegment from a pair of x,y coordinates.
   */
  static fromCoords(x1: number, y1: number, x2: number, y2: number): LineSegment;

  /** Determines if this line segment is pointing in a clockwise direction. */
  get clockwise(): boolean;

  get dx(): number;

  get dy(): number;

  get slope(): number;

  get angle(): number;

  get lengthSquared(): number;

  get length(): number;

  equals(other: LineSegment): boolean;

  /**
   * Determines if this LineSegment is parallel to another LineSegment, ignoring the direction of the lines.
   */
  isParallelTo(other: LineSegment): boolean;

  /**
   * Determines the `t` value for this LineSegment for the closest point on the line to the given point and the square
   * distance from the given point to that point.
   * Note the given value for `t` may NOT be within the range 0-1 (i.e. the length of the line is ignored, only it's
   * position and angle have any bearing on the result).
   * The returned `side` will be either +1 or -1, depending on which side of the line the point is on, or 0 if the
   * point lies exactly on the line.
   */
  findClosestPointOnLineTo(
    x: number,
    y: number
  ): { t: number; point: { x: number; y: number }; distanceSquared: number; side: number };

  /**
   * Gets the Y position that this line segment intersects a vertical line at `x`. Returns undefined if this line is
   * vertical or does not pass the given `x` position.
   */
  intersectsXAt(x: number): number | undefined;

  /**
   * Gets the X poisition that this line segmnet intersects a horizontal line at `y`. Returns undefined if this line
   * is horizontal or does not pass the given `y` position.
   */
  intersectsYAt(y: number): number | undefined;

  /**
   * Gets the X and Y position that this line segment intersects another line segment, as well as the relative
   * distance along each line segmnet that the intersection occured.
   *
   * The returned `t` value is how far along 'this' line segment the intersection point is at:
   * - 0 means that the intersection is at this.p1.
   * - 1 means that the intersection is at this.p2.
   * - Another value (which will be between 0-1) means it proportionally lies along the line segment.
   *
   * The returned `u` value is the equivalent of `t` but for the 'other' line segment.
   *
   * Returns undefined if the line segments do not intersect.
   * Parallel lines are never considered to intersect.
   */
  intersectsAt(other: LineSegment): { x: number; y: number; t: number; u: number } | undefined;

  /**
   * Linearly interpolates the X,Y position of a point that is at `t` along the line.
   */
  lerp(t: number): { x: number; y: number };

  /**
   * Linearly interpolates the X,Y position of a point that is at `t` along the specified line.
   */
  static lerp(x1: number, y1: number, x2: number, y2: number, t: number): { x: number; y: number };

  /**
   * Works out the interior angle between this line segment and another line segment.
   * This makes the assumption `other` starts where `this` ends and the polygon is defined clockwise.
   * @returns A value in range [0, 2PI)
   */
  angleBetween(other: LineSegment): number;

  /**
   * Determines if this LineSegment is angled between the two given edges. It is assumed that these edges have a common
   * vertex, i.e. edge1 starts where edge2 ends, or edge2 starts where edge1 ends. It is also assumed that this segment
   * passes between that vertex also.
   */
  isBetween(edge1: LineSegment, edge2: LineSegment): boolean;

  /**
   * Creates the LineSegment that represents this inverse of this LineSegment.
   */
  inverse(): LineSegment;

  toString(): string;
}

declare class Polygon {
  constructor(vertices?: ({ x: number; y: number } | Point)[]);

  get vertices(): readonly Point[];

  get edges(): readonly LineSegment[];

  get centroid(): readonly [number, number];

  /**
   * Pushes a vertex to the end of the polygon.
   * @param x The X coordinate of the point or a Point object to add.
   * @param y The Y coordinate of the point or undefined.
   */
  pushVertex(x: number | Point | { x: number; y: number }, y?: number | undefined): void;

  /**
   * Determines whether this polygon contains another polygon.
   */
  containsPolygon(other: Polygon): boolean;

  /**
   * Determines if a point is within the bounds of this polygon.
   */
  containsPoint(
    x: number,
    y: number,
    {
      containsOnEdge,
    }: {
      /**
       * When true (default), a point that falls exactly on an edge of this
       * polygon will be treated as inside the polygon. If false, that point
       * would be treated as being outside.
       */
      containsOnEdge: boolean;
    }
  ): boolean;

  /**
   * Finds the edge that comes before the given edge. If the given edge is the first edge, will return the last edge.
   * If the given edge does not exist in this polygon, returns `undefined`.
   */
  previousEdge(edge: LineSegment): LineSegment | undefined;

  /**
   * Finds the edge that comes after the given edge. If the given edge is the last edge, will return the first edge.
   * If the given edge does not exist in this polygon, returns `undefined`.
   */
  nextEdge(edge: LineSegment): LineSegment | undefined;

  /**
   * Traverses the edges in the polygon, starting at the given edge in the given direction. Does not repeat or yield
   * the original 'startEdge'.
   * @param startEdge The edge to begin traversal from.
   * @param direction The direction of travel. 1 for forwards, -1 for backwards.
   */
  *traverseEdges(startEdge: LineSegment, direction: 1 | -1): Generator<LineSegment, void, void>;

  /**
   * Finds the mid of point of all given vertices.
   */
  static centroid(vertices: { x: number; y: number }[]): { x: number; y: number };
}

/**
 * Represents a shape that can be drawn to the map. It is a closed polygon that may
 * have one or more holes within it.
 */
interface HeightMapShape {
  /**
   * The polygon that makes up the perimeter of this shape.
   */
  polygon: Polygon;
  /**
   * Other additional polygons that make holes in this shape.
   */
  holes: Polygon[];
  terrainTypeId: string;
  height: number;
  elevation: number;
}

interface LineOfSightIntersection {
  x: number;
  y: number;
  t: number;
  u: number;
  edge: LineSegment | undefined;
  hole: Polygon | undefined;
}

interface Point3D {
  x: number;
  y: number;
  h: number;
}

/** An object detailing the region of an intersection of a line of sight
 * ray and a shape on the height map.
 */
interface LineOfSightIntersectionRegion {
  /**
   * The start position of the intersection region.
   */
  start: { x: number; y: number; h: number; t: number };
  /**
   * The end position of the intersection region.
   */
  end: { x: number; y: number; h: number; t: number };
  /**
   * Did this intersection region "skim" the shape - i.e. just barely touched the edge of the
   * shape rather than entering it completely.
   */
  skimmed: boolean;
}

export interface TerrainHeightToolsAPI {
  /**
   * Attempts to find a terrain type with the given name or ID.
   * @param  terrain The terrain to search for.
   */
  getTerrainType(
    terrain:
      | {
          /**
           * The ID of the terrain type to find. Either this or `name` must be provided.
           */
          id: string;
          /**
           * The name of the terrain type to find. Either this or `id` must be provided.
           */
          name?: string;
        }
      | {
          /**
           * The ID of the terrain type to find. Either this or `name` must be provided.
           */
          id?: string;
          /**
           * The name of the terrain type to find. Either this or `id` must be provided.
           */
          name: string;
        }
  ): TerrainType | undefined;

  /**
   * Gets the terrain data at the given grid coordinates.
   */
  getCell(x: number, y: number): { terrainTypeId: string; height: number } | undefined;

  /**
   * Paints the target cells on the current scene with the provided terrain data.
   * @param cells The grid cells to paint as [X,Y] coordinate pairs. The cells do not have to be
   * connected.
   * @param  terrain The terrain options to use when painting the cells.
   */
  paintCells(
    cells: [number, number][],
    terrain:
      | {
          /**
           * The ID of the terrain type to use. Either this or `name` must be provided.
           */
          id?: string;
          /**
           * The name of the terrain type to use. Either this or `id` must be provided.
           */
          name: string;
          height?: number;
          elevation?: number;
        }
      | {
          /**
           * The ID of the terrain type to use. Either this or `name` must be provided.
           */
          id: string;
          /**
           * The name of the terrain type to use. Either this or `id` must be provided.
           */
          name?: string;
          /**
           * If the terrain type uses heights, the height to paint on these cells.
           */
          height?: number;
          /**
           * If the terrain type uses heights, the elevation (how high off the ground) to paint these cells.
           */
          elevation?: number;
        },
    {
      overwrite,
    }: {
      /**
       * Whether or not to overwrite already-painted cells with the new
       * terrain data.
       */
      overwrite?: boolean;
    } = {}
  ): Promise<boolean>;

  /**
   * Erases terrain height data from the given cells on the current scene.
   */
  eraseCells(cells: [number, number][]): Promise<boolean>;

  /**
   * Calculates the line of sight between the two given pixel coordinate points and heights.
   * Returns an array of all shapes that were intersected, along with the regions where those shapes were intersected.
   * @param p1 The first point, where `x` and `y` are pixel coordinates.
   * @param p2 The second point, where `x` and `y` are pixel coordinates.
   * @param Options that change how the calculation is done.
   */
  calculateLineOfSight(
    p1: { x: number; y: number; h: number },
    p2: { x: number; y: number; h: number },
    options?: {
      /**
       * If true, terrain types that are configured as not using a height value
       * will be included in the return list. They are treated as having
       * infinite height.
       */
      includeNoHeightTerrain?: boolean;
    }
  ): (LineOfSightIntersectionRegion & { terrainTypeId: string; height: number })[];

  /**
   * Calculates the line of sight between the two given pixel coordinate points and heights.
   * Returns an array of all shapes that were intersected, along with the regions where those shapes were intersected.
   * @param p1 The first point, where `x` and `y` are pixel coordinates.
   * @param p2 The second point, where `x` and `y` are pixel coordinates.
   * @param Options that change how the calculation is done.
   */
  calculateLineOfSightByShape(
    p1: { x: number; y: number; h: number },
    p2: { x: number; y: number; h: number },
    options?: {
      /**
       * If true, terrain types that are configured as not using a height value
       * will be included in the return list. They are treated as having
       * infinite height.
       */
      includeNoHeightTerrain?: boolean;
    }
  ): {
    shape: HeightMapShape;
    regions: LineOfSightIntersectionRegion[];
  };

  /**
   * Calculates the start and end points of line of right rays between two tokens. One from the left-most point of token1
   * to the left-most point of token2, one from centre to centre, and one between the right-most points.
   * @param token1 The first token to draw line of sight from.
   * @param  token2 The second token to draw line of sight to.
   * @param  options Options that change how the calculation is done.
   */
  calculateLineOfSightRaysBetweenTokens(
    token1: Token,
    token2: Token,
    {
      token1RelativeHeight,
      token2RelativeHeight,
    }: {
      /**
       * How far the ray starts vertically relative to token1. The height is
       * calculated as `token1.elevation + (token1RelativeHeight × token1.size)`.
       * If undefined, uses the world-configured default value.
       */
      token1RelativeHeight: number | undefined;
      /**
       * How far the ray ends vertically relative to token2. The height is
       * calculated as `token2.elevation + (token2RelativeHeight * token2.size)`.
       * If undefined, uses the world-configured default value.
       */
      token2RelativeHeight: number | undefined;
    }
  ): {
    left: { p1: left[0]; p2: left[1] };
    centre: { p1: centre[0]; p2: centre[1] };
    right: { p1: right[0]; p2: right[1] };
  };

  /**
   * Calculates and draws a line of sight ray between the given points.
   * Note that this will clear all previously drawn lines, INCLUDING those drawn by the tools in the side bar.
   * @param p1 The first point (where the line is drawn from).
   * @param p2 The second point (where the line is drawn to).
   * @param Options that change for the lines are drawn.
   */
  drawLineOfSightRay(
    p1: Point3D,
    p2: Point3D,
    options?: {
      /**
       * Whether to draw these rays for other users connected to the game.
       */
      drawForOthers?: boolean;
      /**
       * If true, terrain types that are configured as not using a height value
       * will be included in the drawn line. They are treated as having infinite
       * height.
       */
      includeNoHeightTerrain?: boolean;
      /**
       * Whether height labels are shown at the start and end of the ruler.
       */
      showLabels?: boolean;
    }
  ): void;

  /**
   * Calculates and draws any number of line of sight rays between the given points.
   * Note that this will clear all previously drawn lines, INCLUDING those drawn by the tools in the side bar.
   */
  drawLineOfSightRays(
    rays: ({
      p1: Point3D;
      p2: Point3D;
    } & { drawForOthers?: boolean; showLabels?: boolean })[],
    { drawForOthers = true } = {}
  ): void;

  /**
   * Calculates and draws line of sight rays between two tokens, as per the
   * token line of sight tool.
   * Note that currently only one set of lines can be drawn, attempting to draw
   * any other lines of sight will clear these lines, INCLUDING those drawn by
   * the tools in the side bar.
   * @param token1 The first token to draw line of sight from.
   * @param token2 The second token to draw line of sight to.
   * @param options Options that change how the calculation is done.
   */
  drawLineOfSightRaysBetweenTokens(
    token1: Token,
    token2: Token,
    options?: {
      /**
       * How far the ray starts vertically relative to token1. The height is
       * calculated as `token1.elevation + (token1RelativeHeight × token1.size)`.
       * If undefined, uses the world-configured default value.
       */
      token1RelativeHeight?: number;
      /**
       * How far the ray ends vertically relative to token2. The height is
       * calculated as `token2.elevation + (token2RelativeHeight × token2.size)`.
       * If undefined, uses the world-configured default value.
       */
      token2RelativeHeight?: number;
      /**
       * If true, terrain types that are configured as not using a height value
       * will be included in the return list. They are treated as having
       * infinite height.
       */
      includeNoHeightTerrain?: boolean;
      /**
       * Whether to draw these rays for other users connected to the game.
       */
      drawForOthers?: boolean;
    }
  ): void;
  /**
   * Removes all lines of sight drawn by this user, INCLUDING those drawn by the tools in the side bar.
   */
  clearLineOfSightRays(): void;
}
