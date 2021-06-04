import Auth from '@aws-amplify/auth';
import { populatePilotCache } from "../compcon";

export default class CompconLoginForm extends FormApplication {
  constructor(object: any, options = {}) {
    super(object, options);
  }
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      template: "systems/lancer/templates/window/compcon_login.hbs",
      width: 480,
      height: "auto",
      resizable: false,
      classes: ["lancer"],
      submitOnChange: false,
      submitOnClose: false,
      closeOnSubmit: false,
    })
  }

  /** @override */
  async _updateObject(_event: any, formData: any) {
    try {
      let res = await Auth.signIn(formData.username, formData.password);
      ui.notifications.info("Logged in as " + res.attributes.email);
      return this.close();
    } catch (e) {
      ui.notifications.error("Could not log in to Comp/Con: " + e.message);
    }
  }
}
