// @ts-nocheck

const fields = foundry.data.fields;

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
class UUIDField extends StringField {
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
    if ( value instanceof foundry.abstract.Document && value.uuid ) return value.uuid;
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
    return Object.defineProperty(model, name, {
      get: () => this.model?.get(value) ?? null,
      set() {}, // no-op
      configurable: true
    });
  }

  /** @inheritdoc */
  toObject(model, name, value) {
    return value?._id ?? value
  }
}

// Use this to bound a string field to a particular set of string values
export class EnumField extends fields.StringField {
  valid_options: string[];

  constructor(valid_options: string[], options={}) {
    super(options);
    this.valid_options = valid_options;
  }

  /** @inheritdoc */
  static get _defaults() {
    return mergeObject(super._defaults, {
      required: true,
      nullable: false, // Something can simply decline to be referentiable
      trim: true
    });
  }

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
  _validateSpecial(value) {
      // Check that its in the list, and complain otherwise
      if(!this.valid_options.includes(value)) {
        throw new Error(`"${value}" is invalid. Must be one of [${this.valid_options.map(x => `"${x}"`).join(', ')}]`)
      } else {
        return true;
      }
  }
}

// export class BoundedNumberField