const fields: any = foundry.data.fields;

// @ts-expect-error
export class LancerDataModel<T> extends foundry.abstract.DataModel<T> {
  // For you, sohum. Svelte it to your heart's content
}

// Use this for all LIDs, to ensure consistent formatting
export class LIDField extends fields.StringField {
  /** @override */
  _cast(value: any) {
    if (value.lid) value = value.lid;
    if (value.system?.lid) value = value.system.lid;
    if ( typeof value === "string" ) return value;
    throw new Error("Not a string or LID-posessing item: " + value);
  }
}

// Similar to the foreignDocumentField, except untyped and supports uuids
// Supports both sync and async lookup
export class UUIDRefField extends fields.StringField {
  // The acceptable document.type's for this to resolve to
  // Null is wildcard
  accepted_types: string[] | null;

  constructor(accepted_types?: string[], options={}) {
    super(options);
    this.accepted_types = accepted_types ?? null;
  }

  /** @inheritdoc */
  static get _defaults() {
    return mergeObject(super._defaults, {
      required: true,
      blank: false,
      nullable: true,
      initial: null,
      readonly: true,
      validationError: "is not a valid Document UUID string"
    });
  }

  /** @override */
  _cast(value: any) {
    if ( typeof value == "object" && value.uuid) {
      // 
      return value.uuid;
    } else if( value === null) {
      return value;
    } else {
       return String(value);
    }
  }

  /** @override */
  _validateType(value: string | null) {
    try {
      if(value) {
        //@ts-expect-error  Missing type
        _parseUuid(value);
        return true; // A definitive success
      }
    } catch (e) {
      throw new Error("Not a valid uuid");
    }
  }

  /** @inheritdoc */
  initialize(model: unknown, name: string, value: string | null) {
    // if ( this.idOnly ) return value;
    // if ( !game.collections ) return value; // server-side
    let rv = {
      uuid: value,
      doc_async: () => value ? fromUuid(value) : null,
    };
    Object.defineProperty(rv, "doc_sync", {
      get: () => {
        //@ts-expect-error missing type
        let v = fromUuidSync(value);
        if( !(v instanceof foundry.abstract.Document) ) {
          v = null; // It was a compendium reference. Stinky!
        }
        return v;
      },
      set() {}, // no-op
      configurable: false
    });
    return rv;
  }
}

// Use this to represent a field that is effectively just a number, but should present as a min/max/value field in expanded `system` data
export class BoundedNumberField extends fields.NumberField {
  /** @override */
  initialize(model: unknown, name: string, value: number) {
    // Expand to a somewhat reasonable range. `prepareData` functions should handle the rest
    return {
      min: this.min,
      max: this.max || value || 1,
      value
    }
  }

  /** @override */
  _cast(value: any) {
    if(typeof value == "object") {
      value = value.value ?? 0;
    }
    return super._cast(value);
  }
}

// Use for HP, etc
export interface BoundedValue {
  min: number;
  max: number;
  value: number;
}

