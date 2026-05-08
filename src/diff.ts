import type { Theme } from "@mariozechner/pi-coding-agent";
import { truncateToWidth, visibleWidth, type Component } from "@mariozechner/pi-tui";
import {
  changedRangesForTokens,
  wordEmphasisTokens,
  type WordChangeRanges,
  type WordEmphasisToken,
} from "./diff-word-emphasis.ts";
import { positiveEnvInteger } from "./env.ts";
import { codePreviewSettings } from "./settings.ts";
import { renderWithShiki } from "./shiki.ts";
import { escapeControlChars, visibleLength, wrapAnsiToWidth } from "./terminal-text.ts";

const DIFF_ADD_MARKER = "\u0000PI_DIFF_ADD\u0000";
const DIFF_REMOVE_MARKER = "\u0000PI_DIFF_REMOVE\u0000";

export class FullWidthDiffText implements Component {
  private cachedWidth: number | undefined;
  private cachedRows: string[] | undefined;

  constructor(
    private text: string,
    private readonly theme?: Theme,
  ) {}

  setText(text: string): void {
    if (this.text === text) return;
    this.text = text;
    this.invalidate();
  }

  render(width: number): string[] {
    if (this.cachedWidth === width && this.cachedRows) return this.cachedRows;
    const diffBackground = createDiffBackgroundResolver(this.theme);
    const rows = this.text.split("\n").flatMap((rawLine) => {
      const { kind, line } = parseMarkedDiffLine(rawLine);
      const rows = wrapAnsiToWidth(line, width, DIFF_WRAP_ROWS, continuationPrefix(line));
      if (!kind) return rows.map((row) => truncateToWidth(row, width, ""));

      return rows.map((row) => {
        const truncated = truncateToWidth(row, width, "");
        const padding = " ".repeat(Math.max(0, width - visibleWidth(truncated)));
        return diffLineBg(kind, truncated + padding, diffBackground);
      });
    });
    this.cachedWidth = width;
    this.cachedRows = rows;
    return rows;
  }

  invalidate(): void {
    this.cachedWidth = undefined;
    this.cachedRows = undefined;
  }
}

const DIFF_WRAP_ROWS = positiveEnvInteger("CODE_PREVIEW_DIFF_WRAP_ROWS", 3);

type MarkedDiffLine = { kind?: "add" | "remove"; line: string };

function parseMarkedDiffLine(rawLine: string): MarkedDiffLine {
  if (rawLine.startsWith(DIFF_ADD_MARKER))
    return { kind: "add", line: rawLine.slice(DIFF_ADD_MARKER.length) };
  if (rawLine.startsWith(DIFF_REMOVE_MARKER))
    return { kind: "remove", line: rawLine.slice(DIFF_REMOVE_MARKER.length) };
  return { line: rawLine };
}

function continuationPrefix(line: string): string {
  const pipe = line.indexOf("│ ");
  if (pipe < 0) return "";
  return " ".repeat(visibleLength(line.slice(0, pipe + 2)));
}

export function summarizeDiff(diff: string): {
  additions: number;
  removals: number;
  replacements: number;
  insertions: number;
  deletions: number;
  totalLines: number;
  hunks: number;
} {
  let additions = 0;
  let removals = 0;
  let replacements = 0;
  let insertions = 0;
  let deletions = 0;
  let hunks = 0;
  let groupAdditions = 0;
  let groupRemovals = 0;
  let totalLines = 0;

  function flushChangeGroup() {
    if (groupAdditions === 0 && groupRemovals === 0) return;
    hunks++;
    if (groupAdditions > 0 && groupRemovals > 0) {
      replacements++;
      insertions += Math.max(0, groupAdditions - groupRemovals);
      deletions += Math.max(0, groupRemovals - groupAdditions);
    } else if (groupAdditions > 0) {
      insertions += groupAdditions;
    } else {
      deletions += groupRemovals;
    }
    groupAdditions = 0;
    groupRemovals = 0;
  }

  forEachSplitLine(diff, (line) => {
    totalLines++;
    const isAddition = line.startsWith("+") && !line.startsWith("+++");
    const isRemoval = line.startsWith("-") && !line.startsWith("---");

    if (isAddition) {
      additions++;
      groupAdditions++;
    } else if (isRemoval) {
      removals++;
      groupRemovals++;
    } else {
      flushChangeGroup();
    }
  });
  flushChangeGroup();

  return {
    additions,
    removals,
    replacements,
    insertions,
    deletions,
    totalLines,
    hunks,
  };
}

