/**
 * Copies the pinned @xterm/xterm and @xterm/addon-fit builds out of node_modules
 * into vendor/.
 *
 * The registry uploads source files only and installs nothing, so the
 * after-build hook that inlines these libraries cannot resolve them through
 * node_modules. The copies in vendor/ are committed and shipped in the publish
 * payload; run `npm run sync-vendor` after changing the pinned versions.
 */

import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const VENDOR_DIR = resolve("vendor");

const XTERM = "@xterm/xterm";
const FIT = "@xterm/addon-fit";

const FILES = [
  { from: `${XTERM}/lib/xterm.js`, to: "xterm.js" },
  { from: `${XTERM}/css/xterm.css`, to: "xterm.css" },
  { from: `${FIT}/lib/addon-fit.js`, to: "addon-fit.js" },
];

function readPackageVersion(name) {
  return JSON.parse(readFileSync(require.resolve(`${name}/package.json`), "utf8")).version;
}

const xtermVersion = readPackageVersion(XTERM);
const fitVersion = readPackageVersion(FIT);

mkdirSync(VENDOR_DIR, { recursive: true });
for (const file of FILES) {
  copyFileSync(require.resolve(file.from), resolve(VENDOR_DIR, file.to));
}
writeFileSync(
  resolve(VENDOR_DIR, "versions.json"),
  JSON.stringify({ [XTERM]: xtermVersion, [FIT]: fitVersion }, null, 2) + "\n",
  "utf8",
);

console.log(`Copied ${XTERM} ${xtermVersion} and ${FIT} ${fitVersion} into vendor/.`);
