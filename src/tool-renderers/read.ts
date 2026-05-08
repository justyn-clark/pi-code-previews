import type { ExtensionAPI, ReadToolOptions } from "@mariozechner/pi-coding-agent";
import { createReadToolDefinition, getLanguageFromPath } from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";
import { getPathArg, getReadStartLine, getTextContent, isTruncated } from "../data.ts";
import { hiddenPreviewExpandHint, metadata, previewFooter, showingFooter } from "../format.ts";
import { resolvePreviewLanguage } from "../language.ts";
import { renderDisplayPath } from "../paths.ts";
import { codePreviewSettings } from "../settings.ts";
import { normalizeShikiLanguage, shouldSkipHighlight } from "../shiki.ts";
import { escapeControlChars } from "../terminal-text.ts";
import {
  createCodePreviewToolShell,
  renderHighlightedPreviewText,
  withSecretWarning,
} from "./common.ts";

export function registerRead(pi: ExtensionAPI, cwd: string, options?: ReadToolOptions) {
  const originalRead = createReadToolDefinition(cwd, options);
  const previewShell = createCodePreviewToolShell();

  pi.registerTool({
    ...originalRead,
    renderShell: previewShell.renderShell,

    renderCall(args, theme, context) {
      return previewShell.renderCall(context, theme, () => {
        const path = getPathArg(args);
        const lang = resolvePreviewLanguage({ path, piLanguage: getLanguageFromPath(path) });
        let text = `${theme.fg("toolTitle", theme.bold("read"))} ${renderDisplayPath(path, cwd, theme)}`;
        if (typeof args.offset === "number" || typeof args.limit === "number") {
          const start = typeof args.offset === "number" ? args.offset : 1;
          const end = typeof args.limit === "number" ? start + args.limit - 1 : undefined;
          text += theme.fg("warning", `:${start}${end ? `-${end}` : ""}`);
        }
        text += metadata(theme, [lang ? normalizeShikiLanguage(lang) : undefined]);
        return new Text(text, 0, 0);
      });
    },

    renderResult(result, { expanded, isPartial }, theme, context) {
      return previewShell.renderResult(context, theme, (renderContext) => {
        if (isPartial) return new Text(theme.fg("warning", "Reading…"), 0, 0);
        const firstText = getTextContent(result.content);
        if (renderContext.isError) {
          return new Text(
            theme.fg("error", escapeControlChars(firstText.split("\n")[0] || "Read failed")),
            0,
            0,
          );
        }

        const path = getPathArg(renderContext.args);

        // Pi already renders image content parts natively. Avoid emitting terminal image
        // escape sequences here; show only a compact note beside Pi's image renderer.
        if (result.content?.some((part) => part.type === "image")) {
          return new Text(
            theme.fg("dim", escapeControlChars(firstText.replace(/^Read image file/i, "image"))),
            0,
            0,
          );
        }

        if (!expanded && !codePreviewSettings.readContentPreview)
          return new Text(hiddenPreviewExpandHint(theme), 0, 0);

        const lang = resolvePreviewLanguage({
          path,
          content: firstText,
          piLanguage: getLanguageFromPath(path),
        });
        const firstLine = getReadStartLine(renderContext.args);
        const limit = expanded ? 0 : codePreviewSettings.readCollapsedLines;
        const skipHighlight = shouldSkipHighlight(firstText);
        const preview = renderHighlightedPreviewText(
          firstText,
          limit,
          skipHighlight ? undefined : lang,
          theme,
          renderContext.invalidate,
          { firstLine },
        );

        let text = preview.lines.length
          ? withSecretWarning(firstText, theme, preview.lines.join("\n"))
          : theme.fg("muted", "Empty file");
        if (preview.hidden > 0) text += showingFooter(theme, preview.shown, preview.total, "lines");

        if (skipHighlight)
          text += previewFooter(theme, "Syntax highlighting skipped for large file");
        if (isTruncated(result.details)) text += previewFooter(theme, "Output truncated by read");
        return new Text(text, 0, 0);
      });
    },
  });
}
