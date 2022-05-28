// @ts-nocheck

const fields = foundry.data.fields;

export class LancerDataModel extends foundry.abstract.DataModel {
  // For you, sohum. Svelte it to your heart's content
}

// Use this for all LIDs, to ensure consistent formatting
export class LIDField extends fields.StringField {
  /** @override */
  _cast(value) {
    if (value.lid) value = value.lid;
    if (value.system?.lid) value = value.system.lid;
    if ( typeof value === "string" ) return value;
    throw new Error("Not a string or LID-posessing item: " + value);
  }
}

// Similar to the foreignDocumentField, except untyped and supports uuids
// Supports both sync and async lookup
export class UUIDField extends StringField {
  /** @inheritdoc */
  static get _defaults() {
    return mergeObject(super._defaults, {
      required: true,
      blank: false,
      nullable: true,
      initial: null,
      readonly: true
    });
  }

  /** @override */
  _cast(value) {
    if ( typeof value == "object" && value.uuid) return value.uuid;
    else return String(value);
  }

  /** @override */
  _validateType(value) {
    try {
      if(value) {
        _parseUuid(value);
        return true; // A definitive success
      }
    } catch (e) {
      throw new Error("Not a valid uuid");
    }
  }

  /** @inheritdoc */
  initialize(model, name, value) {
    // if ( this.idOnly ) return value;
    // if ( !game.collections ) return value; // server-side
    let rv = {
      uuid: value,
      doc_async: () => fromUuid(value),
    };
    Object.defineProperty(rv, "doc_sync", {
      get: () => {
        let v = fromUuidSync(value);
        if( !(value instanceof foundry.abstract.Document) ) {
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
  _cast(value) {
    let value = super._cast(value);
    if( this.valid_options.includes(value) ) {
      return value;
    } else {
      return this.valid_options[0];
    }
  }  
  
  /** @override */
  initialize(model, name, value: number) {
    // Expand to a somewhat reasonable range. `prepareData` functions should handle the rest
    return {
      min: this.min,
      max: this.max || value || 1,
      value
    }
  }

  /** @override */
  _cast(value) {
    if(typeof value == "object") {
      value = value.value ?? 0;
    }
    return Number(value);
  }
}

// Use for HP, etc
export interface BoundedValue {
  min: number;
  max: number;
  value: number;
}

