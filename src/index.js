import { initializeTerminal } from "./blocks/initializeTerminal.js";
import { showTerminal } from "./blocks/showTerminal.js";
import { hideTerminal } from "./blocks/hideTerminal.js";
import { clearTerminal } from "./blocks/clearTerminal.js";
import { terminalReady } from "./blocks/terminalReady.js";
import { lastTerminalError } from "./blocks/lastTerminalError.js";
import { terminalColumns } from "./blocks/terminalColumns.js";
import { terminalRows } from "./blocks/terminalRows.js";
import { promptUser } from "./blocks/promptUser.js";
import { readKey } from "./blocks/readKey.js";
import { cancelPrompt } from "./blocks/cancelPrompt.js";
import { logMessage } from "./blocks/logMessage.js";
import { setLogLevelFilter } from "./blocks/setLogLevelFilter.js";
import { setLogScopeFilter } from "./blocks/setLogScopeFilter.js";
import { clearLogFilters } from "./blocks/clearLogFilters.js";
import { setTimestamps } from "./blocks/setTimestamps.js";
import { setTimestampStyle } from "./blocks/setTimestampStyle.js";
import { boxText } from "./blocks/boxText.js";
import { divider } from "./blocks/divider.js";
import { dividerLabeled } from "./blocks/dividerLabeled.js";
import { writeToTerminal } from "./blocks/writeToTerminal.js";
import { writeLineToTerminal } from "./blocks/writeLineToTerminal.js";
import { setTheme } from "./blocks/setTheme.js";

export const blocks = {
  initializeTerminal,
  showTerminal,
  hideTerminal,
  clearTerminal,
  terminalReady,
  lastTerminalError,
  terminalColumns,
  terminalRows,
  promptUser,
  readKey,
  cancelPrompt,
  logMessage,
  setLogLevelFilter,
  setLogScopeFilter,
  clearLogFilters,
  setTimestamps,
  setTimestampStyle,
  boxText,
  divider,
  dividerLabeled,
  writeToTerminal,
  writeLineToTerminal,
  setTheme,
};

/**
 * Twext inlines this body into the extension's IIFE, so every declaration below
 * lives in the same scope as the generated block methods. That is the only place
 * shared state can live: block modules are analyzed in isolation, so a handler
 * may only reference these names plus browser globals and `Scratch`.
 */
