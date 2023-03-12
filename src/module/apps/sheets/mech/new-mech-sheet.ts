import { SvelteApplication } from "@typhonjs-fvtt/runtime/svelte/application";
import { TJSDocument } from "@typhonjs-fvtt/runtime/svelte/store";

import MechSheetApp from "./MechSheetApp.svelte";
import { LancerActor } from "../../../actor/lancer-actor.js";

export default class MechSheetV2 extends SvelteApplication {
  constructor(actor: LancerActor, options = {}) {
    super({
      svelte: {
        props: {
          actor: new TJSDocument(actor),
        },
      },
    });
  }

  /**
   * Default Application options
   */
  static get defaultOptions() {
    /*
      const buttons: = [
         { title: 'Hello Foundry', class: HelloFoundryApplication },
         { title: 'Header Buttons', class: HeaderButtonsApplication },
         { title: 'Reactive Document (Basic)', class: BasicDocumentApp },
         { title: 'Reactive Embedded Collections', class: EmbeddedDocApplication },
         { title: 'Chat Message', onPress: () => new TJSDialog(
             {
                title: 'Essential Svelte (ESM) - Chat Message',
                content: ChatDialogContent
             }, {
                id: 'essential-esm-chat-dialog',
                classes: ['tjs-essential-svelte-esm']
             })
         },
         { title: 'Position (Basic Overlay)', class: PositionBasicOverlayApp },
         { title: 'Position (App)', class: PositionApplication },
         { title: 'Position (Box)', class: PositionBoxApplication },
         { title: 'Position (Carousel)', class: PositionCarouselApp },
         { title: 'App State (Client Setting)', class: AppStateClientSettingApp },
         { title: 'App State (Session Storage)', class: AppStateSessionApp },
         { title: 'Content Editable', class: ContentEditableApp },
         { title: 'TinyMCE', class: TinyMCEApp }
      ];
         */

    //buttons.push({ title: 'ProseMirror', class: ProseMirrorApp });

    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "essential-svelte-esm",
      classes: ["lancer", "sheet", "actor", "mech"],
      headerButtonNoClose: true,
      resizable: false,
      minimizable: true,
      popOut: false,
      width: 800,
      height: "auto",
      positionOrtho: false,
      transformOrigin: null,
      title: "NEW MECH SHEET",
      zIndex: 95,

      /*
      tabs: [
        {
          navSelector: ".lancer-tabs",
          contentSelector: ".sheet-body",
          initial: "stats",
        },
      ],
      */

      svelte: {
        class: MechSheetApp,
        target: document.body,
        intro: true,
        props: {
          // buttons
        },
      },
    });
  }
}
