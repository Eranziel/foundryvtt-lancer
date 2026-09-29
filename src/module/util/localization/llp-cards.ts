import { lookupFoundryTranslation, translationsReady, type TranslationRef } from "./llp-map";

export type LocaleFlag = {
  lid: string;
  fields: Record<string, string | TranslationRef>;
};

/**
 * Applies (or restores) translations to chat cards through the `renderChatMessageHTML` hook
 * @param message
 * @param html
 * @param _context
 * @remarks Unlike the other translation functions, the source translation needs to be installed for cards to return to the source translation locale
 */
export async function translateChatCard(
  message: ChatMessage.Implementation,
  html: HTMLElement,
  _context: ChatMessage.MessageData
): Promise<void> {
  const data = message.getFlag("lancer", "localeData");
  if (!data) return;

  await translationsReady; // Hold function until index is built

  // Tags
  const tags = html.querySelectorAll<HTMLElement>("[data-localize-tag]");
  if (tags) {
    translateChatTags(tags);
  }

  // LLP stuff
  const paths = html.querySelectorAll<HTMLElement>("[data-localize]");
  if (paths) {
    translateChatContents(paths, data);
  }

  // Foundry stuff
  const nativePaths = html.querySelectorAll<HTMLElement>("[data-localize-foundry]");
  if (nativePaths) {
    translateChatNative(nativePaths);
  }
}

/**
 *
 * @param contents - Localizable HTML elements
 */
function translateChatTags(tags: NodeListOf<HTMLElement>): void {
  for (const tag of tags) {
    const lid = tag.dataset.localizeTag;
    if (!lid) continue;

    const value = tag.dataset.tagValue ?? "?";
    const interpolateValue = (text: string) => text.replaceAll("{VAL}", value);
    const name = lookupFoundryTranslation(lid, "name");
    const description = lookupFoundryTranslation(lid, "description");

    const nameElement = tag.querySelector<HTMLElement>("[data-tag-name]");
    if (name && nameElement) nameElement.textContent = interpolateValue(name);

    if (description) {
      const localizedDescription = interpolateValue(description);
      tag.dataset.tooltip = localizedDescription;

      const descriptionElement = tag.querySelector<HTMLElement>("[data-tag-description]");
      if (descriptionElement) descriptionElement.textContent = localizedDescription;
    }
  }
}

/**
 *
 * @param tags - Array of HTML elements
 */
function translateChatContents(contents: NodeListOf<HTMLElement>, data: LocaleFlag): void {
  const translateContent = (element: HTMLElement, localeKey: string | undefined): void => {
    if (!localeKey) return;
    const translationPath = data.fields[localeKey]; // ... when combined gives us the localization subpath...
    if (!translationPath) return;

    const translation = lookupFoundryTranslation(data.lid, translationPath); // ... which we use with the localedata's LID to get the string
    if (translation) element.innerHTML = translation;
    console.log("TRANSLATE", data, localeKey, translationPath, translation);
  };

  for (const path of contents) {
    const subPaths = path.querySelectorAll<HTMLElement>("[data-localize-subpath]");
    if (subPaths.length) {
      // Resolve cards with subpaths like NPC reactions
      // TODO: test NPC reactions
      for (const subPath of subPaths) {
        translateContent(subPath, subPath.dataset.localizeSubpath);
      }
    } else {
      translateContent(path, path.dataset.localize); // `data-localize`/`data-localize-subpath` value correlates to a key in `localeData`...
    }
  }
}

/**
 *
 * @param nativeContents - Array of HTML elements
 */
function translateChatNative(nativeContents: NodeListOf<HTMLElement>): void {
  for (const element of nativeContents) {
    const localeKey = element.dataset.localizeFoundry;
    if (localeKey) element.textContent = game.i18n.localize(localeKey).toUpperCase();
  }
}