function forEachSplitLine(text: string, callback: (line: string) => void): void {
  let start = 0;
  while (start <= text.length) {
    const newline = text.indexOf("\n", start);
    if (newline < 0) {
      callback(text.slice(start));
      break;
    }
    callback(text.slice(start, newline));
    start = newline + 1;
  }
}

function splitLinesLimited(text: string, limit: number): string[] {
  const max = Math.max(0, Math.floor(limit));
  if (Number.isNaN(max) || max <= 0) return [];
  const lines: string[] = [];
  let start = 0;
  while (start <= text.length && lines.length < max) {
    const newline = text.indexOf("\n", start);
    if (newline < 0) {
      lines.push(text.slice(start));
      break;
    }
    lines.push(text.slice(start, newline));
    start = newline + 1;
  }
  return lines;
}

export function renderSyntaxHighlightedDiff(
  diff: string,
  lang: string | undefined,
  theme: Theme,
  limit: number,
  invalidate?: () => void,
): string {
  return renderSyntaxHighlightedDiffWithWordEmphasis(
    diff,
    lang,
    theme,
    limit,
    invalidate,
    codePreviewSettings.wordEmphasis !== "off",
  );
}

export function createProgressiveSyntaxHighlightedDiffText(
  diff: string,
  lang: string | undefined,
  theme: Theme,
  limit: number,
  options: { decorate?: (body: string) => string; invalidate?: () => void } = {},
): FullWidthDiffText {
  const decorate = options.decorate ?? ((body: string) => body);
  const initialBody = renderSyntaxHighlightedDiffWithWordEmphasis(
    diff,
    lang,
    theme,
    limit,
    options.invalidate,
    codePreviewSettings.wordEmphasis !== "off",
  );
  const component = new FullWidthDiffText(decorate(initialBody), theme);
  return component;
}

function renderSyntaxHighlightedDiffWithWordEmphasis(
  diff: string,
  lang: string | undefined,
  theme: Theme,
  limit: number,
  invalidate: (() => void) | undefined,
  emphasizeChangedPairs: boolean,
): string {
  return renderDiff(diff, {
    lang,
    theme,
    limit,
    invalidate,
    syntaxHighlight: true,
    emphasizeChangedPairs,
  });
}

export function renderPlainDiff(diff: string, theme: Theme, limit: number): string {
  return renderDiff(diff, {
    theme,
    limit,
    syntaxHighlight: false,
    emphasizeChangedPairs: false,
  });
}

type DiffRenderOptions = {
  lang?: string;
  theme: Theme;
  limit: number;
  invalidate?: () => void;
  syntaxHighlight: boolean;
  emphasizeChangedPairs: boolean;
};

function renderDiff(diff: string, options: DiffRenderOptions): string {
  const lines = splitLinesLimited(diff, options.limit);
  const out: string[] = [];
  const lang = options.syntaxHighlight ? options.lang : undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const parsed = parseDiffLine(line);
    if (!parsed) {
      out.push(renderSeparator(line, options.theme));
      continue;
    }

    if (options.emphasizeChangedPairs && isChangedDiffLine(parsed)) {
      const block: ParsedDiffLine[] = [];
      let end = i;
      while (end < lines.length) {
        const next = parseDiffLine(lines[end]!);
        if (!next || !isChangedDiffLine(next)) break;
        block.push(next);
        end++;
      }
      out.push(...renderChangeBlock(block, lang, options.theme, options.invalidate));
      i = end - 1;
      continue;
    }

    out.push(renderDiffParsedLine(parsed, lang, options.theme, options.invalidate));
  }

  return out.join("\n");
}

function renderSeparator(line: string, theme: Theme): string {
  const safeLine = escapeControlChars(line);
  const trimmed = safeLine.trim();
  if (trimmed === "...") return theme.fg("muted", "      --- unchanged lines hidden ---");
  if (trimmed.startsWith("@@")) return theme.fg("accent", theme.bold(safeLine));
  if (trimmed.startsWith("---") || trimmed.startsWith("+++")) return theme.fg("muted", safeLine);
  if (trimmed.startsWith("diff ") || trimmed.startsWith("index "))
    return theme.fg("muted", safeLine);
  return theme.fg("toolDiffContext", safeLine);
}

