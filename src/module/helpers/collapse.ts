export const COLLAPSE_KEY = "collapse_state";
/** To make collapsible work on a sheet, that sheet must export as part of its getData() function an instance of this object,
 * under the key [COLLAPSE_KEY]
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
  $(html)
    .find(".collapse-item")
    .each((_index, item) => {
      let id = $(item).attr("collapse-id") ?? "";
      if (handler.get(id)) {
        $(item).addClass("expanded");
      } else {
        $(item).addClass("collapsed");
      }
    });

  // Setup the event listener
  $(html)
    .find(".collapse-ctrl")
    .on("click", evt => {
      // Don't want other stuff to happen
      evt.preventDefault();
      evt.stopPropagation();

      // Toggle the handler such that classes will be set properly on re-draw
      let id = $(evt.currentTarget).attr("collapse-id") ?? "";
      let state = handler.toggle(id);

      // Set appropriate class on all items
      let selector = `.collapse-item[collapse-id="${id}"]`;
      if (state) {
        // Remove collapsed, add expanded.
        html.find(selector).removeClass("collapsed").addClass("expanded");
      } else {
        html.find(selector).removeClass("expanded").addClass("collapsed");
      }
    });
}

// V2
/**
 * Generalized collapse activator
 */
export function applyCollapseListeners() {
  const query = document.querySelectorAll(".collapse-trigger");
  query.forEach(dom => {
    dom.removeEventListener("click", handleCollapse);
    dom.addEventListener("click", handleCollapse);
  });
  console.log("Reapplying collapse listeners...");
}

const handleCollapse = (ev: Event) => {
  ev.stopPropagation();

  let prefix = `lancer-collapse`;
  // On click, find matching collapse, and toggle collapsed class.
  let store = (ev.currentTarget as Element).getAttribute("data-collapse-store");
  let id = (ev.currentTarget as Element).getAttribute("data-collapse-id");

  let collapse = document.querySelector(`.collapse[data-collapse-id="${id}"]`);
  if (collapse?.classList.contains("collapsed")) {
    collapse.classList.remove("collapsed");
    store && sessionStorage.setItem(`${prefix}-${store}-${id}`, "opened");
  } else {
    collapse?.classList.add("collapsed");
    store && sessionStorage.setItem(`${prefix}-${store}-${id}`, "closed");
  }
  // console.debug(collapse);
};

// Trusty uuid gen.
export function uuid4(): string {
  // @ts-ignore Uhhh
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
    // tslint:disable-next-line:no-bitwise
    (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
  );
}
