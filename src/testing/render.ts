import type { Theme } from "@earendil-works/pi-coding-agent";
import type { Component } from "@earendil-works/pi-tui";
import { codePreviewSettings, type CodePreviewSettings } from "../settings/index";

export function renderComponent(component: Component, width = 100): string {
  return component.render(width).join("\n");
}

export function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "");
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function cloneCodePreviewSettingsForTest(): CodePreviewSettings {
  return { ...codePreviewSettings, tools: [...codePreviewSettings.tools] };
}

export function testTheme(): Theme {
  return {
    bold: (text: string) => text,
    fg: (_key: string, text: string) => text,
  } as Theme;
}