function renderDiffParsedLine(
  parsed: ParsedDiffLine,
  lang: string | undefined,
  theme: Theme,
  invalidate?: () => void,
): string {
  const highlighted = highlightSingleLine(
    parsed.content.replace(/\t/g, "   "),
    lang,
    theme,
    invalidate,
  );
  if (parsed.kind === "+")
    return `${DIFF_ADD_MARKER}${theme.fg("toolDiffAdded", `+${parsed.lineNumber} │ `)}${highlighted}`;
  if (parsed.kind === "-")
    return `${DIFF_REMOVE_MARKER}${theme.fg("toolDiffRemoved", `-${parsed.lineNumber} │ `)}${highlighted}`;
  return dimAnsi(
    `${theme.fg("toolDiffContext", ` ${parsed.lineNumber} │ `)}${highlighted || theme.fg("toolDiffContext", "")}`,
  );
}

function renderChangeBlock(
  block: ParsedDiffLine[],
  lang: string | undefined,
  theme: Theme,
  invalidate?: () => void,
): string[] {
  const removed = block.flatMap((line, index) =>
    isRemovedDiffLine(line) ? [indexedChangedLine(index, line)] : [],
  );
  const added = block.flatMap((line, index) =>
    isAddedDiffLine(line) ? [indexedChangedLine(index, line)] : [],
  );
  const removedByIndex = new Map(removed.map((line) => [line.index, line]));
  const addedByIndex = new Map(added.map((line) => [line.index, line]));
  const emphasis = new Map<number, { ranges: Array<[number, number]>; kind: "add" | "remove" }>();

  for (const [removedIndex, addedIndex] of matchChangedLines(removed, added)) {
    const removedLine = removedByIndex.get(removedIndex);
    const addedLine = addedByIndex.get(addedIndex);
    if (!removedLine || !addedLine) continue;
    const ranges = changedRangesForTokens(
      normalizedChangedContent(removedLine),
      normalizedChangedContent(addedLine),
      changedLineTokens(removedLine),
      changedLineTokens(addedLine),
    );
    if (!shouldEmphasizeChangedPair(ranges)) continue;
    emphasis.set(removedIndex, { ranges: ranges.removed, kind: "remove" });
    emphasis.set(addedIndex, { ranges: ranges.added, kind: "add" });
  }

  return block.map((line, index) => {
    const rendered = renderDiffParsedLine(line, lang, theme, invalidate);
    const match = emphasis.get(index);
    return match ? emphasizeChangedSpans(rendered, match.ranges, match.kind) : rendered;
  });
}

type IndexedChangedLine<T extends AddedDiffLine | RemovedDiffLine> = {
  index: number;
  line: T;
  normalizedContent?: string;
  tokens?: WordEmphasisToken[];
  tokenValues?: string[];
};

function indexedChangedLine<T extends AddedDiffLine | RemovedDiffLine>(
  index: number,
  line: T,
): IndexedChangedLine<T> {
  return { index, line };
}

function normalizedChangedContent(
  line: IndexedChangedLine<AddedDiffLine | RemovedDiffLine>,
): string {
  // Compute ranges against the same normalized text that Shiki/fallback rendering displays.
  // Otherwise tabs or escaped control chars shift the emphasis range by multiple cells.
  return (line.normalizedContent ??= normalizeDiffContent(line.line.content));
}

function changedLineTokens(
  line: IndexedChangedLine<AddedDiffLine | RemovedDiffLine>,
): WordEmphasisToken[] {
  return (line.tokens ??= wordEmphasisTokens(normalizedChangedContent(line)));
}

function changedLineTokenValues(
  line: IndexedChangedLine<AddedDiffLine | RemovedDiffLine>,
): string[] {
  return (line.tokenValues ??= changedLineTokens(line).map((token) => token.value));
}

