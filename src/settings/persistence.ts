import { saveSettingsToDisk } from "./store";
import type { CodePreviewSettings } from "./index";

let settingsSaveQueue: Promise<void> = Promise.resolve();

export function queueSettingsSave(settings: CodePreviewSettings): Promise<void> {
  const snapshot = cloneSettingsForSave(settings);
  const nextSave = settingsSaveQueue
    .catch(() => undefined)
    .then(() => saveSettingsToDisk(snapshot));
  settingsSaveQueue = nextSave;
  return nextSave;
}

export function flushSettingsSaveQueue(): Promise<void> {
  return settingsSaveQueue;
}

function cloneSettingsForSave(settings: CodePreviewSettings): CodePreviewSettings {
  return { ...settings, tools: [...settings.tools] };
}

export function formatSettingsSaveError(error: unknown): string {
  return `Failed to save code preview settings: ${error instanceof Error ? error.message : String(error)}`;
}
