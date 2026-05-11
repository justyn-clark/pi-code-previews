import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { codePreviewSettings } from "../settings";
import { getSettingsPath } from "../settings/store";
import { getShikiStatus } from "../syntax/shiki";
import { formatEnabledCodePreviewTools } from "../tools/selection";
import {
  formatActiveCodePreviewTools,
  formatDisabledCodePreviewTools,
  formatPendingCodePreviewTools,
  formatSkippedCodePreviewToolLines,
} from "../tools/status";
import { HealthPanel } from "./panels/health";

export function registerHealthCommand(pi: ExtensionAPI): void {
  pi.registerCommand("code-preview-health", {
    description: "Show code preview renderer health and settings",
    handler: async (_args, ctx) => {
      const status = getShikiStatus();
      const skippedLines = formatSkippedCodePreviewToolLines();
      const pendingTools = formatPendingCodePreviewTools();
      const lines = [
        "Code preview health",
        `Shiki initialized: ${yesNo(status.initialized)}`,
        `Shiki theme: ${codePreviewSettings.shikiTheme}`,
        `Syntax highlighting: ${onOff(codePreviewSettings.syntaxHighlighting)}`,
        `Tool call background: ${codePreviewSettings.toolCallBackground}`,
        `Tool call timing: ${onOff(codePreviewSettings.toolCallTiming)}`,
        `Read content preview: ${onOff(codePreviewSettings.readContentPreview)}`,
        `Write content preview: ${onOff(codePreviewSettings.writeContentPreview)}`,
        `Edit diff preview: ${onOff(codePreviewSettings.editDiffPreview)}`,
        `Grep result preview: ${onOff(codePreviewSettings.grepResultPreview)}`,
        `Find result preview: ${onOff(codePreviewSettings.findResultPreview)}`,
        `Ls result preview: ${onOff(codePreviewSettings.lsResultPreview)}`,
        `Bash result preview: ${onOff(codePreviewSettings.bashResultPreview)}`,
        `Word-level diff emphasis: ${codePreviewSettings.wordEmphasis}`,
        `Configured tools: ${formatEnabledCodePreviewTools()}`,
        `Active previews: ${formatActiveCodePreviewTools()}`,
        `Skipped previews: ${skippedLines.length ? "" : "none"}`,
        ...skippedLines,
        `Disabled by config: ${formatDisabledCodePreviewTools()}`,
        ...(pendingTools === "none" ? [] : [`Pending registration: ${pendingTools}`]),
        `Cache: ${status.cacheSize}/${status.cacheLimit}`,
        `Loaded languages: ${status.loadedLanguages}`,
        `Pending languages: ${status.pendingLanguages}`,
        `Max highlight chars: ${status.maxHighlightChars}`,
        `Path icons: ${codePreviewSettings.pathIcons}`,
        `Settings file: ${getSettingsPath()}`,
      ];
      await ctx.ui.custom(
        (_tui, theme, _kb, done) =>
          new HealthPanel(
            lines.map((line, index) => (index === 0 ? theme.bold(line) : line)).join("\n"),
            done,
            (value) => theme.fg("dim", value),
          ),
        { overlay: true },
      );
    },
  });
}

function onOff(value: boolean): "on" | "off" {
  return value ? "on" : "off";
}

function yesNo(value: boolean): "yes" | "no" {
  return value ? "yes" : "no";
}
