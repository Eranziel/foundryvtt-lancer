/**
 * A port of the spell template feature from DnD5e
 * https://gitlab.com/foundrynet/dnd5e/-/blob/master/module/pixi/ability-template.js
 */

/**
 * MeasuredTemplate sublcass to create a placeable template on weapon attacks
 */
export class WeaponRangeTemplate extends MeasuredTemplate {
    isBurst: boolean;

    constructor(params: any) {
        super(params)
        this.isBurst = params.isBurst;
    }

    /**
     * Creates a new WeaponRangeTemplate from a provided range
     */
    static fromRange({type, val, size = 1, position = {x: 0, y: 0}}: {type: string, val: number, size: number, position: any}): WeaponRangeTemplate | null {
        let hex: boolean = canvas.grid.type >= 2;

        let shape: string;
        switch (type) {
            case 'Cone':
                shape = 'cone';
                break;
            case 'Line':
                shape = 'ray';
                break;
            case 'Burst':
                if(hex) {
                    if (size === 2) val += 0.7 - (val > 2 ? 0.1 : 0);
                    if (size === 3) val += 1.2;
                    if (size === 4) val += 1.5;
                } else {
                    if (size === 2) val += .9;
                    if (size === 3) val += 1.4;
                    if (size === 4) val += 1.9;
                }
            case 'Blast':
                shape = 'circle';
                break;
            default:
                return null;
        }

        const scale = hex ? Math.sqrt(3)/2 : 1;
        const templateData = {
            t: shape,
            user: game.user._id,
            distance: (val + 0.1) * scale,
            width: scale,
            direction: 0,
            x: position.x,
            y: position.y,
            angle: 58,
            fillColor: game.user.color,
            isBurst: type === 'Burst',
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
            const snapped = this.snapToCenter(center);
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
        if (!this.isBurst) canvas.stage.on("mousemove", handlers.mm);
        canvas.stage.on("mousedown", handlers.lc);
        canvas.app.view.oncontextmenu = handlers.rc;
        canvas.app.view.onwheel = handlers.mw;
    }

    snapToCenter({x, y}: {x: number, y: number}): {x: number, y: number} {
        const snapped = canvas.grid.getCenter(x, y);
        return {x: snapped[0], y: snapped[1]};
    }
}
