import assert from "node:assert/strict";
import { type Component } from "@mariozechner/pi-tui";
import { afterEach, beforeEach, test } from "vitest";
import { createCodePreviewToolShell, previewCacheKey } from "../src/tool-renderers/common.ts";
import { codePreviewSettings, setCodePreviewSettings } from "../src/settings.ts";
import { cloneCodePreviewSettingsForTest, testTheme } from "./test-utils.ts";

let previousCodePreviewSettings = cloneCodePreviewSettingsForTest();

beforeEach(() => {
  previousCodePreviewSettings = cloneCodePreviewSettingsForTest();
});

afterEach(() => {
  setCodePreviewSettings(previousCodePreviewSettings);
});

test("preview cache keys include word emphasis settings", () => {
  setCodePreviewSettings({ ...codePreviewSettings, wordEmphasis: "all" });
  const allKey = previewCacheKey("edit-result", "-1 old\n+1 new", "src/a.ts", false, testTheme());

  setCodePreviewSettings({ ...codePreviewSettings, wordEmphasis: "off" });
  const offKey = previewCacheKey("edit-result", "-1 old\n+1 new", "src/a.ts", false, testTheme());

  assert.notEqual(allKey, offKey);
});

test("border shell caches framed rows between renders", () => {
  const shell = createCodePreviewToolShell("border");
  let renders = 0;
  const child: Component = {
    render: () => {
      renders++;
      return ["hello"];
    },
    invalidate: () => undefined,
  };
  const component = shell.renderCall(
    {
      args: {},
      argsComplete: true,
      cwd: "/tmp/project",
      executionStarted: false,
      expanded: true,
      invalidate: () => undefined,
      isError: false,
      isPartial: false,
      lastComponent: undefined,
      showImages: true,
      state: {},
      toolCallId: "tool-1",
    },
    testTheme(),
    () => child,
  );

  component.render(40);
  component.render(40);
  assert.equal(renders, 1);

  component.invalidate?.();
  component.render(40);
  assert.equal(renders, 2);
});
