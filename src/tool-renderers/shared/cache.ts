import type { Theme } from "@earendil-works/pi-coding-agent";
import type { Component } from "@earendil-works/pi-tui";
import { hashString } from "../../cache/hash";
import { codePreviewSettings } from "../../settings/index";

let themeCacheIdCounter = 0;
const themeCacheIds = new WeakMap<object, number>();

export function cachedPreview(
  state: Record<string, unknown>,
  keyName: string,
  componentName: string,
  key: string,
  create: () => Component,
): Component {
  const cached = state[componentName];
  if (state[keyName] !== key || !cached || typeof (cached as Component).render !== "function") {
    state[keyName] = key;
    state[componentName] = create();
  }
  return state[componentName] as Component;
}

export function previewCacheKey(
  kind: string,
  source: string,
  path: string,
  expanded: boolean,
  theme: Theme,
): string {
  return [
    kind,
    path,
    expanded ? "expanded" : "collapsed",
    codePreviewSettings.shikiTheme,
    codePreviewSettings.syntaxHighlighting ? "syntax" : "plain",
    codePreviewSettings.diffIntensity,
    codePreviewSettings.wordEmphasis,
    String(codePreviewSettings.editCollapsedLines),
    themeCacheKey(theme),
    source.length,
    hashString(source),
  ].join("\0");
}

export function previewArgsKey(kind: string, source: string, path: string): string {
  return [kind, path, source.length, hashString(source)].join("\0");
}

function themeCacheKey(theme: Theme): string {
  const namedTheme = (theme as Theme & { name?: string }).name ?? "";
  if ((typeof theme !== "object" && typeof theme !== "function") || theme === null)
    return namedTheme;
  let id = themeCacheIds.get(theme);
  if (id === undefined) {
    id = ++themeCacheIdCounter;
    themeCacheIds.set(theme, id);
  }
  return `${namedTheme}\0theme:${id}`;
}
