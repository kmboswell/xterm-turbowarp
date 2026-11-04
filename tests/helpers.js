import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const BUNDLE_PATH = fileURLToPath(new URL("../dist/extension.js", import.meta.url));

export class FakeTerminal {
  constructor(options = {}) {
    this.options = { ...options };
    this.cols = 80;
    this.rows = 24;
    this.output = [];
    this.dataHandlers = [];
    this.addons = [];
    this.disposed = false;
    this.cleared = false;
    this.focusCount = 0;
    this.host = null;
  }

  open(host) {
    this.host = host;
  }

  loadAddon(addon) {
    this.addons.push(addon);
  }

  onData(handler) {
    this.dataHandlers.push(handler);
    return { dispose() {} };
  }

  write(text) {
    this.output.push(String(text));
  }

  writeln(text) {
    this.output.push(String(text) + "\r\n");
  }

  clear() {
    this.cleared = true;
  }

  focus() {
    this.focusCount += 1;
  }

  dispose() {
    this.disposed = true;
  }

  emitData(data) {
    for (const handler of [...this.dataHandlers]) {
      handler(data);
    }
  }

  text() {
    return this.output.join("");
  }
}

export class FakeFitAddon {
  constructor() {
    this.fitCount = 0;
  }

  proposeDimensions() {
    return { cols: 80, rows: 24 };
  }

  fit() {
    this.fitCount += 1;
  }
}

export class FakeRuntime {
  constructor() {
    this.listeners = new Map();
  }

  on(event, handler) {
    const handlers = this.listeners.get(event) ?? [];
    handlers.push(handler);
    this.listeners.set(event, handlers);
  }

  removeListener(event, handler) {
    const handlers = this.listeners.get(event) ?? [];
    this.listeners.set(
      event,
      handlers.filter((candidate) => candidate !== handler),
    );
  }

  emit(event, ...args) {
    for (const handler of [...(this.listeners.get(event) ?? [])]) {
      handler(...args);
    }
  }

  count(event) {
    return (this.listeners.get(event) ?? []).length;
  }
}

const BLOCK_TYPES = {
  COMMAND: "command",
  REPORTER: "reporter",
  BOOLEAN: "boolean",
  HAT: "hat",
  EVENT: "event",
  LOOP: "loop",
  CONDITIONAL: "conditional",
};

const ARGUMENT_TYPES = {
  STRING: "string",
  NUMBER: "number",
  BOOLEAN: "boolean",
  ANGLE: "angle",
  COLOR: "color",
  MATRIX: "matrix",
  NOTE: "note",
  IMAGE: "image",
  COSTUME: "costume",
  SOUND: "sound",
};

/**
 * xterm needs matchMedia and a canvas 2D context to open. jsdom has neither, so
 * the context is a permissive stub: xterm only needs the calls to exist, and the
 * test using this path asserts construction, not rendered pixels.
 */
function installBrowserStubs(window) {
  window.matchMedia = (media) => ({
    matches: false,
    media,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  });
  const context = new Proxy(
    {
      measureText: () => ({ width: 8 }),
      createLinearGradient: () => ({ addColorStop() {} }),
      getImageData: () => ({ data: new Uint8ClampedArray(4) }),
      createImageData: () => ({ data: new Uint8ClampedArray(4) }),
    },
    {
      get(target, key) {
        return key in target ? target[key] : () => {};
      },
      set() {
        return true;
      },
    },
  );
  window.HTMLCanvasElement.prototype.getContext = function () {
    context.canvas = this;
    return context;
  };
}

/**
 * Load the built extension in a jsdom window. A fake Terminal (and fit addon) is
 * installed through the extension's test seam, so the real 280 kB xterm bundle
 * is present in the file but never evaluated by these tests.
 *
 * `failInit` makes the fake Terminal constructor throw, and `failOpen` makes
 * `open()` throw, which is how the init failure paths are exercised; the
 * `*Times` options allow the failure to be one-shot so a retry can succeed.
 * `useRealVendor` skips the seam and evaluates the inlined xterm bundle for
 * real. `now` fixes the clock before setup runs, so uptime is deterministic.
 */
export function createHarness({
  failInit = null,
  failInitTimes = Infinity,
  failOpen = null,
  failOpenTimes = Infinity,
  useRealVendor = false,
  now = null,
} = {}) {
  const dom = new JSDOM(
    '<!doctype html><html><body><div id="stage"><canvas id="stage-canvas"></canvas></div></body></html>',
    { runScripts: "outside-only", pretendToBeVisual: true },
  );
  const { window } = dom;
  const document = window.document;
  const realDateNow = window.Date.now;

  if (now) {
    window.Date.now = () => now();
  }

  const terminals = [];
  const resizeObservers = [];
  const resizeAdds = [];
  const resizeRemoves = [];

  let initFailures = failInit ? failInitTimes : 0;
  let openFailures = failOpen ? failOpenTimes : 0;

  class TestTerminal extends FakeTerminal {
    constructor(options) {
      if (initFailures > 0) {
        initFailures -= 1;
        throw new Error(failInit);
      }
      super(options);
      terminals.push(this);
    }

    open(host) {
      if (openFailures > 0) {
        openFailures -= 1;
        throw new Error(failOpen);
      }
      super.open(host);
    }
  }

  window.ResizeObserver = class {
    constructor(callback) {
      this.callback = callback;
      this.disconnected = false;
      resizeObservers.push(this);
    }

    observe() {}

    disconnect() {
      this.disconnected = true;
    }
  };

  window.requestAnimationFrame = (callback) => {
    callback(0);
    return 1;
  };
  window.cancelAnimationFrame = () => {};

  const addEventListener = window.addEventListener.bind(window);
  const removeEventListener = window.removeEventListener.bind(window);
  window.addEventListener = (type, listener, options) => {
    if (type === "resize") resizeAdds.push(listener);
    addEventListener(type, listener, options);
  };
  window.removeEventListener = (type, listener, options) => {
    if (type === "resize") resizeRemoves.push(listener);
    removeEventListener(type, listener, options);
  };

  const runtime = new FakeRuntime();
  runtime.renderer = { canvas: document.getElementById("stage-canvas") };

  let extension = null;
  window.Scratch = {
    BlockType: BLOCK_TYPES,
    ArgumentType: ARGUMENT_TYPES,
    extensions: {
      unsandboxed: true,
      register: (registered) => {
        extension = registered;
      },
    },
    vm: { runtime },
  };

  if (useRealVendor) {
    installBrowserStubs(window);
  } else {
    window.__XTERM_TEST_VENDOR__ = {
      Terminal: TestTerminal,
      FitAddon: { FitAddon: FakeFitAddon },
      css: ".xterm-test { color: inherit; }",
    };
  }

  window.eval(readFileSync(BUNDLE_PATH, "utf8"));

  return {
    window,
    document,
    runtime,
    terminals,
    resizeObservers,
    resizeAdds,
    resizeRemoves,
    realDateNow,
    stage: document.getElementById("stage"),
    get extension() {
      return extension;
    },
    lastTerminal() {
      return terminals.length > 0 ? terminals[terminals.length - 1] : null;
    },
    output() {
      const terminal = this.lastTerminal();
      return terminal ? terminal.text() : "";
    },
    close() {
      window.close();
    },
  };
}

/** Load the extension, initialize the terminal and return the harness. */
export async function createReadyHarness(t, options) {
  const harness = createHarness(options);
  t.after(() => harness.close());
  await harness.extension.initializeTerminal();
  return harness;
}
