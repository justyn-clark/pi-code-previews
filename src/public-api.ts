import { loadSettingsFromDisk } from "./settings-store.ts";
import {
  codePreviewSettings,
  setCodePreviewSettings,
  type CodePreviewSettings,
} from "./settings.ts";

/**
 * Load pi-code-previews settings from disk into this module instance.
 *
 * Cooperating extensions should call this before registering tools with withCodePreviewShell()
 * when they want to respect the user's saved code-preview background/timing settings.
 */
export async function loadCodePreviewSettings(): Promise<CodePreviewSettings> {
  const savedSettings = await loadSettingsFromDisk();
  if (savedSettings) setCodePreviewSettings(savedSettings);
  return cloneSettings(codePreviewSettings);
}

function cloneSettings(settings: CodePreviewSettings): CodePreviewSettings {
  return { ...settings, tools: [...settings.tools] };
}
