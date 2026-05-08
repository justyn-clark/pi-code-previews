import type { Theme } from "@mariozechner/pi-coding-agent";
import { Container, truncateToWidth, visibleWidth, type Component } from "@mariozechner/pi-tui";
import {
  countLabel,
  hiddenLinesMarker,
  selectPreviewLines,
  selectPreviewTextLines,
} from "../format.ts";
import { positiveEnvInteger } from "../env.ts";
import { hashString } from "../hash.ts";
import { getSecretWarnings } from "../secret-warnings.ts";
import { codePreviewSettings, type ToolCallBackgroundMode } from "../settings.ts";
import { renderHighlightedText } from "../shiki.ts";
import { escapeControlChars } from "../terminal-text.ts";

const SECRET_SCAN_CHARS = positiveEnvInteger("CODE_PREVIEW_SECRET_SCAN_CHARS", 200_000);

interface PreviewRenderContext<TState, TArgs> {
  args: TArgs;
  toolCallId: string;
  invalidate: () => void;
  lastComponent: Component | undefined;
  state: TState;
  cwd: string;
  executionStarted: boolean;
  argsComplete: boolean;
  isPartial: boolean;
  expanded: boolean;
  showImages: boolean;
  isError: boolean;
}

export interface CodePreviewToolShell {
  renderShell: "default" | "self";
  renderCall<TState, TArgs>(
    context: PreviewRenderContext<TState, TArgs>,
    theme: Theme,
    render: (context: PreviewRenderContext<TState, TArgs>) => Component,
  ): Component;
  renderResult<TState, TArgs>(
    context: PreviewRenderContext<TState, TArgs>,
    theme: Theme,
    render: (context: PreviewRenderContext<TState, TArgs>) => Component,
  ): Component;
}

export function createCodePreviewToolShell(
  mode: ToolCallBackgroundMode = codePreviewSettings.toolCallBackground,
): CodePreviewToolShell {
  return {
    renderShell: codePreviewRenderShell(mode),
    renderCall: (context, theme, render) => renderCodePreviewCall(mode, context, theme, render),
    renderResult: (context, theme, render) => renderCodePreviewResult(mode, context, theme, render),
  };
}

export function codePreviewRenderShell(
  mode: ToolCallBackgroundMode = codePreviewSettings.toolCallBackground,
): "default" | "self" {
  return mode === "on" ? "default" : "self";
}

function renderCodePreviewCall<TState, TArgs>(
  mode: ToolCallBackgroundMode,
  context: PreviewRenderContext<TState, TArgs>,
  theme: Theme,
  render: (context: PreviewRenderContext<TState, TArgs>) => Component,
): Component {
  if (mode !== "border") return render(context);
  const state = borderState(context);
  const callComponent = render(withLastComponent(context, state.codePreviewBorderCallComponent));
  state.codePreviewBorderCallComponent = callComponent;
  const shell =
    state.codePreviewBorderShell instanceof BorderedToolCall &&
    state.codePreviewBorderTheme === theme
      ? state.codePreviewBorderShell
      : new BorderedToolCall(theme);
  shell.setBorderColor(borderColorKey(context));
  shell.setCall(callComponent);
  shell.setResult(state.codePreviewBorderResultComponent);
  state.codePreviewBorderShell = shell;
  state.codePreviewBorderTheme = theme;
  return shell;
}

function renderCodePreviewResult<TState, TArgs>(
  mode: ToolCallBackgroundMode,
  context: PreviewRenderContext<TState, TArgs>,
  theme: Theme,
  render: (context: PreviewRenderContext<TState, TArgs>) => Component,
): Component {
  if (mode !== "border") return render(context);
  const state = borderState(context);
  const resultComponent = render(
    withLastComponent(context, state.codePreviewBorderResultComponent),
  );
  state.codePreviewBorderResultComponent = resultComponent;
  if (
    state.codePreviewBorderShell instanceof BorderedToolCall &&
    state.codePreviewBorderTheme === theme
  ) {
    state.codePreviewBorderShell.setBorderColor(borderColorKey(context));
    state.codePreviewBorderShell.setResult(resultComponent);
  } else {
    const shell = new BorderedToolCall(theme);
    shell.setBorderColor(borderColorKey(context));
    shell.setCall(state.codePreviewBorderCallComponent);
    shell.setResult(resultComponent);
    state.codePreviewBorderShell = shell;
    state.codePreviewBorderTheme = theme;
  }
  return new Container();
}

