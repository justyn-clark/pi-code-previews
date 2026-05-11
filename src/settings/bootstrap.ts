import { codePreviewSettings, setCodePreviewSettings, type CodePreviewSettings } from "./index";
import { loadSettingsFromDisk } from "./store";

export async function loadCodePreviewSettings(): Promise<CodePreviewSettings> {
  const savedSettings = await loadSettingsFromDisk();
  if (savedSettings) setCodePreviewSettings(savedSettings);
  return cloneSettings(codePreviewSettings);
}

function cloneSettings(settings: CodePreviewSettings): CodePreviewSettings {
  return { ...settings, tools: [...settings.tools] };
}
