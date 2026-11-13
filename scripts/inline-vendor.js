/**
 * Post-build step: replace the vendor placeholder that src/index.js leaves in
 * the compiled extension with the actual @xterm/xterm and @xterm/addon-fit sources.
 *
 * The placeholder is the string literal `"@@XTERM_VENDOR_BUNDLE@@"`, which sits
 * in an expression position:
 *
 *   const XTERM_VENDOR_BUNDLE = "@@XTERM_VENDOR_BUNDLE@@";
 *
 * so the replacement is a function expression that returns the constructors and
 * the stylesheet. The extension calls it at runtime. Nothing is evaluated from a
 * string: no eval(), no new Function(), no Blob URL, no <script> element and no
 * network request, which is what makes this work under TurboWarp's CSP.
 *
 * Both libraries are UMD bundles that detect CommonJS through `exports` and
 * `module`. Wrapping each one in a function whose parameters are named
 * `exports`, `module` and `define` takes the CommonJS branch, so the build lands
 * in a private object instead of overwriting `self.Terminal` for other
 * extensions on the page.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";

const DIST_FILE = resolve("dist/extension.js");
const VENDOR_DIR = resolve("vendor");
const PLACEHOLDER = '"@@XTERM_VENDOR_BUNDLE@@"';

// The registry compiles this from the published source and installs nothing, so
// the libraries are read from the committed copies in vendor/ rather than from
// node_modules. `npm run sync-vendor` refreshes them from the pinned versions.
function readVendorFile(name) {
  const path = resolve(VENDOR_DIR, name);
  if (!existsSync(path)) {
    throw new Error(`Missing ${path}. Run \`npm run sync-vendor\` first.`);
  }
  return readFileSync(path, "utf8").replace(/\n?\/\/[#@] sourceMappingURL=.*$/gm, "").trim();
}

const versions = JSON.parse(readVendorFile("versions.json"));
const xtermVersion = versions["@xterm/xterm"];
const fitVersion = versions["@xterm/addon-fit"];

const BANNER = `/*!
 * Bundled dependencies, inlined at build time by scripts/inline-vendor.js.
 *
 * @xterm/xterm ${xtermVersion}
 * Copyright (c) 2017-2019, The xterm.js authors (https://github.com/xtermjs/xterm.js)
 * Copyright (c) 2014-2016, SourceLair Private Company (https://www.sourcelair.com)
 * Copyright (c) 2012-2013, Christopher Jeffrey (https://github.com/chjj/)
 * MIT licence.
 *
 * @xterm/addon-fit ${fitVersion}
 * Copyright (c) 2019, The xterm.js authors (https://github.com/xtermjs/xterm.js)
 * MIT licence.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */`;

function commonJsWrapper(variable, source) {
  return [
    `  var ${variable} = (function (exports, module, define) {`,
    source,
    "    return module.exports;",
    "  })({}, { exports: {} }, undefined);",
  ].join("\n");
}

const xtermSource = readVendorFile("xterm.js");
const fitSource = readVendorFile("addon-fit.js");
const css = readVendorFile("xterm.css");

const payload = [
  "(function () {",
  BANNER,
  commonJsWrapper("__xterm", xtermSource),
  commonJsWrapper("__fitAddon", fitSource),
  "  return {",
  "    Terminal: __xterm.Terminal,",
  "    FitAddon: __fitAddon,",
  `    css: ${JSON.stringify(css)},`,
  "  };",
  "})",
].join("\n");

const built = readFileSync(DIST_FILE, "utf8");
if (!built.includes(PLACEHOLDER)) {
  throw new Error(
    `No vendor placeholder found in ${DIST_FILE}. Did the setup change without updating this script?`,
  );
}

// A replacer function keeps "$&"-style sequences in the minified vendor code
// from being treated as replacement patterns.
const output = built.replace(PLACEHOLDER, () => payload);

// Parse the result before writing so a broken injection fails the build loudly.
new vm.Script(output, { filename: DIST_FILE });

for (const forbidden of ["cdn.jsdelivr", "unpkg.com", "cdnjs.cloudflare.com"]) {
  if (output.includes(forbidden)) {
    throw new Error(`Compiled extension still references ${forbidden}`);
  }
}

writeFileSync(DIST_FILE, output, "utf8");
console.log(
  `Inlined @xterm/xterm ${xtermVersion} and @xterm/addon-fit ${fitVersion} (${output.length} bytes).`,
);
