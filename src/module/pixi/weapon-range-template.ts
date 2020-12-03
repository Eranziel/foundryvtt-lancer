/**
 * A port of the spell template feature from DnD5e
 * https://gitlab.com/foundrynet/dnd5e/-/blob/master/module/pixi/ability-template.js
 */

/**
 * MeasuredTemplate sublcass to create a placeable template on weapon attacks
 */
export class WeaponRangeTemplate extends MeasuredTemplate {

    /**
     * Creates a new WeaponRangeTemplate from a provided range
     */
    static fromRange(range: any): WeaponRangeTemplate | null {
        // TODO: Burst for size > 1

        let shape: string;
        switch (range.type) {
            case 'Cone':
                shape = 'cone';
                break;
            case 'Blast':
            case 'Burst':
                shape = 'circle';
                break;
            default:
                return null;
        }

        // TODO: Only scale on hex grids
        const scale = Math.sqrt(3)/2;
        const templateData = {
            t: shape,
            user: game.user._id,
            distance: (range.val + 0.1) * scale,
            direction: 0,
            x: 0,
            y: 0,
            angle: 58,
            fillColor: game.user.color,
        }
        return new this(templateData);
    }

    drawPreview(): void {
        const initialLayer = canvas.activeLayer;
        this.draw();
        this.layer.activate();
        this.layer.preview.addChild(this);
        this.activatePreviewListeners(initialLayer);
    }

    activatePreviewListeners(initialLayer: any): void {
        const handlers: any = {};
        let moveTime = 0;
        // Update placement (mouse-move)
        handlers.mm = (event: any) => {
            event.stopPropagation();
            let now = Date.now(); // Apply a 20ms throttle
            if ( now - moveTime <= 20 ) return;
            const center = event.data.getLocalPosition(this.layer);
            // TODO: New snapping logic for hexes
            const snapped = canvas.grid.getSnappedPosition(center.x, center.y, 2);
            this.data.x = snapped.x;
            this.data.y = snapped.y;
            this.refresh();
            moveTime = now;
        };

        // Cancel the workflow (right-click)
        handlers.rc = () => {
            this.layer.preview.removeChildren();
            canvas.stage.off("mousemove", handlers.mm);
            canvas.stage.off("mousedown", handlers.lc);
            canvas.app.view.oncontextmenu = null;
            canvas.app.view.onwheel = null;
            initialLayer.activate();
        };

        // Confirm the workflow (left-click)
        handlers.lc = (event: any) => {
            handlers.rc(event);

            // Confirm final snapped position
            const destination = canvas.grid.getSnappedPosition(this.x, this.y, 2);
            this.data.x = destination.x;
            this.data.y = destination.y;

            // Create the template
            canvas.scene.createEmbeddedEntity("MeasuredTemplate", this.data);
        };

             // Rotate the template by 3 degree increments (mouse-wheel)
        handlers.mw = (event: any) => {
            if ( event.ctrlKey ) event.preventDefault(); // Avoid zooming the browser window
            event.stopPropagation();
            let delta = canvas.grid.type > CONST.GRID_TYPES.SQUARE ? 30 : 15;
            let snap = event.shiftKey ? delta : 5;
            this.data.direction += (snap * Math.sign(event.deltaY));
            this.refresh();
        };

        // Activate listeners
        canvas.stage.on("mousemove", handlers.mm);
        canvas.stage.on("mousedown", handlers.lc);
        canvas.app.view.oncontextmenu = handlers.rc;
        canvas.app.view.onwheel = handlers.mw;
    }
}
