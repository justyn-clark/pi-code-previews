import type { CodePreviewSettings } from "../index";
import { ALL_CODE_PREVIEW_TOOLS } from "../../tools/names";

export function summarizeAppearance(settings: CodePreviewSettings): string {
  return `${settings.shikiTheme} · syntax ${onOff(settings.syntaxHighlighting)} · timing ${onOff(settings.toolCallTiming)}`;
}

export function summarizeDiffPreviews(settings: CodePreviewSettings): string {
  return `${onOff(settings.editDiffPreview)} · ${settings.diffIntensity} bg · words ${settings.wordEmphasis}`;
}

export function summarizeOutputPreviews(settings: CodePreviewSettings): string {
  return `read ${onOff(settings.readContentPreview)} · write ${onOff(settings.writeContentPreview)} · edit ${onOff(settings.editDiffPreview)} · bash ${onOff(settings.bashResultPreview)}`;
}

export function summarizeReadPreviews(settings: CodePreviewSettings): string {
  return `${onOff(settings.readContentPreview)} · ${settings.readCollapsedLines} lines`;
}

export function summarizeWritePreviews(settings: CodePreviewSettings): string {
  return `${onOff(settings.writeContentPreview)} · ${settings.writeCollapsedLines} lines`;
}

export function summarizeSearchListPreviews(settings: CodePreviewSettings): string {
  return `grep ${onOff(settings.grepResultPreview)} · paths ${settings.pathListCollapsedLines} lines`;
}

export function summarizeBashPreviews(settings: CodePreviewSettings): string {
  return onOff(settings.bashResultPreview);
}

export function summarizeTools(settings: CodePreviewSettings): string {
  if (settings.tools.length === 0) return "none";
  if (settings.tools.length === ALL_CODE_PREVIEW_TOOLS.length) return "all tools";
  return `${settings.tools.length}/${ALL_CODE_PREVIEW_TOOLS.length} tools`;
}

export function summarizeWarnings(settings: CodePreviewSettings): string {
  return `bash ${onOff(settings.bashWarnings)} · secrets ${onOff(settings.secretWarnings)}`;
}

function onOff(value: boolean): "on" | "off" {
  return value ? "on" : "off";
}
