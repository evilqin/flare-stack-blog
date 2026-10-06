import type { HighlighterCore } from "shiki/core";
import { PLAIN_TEXT, resolveCodeLanguage } from "@/lib/code-languages";
import { plainCodeHtml } from "@/lib/plain-code-html";

const themes = {
  light: "vitesse-light",
  dark: "vitesse-dark",
} as const;

let highlighterPromise: Promise<HighlighterCore> | null = null;

async function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = (async () => {
      // Lazy-load shiki core / engine / themes so they never ship in the
      // critical client bundle. Public pages render pre-highlighted HTML from
      // the server and never call getHighlighter; only the admin editor and
      // server-side processing do, at which point this chunk loads on demand.
      const [{ createHighlighterCore }, { createJavaScriptRegexEngine }, viteDark, viteLight] =
        await Promise.all([
          import("shiki/core"),
          import("shiki/engine/javascript"),
          import("shiki/themes/vitesse-dark.mjs"),
          import("shiki/themes/vitesse-light.mjs"),
        ]);

      // Customizing the background color of vitesse-dark to remove the greenish tint
      // using Zinc-900 (#18181b) to match the dark mode UI
      const customViteDark = {
        ...viteDark,
        bg: "#18181b",
        name: "vitesse-dark", // Ensure name matches
      };

      return createHighlighterCore({
        themes: [customViteDark, viteLight],
        langs: [],
        engine: createJavaScriptRegexEngine(),
      });
    })();
  }
  return highlighterPromise;
}

async function loadLanguage(lang: string) {
  const language = resolveCodeLanguage(lang);
  if (!language) return undefined;

  const highlighter = await getHighlighter();
  if (!highlighter.getLoadedLanguages().includes(language.id)) {
    const langModule = await language.load();
    await highlighter.loadLanguage(...langModule.default);
  }
  return language.id;
}

export async function highlight(code: string, lang: string) {
  const safeLang = (await loadLanguage(lang)) ?? PLAIN_TEXT;
  const highlighter = await getHighlighter();

  try {
    return highlighter.codeToHtml(code, {
      lang: safeLang,
      themes: {
        dark: themes.dark,
        light: themes.light,
      },
    });
  } catch (e) {
    console.warn(`Failed to highlight language: ${lang}`, e);
    return plainCodeHtml(code);
  }
}
