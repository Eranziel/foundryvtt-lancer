import type { AnyDocument } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/client/data/abstract/client-document.mjs";
import type {
  AnyObject,
  DeepPartial,
  EmptyObject,
  SimpleMerge,
} from "@league-of-foundry-developers/foundry-vtt-types/src/types/utils.mjs";
import { LancerActor } from "../actor/lancer-actor";
import { DamageType, EntryType, RangeType, SystemType, WeaponSize, WeaponType } from "../enums";
import { formatDotpath } from "../helpers/commons";
import { LancerItem } from "../item/lancer-item";
import { FullBoundedNum, SourceData } from "../source-template";
import { SystemTemplates } from "../system-template";
import { regRefToId, regRefToLid, regRefToUuid } from "../util/migrations";
import fields = foundry.data.fields;

export class LancerDataModel<
  Schema extends DataSchema,
  Parent extends AnyDocument,
  BaseData extends AnyObject = EmptyObject,
  DerivedData extends AnyObject = EmptyObject
> extends foundry.abstract.TypeDataModel<Schema, Parent, BaseData, DerivedData> {
  /**
   * Create a full update payload, e.g. to preserve arrays
   * @param update_data the update data to apply
   */
  full_update_data(update_data: object): object {
    const system = foundry.utils.duplicate(this._source);
    return fancy_merge_data({ system }, update_data);
  }

  prepareBaseData() {
    this.finalize_tasks();
  }

  // These are a workaround for the UUID ref fields
  // Initialization happens too early
  // TODO: Evaluate whether this is still needed or if this can be moved to the
  // initialize method of the field

  // A list of tasks to be called to finish up preparations on this model
  private _pre_finalize_tasks: Array<() => any> | undefined;

  /**
   * Add a job to this model to be called pre-finalize
   */
  add_pre_finalize_task(task: () => any) {
    this._pre_finalize_tasks ??= [];
    this._pre_finalize_tasks.push(task);
  }

  /**
   * Call this in prepare data to finalize our jobs
   */
  finalize_tasks() {
    this._pre_finalize_tasks?.forEach(x => x());
    this._pre_finalize_tasks = [];
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
    const del = k.startsWith("-=");
    if (del) {
      k = k.slice(2);
    }

    // Detect dots
    const di = k.indexOf(".");
    if (di != -1) {
      if (del) {
        throw new Error("'-=' in dotpath must go at penultimate pathlet. E.x. 'system.whatever.-=val'");
      }

      // Dotpath - go recursive on that key
      const fore = k.slice(0, di);
      const aft = k.slice(di + 1);

      // Find existing value and branch on its existence
      const prior = full_source_data[fore];
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
    const rrtl = regRefToLid(value);
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
      return new foundry.data.validation.DataModelValidationFailure({
        invalidValue: value,
        message: `Not a valid LID ${value}`,
      });
    }
  }
}

declare namespace EmbeddedRefField {
  interface Options extends StringFieldOptions {
    allowed_types?: EntryType[];
  }
}

export class EmbeddedRefField extends fields.StringField<
  EmbeddedRefField.Options,
  fields.StringField.AssignmentType<EmbeddedRefField.Options>,
  SystemTemplates.ResolvedEmbeddedRef<any> | null
