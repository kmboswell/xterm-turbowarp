import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const bundle = readFileSync(
  fileURLToPath(new URL("../dist/extension.js", import.meta.url)),
  "utf8",
);

const ORIGINAL_OPCODES = [
  "initializeTerminal",
  "showTerminal",
  "hideTerminal",
  "clearTerminal",
  "promptUser",
  "cancelPrompt",
  "logMessage",
  "setLogLevelFilter",
  "setLogScopeFilter",
  "clearLogFilters",
  "setTimestamps",
  "boxText",
  "divider",
  "dividerLabeled",
  "writeToTerminal",
  "writeLineToTerminal",
  "setTheme",
];

test("the built bundle makes no CDN request", () => {
  assert.equal(bundle.includes("cdn.jsdelivr"), false);
  assert.equal(bundle.includes("@@XTERM_VENDOR_BUNDLE@@"), false);
  assert.equal(bundle.includes('createElement("script")'), false);
});

test("the bundled libraries keep their licence banner", () => {
  assert.ok(bundle.includes("Bundled dependencies, inlined at build time"));
  assert.ok(bundle.includes("@xterm/xterm 6.0.0"));
  assert.ok(bundle.includes("@xterm/addon-fit 0.11.0"));
  assert.ok(bundle.includes("MIT licence"));
});

test("all pre-existing opcodes are still declared", () => {
  for (const opcode of ORIGINAL_OPCODES) {
    assert.ok(bundle.includes(`opcode: "${opcode}"`), `missing opcode ${opcode}`);
  }
});
