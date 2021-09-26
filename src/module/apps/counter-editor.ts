import { Counter } from "machine-mind";
import { gentle_merge, resolve_dotpath } from "../helpers/commons";

/**
* A helper Dialog subclass for editing a counter
* @extends {Dialog}
*/
export class CounterEditDialog<O> extends Dialog {
    // The counter we're editing
    counter: Counter;
       
    // Where it is
    path: string;
    
    constructor(target: O, path: string, dialogData: Dialog.Data, options: Partial<Dialog.Options> = {}) {
        super(dialogData, options);
        this.path = path;
        this.counter = resolve_dotpath(target, path);
    }
    
    /* -------------------------------------------- */
    
    /** @override */
    static get defaultOptions(): Dialog.Options {
        return {
            ...super.defaultOptions,
            template: `systems/${game.system.id}/templates/window/counter.hbs`,
            width: 400,
            height: "auto",
            classes: ["lancer"],
        };
    }
    
    /** @override
    * Expose our data
    */
    getData(): any {
        return {
            ...super.getData(),
            counter: this.counter,
            path: this.path,
        };
    }
    
    /* -------------------------------------------- */
    
    /**
    * A helper constructor function which displays the bonus editor and returns a Promise once it's
    * workflow has been resolved.
    * @param {Actor5e} actor
    * @return {Promise}
    */
    static async edit_counter<T>(
        in_object: T,
        at_path: string,
        commit_callback: () =>  Promise<void>
        ): Promise<void> {
            return new Promise((resolve, _reject) => {
                const dlg = new this(in_object, at_path, {
                    title: "Edit Counter",
                    content: "",
                    buttons: {
                        confirm: {
                            icon: '<i class="fas fa-save"></i>',
                            label: "Save",
                            callback: html => {
                                // Idk how to get form data - FormData doesn't work :(
                                // Just collect inputs manually
                                let flat_data: any = {};
                                $(html)
                                .find("input")
                                .each((_i, elt) => {
                                    // Retrieve input info
                                    let name = elt.name;
                                    let val: boolean | string;
                                    if (elt.type == "text") {
                                        val = elt.value;
                                    } else if (elt.type == "checkbox") {
                                        val = elt.checked;
                                    } else {
                                        return;
                                    }
                                    
                                    // Add to form
                                    flat_data[name] = val;
                                });
                                
                                // Do the merge
                                gentle_merge(in_object, flat_data);
                                resolve(Promise.resolve(commit_callback()));
                            },
                        },
                        cancel: {
                            icon: '<i class="fas fa-times"></i>',
                            label: "Cancel",
                            callback: () => resolve(),
                        },
                    },
                    default: "confirm",
                    close: () => resolve(),
                });
                dlg.render(true);
            });
        }
    }
