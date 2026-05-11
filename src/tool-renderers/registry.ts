import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { BuiltinToolOptions } from "../tools/builtin-options";
import type { CodePreviewToolName } from "../tools/names";
import { registerBash } from "./bash";
import { registerEdit } from "./edit";
import { registerFind } from "./find";
import { registerGrep } from "./grep";
import { registerLs } from "./ls";
import { registerRead } from "./read";
import { registerWrite } from "./write";

export type ToolRendererRegistration = (
  pi: ExtensionAPI,
  cwd: string,
  options: BuiltinToolOptions,
) => void;

export type ToolRendererDefinition = {
  name: CodePreviewToolName;
  register: ToolRendererRegistration;
};

export const TOOL_RENDERER_DEFINITIONS = [
  { name: "bash", register: (pi, cwd, options) => registerBash(pi, cwd, options.bash) },
  { name: "read", register: (pi, cwd, options) => registerRead(pi, cwd, options.read) },
  { name: "write", register: (pi, cwd) => registerWrite(pi, cwd) },
  { name: "edit", register: (pi, cwd) => registerEdit(pi, cwd) },
  { name: "grep", register: (pi, cwd) => registerGrep(pi, cwd) },
  { name: "find", register: (pi, cwd) => registerFind(pi, cwd) },
  { name: "ls", register: (pi, cwd) => registerLs(pi, cwd) },
] as const satisfies readonly ToolRendererDefinition[];

export const TOOL_RENDERERS_BY_NAME: ReadonlyMap<CodePreviewToolName, ToolRendererDefinition> =
  new Map(TOOL_RENDERER_DEFINITIONS.map((definition) => [definition.name, definition]));
