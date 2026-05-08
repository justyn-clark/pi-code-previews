import { getSelectListTheme, getSettingsListTheme } from "@mariozechner/pi-coding-agent";
import {
  Container,
  SelectList,
  SettingsList,
  Spacer,
  Text,
  type SelectItem,
  type SettingItem,
} from "@mariozechner/pi-tui";
import { bundledThemes } from "shiki";
import { getSettingsPath } from "./settings-store.ts";
import {
  formatSettingValue,
  formatToolsSettingValue,
  type CodePreviewEditableSettingId,
  type CodePreviewSettings,
} from "./settings.ts";
import {
  ALL_CODE_PREVIEW_TOOLS,
  parseCodePreviewTools,
  type CodePreviewToolName,
} from "./tool-names.ts";
import {
  formatToolOwner,
  getCodePreviewToolStatuses,
  type CodePreviewToolStatus,
} from "./tool-status.ts";

const SETTINGS_GROUP_ID_PREFIX = "group:";

type SettingsUiItemId = CodePreviewEditableSettingId | "settingsFile";
type SettingsProvider = () => CodePreviewSettings;
type SettingChangeHandler = (id: string, value: string) => void;

const FLAT_SETTING_IDS = [
  "shikiTheme",
  "diffIntensity",
  "wordEmphasis",
  "tools",
  "toolCallBackground",
  "toolCallTiming",
  "readContentPreview",
  "readCollapsedLines",
  "writeContentPreview",
  "writeCollapsedLines",
  "editDiffPreview",
  "editCollapsedLines",
  "grepResultPreview",
  "grepCollapsedLines",
  "findResultPreview",
  "lsResultPreview",
  "pathListCollapsedLines",
  "readLineNumbers",
  "pathIcons",
  "bashResultPreview",
  "bashWarnings",
  "syntaxHighlighting",
  "secretWarnings",
  "settingsFile",
  "resetToDefaults",
] as const satisfies readonly SettingsUiItemId[];

const APPEARANCE_SETTING_IDS = [
  "shikiTheme",
  "syntaxHighlighting",
  "toolCallBackground",
  "toolCallTiming",
  "readLineNumbers",
  "pathIcons",
] as const satisfies readonly SettingsUiItemId[];

const DIFF_PREVIEW_SETTING_IDS = [
  "diffIntensity",
  "wordEmphasis",
  "editDiffPreview",
  "editCollapsedLines",
] as const satisfies readonly SettingsUiItemId[];

const READ_PREVIEW_SETTING_IDS = [
  "readContentPreview",
  "readCollapsedLines",
] as const satisfies readonly SettingsUiItemId[];

const WRITE_PREVIEW_SETTING_IDS = [
  "writeContentPreview",
  "writeCollapsedLines",
] as const satisfies readonly SettingsUiItemId[];

const SEARCH_LIST_PREVIEW_SETTING_IDS = [
  "grepResultPreview",
  "grepCollapsedLines",
  "findResultPreview",
  "lsResultPreview",
  "pathListCollapsedLines",
] as const satisfies readonly SettingsUiItemId[];

const BASH_PREVIEW_SETTING_IDS = [
  "bashResultPreview",
] as const satisfies readonly SettingsUiItemId[];

const WARNING_SETTING_IDS = [
  "bashWarnings",
  "secretWarnings",
] as const satisfies readonly SettingsUiItemId[];

const ADVANCED_SETTING_IDS = [
  "settingsFile",
  "resetToDefaults",
] as const satisfies readonly SettingsUiItemId[];

export function createSettingsItems(current: CodePreviewSettings): SettingItem[] {
  return createSettingListItems(current, FLAT_SETTING_IDS);
}