function matchChangedLines(
  removed: Array<IndexedChangedLine<RemovedDiffLine>>,
  added: Array<IndexedChangedLine<AddedDiffLine>>,
): Array<[number, number]> {
  if (removed.length === 0 || added.length === 0) return [];
  if (removed.length * added.length > MAX_CHANGED_LINE_PAIR_CELLS)
    return matchChangedLinesByPosition(removed, added);
  const scores = removed.map((removedLine) =>
    added.map((addedLine) =>
      tokenSimilarity(changedLineTokenValues(removedLine), changedLineTokenValues(addedLine)),
    ),
  );
  const dp = Array.from({ length: removed.length + 1 }, () =>
    Array.from({ length: added.length + 1 }, () => 0),
  );

  for (let i = 1; i <= removed.length; i++) {
    for (let j = 1; j <= added.length; j++) {
      const score = scores[i - 1]?.[j - 1] ?? 0;
      const pair =
        score >= MIN_CHANGED_LINE_PAIR_SCORE
          ? dp[i - 1]![j - 1]! + score + 0.01
          : Number.NEGATIVE_INFINITY;
      dp[i]![j] = Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!, pair);
    }
  }

  const pairs: Array<[number, number]> = [];
  let i = removed.length;
  let j = added.length;
  while (i > 0 && j > 0) {
    const score = scores[i - 1]?.[j - 1] ?? 0;
    const pair =
      score >= MIN_CHANGED_LINE_PAIR_SCORE
        ? dp[i - 1]![j - 1]! + score + 0.01
        : Number.NEGATIVE_INFINITY;
    if (Math.abs(dp[i]![j]! - pair) < 1e-9) {
      pairs.push([i - 1, j - 1]);
      i--;
      j--;
    } else if (dp[i - 1]![j]! >= dp[i]![j - 1]!) {
      i--;
    } else {
      j--;
    }
  }

  const similarPairs = pairs.reverse();
  if (similarPairs.length === 0 && removed.length === 1 && added.length === 1)
    return [[removed[0]!.index, added[0]!.index]];
  return addPositionalFallbackPairs(removed, added, scores, similarPairs);
}

const MIN_CHANGED_LINE_PAIR_SCORE = 0.45;
const MIN_POSITIONAL_FALLBACK_PAIR_SCORE = 0.28;
const MAX_CHANGED_LINE_PAIR_CELLS = 256;

function matchChangedLinesByPosition(
  removed: Array<IndexedChangedLine<RemovedDiffLine>>,
  added: Array<IndexedChangedLine<AddedDiffLine>>,
): Array<[number, number]> {
  const pairs: Array<[number, number]> = [];
  for (let index = 0; index < Math.min(removed.length, added.length); index++) {
    if (
      tokenSimilarity(
        changedLineTokenValues(removed[index]!),
        changedLineTokenValues(added[index]!),
      ) >= MIN_POSITIONAL_FALLBACK_PAIR_SCORE
    )
      pairs.push([removed[index]!.index, added[index]!.index]);
  }
  return pairs;
}

function addPositionalFallbackPairs(
  removed: Array<IndexedChangedLine<RemovedDiffLine>>,
  added: Array<IndexedChangedLine<AddedDiffLine>>,
  scores: number[][],
  similarPairs: Array<[number, number]>,
): Array<[number, number]> {
  const pairs: Array<[number, number]> = [];
  let removedCursor = 0;
  let addedCursor = 0;
  for (const [removedPosition, addedPosition] of similarPairs) {
    pairs.push(
      ...positionPairs(
        removed,
        added,
        scores,
        removedCursor,
        removedPosition,
        addedCursor,
        addedPosition,
      ),
    );
    pairs.push([removed[removedPosition]!.index, added[addedPosition]!.index]);
    removedCursor = removedPosition + 1;
    addedCursor = addedPosition + 1;
  }
  pairs.push(
    ...positionPairs(
      removed,
      added,
      scores,
      removedCursor,
      removed.length,
      addedCursor,
      added.length,
    ),
  );
  return pairs;
}

function positionPairs(
  removed: Array<IndexedChangedLine<RemovedDiffLine>>,
  added: Array<IndexedChangedLine<AddedDiffLine>>,
  scores: number[][],
  removedStart: number,
  removedEnd: number,
  addedStart: number,
  addedEnd: number,
): Array<[number, number]> {
  const pairs: Array<[number, number]> = [];
  const count = Math.min(removedEnd - removedStart, addedEnd - addedStart);
  for (let offset = 0; offset < count; offset++) {
    const removedPosition = removedStart + offset;
    const addedPosition = addedStart + offset;
    const score = scores[removedPosition]?.[addedPosition] ?? 0;
    if (score < MIN_POSITIONAL_FALLBACK_PAIR_SCORE) continue;
    pairs.push([removed[removedPosition]!.index, added[addedPosition]!.index]);
  }
  return pairs;
}

