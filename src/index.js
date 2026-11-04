import { initializeTerminal } from "./blocks/initializeTerminal.js";
import { showTerminal } from "./blocks/showTerminal.js";
import { hideTerminal } from "./blocks/hideTerminal.js";
import { clearTerminal } from "./blocks/clearTerminal.js";
import { promptUser } from "./blocks/promptUser.js";
import { cancelPrompt } from "./blocks/cancelPrompt.js";
import { logMessage } from "./blocks/logMessage.js";
import { setLogLevelFilter } from "./blocks/setLogLevelFilter.js";
import { setLogScopeFilter } from "./blocks/setLogScopeFilter.js";
import { clearLogFilters } from "./blocks/clearLogFilters.js";
import { setTimestamps } from "./blocks/setTimestamps.js";
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
  promptUser,
  cancelPrompt,
  logMessage,
  setLogLevelFilter,
  setLogScopeFilter,
  clearLogFilters,
  setTimestamps,
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

  let activeTheme = DEFAULT_THEME;
  let timestampsEnabled = false;
  let levelFilter = null;
  let scopeFilter = null;
  const promptQueue = [];

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

  function onTerminalData(data) {
    const prompt = promptQueue[0];
    if (!prompt || data.startsWith("\x1b")) return;
    for (const character of data) {
      if (character === "\r") {
        terminal.write("\r\n");
        promptQueue.shift();
        prompt.resolve(prompt.buffer);
        startNextPrompt();
        return;
      } else if (character === "\x7f") {
        if (prompt.buffer.length > 0) {
          prompt.buffer = prompt.buffer.slice(0, -1);
          terminal.write("\b \b");
        }
      } else if (character >= " " && !(character >= "\x80" && character <= "\x9f")) {
        prompt.buffer += character;
        terminal.write(character);
      }
    }
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
        return terminal;
      })
      .catch((err) => {
        // Allow a later "initialize terminal" block to retry.
        initPromise = null;
        throw err;
      });

    return initPromise;
  }

  function show() {
    if (!container || !terminal) return;
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
    const prompt = promptQueue[0];
    if (!prompt) {
      setInputEnabled(false);
      return;
    }
    if (prompt.text) {
      terminal.write(prompt.text);
    }
    setInputEnabled(true);
  }

  function openPrompt(promptText, util) {
    if (!terminal) {
      return Promise.resolve("");
    }
    const text = String(promptText === undefined || promptText === null ? "" : promptText);
    return new Promise((resolve) => {
      // util is only valid during the block's synchronous execution, so the
      // target reference is captured now and never re-read later.
      promptQueue.push({ text, buffer: "", resolve, target: util ? util.target : null });
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

  function writeRaw(text) {
    if (terminal) {
      terminal.write(text);
    }
  }

  function writeLine(text) {
    if (terminal) {
      terminal.writeln(text);
    }
  }

  function log(args) {
    if (!terminal) return;

    const levelKey = String(args.LEVEL);
    const scope = String(
      args.SCOPE === undefined || args.SCOPE === null ? "" : args.SCOPE,
    ).trim();

    if (levelFilter && levelFilter.indexOf(levelKey) === -1) return;
    if (scopeFilter && scopeFilter.indexOf(scope) === -1) return;

    const config = LEVELS[levelKey] || LEVELS.info;
    const timestamp = timestampsEnabled
      ? ANSI.DIM + new Date().toLocaleTimeString() + ANSI.RESET + " "
      : "";
    const label = config.label.padEnd(MAX_LABEL_WIDTH);
    const prefix = timestamp + config.color + ANSI.BOLD + config.icon + " " + label + ANSI.RESET;
    const scopeFormat = scope ? ANSI.DIM + "[" + scope + "]" + ANSI.RESET + " " : "";

    terminal.writeln(prefix + " " + scopeFormat + String(args.TEXT));
  }

  function drawBox(text) {
    if (!terminal) return;

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
    if (!terminal) return;
    const width = Math.max(1, terminal.cols || 80);
    terminal.writeln(ANSI.DIM + "─".repeat(width) + ANSI.RESET);
  }

  function drawRuleLabeled(text) {
    if (!terminal) return;
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
    runtime.on("PROJECT_STOP_ALL", onStopAll);
    runtime.on("STOP_FOR_TARGET", onStopForTarget);
    runtime.on("RUNTIME_DISPOSED", () => {
      if (typeof runtime.removeListener === "function") {
        runtime.removeListener("PROJECT_STOP_ALL", onStopAll);
        runtime.removeListener("STOP_FOR_TARGET", onStopForTarget);
      }
    });
  }
}
