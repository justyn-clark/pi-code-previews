/**
 * Syntax-highlighted code previews for pi.
 */
export { codePreviews as default } from "./src/extension";
export { loadCodePreviewSettings } from "./src/settings/load";
export { withCodePreviewShell, type CodePreviewShellOptions } from "./src/api/cooperative-tools";
export type { CodePreviewSettings, ToolCallBackgroundMode } from "./src/settings";