function tokenSimilarity(beforeTokens: string[], afterTokens: string[]): number {
  if (beforeTokens.length === 0 || afterTokens.length === 0)
    return beforeTokens.length === afterTokens.length ? 1 : 0;
  const beforeWeight = tokenListWeight(beforeTokens);
  const afterWeight = tokenListWeight(afterTokens);
  const remaining = new Map<string, number>();
  for (const token of beforeTokens) remaining.set(token, (remaining.get(token) ?? 0) + 1);
  let sharedWeight = 0;
  for (const token of afterTokens) {
    const count = remaining.get(token) ?? 0;
    if (count === 0) continue;
    sharedWeight += tokenWeight(token);
    if (count === 1) remaining.delete(token);
    else remaining.set(token, count - 1);
  }
  return (2 * sharedWeight) / (beforeWeight + afterWeight);
}

function tokenListWeight(tokens: string[]): number {
  return tokens.reduce((total, token) => total + tokenWeight(token), 0);
}

function tokenWeight(token: string): number {
  if (/^[A-Za-z_$][\w$]*$/.test(token)) return 2;
  if (/^\d+(?:\.\d+)?$/.test(token)) return 1.5;
  if (/^(?:===|!==|=>|==|!=|<=|>=|&&|\|\||[+\-*\/%<>=!?:]+)$/.test(token)) return 0.75;
  if (/^[{}()[\].,;]$/.test(token)) return 0.15;
  return 1;
}

function dimAnsi(text: string): string {
  return `\x1b[2m${text}\x1b[22m`;
}

type DiffLineKind = "add" | "remove";

type DiffBackgroundResolver = (kind: DiffLineKind) => string | undefined;

function createDiffBackgroundResolver(theme?: Theme): DiffBackgroundResolver {
  const intensity = codePreviewSettings.diffIntensity;
  if (intensity === "off") return () => undefined;
  const cache: Partial<Record<DiffLineKind, string>> = {};
  return (kind) =>
    (cache[kind] ??=
      deriveDiffBg(kind, theme, intensity === "medium" ? 0.24 : 0.14) ??
      fallbackDiffBg(kind, intensity));
}

function diffLineBg(
  kind: DiffLineKind,
  line: string,
  diffBackground: DiffBackgroundResolver,
): string {
  // Full-width subtle backgrounds for changed lines. Re-apply after foreground
  // resets emitted by Shiki so token coloring does not punch holes in the bg.
  const bg = diffBackground(kind);
  if (!bg) return line;
  const coloredLine = line
    .replace(/\x1b\[39m/g, `\x1b[39m${bg}`)
    .replace(/\x1b\[49m/g, `\x1b[49m${bg}`);
  // Leave the diff background active at end-of-line. Pi's surrounding Box adds
  // the final right-padding cell before resetting the tool background, so that
  // padding inherits the diff background without the child exceeding its width.
  return bg + coloredLine;
}

function fallbackDiffBg(kind: DiffLineKind, intensity: "subtle" | "medium"): string {
  if (kind === "add") return intensity === "medium" ? "\x1b[48;2;22;68;40m" : "\x1b[48;2;10;42;26m";
  return intensity === "medium" ? "\x1b[48;2;78;36;40m" : "\x1b[48;2;50;24;30m";
}

function deriveDiffBg(
  kind: DiffLineKind,
  theme: Theme | undefined,
  intensity: number,
): string | undefined {
  const themed = theme as
    | (Theme & { getFgAnsi?: (key: string) => string; getBgAnsi?: (key: string) => string })
    | undefined;
  const fg = themed?.getFgAnsi?.(kind === "add" ? "toolDiffAdded" : "toolDiffRemoved");
  const fgRgb = parseAnsiRgb(fg ?? "");
  if (!fgRgb) return undefined;
  const base = parseAnsiRgb(
    themed?.getBgAnsi?.(kind === "add" ? "toolSuccessBg" : "toolErrorBg") ?? "",
  ) ??
    parseAnsiRgb(themed?.getBgAnsi?.("toolSuccessBg") ?? "") ?? { r: 0, g: 0, b: 0 };
  return `\x1b[48;2;${Math.round(base.r + (fgRgb.r - base.r) * intensity)};${Math.round(base.g + (fgRgb.g - base.g) * intensity)};${Math.round(base.b + (fgRgb.b - base.b) * intensity)}m`;
}

function parseAnsiRgb(ansi: string): { r: number; g: number; b: number } | undefined {
  const match = ansi.match(/\x1b\[(?:38|48);2;(\d+);(\d+);(\d+)m/);
  if (!match) return undefined;
  return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]) };
}

