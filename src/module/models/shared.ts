import { DamageType, EntryType, RangeType, WeaponSize, WeaponType } from "../enums";
import { format_dotpath } from "../helpers/commons";
import { SystemTemplates } from "../system-template";

// @ts-ignore
const fields: any = foundry.data.fields;

const EMBEDDED_REF_WIP_MARKER = Symbol("EMBEDDED_REF_FIELD_MARKER");

// @ts-expect-error
export class LancerDataModel<T> extends foundry.abstract.DataModel<T> {
  // For you, sohum. Svelte it to your heart's content

  /**
   * Create a full update payload, e.g. to preserve arrays
   * @param update_data the update data to apply
   */
  full_update_data(update_data: object): object {
    // @ts-expect-error
    let system = this.toObject();
    return fancy_merge_data({ system }, update_data);
  }

  // A list of tasks to be called to finish up preparations on this model
  _pre_finalize_tasks!: Array<() => any>;

  /**
   * Add a job to this model to be called pre-finalize
   */
  add_pre_finalize_task(task: () => any) {
    this._pre_finalize_tasks.push(task);
  }

  /**
   * Call this in prepare data to finalize our jobs
   */
  finalize_tasks() {
    this._pre_finalize_tasks.forEach(x => x());
    this._pre_finalize_tasks = [];
  }

  // Have to override this to set up our tasks
  _initialize(...args: any) {
    this._pre_finalize_tasks = [];
    super._initialize(...args);
  }
}

/**
 * Merge data, except it handles arrays.
 *
 */
export function fancy_merge_data(full_source_data: any, update_data: any): any {
  if (full_source_data == null) throw new Error("Cannot merge with null or undefined - try again");
  if (
    typeof full_source_data == "number" ||
    typeof full_source_data == "string" ||
    typeof full_source_data == "boolean"
  ) {
    return update_data; // Handle in parent
  }
  for (let [k, v] of Object.entries(update_data)) {
    // Prepare for dotpath traversal
    k = format_dotpath(k);

    // Detect deletes
    let del = k.startsWith("-=");
    if (del) {
      k = k.slice(2);
    }

    // Detect dots
    let di = k.indexOf(".");
    if (di != -1) {
      if (del) {
        throw new Error("'-=' in dotpath must go at penultimate pathlet. E.x. 'system.whatever.-=val'");
      }

      // Dotpath - go recursive on that key
      let fore = k.slice(0, di);
      let aft = k.slice(di + 1);

      // Find existing value and branch on its existence
      let prior = full_source_data[fore];
      if (prior) {
        // Recursive
        full_source_data[fore] = fancy_merge_data(prior, { [aft]: v });
      } else {
        // New value at this location
        full_source_data[fore] = { [aft]: v };
      }
    } else {
      // Not a dotpath - assign/delete directly. Fairly trivial
      if (del) {
        if (Array.isArray(full_source_data)) {
          // Splice it
          full_source_data.splice(parseInt(k), 1);
        } else if (typeof full_source_data == "object") {
          // Delete it
          delete full_source_data[k];
        } else {
          // Unhandled type or nonexistant val
          console.warn("'-=' in update may only target Object or Array items");
        }
      } else {
        // Just assign it - simple as
        full_source_data[k] = v;
      }
    }
  }
  return full_source_data;
}

// Use this for all LIDs, to ensure consistent formatting
export class LIDField extends fields.StringField {
  /** @override */
  _cast(value: any) {
    if (value.lid) value = value.lid;
    if (value.system?.lid) value = value.system.lid;
    if (typeof value === "string") return value;
    throw new Error("Not a string or LID-posessing item: " + value);
  }
}

export class ResolvedEmbeddedRefField extends fields.StringField {
  // The acceptable document.type's for this to resolve to. Null is any
  allowed_types: EntryType[] | null;

  /**
   * @param {StringFieldOptions} options  Options which configure the behavior of the field
   */
  constructor(
    readonly embedded_collection: "Item" | "ActiveEffect",
    options: { allowed_types?: EntryType[] } & Record<string, any> = {}
  ) {
    super(options);
    this.allowed_types = options.allowed_types ?? null;
  }

  /** @inheritdoc */
  static get _defaults() {
    return mergeObject(super._defaults, {
      initial: null,
      blank: false,
      trim: true,
      nullable: true,
    });
  }

  /** @override */
  _cast(value: any) {
    if (value?.id) {
      value = value.id;
    }
    return String(value);
  }