function withLastComponent<TState, TArgs>(
  context: PreviewRenderContext<TState, TArgs>,
  lastComponent: Component | undefined,
): PreviewRenderContext<TState, TArgs> {
  return { ...context, lastComponent };
}

type BorderState = Record<string, unknown> & {
  codePreviewBorderCallComponent?: Component;
  codePreviewBorderResultComponent?: Component;
  codePreviewBorderShell?: BorderedToolCall;
  codePreviewBorderTheme?: Theme;
};

function borderState<TState, TArgs>(context: PreviewRenderContext<TState, TArgs>): BorderState {
  return context.state as BorderState;
}

type BorderColorKey = "borderMuted" | "warning" | "success" | "error";

function borderColorKey<TState, TArgs>(
  context: PreviewRenderContext<TState, TArgs>,
): BorderColorKey {
  if (context.isError) return "error";
  if (context.isPartial) return "warning";
  return "success";
}

const RESET_ANSI = "\x1b[0m";

class BorderedToolCall implements Component {
  private callComponent: Component | undefined;
  private borderColorKey: BorderColorKey = "borderMuted";
  private resultComponent: Component | undefined;
  private cachedWidth: number | undefined;
  private cachedRows: string[] | undefined;

  constructor(private readonly theme: Theme) {}

  setBorderColor(colorKey: BorderColorKey): void {
    if (this.borderColorKey === colorKey) return;
    this.borderColorKey = colorKey;
    this.invalidateCache();
  }

  setCall(component: Component | undefined): void {
    this.callComponent = component;
    this.invalidateCache();
  }

  setResult(component: Component | undefined): void {
    this.resultComponent = component;
    this.invalidateCache();
  }

  render(width: number): string[] {
    if (this.cachedWidth === width && this.cachedRows) return this.cachedRows;
    const rows = this.renderUncached(width);
    this.cachedWidth = width;
    this.cachedRows = rows;
    return rows;
  }

  invalidate(): void {
    this.invalidateCache();
    this.callComponent?.invalidate?.();
    this.resultComponent?.invalidate?.();
  }

  private invalidateCache(): void {
    this.cachedWidth = undefined;
    this.cachedRows = undefined;
  }

  private renderUncached(width: number): string[] {
    if (width < 4) return this.renderBody(Math.max(1, width));
    const innerWidth = Math.max(1, width - 4);
    const border = (value: string) => this.theme.fg(this.borderColorKey, value);
    return [
      border(`╭${"─".repeat(width - 2)}╮`),
      ...this.renderBody(innerWidth).map((line) => this.frameLine(line, innerWidth, border)),
      border(`╰${"─".repeat(width - 2)}╯`),
    ];
  }

  private renderBody(width: number): string[] {
    return [
      ...(this.callComponent?.render(width) ?? []),
      ...(this.resultComponent?.render(width) ?? []),
    ];
  }

  private frameLine(line: string, innerWidth: number, border: (value: string) => string): string {
    const truncated = truncateToWidth(line, innerWidth, "");
    const padding = " ".repeat(Math.max(0, innerWidth - visibleWidth(truncated)));
    return `${border("│")} ${truncated}${RESET_ANSI}${padding} ${border("│")}`;
  }
}

export function withSecretWarning(source: string, theme: Theme, preview: string): string {
  if (!codePreviewSettings.secretWarnings) return preview;
  const warnings = getSecretWarnings(secretScanSample(source));
  if (warnings.length === 0) return preview;
  return `${theme.fg("warning", `⚠ Preview ${countLabel(warnings.length, "warning")}: possible ${warnings.join(", ")}`)}\n${preview}`;
}