export function createSettingsCategoryItems(
  current: CodePreviewSettings,
  getCurrent: SettingsProvider,
  onSettingChange: SettingChangeHandler,
): SettingItem[] {
  return [
    {
      id: groupId("appearance"),
      label: "Appearance",
      description: "Theme, syntax color, tool frames, timing, line numbers, and path icons.",
      currentValue: summarizeAppearance(current),
      submenu: (_currentValue, done) =>
        new SettingsGroupSubmenu({
          title: "Appearance",
          description: "Theme, syntax color, tool frames, timing, line numbers, and path icons.",
          items: () => createSettingListItems(getCurrent(), APPEARANCE_SETTING_IDS),
          onChange: onSettingChange,
          done,
          summary: () => summarizeAppearance(getCurrent()),
        }),
    },
    {
      id: groupId("outputPreviews"),
      label: "Output previews",
      description: "Collapsed output/code visibility and preview lengths by tool family.",
      currentValue: summarizeOutputPreviews(current),
      submenu: (_currentValue, done) =>
        new SettingsGroupSubmenu({
          title: "Output previews",
          description: "Collapsed output/code visibility and preview lengths by tool family.",
          items: () => createOutputPreviewItems(getCurrent(), getCurrent, onSettingChange),
          onChange: onSettingChange,
          done,
          summary: () => summarizeOutputPreviews(getCurrent()),
        }),
    },
    {
      id: "tools",
      label: "Enabled tools",
      description:
        "Toggle tool previews individually. Changes take effect after /reload. Tools already owned by another extension are skipped automatically.",
      currentValue: summarizeTools(current),
      submenu: (_currentValue, done) =>
        new ToolPreviewSettingsSubmenu(formatSettingValue(getCurrent(), "tools"), done),
    },
    {
      id: groupId("warningsSafety"),
      label: "Warnings & safety",
      description: "Preview-only safety warnings for shell commands and secret-looking values.",
      currentValue: summarizeWarnings(current),
      submenu: (_currentValue, done) =>
        new SettingsGroupSubmenu({
          title: "Warnings & safety",
          description: "Preview-only safety warnings for shell commands and secret-looking values.",
          items: () => createSettingListItems(getCurrent(), WARNING_SETTING_IDS),
          onChange: onSettingChange,
          done,
          summary: () => summarizeWarnings(getCurrent()),
        }),
    },
    {
      id: groupId("advanced"),
      label: "Advanced",
      description: "Settings file location and restore defaults.",
      currentValue: "file & defaults",
      submenu: (_currentValue, done) =>
        new SettingsGroupSubmenu({
          title: "Advanced",
          description: "Settings file location and restore defaults.",
          items: () => createSettingListItems(getCurrent(), ADVANCED_SETTING_IDS),
          onChange: onSettingChange,
          done,
          summary: () => "file & defaults",
        }),
    },
  ];
}

export function isSettingsGroupItemId(id: string): boolean {
  return id.startsWith(SETTINGS_GROUP_ID_PREFIX);
}