  /** @inheritdoc */
  initialize(value: string | null, model: LancerDataModel<any>): null | SystemTemplates.ResolvedEmbeddedRef<any> {
    if (!value) return null;

    // Create shell
    let shell = {} as SystemTemplates.ResolvedEmbeddedRef<any>;

    // Create job
    model.add_pre_finalize_task(() => {
      if (value != null) {
        // @ts-expect-error
        let sub: LancerItem | ActiveEffect | null =
          model?.parent?.getEmbeddedDocument(this.embedded_collection, value) ?? null;
        if (!sub) {
          console.log("Failed to resolve embedded ref: ID not found.", model, value);
          shell.status = "missing";
          shell.value = null;
        } else if (this.allowed_types && !this.allowed_types.includes(sub.type)) {
          console.log(
            `Failed to resolve embedded ref: Wrong type ${sub.type} not in ${this.allowed_types.join("|")}`,
            model,
            value
          );
          shell.status = "missing";
          shell.value = null;
        } else {
          shell.status = "resolved";
          shell.value = sub;
        }
      }
    });

    // Return our shell, which will be filled by the above job
    return shell;
  }
}

// Similar to the foreignDocumentField, except untyped and supports uuids
// Supports both sync and async lookup
export class ResolvedUUIDRefField extends fields.StringField {
  // The acceptable document.type's for this to resolve to. Null is any
  allowed_types: string[] | null;

  /**
   * @param {StringFieldOptions} options  Options which configure the behavior of the field
   */
  constructor(options: { allowed_types?: EntryType[] } & Record<string, any> = {}) {
    super(options);
    this.allowed_types = options.allowed_types ?? null;
  }

  /** @inheritdoc */
  static get _defaults() {
    return mergeObject(super._defaults, {
      initial: null,
      blank: false,
      trim: true,
      nullable: true,
    });
  }

  /** @override */
  _cast(value: any) {
    if (value?.uuid) {
      value = value.uuid;
    }
    return String(value);
  }

  /** @override */
  _validateType(value: string | null) {
    try {
      if (value) {
        //@ts-expect-error  Missing type
        _parseUuid(value);
        return true; // A definitive success
      }
    } catch (e) {
      throw new Error("Not a valid uuid");
    }
  }

  /** @inheritdoc */
  initialize(value: string, model: any): null | SystemTemplates.ResolvedUuidRef<any> {
    if (value != null) {
      //@ts-expect-error missing type
      let sub = fromUuidSync(value);
      if (!sub) {
        return {
          status: "async",
          value: (async () => {
            let x = await fromUuid(value);
            if (!x) {
              // Retry once
              await new Promise((a, d) => setTimeout(a, 100));
              x = await fromUuid(value);
            }
            if (!x) return null;
            if (this.allowed_types && !this.allowed_types.includes((x as any).type)) {
              console.error(
                `Failed to resolve embedded ref: Wrong type ${(x as any).type} not in ${this.allowed_types.join("|")}`
              );
              return null;
            }
            return x;
          })(),
        };
      } else if (this.allowed_types && !this.allowed_types.includes(sub.type)) {
        console.error(
          `Failed to resolve embedded ref: Wrong type ${sub.type} not in ${this.allowed_types.join("|")}`,
          model,
          value
        );
        return {
          status: "missing",
          value: null,
        };
      } else {
        return {
          status: "resolved",
          value: sub,
        };
      }
    } else {
      return null;
    }
  }
}

// Use this to represent a field that is effectively just a number, but should present as a min/max/value field in expanded `system` data
export class FakeBoundedNumberField extends fields.NumberField {
  /** @override */
  initialize(value: string, model: any) {
    // Expand to a somewhat reasonable range. `prepareData` functions should handle the rest
    return {
      min: 0,
      max: value || 1,
      value,
    };
  }

  /** @override */
  _cast(value: any) {
    if (typeof value == "object") {
      value = value.value ?? 0;
    }
    return super._cast(value);
  }
}

// Schemafields for our type checklists
export class ChecklistField extends fields.SchemaField {
  constructor(target_enum: Record<string, string>, options = {}) {
    let scaffold: Record<string, any> = {};
    for (let val of Object.values(target_enum)) {
      scaffold[val] = new fields.BooleanField({ initial: true });
    }
    super(scaffold, options);
  }
}

export class DamageTypeChecklistField extends ChecklistField {
  constructor(options = {}) {
    super(DamageType, options);
  }
}

export class RangeTypeChecklistField extends ChecklistField {
  constructor(options = {}) {
    super(RangeType, options);
  }
}

export class WeaponTypeChecklistField extends ChecklistField {
  constructor(options = {}) {
    super(WeaponType, options);
  }
}
export class WeaponSizeChecklistField extends ChecklistField {
  constructor(options = {}) {
    super(WeaponSize, options);
  }
}
