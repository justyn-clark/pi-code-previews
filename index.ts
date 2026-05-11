/**
 * Syntax-highlighted code previews for pi.
 */
export { codePreviews as default } from "./src/extension/index";
export { loadCodePreviewSettings } from "./src/settings/bootstrap";
export { withCodePreviewShell, type CodePreviewShellOptions } from "./src/api/cooperative-tools";
export type { CodePreviewSettings, ToolCallBackgroundMode } from "./src/settings";
