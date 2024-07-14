import { LancerActor } from "../actor/lancer-actor";
import { DamageType, EntryType, RangeType, SystemType, WeaponSize, WeaponType } from "../enums";
import { formatDotpath } from "../helpers/commons";
import { LancerItem } from "../item/lancer-item";
import { regRefToId, regRefToLid, regRefToUuid } from "../util/migrations";
import { FullBoundedNum, SourceData } from "../source-template";
import { SystemTemplates } from "../system-template";

// @ts-ignore
const fields: any = foundry.data.fields;

// @ts-expect-error
export class LancerDataModel<T> extends foundry.abstract.TypeDataModel<T> {
  /**
   * Create a full update payload, e.g. to preserve arrays
   * @param update_data the update data to apply
   */
  full_update_data(update_data: object): object {
    // @ts-expect-error
    let system = foundry.utils.duplicate(this._source);
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
    k = formatDotpath(k);

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

// Use this for all LIDs, to ensure consistent formatting, and to allow easier setting
export class LIDField extends fields.StringField {
  /** @override */
  _cast(value: any) {
    let rrtl = regRefToLid(value);
    if (rrtl) return rrtl;
    if (value.lid) value = value.lid;
    if (value.system?.lid) value = value.system.lid;
    console.warn("If passing an object as a value for an LIDField, object must have an `lid` or `system.lid` property");
    return value; // Don't overzealouisly fix
  }

  _validateType(value: any) {
    try {
      super._validateType(value);
    } catch (e) {
      // @ts-expect-error
      return new foundry.data.validation.DataModelValidationFailure({
        invalidValue: value,
        message: `Not a valid LID ${value}`,
      });
    }
  }
}

export class EmbeddedRefField extends fields.StringField {
  // The acceptable document.type's for this to resolve to. Null is any
  allowed_types: EntryType[] | null;

  /**
   * @param {StringFieldOptions} options  Options which configure the behavior of the field
   */
  constructor(
    readonly document_type: "Item" | "ActiveEffect",
    options: { allowed_types?: EntryType[] } & Record<string, any> = {}
  ) {
    super(options);
    this.allowed_types = options.allowed_types ?? null;
  }

  /** @inheritdoc */
  static get _defaults() {
    return foundry.utils.mergeObject(super._defaults, {
      initial: null,
      blank: false,
      trim: true,
      nullable: true,
    });
  }

  /** @override */
  _cast(value: any) {
    let rrti = regRefToId(this.document_type, value);
    if (rrti) return rrti;
    if (value?.id) value = value.id;
    if (value?.value !== undefined) value = value.value;
    if (value?.id) value = value.id; // Intentionally duplicated
    return value; // Don't overzealously fix
  }

  /** @inheritdoc */
  initialize(value: string | null, model: LancerDataModel<any>): null | SystemTemplates.ResolvedEmbeddedRef<any> {
    if (!value) return null;

    // Create shell
    let shell = {
      id: value,
    } as SystemTemplates.ResolvedEmbeddedRef<any>;

    // Create job
    model.add_pre_finalize_task(() => {
      let sub: LancerItem | ActiveEffect | null =
        // @ts-expect-error
        model?.parent?.getEmbeddedDocument(this.document_type, value) ?? null;
      if (!sub) {
        console.log("Failed to resolve embedded ref: ID not found.", model, value);
        shell.status = "missing";
        shell.value = null;
      } else if (this.allowed_types && sub instanceof LancerItem && !this.allowed_types.includes(sub.type)) {
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
    });

    // Return our shell, which will be filled by the above job
    return shell;
  }
}

// Similar to the foreignDocumentField, except untyped and supports uuids
// Supports only sync lookup
export class SyncUUIDRefField extends fields.StringField {
  // The acceptable document.type's for this to resolve to. Null is any
  allowed_types: string[] | null;

  /**
   * @param {StringFieldOptions} options  Options which configure the behavior of the field
   */
  constructor(
    readonly document_type: "Actor" | "Item",
    options: { allowed_types?: EntryType[] } & Record<string, any> = {}
  ) {
    super(options);
    this.allowed_types = options.allowed_types ?? null;
  }

  /** @inheritdoc */
  static get _defaults() {
    return foundry.utils.mergeObject(super._defaults, {
      initial: null,
      blank: false,
      trim: true,
      nullable: true,
    });
  }

  /** @override */
  _cast(value: any) {
    let rrtu = regRefToUuid(this.document_type, value);
    if (rrtu) return rrtu;
    if (value?.uuid) value = value.uuid;
    if (value?.value !== undefined) value = value.value;
    if (value?.uuid) value = value.uuid; // Intentionally duplicated
    return value; // Don't overzealously fix
  }

  /** @override */
  _validateType(value: any) {
    try {
      super._validateType(value);
      if (value) {
        //@ts-expect-error  Missing type
        foundry.utils.parseUuid(value);
        return true; // A definitive success
      }
    } catch (e) {
      // @ts-expect-error Missing type for this Failure
      return new foundry.data.validation.DataModelValidationFailure({
        invalidValue: value,
        message: `Not a valid uuid ${value}`,
      });
    }
  }

  /** @inheritdoc */
  initialize(value: string, model: any): null | SystemTemplates.ResolvedSyncUuidRef<any> {
    if (!value) return null;

    // Create shell
    let shell = {
      id: value,
    } as SystemTemplates.ResolvedSyncUuidRef<any>;

    // Create job
    model.add_pre_finalize_task(() => {
      let syncRes = fromUuidSync(value) as LancerActor | LancerItem;
      if (!syncRes) {
        console.error(`Failed to resolve uuid ref: Not found ${value}`, model, value);
        shell.status = "missing";
        shell.value = null;
      } else if (this.allowed_types && !this.allowed_types.includes(syncRes.type)) {
        console.error(
          `Failed to resolve uuid ref: Wrong type ${syncRes.type} not in ${this.allowed_types.join("|")}`,
          model,
          value
        );
        shell.status = "missing";
        shell.value = null;
      } else {
        // Sync resolved quickly and successfully
        shell.status = "resolved";
        // Set it as non enumerable to avoid circular issues
        Object.defineProperty(shell, "value", {
          value: syncRes,
          enumerable: false,
        });
      }
    });

    // Return our shell, which will be filled by the above job
    return shell;
  }
}

// Use this to represent a field that is effectively just a number, but should present as a min/max/value field in expanded `system` data
// This is 10% so we can show them with bars, and 90% because usually the max is computed and we don't want to confuse anyone
export class FakeBoundedNumberField extends fields.NumberField {
  constructor(options: object = {}) {
    super(options);
  }

  /** @override */
  initialize(value: number, model: any) {
    // Expand to a somewhat reasonable range. `prepareData` functions should handle the rest
    return {
      min: this.options?.min ?? 0,
      max: this.options?.max ?? 0,
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

export class FullBoundedNumberField extends fields.SchemaField {
  defaultValue: number = 10;
  defaultMax: number = 10;

  constructor(options: { min?: number; max?: number; initialValue?: number } = {}) {
    super(
      {
        min: new fields.NumberField({ integer: true, nullable: false, initial: options?.min ?? 0 }),
        max: new fields.NumberField({
          integer: true,
          nullable: false,
          initial: options?.max ?? FullBoundedNumberField.defaultMax,
        }),
        value: new fields.NumberField({ integer: true, nullable: false, initial: options?.initialValue ?? 0 }),
      },
      options
    );
  }

  /** @override */
  initialize(value: FullBoundedNum, model: any) {
    // Expand to a somewhat reasonable range. `prepareData` functions should handle the rest
    return {
      min: value.min ?? this.options?.min ?? 0,
      max: value.max ?? this.options?.max ?? value.value ?? FullBoundedNumberField.defaultMax,
      value: value.value ?? this.options?.initial ?? 0,
    };
  }

  /** @override */
  _cast(value: FullBoundedNum) {
    if (typeof value == "number") {
      value = { value, min: this.options?.min ?? 0, max: this.options?.max ?? FullBoundedNumberField.defaultMax };
    }
    if (typeof value == "string") {
      let strValue = FullBoundedNumberField.defaultValue;
      try {
        strValue = parseFloat(value);
      } catch (e) {
        console.warn(`Failed to parse number from string ${value}`);
      }
      value = {
        value: strValue,
        min: this.options?.min ?? 0,
        max: this.options?.max ?? FullBoundedNumberField.defaultMax,
      };
    }
    if (value.min == null || value.min == undefined) value.min = this.options?.min ?? 0;
    if (value.max == null || value.max == undefined)
      value.max = this.options?.max ?? value.value ?? FullBoundedNumberField.defaultMax;
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

export class SystemTypeChecklistField extends ChecklistField {
  constructor(options = {}) {
    super(SystemType, options);
  }
}

/** A single tier of npc stats */
export class NpcStatBlockField extends fields.SchemaField {
  constructor(options: { nullable: boolean }) {
    let nullable = options.nullable;
    super(
      {
        activations: new fields.NumberField({ integer: true, nullable, initial: nullable ? null : 1 }),
        armor: new fields.NumberField({ integer: true, nullable, initial: nullable ? null : 0 }),
        hp: new fields.NumberField({ integer: true, nullable, initial: nullable ? null : 10 }),
        evasion: new fields.NumberField({ integer: true, nullable, initial: nullable ? null : 5 }),
        edef: new fields.NumberField({ integer: true, nullable, initial: nullable ? null : 8 }),
        heatcap: new fields.NumberField({ integer: true, nullable, initial: nullable ? null : 5 }),
        speed: new fields.NumberField({ integer: true, nullable, initial: nullable ? null : 3 }),
        sensor_range: new fields.NumberField({ integer: true, nullable, initial: nullable ? null : 10 }),
        save: new fields.NumberField({ integer: true, nullable, initial: nullable ? null : 10 }),
        hull: new fields.NumberField({ integer: true, nullable, initial: nullable ? null : 0 }),
        agi: new fields.NumberField({ integer: true, nullable, initial: nullable ? null : 0 }),
        sys: new fields.NumberField({ integer: true, nullable, initial: nullable ? null : 0 }),
        eng: new fields.NumberField({ integer: true, nullable, initial: nullable ? null : 0 }),
        size: new fields.NumberField({ integer: false, nullable, minimum: 0.5, initial: nullable ? null : 1 }),
        structure: new fields.NumberField({ integer: true, nullable, initial: nullable ? null : 1 }),
        stress: new fields.NumberField({ integer: true, nullable, initial: nullable ? null : 1 }),
      },
      options
    );
  }
}

// Handles an additional "length" option, and mandates that it remain at that length
// If "overflow" option = truthy, then just forces there to be AT LEAST length
export class ControlledLengthArrayField extends fields.ArrayField {
  // Constructor demands options
  constructor(element: any, options: any) {
    super(element, options);
    if (!Number.isInteger(options.length))
      throw new TypeError("ControlledLengthArrayField requires an integer 'length' option!");
  }

  /** @override */
  _cast(value: any) {
    value = super._cast(value);
    if (!Array.isArray(value)) return value; // Give up early
    // Extend or contract as appropriate
    while (value.length < this.options.length) {
      let new_elt = typeof this.element.initial == "function" ? this.element.initial() : this.element.initial;
      value.push(foundry.utils.duplicate(new_elt));
    }
    if (!this.options.overflow && value.length > this.options.length) value = value.slice(0, this.options.length);
    return value;
  }
}

// Use this to track pending jobs while unpacking
export interface UnpackContext {
  createdDeployables: Array<{
    name: string;
    type: EntryType.DEPLOYABLE;
    system: DeepPartial<SourceData.Deployable>;
  }>;
  // Idk, do we really need anything else?
}