function createOutputPreviewItems(
  current: CodePreviewSettings,
  getCurrent: SettingsProvider,
  onSettingChange: SettingChangeHandler,
): SettingItem[] {
  return [
    {
      id: groupId("readPreviews"),
      label: "Read previews",
      description: "File content visibility and collapsed read size.",
      currentValue: summarizeReadPreviews(current),
      submenu: (_currentValue, done) =>
        new SettingsGroupSubmenu({
          title: "Read previews",
          description: "File content visibility and collapsed read size.",
          items: () => createSettingListItems(getCurrent(), READ_PREVIEW_SETTING_IDS),
          onChange: onSettingChange,
          done,
          summary: () => summarizeReadPreviews(getCurrent()),
        }),
    },
    {
      id: groupId("writePreviews"),
      label: "Write previews",
      description: "Write content/diff visibility and collapsed write content size.",
      currentValue: summarizeWritePreviews(current),
      submenu: (_currentValue, done) =>
        new SettingsGroupSubmenu({
          title: "Write previews",
          description: "Write content/diff visibility and collapsed write content size.",
          items: () => createSettingListItems(getCurrent(), WRITE_PREVIEW_SETTING_IDS),
          onChange: onSettingChange,
          done,
          summary: () => summarizeWritePreviews(getCurrent()),
        }),
    },
    {
      id: groupId("diffPreviews"),
      label: "Edit diff previews",
      description: "Edit diff visibility, backgrounds, word emphasis, and collapsed size.",
      currentValue: summarizeDiffPreviews(current),
      submenu: (_currentValue, done) =>
        new SettingsGroupSubmenu({
          title: "Edit diff previews",
          description: "Edit diff visibility, backgrounds, word emphasis, and collapsed size.",
          items: () => createSettingListItems(getCurrent(), DIFF_PREVIEW_SETTING_IDS),
          onChange: onSettingChange,
          done,
          summary: () => summarizeDiffPreviews(getCurrent()),
        }),
    },
    {
      id: groupId("searchListPreviews"),
      label: "Search/list previews",
      description: "Grep, find, and ls result visibility plus collapsed sizes.",
      currentValue: summarizeSearchListPreviews(current),
      submenu: (_currentValue, done) =>
        new SettingsGroupSubmenu({
          title: "Search/list previews",
          description: "Grep, find, and ls result visibility plus collapsed sizes.",
          items: () => createSettingListItems(getCurrent(), SEARCH_LIST_PREVIEW_SETTING_IDS),
          onChange: onSettingChange,
          done,
          summary: () => summarizeSearchListPreviews(getCurrent()),
        }),
    },
    {
      id: groupId("bashPreviews"),
      label: "Bash previews",
      description: "Successful bash output visibility.",
      currentValue: summarizeBashPreviews(current),
      submenu: (_currentValue, done) =>
        new SettingsGroupSubmenu({
          title: "Bash previews",
          description: "Successful bash output visibility.",
          items: () => createSettingListItems(getCurrent(), BASH_PREVIEW_SETTING_IDS),
          onChange: onSettingChange,
          done,
          summary: () => summarizeBashPreviews(getCurrent()),
        }),
    },
  ];
}

function createSettingListItems(
  current: CodePreviewSettings,
  ids: readonly SettingsUiItemId[],
): SettingItem[] {
  return ids.map((id) => createSettingItem(current, id));
}

