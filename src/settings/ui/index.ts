import { type SettingItem } from "@earendil-works/pi-tui";
import { getSettingsPath } from "../store";
import { formatSettingValue, type CodePreviewSettings } from "../index";
import { SettingsGroupSubmenu, ThemeSelectSubmenu, ToolPreviewSettingsSubmenu } from "./submenus";
import {
  ADVANCED_SETTING_IDS,
  APPEARANCE_SETTING_IDS,
  BASH_PREVIEW_SETTING_IDS,
  DIFF_PREVIEW_SETTING_IDS,
  FLAT_SETTING_IDS,
  READ_PREVIEW_SETTING_IDS,
  SEARCH_LIST_PREVIEW_SETTING_IDS,
  SETTING_ITEM_DEFINITIONS,
  SETTINGS_GROUP_ID_PREFIX,
  WARNING_SETTING_IDS,
  WRITE_PREVIEW_SETTING_IDS,
  type SettingItemDefinition,
  type SettingsUiItemId,
} from "./registry";
import {
  summarizeAppearance,
  summarizeBashPreviews,
  summarizeDiffPreviews,
  summarizeOutputPreviews,
  summarizeReadPreviews,
  summarizeSearchListPreviews,
  summarizeTools,
  summarizeWarnings,
  summarizeWritePreviews,
} from "./summaries";

type SettingsProvider = () => CodePreviewSettings;
type SettingChangeHandler = (id: string, value: string) => void;

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
  const definition = SETTING_ITEM_DEFINITIONS[id] as SettingItemDefinition;
  const item: SettingItem = {
    id,
    label: definition.label,
    description: definition.description,
    currentValue: id === "settingsFile" ? getSettingsPath() : formatSettingValue(current, id),
    ...(definition.values ? { values: [...definition.values] } : {}),
  };
  if (id === "shikiTheme")
    item.submenu = (currentValue, done) => new ThemeSelectSubmenu(currentValue, done);
  else if (id === "tools")
    item.submenu = (currentValue, done) => new ToolPreviewSettingsSubmenu(currentValue, done);
  return item;
}

function groupId(name: string): string {
  return `${SETTINGS_GROUP_ID_PREFIX}${name}`;
}
