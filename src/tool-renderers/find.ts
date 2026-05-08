import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { createFindToolDefinition } from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";

import { renderDisplayPath } from "../paths.ts";
import { codePreviewSettings } from "../settings.ts";
import { escapeControlChars } from "../terminal-text.ts";
import { createCodePreviewToolShell } from "./common.ts";
import { renderPathListResult } from "./path-list-result.ts";

export function registerFind(pi: ExtensionAPI, cwd: string) {
  const originalFind = createFindToolDefinition(cwd);
  const previewShell = createCodePreviewToolShell();
  pi.registerTool({
    ...originalFind,
    renderShell: previewShell.renderShell,
    renderCall(args, theme, context) {
      return previewShell.renderCall(context, theme, () => {
        const pattern = typeof args.pattern === "string" ? args.pattern : "";
        const path = typeof args.path === "string" && args.path ? args.path : ".";
        return new Text(
          `${theme.fg("toolTitle", theme.bold("find"))} ${theme.fg("accent", escapeControlChars(pattern || "*"))} ${theme.fg("muted", "in")} ${renderDisplayPath(path, cwd, theme)}`,
          0,
          0,
        );
      });
    },
    renderResult(result, options, theme, context) {
      return previewShell.renderResult(context, theme, (renderContext) =>
        renderPathListResult(result, options, theme, renderContext, {
          cwd,
          previewEnabled: codePreviewSettings.findResultPreview,
          collapsedLines: codePreviewSettings.pathListCollapsedLines,
          loadingLabel: "Finding…",
          errorLabel: "Find failed",
          emptyMarker: "No files found matching pattern",
          emptyLabel: (output) => output || "No files found",
          footerNoun: "paths",
        }),
      );
    },
  });
}