function createSettingItem(current: CodePreviewSettings, id: SettingsUiItemId): SettingItem {
  switch (id) {
    case "shikiTheme":
      return {
        id,
        label: "Syntax theme",
        description: "Theme used for Shiki syntax highlighting in code previews.",
        currentValue: formatSettingValue(current, id),
        submenu: (currentValue, done) => new ThemeSelectSubmenu(currentValue, done),
      };
    case "diffIntensity":
      return {
        id,
        label: "Diff background",
        description: "Background intensity for added and removed edit diff lines.",
        currentValue: formatSettingValue(current, id),
        values: ["off", "subtle", "medium"],
      };
    case "wordEmphasis":
      return {
        id,
        label: "Word-level diff emphasis",
        description:
          "Highlight changed words inside edit diffs. All mode is the default; smart suppresses low-signal punctuation and wrapper syntax.",
        currentValue: formatSettingValue(current, id),
        values: ["all", "smart", "off"],
      };
    case "tools":
      return {
        id,
        label: "Preview tools",
        description:
          "Open granular tool preview toggles. Changes take effect after /reload. Tools already owned by another extension are skipped automatically.",
        currentValue: formatSettingValue(current, id),
        submenu: (currentValue, done) => new ToolPreviewSettingsSubmenu(currentValue, done),
      };
    case "toolCallBackground":
      return {
        id,
        label: "Tool call background",
        description:
          "Choose Pi's default colored background, no frame, or a border-only frame. Changes take effect after /reload.",
        currentValue: formatSettingValue(current, id),
        values: ["on", "border", "off"],
      };
    case "toolCallTiming":
      return {
        id,
        label: "Tool call timing",
        description:
          "Show each tool's elapsed duration in the result footer, or in the bottom-right border when border mode is enabled.",
        currentValue: formatSettingValue(current, id),
        values: ["on", "off"],
      };
    case "readContentPreview":
      return {
        id,
        label: "Read content preview",
        description:
          "Show file contents in read results. Turn off to hide collapsed output while still allowing expanded output.",
        currentValue: formatSettingValue(current, id),
        values: ["on", "off"],
      };
    case "readCollapsedLines":
      return {
        id,
        label: "Read preview lines",
        description: "Maximum read result lines shown before collapsing.",
        currentValue: formatSettingValue(current, id),
        values: ["10", "20", "40", "80"],
      };
    case "writeContentPreview":
      return {
        id,
        label: "Write code preview",
        description:
          "Show write content and write diffs. Turn off to hide collapsed code previews while still allowing expanded output.",
        currentValue: formatSettingValue(current, id),
        values: ["on", "off"],
      };
    case "writeCollapsedLines":
      return {
        id,
        label: "Write preview lines",
        description: "Maximum write content lines shown before collapsing.",
        currentValue: formatSettingValue(current, id),
        values: ["10", "20", "40", "80"],
      };
    case "editDiffPreview":
      return {
        id,
        label: "Edit diff preview",
        description:
          "Show proposed and applied edit diffs. Turn off to hide collapsed diff previews while still allowing expanded output.",
        currentValue: formatSettingValue(current, id),
        values: ["on", "off"],
      };
    case "editCollapsedLines":
      return {
        id,
        label: "Edit diff preview lines",
        description:
          "Maximum edit diff lines shown before collapsing. `all` matches pi's built-in edit diff behavior.",
        currentValue: formatSettingValue(current, id),
        values: ["all", "60", "100", "160", "240"],
      };
    case "grepResultPreview":
      return {
        id,
        label: "Grep result preview",
        description:
          "Show grep matches in tool results. Turn off to hide collapsed output while still allowing expanded output.",
        currentValue: formatSettingValue(current, id),
        values: ["on", "off"],
      };
    case "grepCollapsedLines":
      return {
        id,
        label: "Grep preview lines",
        description: "Maximum grep result lines shown before collapsing.",
        currentValue: formatSettingValue(current, id),
        values: ["10", "15", "25", "40", "80"],
      };
    case "findResultPreview":
      return {
        id,
        label: "Find result preview",
        description:
          "Show find paths in tool results. Turn off to hide collapsed output while still allowing expanded output.",
        currentValue: formatSettingValue(current, id),
        values: ["on", "off"],
      };
    case "lsResultPreview":
      return {
        id,
        label: "Ls result preview",
        description:
          "Show ls entries in tool results. Turn off to hide collapsed output while still allowing expanded output.",
        currentValue: formatSettingValue(current, id),
        values: ["on", "off"],
      };
    case "pathListCollapsedLines":
      return {
        id,
        label: "Find/ls preview lines",
        description: "Maximum find and ls result lines shown before collapsing.",
        currentValue: formatSettingValue(current, id),
        values: ["10", "20", "40", "80", "120"],
      };
    case "readLineNumbers":
      return {
        id,
        label: "Read line numbers",
        description: "Show line numbers in read previews.",
        currentValue: formatSettingValue(current, id),
        values: ["on", "off"],
      };
    case "pathIcons":
      return {
        id,
        label: "Find/ls path icons",
        description:
          "Choose icons for find and ls path-list previews. Nerd mode requires a Nerd Font.",
        currentValue: formatSettingValue(current, id),
        values: ["unicode", "nerd", "off"],
      };
    case "bashResultPreview":
      return {
        id,
        label: "Bash result preview",
        description:
          "Show successful bash output. Turn off to hide collapsed output while still allowing expanded output, running state, and errors.",
        currentValue: formatSettingValue(current, id),
        values: ["on", "off"],
      };
    case "bashWarnings":
      return {
        id,
        label: "Bash visual warnings",
        description: "Show preview-only warnings for potentially destructive shell commands.",
        currentValue: formatSettingValue(current, id),
        values: ["on", "off"],
      };
    case "syntaxHighlighting":
      return {
        id,
        label: "Syntax highlighting",
        description:
          "Use Shiki token colors in code previews. Turn off for plainer, lower-noise previews.",
        currentValue: formatSettingValue(current, id),
        values: ["on", "off"],
      };
    case "secretWarnings":
      return {
        id,
        label: "Secret value warnings",
        description:
          "Show preview-only warnings when read, write, or bash output looks like it may contain secrets.",
        currentValue: formatSettingValue(current, id),
        values: ["on", "off"],
      };
    case "settingsFile":
      return {
        id,
        label: "Settings file",
        description: "Settings are stored globally in this file.",
        currentValue: getSettingsPath(),
      };
    case "resetToDefaults":
      return {
        id,
        label: "Restore defaults",
        description: "Restore the default code preview settings.",
        currentValue: formatSettingValue(current, id),
        values: ["keep current", "reset now"],
      };
  }
}

