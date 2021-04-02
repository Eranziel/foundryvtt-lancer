export const COLLAPSE_KEY = "collapse_state";
/** To make collapsible work on a sheet, that sheet must export as part of its getData() function an instance of this object,
 * under the key [COLLAPSE_KEY]
 * 
 */
export class CollapseHandler {
    private state: Map<string, boolean> = new Map();

    // Toggle the specified collapsible, returning new state
    toggle(id: string): boolean {
        let curr = this.state.get(id) ?? false;
        this.state.set(id, !curr);
        return !curr;
    }

    // Get whether a state should be expanded
    get(id: string) {
        return this.state.get(id) ?? false;
    }
}

/** Enables clicking any `collapse-ctrl` will collapse any `collapse-item` if they have the same `collapse-id`.
 * Collapse id only needs to be unique within descendants of the provided JQuery, so no need to get too fancy with those mechanisms
 */
export function HANDLER_activate_collapsibles(html: JQuery, handler: CollapseHandler) {
    // Perform initial state setting
    $(html).find(".collapse-item").each((index, _item) => {
        let item = $(_item);
        let id = item.attr("collapse-id") ?? "";
        if(handler.get(id)) {
            item.addClass("expanded");
        } else {
            item.addClass("collapsed");
        }
    });

    // Setup the event listener
    $(html).find(".collapse-ctrl").on("click", (evt) => {
        // Don't want other stuff to happen
        evt.preventDefault();
        evt.stopPropagation();

        // Toggle the handler such that classes will be set properly on re-draw
        let id = $(evt.currentTarget).attr("collapse-id") ?? "";
        let state = handler.toggle(id);

        // Set appropriate class on all items
        let selector = `.collapse-item[collapse-id="${id}"]`;
        if(state) {
            // Remove collapsed, add expanded.
            html.find(selector).removeClass("collapsed").addClass("expanded");
        } else {
            html.find(selector).removeClass("expanded").addClass("collapsed");
        }
    });
}