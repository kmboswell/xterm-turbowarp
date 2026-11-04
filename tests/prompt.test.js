import test from "node:test";
import assert from "node:assert/strict";
import { createReadyHarness } from "./helpers.js";

const LEFT = "\x1b[D";
const RIGHT = "\x1b[C";
const UP = "\x1b[A";
const DOWN = "\x1b[B";
const HOME = "\x1b[H";
const END = "\x1b[F";
const DELETE = "\x1b[3~";
const BACKSPACE = "\x7f";
const ENTER = "\r";
const CTRL_C = "\x03";

async function typeLine(harness, text) {
  const answer = harness.extension.promptUser({ TEXT: "> " });
  const terminal = harness.lastTerminal();
  if (text) terminal.emitData(text);
  terminal.emitData(ENTER);
  return answer;
}

test("the cursor can be moved and text inserted in the middle of a line", async (t) => {
  const harness = await createReadyHarness(t);
  const answer = harness.extension.promptUser({ TEXT: "> " });
  const terminal = harness.lastTerminal();

  terminal.emitData("abc");
  terminal.emitData(LEFT);
  terminal.emitData("X");
  terminal.emitData(HOME);
  terminal.emitData("1");
  terminal.emitData(END);
  terminal.emitData("2");
  terminal.emitData(ENTER);

  assert.equal(await answer, "1abXc2");
});

test("Backspace deletes before the cursor and Delete deletes after it", async (t) => {
  const harness = await createReadyHarness(t);
  const answer = harness.extension.promptUser({ TEXT: "> " });
  const terminal = harness.lastTerminal();

  terminal.emitData("abcd");
  terminal.emitData(LEFT);
  terminal.emitData(BACKSPACE);
  terminal.emitData(HOME);
  terminal.emitData(DELETE);
  terminal.emitData(ENTER);

  assert.equal(await answer, "bd");
});

test("Up and Down walk history, de-duplicated and most recent first", async (t) => {
  const harness = await createReadyHarness(t);
  const terminal = harness.lastTerminal();

  assert.equal(await typeLine(harness, "first"), "first");
  assert.equal(await typeLine(harness, "second"), "second");
  assert.equal(await typeLine(harness, "second"), "second");

  const second = harness.extension.promptUser({ TEXT: "> " });
  terminal.emitData(UP);
  terminal.emitData(UP);
  terminal.emitData(DOWN);
  terminal.emitData(ENTER);
  assert.equal(await second, "second");

  const first = harness.extension.promptUser({ TEXT: "> " });
  terminal.emitData(UP);
  terminal.emitData(UP);
  terminal.emitData(UP);
  terminal.emitData(ENTER);
  assert.equal(await first, "first");
});

test("Down past the newest entry restores the line being edited", async (t) => {
  const harness = await createReadyHarness(t);
  const terminal = harness.lastTerminal();

  assert.equal(await typeLine(harness, "old"), "old");

  const answer = harness.extension.promptUser({ TEXT: "> " });
  terminal.emitData("draft");
  terminal.emitData(UP);
  terminal.emitData(DOWN);
  terminal.emitData(ENTER);

  assert.equal(await answer, "draft");
});

test("Ctrl+C resolves the prompt with an empty string and prints ^C", async (t) => {
  const harness = await createReadyHarness(t);
  const answer = harness.extension.promptUser({ TEXT: "> " });
  const terminal = harness.lastTerminal();

  terminal.emitData("abc");
  terminal.emitData(CTRL_C);

  assert.equal(await answer, "");
  assert.ok(harness.output().includes("^C"));
});

test("a multi-line paste completes one prompt and feeds the next prompts", async (t) => {
  const harness = await createReadyHarness(t);
  const terminal = harness.lastTerminal();

  const first = harness.extension.promptUser({ TEXT: "> " });
  terminal.emitData("one\ntwo\nthree");
  assert.equal(await first, "one");

  const second = harness.extension.promptUser({ TEXT: "> " });
  assert.equal(await second, "two");

  const third = harness.extension.promptUser({ TEXT: "> " });
  assert.equal(await third, "three");

  const fourth = harness.extension.promptUser({ TEXT: "> " });
  terminal.emitData("four" + ENTER);
  assert.equal(await fourth, "four");
});

test("editing works on code points, so an emoji is deleted whole", async (t) => {
  const harness = await createReadyHarness(t);
  const answer = harness.extension.promptUser({ TEXT: "> " });
  const terminal = harness.lastTerminal();

  terminal.emitData("a😀b");
  terminal.emitData(LEFT);
  terminal.emitData(BACKSPACE);
  terminal.emitData(ENTER);

  assert.equal(await answer, "ab");
  assert.ok(!harness.output().includes("\ufffd"));
});

test("read key returns names for special keys and the character itself", async (t) => {
  const harness = await createReadyHarness(t);
  const terminal = harness.lastTerminal();

  const enter = harness.extension.readKey();
  terminal.emitData(ENTER);
  assert.equal(await enter, "Enter");

  const arrow = harness.extension.readKey();
  terminal.emitData(UP);
  assert.equal(await arrow, "ArrowUp");

  const escape = harness.extension.readKey();
  terminal.emitData("\x1b");
  assert.equal(await escape, "Escape");

  const character = harness.extension.readKey();
  terminal.emitData("q");
  assert.equal(await character, "q");
});

test("read key records the not-initialized error instead of hanging", async (t) => {
  const { createHarness } = await import("./helpers.js");
  const harness = createHarness();
  t.after(() => harness.close());

  assert.equal(await harness.extension.readKey(), "");
  assert.equal(harness.extension.lastTerminalError(), "Terminal is not initialized.");
});