interface SettingsGroupSubmenuOptions {
  title: string;
  description: string;
  items: () => SettingItem[];
  onChange: SettingChangeHandler;
  done: (selectedValue?: string) => void;
  summary?: () => string;
  maxVisible?: number;
}

class SettingsGroupSubmenu extends Container {
  private readonly settingsList: SettingsList;

  constructor(private readonly options: SettingsGroupSubmenuOptions) {
    super();

    const items = options.items();
    this.settingsList = new SettingsList(
      items,
      options.maxVisible ?? Math.min(items.length + 2, 12),
      getSettingsListTheme(),
      (id, value) => {
        if (!isSettingsGroupItemId(id)) options.onChange(id, value);
        this.syncValues();
      },
      () => options.done(options.summary?.()),
    );

    this.addChild(new Text(options.title, 0, 0));
    this.addChild(new Text(options.description, 0, 0));
    this.addChild(new Spacer(1));
    this.addChild(this.settingsList);
  }

  handleInput(data: string): void {
    this.settingsList.handleInput(data);
  }

  private syncValues(): void {
    for (const item of this.options.items())
      this.settingsList.updateValue(item.id, item.currentValue);
  }
}

class ToolPreviewSettingsSubmenu extends Container {
  private readonly selectedTools: Set<CodePreviewToolName>;
  private readonly settingsList: SettingsList;

  constructor(currentValue: string, done: (selectedValue?: string) => void) {
    super();
    this.selectedTools = parseCodePreviewTools(currentValue) ?? new Set(ALL_CODE_PREVIEW_TOOLS);
    this.settingsList = new SettingsList(
      createToolToggleItems(this.selectedTools, getCodePreviewToolStatuses()),
      ALL_CODE_PREVIEW_TOOLS.length + 2,
      getSettingsListTheme(),
      (id, value) => {
        const tool = parseToolToggleId(id);
        if (!tool) return;
        if (value === "on") this.selectedTools.add(tool);
        else this.selectedTools.delete(tool);
      },
      () => done(this.formatSelectedTools()),
    );

    this.addChild(new Text("Preview tools", 0, 0));
    this.addChild(
      new Text("Toggle tool previews individually. Changes take effect after /reload.", 0, 0),
    );
    this.addChild(new Spacer(1));
    this.addChild(this.settingsList);
  }

  handleInput(data: string): void {
    this.settingsList.handleInput(data);
  }

  private formatSelectedTools(): string {
    return formatToolsSettingValue(
      ALL_CODE_PREVIEW_TOOLS.filter((tool) => this.selectedTools.has(tool)),
    );
  }
}

function createToolToggleItems(
  enabledTools: Set<CodePreviewToolName>,
  statuses: Map<CodePreviewToolName, CodePreviewToolStatus>,
): SettingItem[] {
  return ALL_CODE_PREVIEW_TOOLS.map((tool) => {
    const status = statuses.get(tool);
    if (status?.state === "skipped-conflict") {
      const owner = formatToolOwner(status.owner);
      return {
        id: `tool:${tool}`,
        label: `${tool} preview`,
        description: `${tool} preview is disabled because ${owner} owns the ${tool} tool. Disable that extension or change package order to let pi-code-previews own it.`,
        currentValue: `disabled (${owner})`,
      };
    }

    const statusText =
      status?.state === "active" ? "currently active" : "takes effect after /reload";
    return {
      id: `tool:${tool}`,
      label: `${tool} preview`,
      description: `${tool} preview registration (${statusText}). Tools already owned by another extension are disabled automatically.`,
      currentValue: enabledTools.has(tool) ? "on" : "off",
      values: ["on", "off"],
    };
  });
}