> {
  // The acceptable document.type's for this to resolve to. Null is any
  allowed_types: EntryType[] | null;

  /**
   * @param {StringFieldOptions} options  Options which configure the behavior of the field
   */
  constructor(readonly document_type: "Item" | "ActiveEffect", options: EmbeddedRefField.Options = {}) {
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
    const rrti = regRefToId(this.document_type, value);
    if (rrti) return rrti;
    if (value?.id) value = value.id;
    if (value?.value !== undefined) value = value.value;
    if (value?.id) value = value.id; // Intentionally duplicated
    return value; // Don't overzealously fix
  }

  /** @inheritdoc */
  initialize(
    value: fields.StringField.InitializedType<EmbeddedRefField.Options>,
    model: LancerDataModel<any, any>
  ): null | SystemTemplates.ResolvedEmbeddedRef<any> {
    super.initialize;
    if (!value) return null;

    // Create shell
    const shell = {
      id: value,
    } as SystemTemplates.ResolvedEmbeddedRef<any>;

    // Create job
    model.add_pre_finalize_task(() => {
      const sub: LancerItem | ActiveEffect | null =
        model?.parent?.getEmbeddedDocument(this.document_type, value) ?? null;
      if (!sub) {
        console.log("Failed to resolve embedded ref: ID not found.", model, value);
        shell.status = "missing";
        shell.value = null;
      } else if (
        this.allowed_types &&
        sub instanceof LancerItem &&
        !this.allowed_types.includes(sub.type as EntryType)
      ) {
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

declare namespace SyncUUIDRefField {
  interface Options extends StringFieldOptions {
    allowed_types?: EntryType[];
  }
}

// Similar to the foreignDocumentField, except untyped and supports uuids
// Supports only sync lookup
export class SyncUUIDRefField extends fields.StringField<
  SyncUUIDRefField.Options,
  fields.StringField.AssignmentType<SyncUUIDRefField.Options>,
  SystemTemplates.ResolvedSyncUuidRef<any> | null
> {
  // The acceptable document.type's for this to resolve to. Null is any
  allowed_types: string[] | null;

  /**
   * @param {StringFieldOptions} options  Options which configure the behavior of the field
   */
  constructor(readonly document_type: "Actor" | "Item", options: SyncUUIDRefField.Options = {}) {
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
    const rrtu = regRefToUuid(this.document_type, value);
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
        foundry.utils.parseUuid(value);
        return true; // A definitive success
      }
    } catch (e) {
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
    const shell = {
      id: value,
    } as SystemTemplates.ResolvedSyncUuidRef<any>;

    // Create job
    model.add_pre_finalize_task(() => {
      const syncRes = fromUuidSync(value) as LancerActor | LancerItem;
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

declare namespace FakeBoundedNumberField {
  interface Options extends NumberFieldOptions {}
  type DefaultOptions = SimpleMerge<
    fields.NumberField.DefaultOptions,
    {
      integer: true;
      nullable: false;
      initial: number;
    }
  >;
  type InitializedType = {
    min: number;
    max: number;
    value: number;
  };
}
// Use this to represent a field that is effectively just a number, but should present as a min/max/value field in expanded `system` data
// This is 10% so we can show them with bars, and 90% because usually the max is computed and we don't want to confuse anyone
export class FakeBoundedNumberField<
  Options extends FakeBoundedNumberField.Options = FakeBoundedNumberField.DefaultOptions
> extends fields.NumberField<
  Options,
  fields.NumberField.AssignmentType<Options>,
  FakeBoundedNumberField.InitializedType
> {
  constructor(options: Options = {} as any) {
    super(options);
  }

  /** @override */
  initialize(value: number, _model: any) {
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

declare namespace FullBoundedNumberField {
  interface Options extends fields.SchemaField.Options<Fields> {
    min?: number;
    max?: number;
    initialValue?: number;
  }
  interface Fields extends DataSchema {
    min: fields.NumberField<{}>;
    max: fields.NumberField<{}>;
    value: fields.NumberField<{}>;
  }
}
export class FullBoundedNumberField extends fields.SchemaField<
  FullBoundedNumberField.Fields,
  FullBoundedNumberField.Options
> {
  static defaultValue: number = 10;
  static defaultMax: number = 10;

  constructor(options: FullBoundedNumberField.Options = {}) {
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
  initialize(value: FullBoundedNum, _model: any) {
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

declare namespace ChecklistField {
  type Field<T extends Record<string, string>> = {
    [K in T[keyof T]]: fields.BooleanField<{ initial: true }>;
  };
  interface Options<T extends Record<string, string>> extends fields.SchemaField.Options<Field<T>> {}
}
// Schemafields for our type checklists
export class ChecklistField<List extends Record<string, string>> extends fields.SchemaField<
  ChecklistField.Field<List>,
  ChecklistField.Options<List>
> {
  constructor(target_enum: List, options: ChecklistField.Options<List> = {}) {
    const scaffold: ChecklistField.Field<List> = {} as any;
    for (let val of Object.values(target_enum)) {
      // @ts-expect-error
      scaffold[val] = new fields.BooleanField({ initial: true });
    }
    super(scaffold, options);
  }
}

export class DamageTypeChecklistField extends ChecklistField<typeof DamageType> {
  constructor(options: ChecklistField.Options<typeof DamageType> = {}) {
    super(DamageType, options);
  }
}

export class RangeTypeChecklistField extends ChecklistField<typeof RangeType> {
  constructor(options: ChecklistField.Options<typeof RangeType> = {}) {
    super(RangeType, options);
  }
}

export class WeaponTypeChecklistField extends ChecklistField<typeof WeaponType> {
  constructor(options: ChecklistField.Options<typeof WeaponType> = {}) {
    super(WeaponType, options);
  }
}
export class WeaponSizeChecklistField extends ChecklistField<typeof WeaponSize> {
  constructor(options: ChecklistField.Options<typeof WeaponSize> = {}) {
    super(WeaponSize, options);
  }
}

export class SystemTypeChecklistField extends ChecklistField<typeof SystemType> {
  constructor(options: ChecklistField.Options<typeof SystemType> = {}) {
    super(SystemType, options);
  }
}

declare namespace NpcStatBlockField {
  interface Fields extends DataSchema {
    activations: fields.NumberField<{}>;
    armor: fields.NumberField<{}>;
    hp: fields.NumberField<{}>;
    evasion: fields.NumberField<{}>;
    edef: fields.NumberField<{}>;
    heatcap: fields.NumberField<{}>;
    speed: fields.NumberField<{}>;
    sensor_range: fields.NumberField<{}>;
    save: fields.NumberField<{}>;
    hull: fields.NumberField<{}>;
    agi: fields.NumberField<{}>;
    sys: fields.NumberField<{}>;
    eng: fields.NumberField<{}>;
    size: fields.NumberField<{}>;
    structure: fields.NumberField<{}>;
    stress: fields.NumberField<{}>;
  }
  interface Options extends fields.SchemaField.Options<Fields> {}
}
/** A single tier of npc stats */
export class NpcStatBlockField extends fields.SchemaField<NpcStatBlockField.Fields, NpcStatBlockField.Options> {
  constructor(options: NpcStatBlockField.Options) {
    const nullable = options.nullable;
    super(
      {
        activations: new fields.NumberField({ integer: true, nullable, initial: nullable ? null : 1 }),
        armor: new fields.NumberField({ integer: true, nullable, initial: nullable ? null : 0 }),
        hp: new fields.NumberField({ integer: true, nullable, initial: nullable ? null : 10 }),
        evasion: new fields.NumberField({ integer: true, nullable, initial: nullable ? null : 5 }),
        edef: new fields.NumberField({ integer: true, nullable, initial: nullable ? null : 8 }),
        heatcap: new fields.NumberField({ integer: true, nullable, initial: nullable ? null : 0 }),
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

declare namespace ControlledLengthArrayField {
  interface Options<ElementType> extends fields.ArrayField.Options<ElementType> {
    length: number;
    overflow?: boolean | undefined;
  }
}

// Handles an additional "length" option, and mandates that it remain at that length
// If "overflow" option = truthy, then just forces there to be AT LEAST length
export class ControlledLengthArrayField<
  ElementField extends fields.DataField.Any,
  AssignmentElementField = fields.ArrayField.AssignmentElementType<ElementField>,
  InitializedElementType = fields.ArrayField.InitializedElementType<ElementField>
> extends fields.ArrayField<
  ElementField,
  AssignmentElementField,
  InitializedElementType,
  ControlledLengthArrayField.Options<AssignmentElementField>
> {
  // Constructor demands options
  constructor(element: ElementField, options: ControlledLengthArrayField.Options<AssignmentElementField>) {
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
      const new_elt = typeof this.element.initial == "function" ? this.element.initial() : this.element.initial;
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