export function setup() {
  const ANSI = {
    RESET: "\x1b[0m",
    BOLD: "\x1b[1m",
    DIM: "\x1b[2m",
    RED: "\x1b[31m",
    GREEN: "\x1b[32m",
    YELLOW: "\x1b[33m",
    BLUE: "\x1b[34m",
    MAGENTA: "\x1b[35m",
    CYAN: "\x1b[36m",
    WHITE: "\x1b[37m",
    GRAY: "\x1b[90m",
    RED_BG: "\x1b[41m",
    WHITE_BOLD: "\x1b[1;37m",
  };

  const LEVELS = {
    info: { icon: "ℹ", color: ANSI.BLUE, label: "info" },
    success: { icon: "✓", color: ANSI.GREEN, label: "success" },
    warn: { icon: "⚠", color: ANSI.YELLOW, label: "warn" },
    error: { icon: "✗", color: ANSI.RED, label: "error" },
    debug: { icon: "⛭", color: ANSI.MAGENTA, label: "debug" },
    start: { icon: "▶", color: ANSI.CYAN, label: "start" },
    trace: { icon: "›", color: ANSI.GRAY, label: "trace" },
    fatal: { icon: "✕", color: ANSI.WHITE_BOLD + ANSI.RED_BG, label: "fatal" },
  };

  const MAX_LABEL_WIDTH = Math.max(
    ...Object.keys(LEVELS).map((key) => LEVELS[key].label.length),
  );

  const THEMES = {
    "atom-one-dark": {
      background: "#282c34",
      foreground: "#abb2bf",
      cursor: "#528bff",
      black: "#3f4451",
      red: "#e06c75",
      green: "#98c379",
      yellow: "#e5c07b",
      blue: "#61afef",
      magenta: "#c678dd",
      cyan: "#56b6c2",
      white: "#d19a66",
      brightBlack: "#5c6370",
      brightRed: "#e06c75",
      brightGreen: "#98c379",
      brightYellow: "#e5c07b",
      brightBlue: "#61afef",
      brightMagenta: "#c678dd",
      brightCyan: "#56b6c2",
      brightWhite: "#ffffff",
    },
    "atom-one-light": {
      background: "#fafafa",
      foreground: "#383a42",
      cursor: "#526fff",
      black: "#a0a1a7",
      red: "#e45649",
      green: "#50a14f",
      yellow: "#c18401",
      blue: "#4078f2",
      magenta: "#a626a4",
      cyan: "#0184bc",
      white: "#383a42",
      brightBlack: "#a0a1a7",
      brightRed: "#e45649",
      brightGreen: "#50a14f",
      brightYellow: "#c18401",
      brightBlue: "#4078f2",
      brightMagenta: "#a626a4",
      brightCyan: "#0184bc",
      brightWhite: "#fafafa",
    },
    dracula: {
      background: "#282a36",
      foreground: "#f8f8f2",
      cursor: "#f8f8f2",
      black: "#000000",
      red: "#ff5555",
      green: "#50fa7b",
      yellow: "#f1fa8c",
      blue: "#bd93f9",
      magenta: "#ff79c6",
      cyan: "#8be9fd",
      white: "#bfbfbf",
      brightBlack: "#4d4d4d",
      brightRed: "#ff6e67",
      brightGreen: "#5af78e",
      brightYellow: "#f4f99d",
      brightBlue: "#caa9fa",
      brightMagenta: "#ff92d0",
      brightCyan: "#9aedfe",
      brightWhite: "#e6e6e6",
    },
    solarized: {
      background: "#002b36",
      foreground: "#839496",
      cursor: "#93a1a1",
      black: "#073642",
      red: "#dc322f",
      green: "#859900",
      yellow: "#b58900",
      blue: "#268bd2",
      magenta: "#d33682",
      cyan: "#2aa198",
      white: "#eee8d5",
    },
  };

  const DEFAULT_THEME = "atom-one-dark";

  const NOT_READY_ERROR = "Terminal is not initialized.";
  const OUTPUT_BUFFER_LIMIT = 1000;
  const HISTORY_LIMIT = 100;

  // scripts/inline-vendor.js replaces this literal with the bundled xterm and
  // xterm-addon-fit builds during `npm run build`, so starting the terminal never
  // makes a network request. The xterm stylesheet rides along in the same bundle.
  const XTERM_VENDOR_BUNDLE = "@@XTERM_VENDOR_BUNDLE@@";

  // Extra rules on top of the bundled xterm.css. Kept as an array of single-line
  // strings: the build re-indents setup code but never string contents.
  const XTERM_CSS_OVERRIDES = [
    ".xterm-viewport::-webkit-scrollbar { display: none !important; }",
    ".xterm-viewport { -ms-overflow-style: none !important; scrollbar-width: none !important; }",
    ".xterm { width: 100% !important; height: 100% !important; padding: 4px; box-sizing: border-box; }",
    ".xterm .xterm-screen { width: 100% !important; }",
  ].join("\n");

  let container = null;
  let terminal = null;
  let fitAddon = null;
  let resizeObserver = null;
  let initPromise = null;
  let isVisible = false;
  let vendor = null;

  let lastError = "";
  let activeTheme = DEFAULT_THEME;
  let timestampsEnabled = false;
  let timestampStyle = "clock";
  // "Project started" is when the project began running, not when the extension
  // happened to load: setup() runs once at load, and the runtime's PROJECT_START
  // event (green flag / project start) refreshes this instant. Uptime
  // timestamps count from it.
  let projectStartedAt = Date.now();
  let levelFilter = null;
  let scopeFilter = null;
  const promptQueue = [];
  const keyQueue = [];
  // Lines left over from a multi-line paste, handed to the following prompts.
  const pendingLines = [];
  // Recently submitted non-empty lines, oldest first, de-duplicated.
  const history = [];
  // Output produced before the terminal exists is held here as already-formatted
  // entries, so the filters and timestamp style from write time still apply when
  // it is flushed. Bounded so a project that never initializes cannot grow it
  // without limit; the oldest entry is dropped first.
  const outputQueue = [];

  function errorText(err) {
    if (err && err.message) return String(err.message);
    return String(err === undefined || err === null ? "unknown error" : err);
  }

  // Every block that needs a live terminal goes through this, so a failure is
  // recorded in `last terminal error` instead of silently doing nothing.
  function requireTerminal() {
    if (terminal) return true;
    lastError = NOT_READY_ERROR;
    return false;
  }

  function getStageCanvas() {
    const runtime =
      Scratch.vm && Scratch.vm.runtime && Scratch.vm.runtime.renderer
        ? Scratch.vm.runtime.renderer
        : null;
    return (runtime && runtime.canvas) || document.querySelector("canvas");
  }

  // The inlined bundle is plain code: calling this function runs it once. No
  // <script> tag, string-compiled code or Blob URL is involved, so it cannot be
  // blocked by a missing inline-script permission.
  function getVendor() {
    if (vendor) return vendor;
    // Test seam: a fake implementation can be installed before the first
    // initialize so tests never evaluate the full xterm bundle.
    const override =
      typeof window !== "undefined" ? window.__XTERM_TEST_VENDOR__ : null;
    if (override) {
      vendor = override;
      return vendor;
    }
    if (typeof XTERM_VENDOR_BUNDLE !== "function") {
      throw new Error("The bundled xterm code is missing. Run `npm run build`.");
    }
    vendor = XTERM_VENDOR_BUNDLE();
    return vendor;
  }

  function injectStyles() {
    if (document.getElementById("xterm-twext-css")) return;
    const style = document.createElement("style");
    style.id = "xterm-twext-css";
    style.textContent = (getVendor().css || "") + "\n" + XTERM_CSS_OVERRIDES;
    document.head.appendChild(style);
  }

  function safeFit() {
    if (!fitAddon || !terminal || !isVisible) return;
    try {
      const dims = fitAddon.proposeDimensions();
      if (dims && dims.cols > 0 && dims.rows > 0) {
        fitAddon.fit();
      }
    } catch (err) {
      // xterm throws while the overlay is mid-transition; the next refit recovers.
    }
  }

  function ensureContainer() {
    if (container) return container;

    const canvas = getStageCanvas();
    if (!canvas) return null;
    const stage = canvas.parentElement;
    if (!stage) return null;

    container = document.createElement("div");
    container.style.position = "absolute";
    container.style.top = "0";
    container.style.left = "0";
    container.style.width = "100%";
    container.style.height = "100%";
    container.style.backgroundColor = THEMES[activeTheme].background;
    container.style.zIndex = "100";
    container.style.display = "none";
    container.style.overflow = "hidden";

    if (getComputedStyle(stage).position === "static") {
      stage.style.position = "relative";
    }
    stage.appendChild(container);

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        if (isVisible) {
          requestAnimationFrame(safeFit);
        }
      });
      resizeObserver.observe(container);
    }
    return container;
  }

  function onWindowResize() {
    if (isVisible) {
      setTimeout(safeFit, 50);
    }
  }

  // Key sequences xterm reports through onData. Longer sequences come first so
  // "\x1b[3~" is not mistaken for a bare Escape.
  const KEY_SEQUENCES = [
    ["\x1b[200~", "PasteStart"],
    ["\x1b[201~", "PasteEnd"],
    ["\x1b[1;5C", "CtrlArrowRight"],
    ["\x1b[1;5D", "CtrlArrowLeft"],
    ["\x1b[3~", "Delete"],
    ["\x1b[2~", "Insert"],
    ["\x1b[5~", "PageUp"],
    ["\x1b[6~", "PageDown"],
    ["\x1b[1~", "Home"],
    ["\x1b[4~", "End"],
    ["\x1b[7~", "Home"],
    ["\x1b[8~", "End"],
    ["\x1b[A", "ArrowUp"],
    ["\x1b[B", "ArrowDown"],
    ["\x1b[C", "ArrowRight"],
    ["\x1b[D", "ArrowLeft"],
    ["\x1b[H", "Home"],
    ["\x1b[F", "End"],
    ["\x1bOH", "Home"],
    ["\x1bOF", "End"],
    ["\x1b", "Escape"],
  ];

  function readEscape(text, start) {
    for (let i = 0; i < KEY_SEQUENCES.length; i++) {
      const sequence = KEY_SEQUENCES[i][0];
      if (text.startsWith(sequence, start)) {
        return { name: KEY_SEQUENCES[i][1], length: sequence.length };
      }
    }
    // Unknown CSI sequences are consumed whole so their bytes are never typed
    // into the line as literal text.
    const match = /^\x1b\[[0-9;]*[A-Za-z~]/.exec(text.slice(start));
    if (match) return { name: "", length: match[0].length };
    return null;
  }

  function toCodePoints(text) {
    return Array.from(String(text));
  }

  function promptValue(prompt) {
    return prompt.buffer.join("");
  }

  function rememberHistory(value) {
    const text = String(value);
    if (text === "") return;
    const existing = history.indexOf(text);
    if (existing !== -1) history.splice(existing, 1);
    history.push(text);
    if (history.length > HISTORY_LIMIT) history.shift();
  }

  function redrawPrompt(prompt) {
    if (!terminal) return;
    const before = prompt.buffer.slice(0, prompt.cursor).join("");
    const after = prompt.buffer.slice(prompt.cursor).join("");
    // Draw up to the cursor, save it, paint the tail, erase whatever a longer
    // previous line left behind, then restore the cursor. The save/restore pair
    // avoids measuring cell widths, which matters for wide characters.
    terminal.write("\r\x1b[0K" + prompt.text + before);
    terminal.write("\x1b7");
    if (after) terminal.write(after);
    terminal.write("\x1b[0K\x1b8");
  }

  function setPromptText(prompt, text) {
    prompt.buffer = toCodePoints(text);
    prompt.cursor = prompt.buffer.length;
    redrawPrompt(prompt);
  }

  function insertPromptText(prompt, text) {
    const points = toCodePoints(text);
    if (points.length === 0) return;
    prompt.buffer = prompt.buffer
      .slice(0, prompt.cursor)
      .concat(points, prompt.buffer.slice(prompt.cursor));
    prompt.cursor += points.length;
    redrawPrompt(prompt);
  }

  function deleteBackward(prompt) {
    if (prompt.cursor === 0) return;
    prompt.buffer.splice(prompt.cursor - 1, 1);
    prompt.cursor -= 1;
    redrawPrompt(prompt);
  }

  function deleteForward(prompt) {
    if (prompt.cursor >= prompt.buffer.length) return;
    prompt.buffer.splice(prompt.cursor, 1);
    redrawPrompt(prompt);
  }

  function historyUp(prompt) {
    if (history.length === 0) return;
    if (prompt.historyIndex === null) {
      prompt.draft = prompt.buffer.slice();
      prompt.historyIndex = history.length - 1;
    } else if (prompt.historyIndex > 0) {
      prompt.historyIndex -= 1;
    } else {
      return;
    }
    setPromptText(prompt, history[prompt.historyIndex]);
  }

  function historyDown(prompt) {
    if (prompt.historyIndex === null) return;
    if (prompt.historyIndex < history.length - 1) {
      prompt.historyIndex += 1;
      setPromptText(prompt, history[prompt.historyIndex]);
      return;
    }
    prompt.historyIndex = null;
    const draft = prompt.draft || [];
    prompt.draft = null;
    prompt.buffer = draft;
    prompt.cursor = draft.length;
    redrawPrompt(prompt);
  }

  function submitPrompt(prompt) {
    if (promptQueue[0] !== prompt) return;
    const value = promptValue(prompt);
    terminal.write("\r\n");
    rememberHistory(value);
    promptQueue.shift();
    prompt.resolve(value);
    startNextPrompt();
  }

  function cancelActivePrompt() {
    const prompt = promptQueue[0];
    if (!prompt) return;
    terminal.write("^C\r\n");
    promptQueue.shift();
    prompt.resolve("");
    startNextPrompt();
  }

  function handlePromptKey(prompt, name) {
    if (name === "ArrowLeft") {
      if (prompt.cursor > 0) {
        prompt.cursor -= 1;
        redrawPrompt(prompt);
      }
    } else if (name === "ArrowRight") {
      if (prompt.cursor < prompt.buffer.length) {
        prompt.cursor += 1;
        redrawPrompt(prompt);
      }
    } else if (name === "Home") {
      prompt.cursor = 0;
      redrawPrompt(prompt);
    } else if (name === "End") {
      prompt.cursor = prompt.buffer.length;
      redrawPrompt(prompt);
    } else if (name === "Delete") {
      deleteForward(prompt);
    } else if (name === "Backspace") {
      deleteBackward(prompt);
    } else if (name === "ArrowUp") {
      historyUp(prompt);
    } else if (name === "ArrowDown") {
      historyDown(prompt);
    }
  }

  function handlePromptCharacter(prompt, character) {
    if (character === "\r" || character === "\n") {
      submitPrompt(prompt);
    } else if (character === "\x03") {
      cancelActivePrompt();
    } else if (character === "\x7f" || character === "\b") {
      deleteBackward(prompt);
    } else if (character === "\t") {
      insertPromptText(prompt, "  ");
    } else if (character >= " ") {
      insertPromptText(prompt, character);
    }
  }

  function parseInputChunk(text, prompt) {
    let index = 0;
    while (index < text.length) {
      if (text[index] === "\x1b") {
        const escape = readEscape(text, index);
        if (escape) {
          if (escape.name && escape.name !== "PasteStart" && escape.name !== "PasteEnd") {
            handlePromptKey(prompt, escape.name);
          }
          index += escape.length;
        } else {
          index += 1;
        }
      } else {
        const character = String.fromCodePoint(text.codePointAt(index));
        index += character.length;
        handlePromptCharacter(prompt, character);
      }
      // Submitting or cancelling replaces the active prompt; stop feeding it.
      if (promptQueue[0] !== prompt) return;
    }
  }

  function describeKey(data) {
    if (!data) return "";
    const escape = readEscape(data, 0);
    if (escape) return escape.name;
    const character = String.fromCodePoint(data.codePointAt(0));
    if (character === "\r" || character === "\n") return "Enter";
    if (character === "\t") return "Tab";
    if (character === "\x7f" || character === "\b") return "Backspace";
    if (character === "\x03") return "Ctrl+C";
    return character >= " " ? character : "";
  }

  function handleKeyInput(data) {
    if (keyQueue.length === 0) return;
    const name = describeKey(data);
    if (!name) return;
    const resolve = keyQueue.shift();
    resolve(name);
    if (keyQueue.length === 0 && promptQueue.length === 0) {
      setInputEnabled(false);
    }
  }

  function waitForKey() {
    if (!requireTerminal()) return "";
    setInputEnabled(true);
    return new Promise((resolve) => {
      keyQueue.push(resolve);
    });
  }

  function onTerminalData(data) {
    // Bracketed paste markers wrap pasted text; they are not part of it.
    const raw = String(data).replace(/\x1b\[20[01]~/g, "");
    if (promptQueue.length === 0) {
      handleKeyInput(raw);
      return;
    }

    const prompt = promptQueue[0];
    if (/\r|\n/.test(raw)) {
      // A paste with several lines completes this prompt with the first line.
      // The rest are queued before the submit so a prompt that is already
      // waiting consumes them in order instead of losing them.
      const lines = raw.split(/\r\n|\r|\n/);
      const rest = lines.slice(1);
      if (rest.length > 0 && rest[rest.length - 1] === "") rest.pop();
      for (let i = 0; i < rest.length; i++) {
        pendingLines.push(rest[i]);
      }
      parseInputChunk(lines[0], prompt);
      if (promptQueue[0] === prompt) {
        submitPrompt(prompt);
      }
      return;
    }

    parseInputChunk(raw, prompt);
  }

  function init() {
    if (terminal) return Promise.resolve(terminal);
    // Cache the in-flight attempt so overlapping "initialize terminal" blocks
    // cannot both build a terminal.
    if (initPromise) return initPromise;

    initPromise = Promise.resolve()
      .then(() => {
        injectStyles();
        const host = ensureContainer();
        if (!host) {
          throw new Error("Xterm could not find the stage canvas.");
        }

        const bundle = getVendor();
        terminal = new bundle.Terminal({
          // Blinking is off by default; it is enabled only for the duration of a prompt.
          cursorBlink: false,
          // Block keyboard input unless a prompt is waiting for it.
          disableStdin: true,
          convertEol: true,
          fontFamily: "monospace",
          fontSize: 14,
          theme: THEMES[activeTheme],
        });

        fitAddon = new bundle.FitAddon.FitAddon();
        terminal.loadAddon(fitAddon);
        terminal.open(host);
        window.addEventListener("resize", onWindowResize);
        terminal.onData(onTerminalData);
        setTimeout(safeFit, 50);
        // Anything written while the terminal was starting goes out now, before
        // any later output can overtake it.
        flushOutput();
        lastError = "";
        return terminal;
      })
      .catch((err) => {
        // Allow a later "initialize terminal" block to retry, and keep the
        // reason so `last terminal error` can explain the silence.
        initPromise = null;
        lastError = "Could not initialize the terminal: " + errorText(err);
        throw err;
      });

    return initPromise;
  }

  function show() {
    if (!requireTerminal()) return;
    if (!container) return;
    container.style.display = "block";
    isVisible = true;
    // Refit on the next frame and once more after the layout has settled,
    // which is what fullscreen and stage-scaling changes need.
    requestAnimationFrame(() => {
      safeFit();
      if (terminal) terminal.focus();
    });
    setTimeout(safeFit, 100);
  }

  function hide() {
    if (!requireTerminal()) return;
    if (!container) return;
    container.style.display = "none";
    isVisible = false;
  }

  function setInputEnabled(enabled) {
    if (!terminal) return;
    terminal.options.cursorBlink = enabled;
    terminal.options.disableStdin = !enabled;
    if (enabled) {
      terminal.focus();
    }
  }

  function startNextPrompt() {
    if (!terminal) return;
    // Lines left over from a paste are consumed here, immediately completing as
    // many prompts as there are lines for.
    while (promptQueue.length > 0) {
      const prompt = promptQueue[0];
      if (pendingLines.length > 0) {
        const line = pendingLines.shift();
        terminal.write(prompt.text + line + "\r\n");
        rememberHistory(line);
        promptQueue.shift();
        prompt.resolve(line);
        continue;
      }
      if (prompt.text) {
        terminal.write(prompt.text);
      }
      setInputEnabled(true);
      return;
    }
    setInputEnabled(false);
  }

  function openPrompt(promptText, util) {
    // A prompt with no terminal can never be answered, so resolve it right away
    // and leave the reason in `last terminal error`.
    if (!requireTerminal()) {
      return Promise.resolve("");
    }
    const text = String(promptText === undefined || promptText === null ? "" : promptText);
    return new Promise((resolve) => {
      // util is only valid during the block's synchronous execution, so the
      // target reference is captured now and never re-read later.
      promptQueue.push({
        text,
        // The line is edited as code points, never UTF-16 units, so operations
        // like backspace cannot split a surrogate pair (emoji included).
        buffer: [],
        cursor: 0,
        historyIndex: null,
        draft: null,
        resolve,
        target: util ? util.target : null,
      });
      if (promptQueue.length === 1) {
        startNextPrompt();
      }
    });
  }

  function cancelPrompts(match) {
    if (promptQueue.length === 0) return;
    const headWasDropped = match(promptQueue[0]);
    const kept = [];
    for (let i = 0; i < promptQueue.length; i++) {
      const prompt = promptQueue[i];
      if (match(prompt)) {
        // Resolve rather than drop so a script waiting on this prompt always
        // continues, even if its thread outlives the cancellation.
        prompt.resolve("");
      } else {
        kept.push(prompt);
      }
    }
    promptQueue.length = 0;
    for (let i = 0; i < kept.length; i++) {
      promptQueue.push(kept[i]);
    }
    if (headWasDropped) {
      startNextPrompt();
    }
  }

  function parseFilter(input) {
    const text = String(input === undefined || input === null ? "" : input).trim();
    if (text === "" || text === "*") return null;
    return text
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part);
  }

  function pushOutput(entry) {
    outputQueue.push(entry);
    if (outputQueue.length > OUTPUT_BUFFER_LIMIT) {
      outputQueue.shift();
    }
  }

  function writeOutput(entry) {
    if (!terminal) {
      pushOutput(entry);
      return;
    }
    if (entry.kind === "writeln") {
      terminal.writeln(entry.text);
    } else {
      terminal.write(entry.text);
    }
  }

  function flushOutput() {
    if (!terminal) return;
    while (outputQueue.length > 0) {
      const entry = outputQueue.shift();
      if (entry.kind === "writeln") {
        terminal.writeln(entry.text);
      } else {
        terminal.write(entry.text);
      }
    }
  }

  function writeRaw(text) {
    writeOutput({ kind: "write", text: String(text) });
  }

  function writeLine(text) {
    writeOutput({ kind: "writeln", text: String(text) });
  }

  function formatTimestamp() {
    if (!timestampsEnabled) return "";
    if (timestampStyle === "uptime") {
      const seconds = Math.max(0, Date.now() - projectStartedAt) / 1000;
      return ANSI.DIM + "[" + seconds.toFixed(4) + "]" + ANSI.RESET + " ";
    }
    return ANSI.DIM + new Date().toLocaleTimeString() + ANSI.RESET + " ";
  }

  function formatLog(args) {
    const levelKey = String(args.LEVEL);
    const scope = String(
      args.SCOPE === undefined || args.SCOPE === null ? "" : args.SCOPE,
    ).trim();

    if (levelFilter && levelFilter.indexOf(levelKey) === -1) return null;
    if (scopeFilter && scopeFilter.indexOf(scope) === -1) return null;

    const config = LEVELS[levelKey] || LEVELS.info;
    const timestamp = formatTimestamp();
    const label = config.label.padEnd(MAX_LABEL_WIDTH);
    const prefix = timestamp + config.color + ANSI.BOLD + config.icon + " " + label + ANSI.RESET;
    const scopeFormat = scope ? ANSI.DIM + "[" + scope + "]" + ANSI.RESET + " " : "";

    return { kind: "writeln", text: prefix + " " + scopeFormat + String(args.TEXT) };
  }

  function log(args) {
    const entry = formatLog(args);
    if (!entry) return;
    writeOutput(entry);
  }

  function drawBox(text) {
    if (!requireTerminal()) return;

    const cols = Math.max(10, terminal.cols || 80);
    const maxInnerWidth = Math.max(1, cols - 4);
    const rawLines = String(text).split("\n");
    const lines = [];

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];
      if (line.length === 0) {
        lines.push("");
        continue;
      }
      let rest = line;
      while (rest.length > maxInnerWidth) {
        lines.push(rest.slice(0, maxInnerWidth));
        rest = rest.slice(maxInnerWidth);
      }
      if (rest.length > 0) {
        lines.push(rest);
      }
    }

    const boxWidth = Math.max(...lines.map((line) => line.length));
    const top = "┌" + "─".repeat(boxWidth + 2) + "┐";
    const bottom = "└" + "─".repeat(boxWidth + 2) + "┘";

    terminal.writeln(ANSI.CYAN + top + ANSI.RESET);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const padding = boxWidth - line.length;
      const left = Math.floor(padding / 2);
      const right = padding - left;
      terminal.writeln(
        ANSI.CYAN +
          "│ " +
          ANSI.RESET +
          " ".repeat(left) +
          line +
          " ".repeat(right) +
          ANSI.CYAN +
          " │" +
          ANSI.RESET,
      );
    }
    terminal.writeln(ANSI.CYAN + bottom + ANSI.RESET);
  }

  function drawRule() {
    if (!requireTerminal()) return;
    const width = Math.max(1, terminal.cols || 80);
    terminal.writeln(ANSI.DIM + "─".repeat(width) + ANSI.RESET);
  }

  function drawRuleLabeled(text) {
    if (!requireTerminal()) return;
    const label = " " + String(text) + " ";
    const width = Math.max(1, terminal.cols || 80);

    if (label.length >= width) {
      terminal.writeln(ANSI.DIM + label.slice(0, width) + ANSI.RESET);
      return;
    }

    const left = Math.floor((width - label.length) / 2);
    const right = width - label.length - left;
    terminal.writeln(ANSI.DIM + "─".repeat(left) + label + "─".repeat(right) + ANSI.RESET);
  }

  function applyTheme(name) {
    activeTheme = THEMES[String(name).toLowerCase()] ? String(name).toLowerCase() : DEFAULT_THEME;
    if (!terminal) return;
    terminal.options.theme = THEMES[activeTheme];
    if (container) {
      container.style.backgroundColor = THEMES[activeTheme].background;
    }
  }

  // A thread blocked on a prompt can only be stopped from outside, and every
  // external stop path in scratch-vm emits one of these two events, so this is
  // what keeps a dead thread from blocking the queue forever.
  const runtime = Scratch.vm && Scratch.vm.runtime;
  if (runtime && typeof runtime.on === "function") {
    const onStopAll = () => cancelPrompts(() => true);
    const onStopForTarget = (target) =>
      cancelPrompts((prompt) => prompt.target === target);
    const onProjectStart = () => {
      projectStartedAt = Date.now();
    };
    runtime.on("PROJECT_STOP_ALL", onStopAll);
    runtime.on("STOP_FOR_TARGET", onStopForTarget);
    runtime.on("PROJECT_START", onProjectStart);
    runtime.on("RUNTIME_DISPOSED", () => {
      if (typeof runtime.removeListener === "function") {
        runtime.removeListener("PROJECT_STOP_ALL", onStopAll);
        runtime.removeListener("STOP_FOR_TARGET", onStopForTarget);
        runtime.removeListener("PROJECT_START", onProjectStart);
      }
    });
  }
}