function parseToolToggleId(id: string): CodePreviewToolName | undefined {
  const tool = id.startsWith("tool:") ? id.slice("tool:".length) : "";
  return ALL_CODE_PREVIEW_TOOLS.find((candidate) => candidate === tool);
}

class ThemeSelectSubmenu extends Container {
  private readonly selectList: SelectList;

  constructor(currentTheme: string, done: (selectedValue?: string) => void) {
    super();

    const themes: SelectItem[] = Object.keys(bundledThemes)
      .sort()
      .map((theme) => ({ value: theme, label: theme }));

    this.selectList = new SelectList(themes, 12, getSelectListTheme(), {
      minPrimaryColumnWidth: 16,
      maxPrimaryColumnWidth: 48,
    });

    const currentIndex = themes.findIndex((theme) => theme.value === currentTheme);
    if (currentIndex >= 0) this.selectList.setSelectedIndex(currentIndex);

    this.selectList.onSelect = (item) => done(item.value);
    this.selectList.onCancel = () => done(undefined);

    this.addChild(new Text("Syntax theme", 0, 0));
    this.addChild(new Text("Select a Shiki theme for code previews.", 0, 0));
    this.addChild(new Spacer(1));
    this.addChild(this.selectList);
    this.addChild(new Spacer(1));
    this.addChild(new Text("Enter to select · Esc to go back", 0, 0));
  }

  handleInput(data: string): void {
    this.selectList.handleInput(data);
  }
}

function groupId(name: string): string {
  return `${SETTINGS_GROUP_ID_PREFIX}${name}`;
}

function summarizeAppearance(settings: CodePreviewSettings): string {
  return `${settings.shikiTheme} · syntax ${onOff(settings.syntaxHighlighting)} · timing ${onOff(settings.toolCallTiming)}`;
}

function summarizeDiffPreviews(settings: CodePreviewSettings): string {
  return `${onOff(settings.editDiffPreview)} · ${settings.diffIntensity} bg · words ${settings.wordEmphasis}`;
}

function summarizeOutputPreviews(settings: CodePreviewSettings): string {
  return `read ${onOff(settings.readContentPreview)} · write ${onOff(settings.writeContentPreview)} · edit ${onOff(settings.editDiffPreview)} · bash ${onOff(settings.bashResultPreview)}`;
}

function summarizeReadPreviews(settings: CodePreviewSettings): string {
  return `${onOff(settings.readContentPreview)} · ${settings.readCollapsedLines} lines`;
}

function summarizeWritePreviews(settings: CodePreviewSettings): string {
  return `${onOff(settings.writeContentPreview)} · ${settings.writeCollapsedLines} lines`;
}

function summarizeSearchListPreviews(settings: CodePreviewSettings): string {
  return `grep ${onOff(settings.grepResultPreview)} · paths ${settings.pathListCollapsedLines} lines`;
}

function summarizeBashPreviews(settings: CodePreviewSettings): string {
  return onOff(settings.bashResultPreview);
}

function summarizeTools(settings: CodePreviewSettings): string {
  if (settings.tools.length === 0) return "none";
  if (settings.tools.length === ALL_CODE_PREVIEW_TOOLS.length) return "all tools";
  return `${settings.tools.length}/${ALL_CODE_PREVIEW_TOOLS.length} tools`;
}

function summarizeWarnings(settings: CodePreviewSettings): string {
  return `bash ${onOff(settings.bashWarnings)} · secrets ${onOff(settings.secretWarnings)}`;
}

function onOff(value: boolean): "on" | "off" {
  return value ? "on" : "off";
}
