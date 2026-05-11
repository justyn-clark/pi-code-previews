import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerHealthCommand } from "./commands/health";
import { registerSettingsCommand } from "./commands/settings";
import { codePreviewSettings } from "./settings";
import { loadCodePreviewSettings } from "./settings/load";
import { initializeShiki } from "./syntax/shiki";
import { type CodePreviewToolName } from "./tools/names";
import { registerToolRenderers } from "./tool-renderers/registration";

export async function codePreviews(pi: ExtensionAPI) {
  await loadCodePreviewSettings();
  if (codePreviewSettings.syntaxHighlighting) void initializeShiki(codePreviewSettings.shikiTheme);
  const registeredTools = new Set<CodePreviewToolName>();
  const activatedTools = new Set<CodePreviewToolName>();

  registerHealthCommand(pi);
  registerSettingsCommand(pi);

  pi.on("session_start", (_event, ctx) => {
    registerToolRenderers(pi, ctx.cwd, { registeredTools, activatedTools });
  });
}
