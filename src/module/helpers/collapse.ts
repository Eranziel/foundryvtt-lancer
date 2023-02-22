import { LancerActor } from "../actor/lancer-actor";
import { LancerItem } from "../item/lancer-item";

export type CollapseRegistry = { [LID: string]: number };

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

/**Generate a UID for the given collapse item
 *
 * */

/**
 * Generate a unique id for the given collapse item
 * @param collapse Collapse ID registry to operate in
 * @param doc The document / id we are generating a new ID based off of
 * @param no_inc Whether we should re-use the previous index, if one exists. This allows consecutively generated IDs to be aliased to each other - they will collapse each other
 */
export function collapseID(
  collapse: CollapseRegistry,
  doc: string | LancerActor | LancerItem | null | undefined,
  no_inc: boolean
): string {
  // On sheet, enable collapse.
  let doc_id: string;
  if (doc instanceof foundry.abstract.Document) {
    doc_id = doc.id ?? "ephem";
  } else if (typeof doc == "string") {
    doc_id = doc;
  } else {
    doc_id = "uncat";
  }
  if (collapse[doc_id] == undefined) collapse[doc_id] = 0;
  let collapse_index: number;
  if (no_inc) {
    collapse_index = collapse[doc_id];
  } else {
    collapse_index = ++collapse[doc_id];
  }
  return `${doc_id}_${collapse_index}`;
}

/**
 * Generates a button for toggling collapse state of a thing. To be used in conjuncture with collapseParam
 * @param collapse G
 * @param doc
 * @param no_increment
 * @returns
 */
export function collapseButton(
  collapse: CollapseRegistry | undefined | null,
  doc?: string | LancerActor | LancerItem | null,
  no_increment: boolean = false
) {
  if (collapse) {
    return `<i class="mdi mdi-unfold-less-horizontal collapse-trigger collapse-icon" data-collapse-id="${collapseID(
      collapse,
      doc,
      no_increment
    )}"> </i>`;
  }
  return "";
}

export function collapseParam(
  collapse: CollapseRegistry | undefined | null,
  doc?: string | LancerActor | LancerItem | null,
  no_increment: boolean = false
) {
  if (collapse) {
    return `data-collapse-id="${collapseID(collapse, doc, no_increment)}"`;
  }
  return "";
}

// V2
/**
 * Generalized collapse activator
 */
export function applyCollapseListeners(html: JQuery) {
  html.find(".collapse-trigger").on("click", handleCollapse);
}

const handleCollapse = (ev: Event) => {
  ev.stopPropagation();

  let prefix = `lancer-collapse`;
  // On click, find matching collapse, and toggle collapsed class.
  let id = (ev.currentTarget as Element).getAttribute("data-collapse-id");

  let collapse = document.querySelector(`.collapse[data-collapse-id="${id}"]`);
  if (collapse?.classList.contains("collapsed")) {
    collapse.classList.remove("collapsed");
    sessionStorage.setItem(`${prefix}-${id}`, "opened");
  } else {
    collapse?.classList.add("collapsed");
    sessionStorage.setItem(`${prefix}-${id}`, "closed");
  }
  // console.debug(collapse);
};

export function initializeCollapses(html: JQuery) {
  let collapse_sections = html.find(".collapse");
  // Init according to session store.
  collapse_sections.each((_index, section) => {
    let id = section.getAttribute("data-collapse-id");
    if (id) {
      let ssv = sessionStorage.getItem("lancer-collapse-" + id);
      if (ssv == "opened") {
        section.classList.remove("collapsed");
      } else if (ssv == "closed") {
        section.classList.add("collapsed");
      }
    }
  });
}

// Trusty uuid gen.
export function uuid4(): string {
  // @ts-ignore Uhhh
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
    // tslint:disable-next-line:no-bitwise
    (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
  );
}
