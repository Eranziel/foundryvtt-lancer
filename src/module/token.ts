declare global {
  interface DocumentClassConfig {
    Token: typeof LancerTokenDocument;
  }
}

/**
 * Extend the base TokenDocument class to implement system-specific HP bar logic.
 * @extends {TokenDocument}
 */
export class LancerTokenDocument extends TokenDocument {
  /** @inheritdoc */
  getBarAttribute(barName: string, { alternative }: { alternative?: string | undefined } | undefined = {}) {
    let result = super.getBarAttribute(barName, { alternative });
    if (result && !result.editable) {
      const attr = result.attribute;
      if (attr.includes("derived.")) {
        let new_key = un_derive_attr_key(attr);
        // Get the model, and see if it _should_ be editable
        const model = game.system.model.Actor[this.actor!.type];
        result.editable = hasProperty(model!, new_key);
      }
    }
    return result;
  }
}
/**
 * Extend the base Token class to implement additional system-specific logic.
 * @extends {Token}
 */
export class LancerToken extends Token {}

// Make derived fields properly update their intended origin target
export function un_derive_attr_key(key: string) {
  // Cut the .derived, and also remove any trailing .value to resolve pseudo-bars
  let new_key = key.replace(/derived\./, "");
  return new_key.replace(/\.value$/, "");
}

// Makes calls to modify_token_attribute re-route to the appropriate field
export function fix_modify_token_attribute(data: any) {
  for (let key of Object.keys(data)) {
    // If starts with "data.derived", replace with just "data"
    if (key.includes("data.derived.")) {
      let new_key = un_derive_attr_key(key);
      data[new_key] = data[key];
      delete data[key];

      console.log(`Overrode assignment from ${key} to ${new_key}`);
    }
  }
}
