# Foundry V13/V14 App Migration Audit

This document tracks app and sheet classes that still rely on V1 compatibility APIs and how we intend to handle each class while supporting both Foundry V13 and V14.

## Keep for compatibility (current release line)

- `src/module/actor/lancer-actor-sheet.ts` (`foundry.appv1.sheets.ActorSheet`)
- `src/module/item/item-sheet.ts` (`foundry.appv1.sheets.ItemSheet`)
- `src/module/apps/text-editor.ts` (`FormApplication`)
- `src/module/apps/targeted-form-editor.ts` (`FormApplication`)
- `src/module/helpers/compcon-login-form.ts` (`FormApplication`)
- `src/module/action/action-manager.ts` (`Application`)
- `src/module/helpers/svelte-application.ts` (`Application`)

These classes are stable and currently depend on existing templates/listeners. They remain in place for dual-version support and will be migrated opportunistically.

## Already migrated (ApplicationV2)

- `src/module/apps/lancer-initiative-config-form.ts`
- `src/module/apps/lcp-manager/lcp-manager.ts`
- `src/module/apps/action-tracker-settings.ts`
- `src/module/apps/automation-settings.ts`
- `src/module/apps/status-icon-config.ts`

No immediate migration action is required for these files.

## Migrate next (low-risk targets)

1. `src/module/helpers/compcon-login-form.ts`
   - Small isolated form app with limited lifecycle surface.
2. `src/module/apps/text-editor.ts`
   - Standalone editor UI that can move to `HandlebarsApplicationMixin(ApplicationV2)`.

## Defer (higher-risk targets)

1. `src/module/actor/lancer-actor-sheet.ts`
2. `src/module/item/item-sheet.ts`
3. `src/module/action/action-manager.ts`
4. `src/module/helpers/svelte-application.ts`

These are central interaction surfaces and should be migrated only with a dedicated QA pass for drag/drop, listeners, and sheet extension behavior.