export function countFileLines(content: string): number {
  if (!content) return 0;
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const withoutFinalTerminator = normalized.endsWith("\n") ? normalized.slice(0, -1) : normalized;
  return withoutFinalTerminator.split("\n").length;
}

export function renderHighlightedPreviewText(
  text: string,
  limit: number,
  lang: string | undefined,
  theme: Theme,
  invalidate?: () => void,
  lineNumbers?: { firstLine: number; lineNumberWidth?: number },
): { lines: string[]; shown: number; hidden: number; total: number } {
  const preview = selectPreviewTextLines(text, limit);
  const numbered = lineNumbers
    ? {
        ...lineNumbers,
        lineNumberWidth:
          lineNumbers.lineNumberWidth ??
          String(lineNumbers.firstLine + Math.max(0, preview.total - 1)).length,
      }
    : undefined;
  return {
    ...renderHighlightedPreviewEntries(preview, lang, theme, invalidate, numbered),
    total: preview.total,
  };
}

function renderHighlightedPreviewEntries(
  preview: {
    entries: ReturnType<typeof selectPreviewLines<string>>["entries"];
    shown: number;
    hidden: number;
  },
  lang: string | undefined,
  theme: Theme,
  invalidate?: () => void,
  lineNumbers?: { firstLine: number; lineNumberWidth?: number },
): { lines: string[]; shown: number; hidden: number } {
  const lines: string[] = [];
  const lineNumberOptions =
    lineNumbers && codePreviewSettings.readLineNumbers ? lineNumbers : undefined;
  let chunk: Array<{ line: string; index: number }> = [];

  function flushChunk(): void {
    if (chunk.length === 0) return;
    const normalizedChunk = chunk.map((entry) => entry.line.replace(/\t/g, "   "));
    const highlighted = renderHighlightedText(normalizedChunk.join("\n"), lang, theme, invalidate);
    for (let index = 0; index < chunk.length; index++) {
      const rendered =
        highlighted[index] ??
        theme.fg("toolOutput", escapeControlChars(normalizedChunk[index] ?? ""));
      if (!lineNumberOptions) {
        lines.push(rendered);
        continue;
      }
      const width =
        lineNumberOptions.lineNumberWidth ??
        String(lineNumberOptions.firstLine + chunk[index]!.index).length;
      const lineNumber = String(lineNumberOptions.firstLine + chunk[index]!.index).padStart(
        width,
        " ",
      );
      lines.push(`${theme.fg("dim", `${lineNumber} │ `)}${rendered}`);
    }
    chunk = [];
  }

  for (const entry of preview.entries) {
    if (entry.kind === "hidden") {
      flushChunk();
      lines.push(hiddenLinesMarker(theme, entry.hidden));
    } else {
      chunk.push({ line: entry.line, index: entry.index });
    }
  }
  flushChunk();
  return { lines, shown: preview.shown, hidden: preview.hidden };
}

export function renderSelectedOutputLines(
  rawLines: string[],
  limit: number,
  theme: Theme,
  renderChunk: (chunk: string[]) => string[],
): { lines: string[]; shown: number; hidden: number } {
  const preview = selectPreviewLines(rawLines, limit);
  const lines: string[] = [];
  let chunk: string[] = [];

  function flushChunk(): void {
    if (chunk.length === 0) return;
    lines.push(...renderChunk(chunk));
    chunk = [];
  }

  for (const entry of preview.entries) {
    if (entry.kind === "hidden") {
      flushChunk();
      lines.push(hiddenLinesMarker(theme, entry.hidden));
    } else {
      chunk.push(entry.line);
    }
  }
  flushChunk();
  return { lines, shown: preview.shown, hidden: preview.hidden };
}

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
    (theme as Theme & { name?: string }).name ?? "",
    source.length,
    hashString(source),
  ].join("\0");
}

export function previewArgsKey(kind: string, source: string, path: string): string {
  return [kind, path, source.length, hashString(source)].join("\0");
}

function secretScanSample(source: string): string {
  if (source.length <= SECRET_SCAN_CHARS) return source;
  const half = Math.floor(SECRET_SCAN_CHARS / 2);
  return `${source.slice(0, half)}\n${source.slice(-half)}`;
}
