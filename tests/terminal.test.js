import test from "node:test";
import assert from "node:assert/strict";
import { createHarness, createReadyHarness } from "./helpers.js";

function setup(t, options) {
  const harness = createHarness(options);
  t.after(() => harness.close());
  return harness;
}

test("a failed initialize keeps ready? false and records the reason", async (t) => {
  const harness = setup(t, { failInit: "the terminal exploded" });

  assert.equal(harness.extension.terminalReady(), false);
  await harness.extension.initializeTerminal();

  assert.equal(harness.extension.terminalReady(), false);
  assert.match(harness.extension.lastTerminalError(), /the terminal exploded/);
});

test("unready blocks record the not-initialized error instead of failing silently", async (t) => {
  const harness = setup(t);
  const { extension } = harness;

  extension.clearTerminal();
  assert.equal(extension.lastTerminalError(), "Terminal is not initialized.");

  assert.equal(await extension.promptUser({ TEXT: "> " }), "");
  assert.equal(extension.lastTerminalError(), "Terminal is not initialized.");
  assert.equal(extension.terminalColumns(), 0);
  assert.equal(extension.terminalRows(), 0);
});

test("a successful initialize clears the recorded error", async (t) => {
  const harness = setup(t);
  harness.extension.clearTerminal();
  assert.notEqual(harness.extension.lastTerminalError(), "");

  await harness.extension.initializeTerminal();

  assert.equal(harness.extension.terminalReady(), true);
  assert.equal(harness.extension.lastTerminalError(), "");
});

test("output written before init is flushed in order with write-time filters", async (t) => {
  const harness = setup(t);
  const { extension } = harness;

  extension.writeToTerminal({ TEXT: "one " });
  extension.setLogLevelFilter({ LEVELS: "error" });
  extension.logMessage({ LEVEL: "info", SCOPE: "", TEXT: "filtered out" });
  extension.setLogLevelFilter({ LEVELS: "*" });
  extension.logMessage({ LEVEL: "error", SCOPE: "net", TEXT: "boom" });
  extension.writeLineToTerminal({ TEXT: "two" });

  await extension.initializeTerminal();
  const output = harness.output();

  assert.ok(output.startsWith("one "));
  assert.ok(!output.includes("filtered out"));
  assert.ok(output.includes("boom"));
  assert.ok(output.indexOf("boom") < output.indexOf("two"));
});

test("the pre-init output buffer keeps only the newest 1000 entries", async (t) => {
  const harness = setup(t);
  const { extension } = harness;

  for (let i = 0; i < 1005; i++) {
    extension.writeLineToTerminal({ TEXT: `line-${i}` });
  }

  await extension.initializeTerminal();
  const output = harness.output();

  assert.equal(output.match(/line-\d+/g).length, 1000);
  assert.ok(!output.includes("line-0\r\n"));
  assert.ok(!output.includes("line-4\r\n"));
  assert.ok(output.includes("line-5\r\n"));
  assert.ok(output.includes("line-1004\r\n"));
});

test("uptime timestamps bracket seconds since the project started", async (t) => {
  const harness = setup(t);
  const { extension } = harness;

  extension.setTimestampStyle({ STYLE: "uptime" });
  extension.setTimestamps({ STATE: "on" });
  extension.logMessage({ LEVEL: "info", SCOPE: "", TEXT: "uptime hello" });

  await extension.initializeTerminal();

  assert.match(harness.output(), /\[\d+\.\d{4}\][\s\S]*uptime hello/);
});

test("clock style still renders a wall-clock timestamp", async (t) => {
  const harness = await createReadyHarness(t);
  const { extension } = harness;

  extension.setTimestampStyle({ STYLE: "clock" });
  extension.setTimestamps({ STATE: "on" });
  extension.logMessage({ LEVEL: "info", SCOPE: "", TEXT: "clock hello" });

  const output = harness.output();
  assert.ok(output.includes("clock hello"));
  assert.ok(!output.includes("[0."));
});

test("terminal columns and rows report the terminal size", async (t) => {
  const harness = await createReadyHarness(t);

  assert.equal(harness.extension.terminalColumns(), 80);
  assert.equal(harness.extension.terminalRows(), 24);
});

test("dispose removes everything it added and allows a fresh initialize", async (t) => {
  const harness = await createReadyHarness(t);
  const { extension } = harness;

  extension.showTerminal();
  const firstTerminal = harness.lastTerminal();
  const observer = harness.resizeObservers[0];
  const pending = extension.promptUser({ TEXT: "> " });

  assert.ok(harness.document.getElementById("xterm-twext-container"));
  assert.ok(harness.document.getElementById("xterm-twext-css"));

  extension.disposeTerminal();

  assert.equal(await pending, "");
  assert.equal(firstTerminal.disposed, true);
  assert.equal(observer.disconnected, true);
  assert.equal(harness.resizeRemoves.length, 1);
  assert.equal(harness.document.getElementById("xterm-twext-container"), null);
  assert.equal(harness.document.getElementById("xterm-twext-css"), null);
  assert.equal(extension.terminalReady(), false);
  assert.equal(harness.resizeObservers.length, 1);

  await extension.initializeTerminal();

  assert.equal(harness.terminals.length, 2);
  assert.equal(extension.terminalReady(), true);
  assert.ok(harness.document.getElementById("xterm-twext-container"));
});

test("RUNTIME_DISPOSED runs the same cleanup and forgets its own listeners", async (t) => {
  const harness = await createReadyHarness(t);
  const terminal = harness.lastTerminal();

  assert.equal(harness.runtime.count("RUNTIME_DISPOSED"), 1);
  harness.runtime.emit("RUNTIME_DISPOSED");

  assert.equal(terminal.disposed, true);
  assert.equal(harness.document.getElementById("xterm-twext-container"), null);
  assert.equal(harness.document.getElementById("xterm-twext-css"), null);
  assert.equal(harness.runtime.count("RUNTIME_DISPOSED"), 0);
  assert.equal(harness.runtime.count("PROJECT_START"), 0);
  assert.equal(harness.runtime.count("PROJECT_STOP_ALL"), 0);
});
