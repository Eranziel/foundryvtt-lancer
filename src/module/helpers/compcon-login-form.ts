import { populatePilotCache } from "../util/compcon";

export default class CompconLoginForm extends FormApplication {
  constructor(object?: any, options = {}) {
    super(object, options);
  }
  static get defaultOptions(): FormApplication.Options {
    return {
      ...super.defaultOptions,
      template: `systems/${game.system.id}/templates/window/compcon_login.hbs`,
      width: 480,
      height: "auto",
      resizable: false,
      classes: ["lancer"],
      submitOnChange: false,
      submitOnClose: false,
      closeOnSubmit: false,
      title: "COMP/CON Login",
    };
  }

  /** @override */
  async _updateObject(_event: any, formData: any) {
    const { signIn } = await import("@aws-amplify/auth");

    try {
      //FIRST attempt to login with case sensitivity
      await signIn({
        username: formData.username,
        password: formData.password,
      });
    } catch (e) {
      try {
        //SECOND attempt to login with case insensitivity
        await signIn({
          //username will be converted to lowercase to make emails case insensitive
          username: formData.username.toLocaleLowerCase(),
          password: formData.password,
        });
      } catch (e) {
        // AWS-amplify doesn't throw Errors for no apparent reason so ignore types and try our best
        ui.notifications!.error(`Could not log in to Comp/Con: ${(e as any)?.message ?? e}`);
        console.error(e);
        return;
      }
    }

    ui.notifications!.info("Logged in as " + formData.username);
    // we have a fresh login token, let's populate the pilot cache
    // no need to block on it, it can happen in the background
    populatePilotCache();
    return this.close();
  }
}