function normalizeDiffContent(content: string): string {
  return escapeControlChars(content.replace(/\t/g, "   "));
}

function shouldEmphasizeChangedPair(ranges: WordChangeRanges): boolean {
  return ranges.removed.length > 0 || ranges.added.length > 0;
}

function emphasizeChangedSpans(
  line: string,
  ranges: Array<[number, number]>,
  kind: "add" | "remove",
): string {
  if (ranges.length === 0) return line;
  const codeStart = findCodeStart(line);
  return (
    line.slice(0, codeStart) +
    injectVisibleRangeEmphasis(line.slice(codeStart), ranges, wordEmphasis(kind))
  );
}

function findCodeStart(line: string): number {
  const pipe = line.indexOf("│ ");
  if (pipe < 0) return 0;
  let index = pipe + "│ ".length;
  // Skip foreground resets emitted by theme.fg() around the gutter. These do not
  // correspond to visible code cells and should not count toward changed ranges.
  while (line[index] === "\x1b") {
    const end = line.indexOf("m", index);
    if (end < 0) break;
    index = end + 1;
  }
  return index;
}

function wordEmphasis(kind: "add" | "remove"): string {
  // Use a strong bg + bold so word emphasis remains visible after the full-line
  // diff background is re-applied in FullWidthDiffText.render().
  return kind === "add" ? "\x1b[48;2;64;132;82m\x1b[1m" : "\x1b[48;2;148;62;70m\x1b[1m";
}

function injectVisibleRangeEmphasis(
  ansi: string,
  ranges: Array<[number, number]>,
  open: string,
): string {
  let visible = 0;
  let rangeIndex = 0;
  let out = "";
  let active = false;
  for (let i = 0; i < ansi.length; i++) {
    const range = ranges[rangeIndex];
    if (ansi[i] === "\x1b") {
      const end = ansi.indexOf("m", i);
      if (end >= 0) {
        const seq = ansi.slice(i, end + 1);
        out += active && (seq === "\x1b[39m" || seq === "\x1b[22m") ? `${seq}${open}` : seq;
        i = end;
        continue;
      }
    }
    if (!active && range && visible === range[0]) {
      out += open;
      active = true;
    }
    if (active && range && visible === range[1]) {
      out += "\x1b[22m\x1b[49m";
      active = false;
      rangeIndex++;
    }
    out += ansi[i];
    visible++;
  }
  if (active) out += "\x1b[22m\x1b[49m";
  return out;
}

type ParsedDiffLine = { kind: "+" | "-" | " "; lineNumber: string; content: string };

type AddedDiffLine = ParsedDiffLine & { kind: "+" };
type RemovedDiffLine = ParsedDiffLine & { kind: "-" };

function parseDiffLine(line: string): ParsedDiffLine | null {
  const match = line.match(/^([+\- ])(\s*\d*)\s(.*)$/);
  if (!match) return null;
  const kind = match[1];
  if (kind !== "+" && kind !== "-" && kind !== " ") return null;
  return { kind, lineNumber: match[2] ?? "", content: match[3] ?? "" };
}

function isAddedDiffLine(line: ParsedDiffLine | null): line is AddedDiffLine {
  return line?.kind === "+";
}

function isRemovedDiffLine(line: ParsedDiffLine | null): line is RemovedDiffLine {
  return line?.kind === "-";
}

function isChangedDiffLine(line: ParsedDiffLine): line is AddedDiffLine | RemovedDiffLine {
  return line.kind === "+" || line.kind === "-";
}

function highlightSingleLine(
  line: string,
  lang: string | undefined,
  theme: Theme,
  invalidate?: () => void,
): string {
  return (
    renderWithShiki(line, lang, invalidate)?.[0] ?? theme.fg("toolOutput", escapeControlChars(line))
  );
}
