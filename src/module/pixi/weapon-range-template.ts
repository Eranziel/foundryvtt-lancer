/**
 * A port of the spell template feature from DnD5e
 * https://gitlab.com/foundrynet/dnd5e/-/blob/master/module/pixi/ability-template.js
 */

/**
 * MeasuredTemplate sublcass to create a placeable template on weapon attacks
 * @extends MeasuredTemplate
 * @example
 * ```
 * WeaponRangeTemplate.fromRange({
 *     type: 'Cone',
 *     val: 5,
 * }).drawPreview();
 * ```
 */
export class WeaponRangeTemplate extends MeasuredTemplate {
  isBurst!: boolean;
  range!: { val: number; type: string };

  /**
   * Creates a new WeaponRangeTemplate from a provided range object
   * @param type Type of template
   * @param val Size of template
   */
  static fromRange({ type, val }: { type: string; val: number }): WeaponRangeTemplate | null {
    let hex: boolean = canvas.grid.type >= 2;

    let shape: string;
    switch (type) {
      case "Cone":
        shape = "cone";
        break;
      case "Line":
        shape = "ray";
        break;
      case "Burst":
      case "Blast":
        shape = "circle";
        break;
      default:
        return null;
    }

    const scale = hex ? Math.sqrt(3) / 2 : 1;
    const templateData = {
      t: shape,
      //@ts-ignore 0.8
      user: game.user.data.id,
      distance: (val + 0.1) * scale,
      width: scale,
      direction: 0,
      x: 0,
      y: 0,
      angle: 58,
      fillColor: game.user.color,
    };

    const cls = CONFIG.MeasuredTemplate.documentClass;
    const template = new cls(templateData, { parent: canvas.scene });
    const object = new this(template);
    object.range = { type, val };
    object.isBurst = type === "Burst";
    return object;
  }

  /**
   * Start placement of the template. Returns immediately, so cannot be used to
   * block until a template is placed.
   */
  drawPreview(): void {
    const initialLayer = canvas.activeLayer;
    this.draw();
    this.layer.activate();
    this.layer.preview.addChild(this);
    this.activatePreviewListeners(initialLayer);
  }

  activatePreviewListeners(initialLayer: PlaceablesLayer): void {
    const handlers: any = {};
    let moveTime = 0;

    // Update placement (mouse-move)
    handlers.mm = (event: MouseEvent) => {
      event.stopPropagation();
      let now = Date.now(); // Apply a 20ms throttle
      if (now - moveTime <= 20) return;
      //@ts-ignore 0.8
      const center = event.data.getLocalPosition(this.layer);
      let snapped = this.snapToCenter(center);

      if (this.isBurst) snapped = this.snapToToken(center);

      this.data.update({ x: snapped.x, y: snapped.y });
      this.refresh();
      moveTime = now;
    };

    // Cancel the workflow (right-click)
    handlers.rc = (_event: MouseEvent) => {
      this.layer.preview.removeChildren();
      canvas.stage.off("mousemove", handlers.mm);
      canvas.stage.off("mousedown", handlers.lc);
      canvas.app.view.oncontextmenu = null;
      canvas.app.view.onwheel = null;
      initialLayer.activate();
    };

    // Confirm the workflow (left-click)
    handlers.lc = (event: MouseEvent) => {
      handlers.rc(event);
      //@ts-ignore 0.8
      let destination = this.snapToCenter(event.data.getLocalPosition(this.layer));
      //@ts-ignore 0.8
      if (this.isBurst) destination = this.snapToToken(event.data.getLocalPosition(this.layer));
      this.data.update(destination);
      canvas.scene.createEmbeddedDocuments("MeasuredTemplate", [this.data]);
    };

    // Rotate the template by 3 degree increments (mouse-wheel)
    handlers.mw = (event: MouseEvent) => {
      if (event.ctrlKey) event.preventDefault(); // Avoid zooming the browser window
      event.stopPropagation();
      let delta = canvas.grid.type > CONST.GRID_TYPES.SQUARE ? 30 : 15;
      let snap = event.shiftKey ? delta : 5;
      //@ts-ignore 0.8
      this.data.update({ direction: this.data.direction + snap * Math.sign(event.deltaY) });
      this.refresh();
    };

    // Activate listeners
    canvas.stage.on("mousemove", handlers.mm);
    canvas.stage.on("mousedown", handlers.lc);
    canvas.app.view.oncontextmenu = handlers.rc;
    canvas.app.view.onwheel = handlers.mw;
  }

  /**
   * Snapping function to only snap to the center of spaces rather than corners.
   */
  snapToCenter({ x, y }: { x: number; y: number }): { x: number; y: number } {
    const snapped = canvas.grid.getCenter(x, y);
    return { x: snapped[0], y: snapped[1] };
  }

  /**
   * Snapping function to snap to the center of a hovered token. Also resizes
   * the template for bursts.
   */
  snapToToken({ x, y }: { x: number; y: number }): { x: number; y: number } {
    const token = canvas.tokens.placeables
      .filter((t: any) => {
        // test if cursor is inside token
        return t.x < x && t.x + t.w > x && t.y < y && t.y + t.h > y;
      })
      .reduce((r: any | null, t: any) => {
        // skip hidden tokens
        if (!t.visible) return r;
        // use the token that is closest.
        if (
          r === null ||
          r === undefined ||
          canvas.grid.measureDistance({ x, y }, t.center) <
            canvas.grid.measureDistance({ x, y }, r.center)
        )
          return t;
        else return r;
      }, null);
    if (token) {
      this.data.update({ distance: this.getBurstDistance(token.data.width) });
      return token.center;
    } else {
      this.data.update({ distance: this.getBurstDistance(1) });
      return this.snapToCenter({ x, y });
    }
  }

  /**
   * Get fine-tuned sizing data for Burst templates
   */
  getBurstDistance(size: number): number {
    const hex = canvas.grid.type > 1;
    const scale = hex ? Math.sqrt(3) / 2 : 1;
    let val = this.range.val;
    if (hex) {
      if (size === 2) val += 0.7 - (val > 2 ? 0.1 : 0);
      if (size === 3) val += 1.2;
      if (size === 4) val += 1.5;
    } else {
      if (size === 2) val += 0.9;
      if (size === 3) val += 1.4;
      if (size === 4) val += 1.9;
    }
    return (val + 0.1) * scale;
  }
}
