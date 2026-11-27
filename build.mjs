#!/usr/bin/env node
// Cache busting for GitHub Pages, no dependencies.
//
// Hashes every file in public/assets/css and public/assets/js and rewrites the block between
// <!-- build:assets --> and <!-- /build:assets --> in public/index.html with ?v=<hash> URLs:
// the stylesheet, an import map (so modules imported by other modules are busted
// too), modulepreload hints and the entry script.
//
//   node build.mjs           update public/index.html
//   node build.mjs --check   exit 1 if public/index.html is out of date
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Site root: everything in public/ is served by GitHub Pages; the rest of the repo is not.
const root = join(dirname(fileURLToPath(import.meta.url)), "public");
const HTML = join(root, "index.html");
const START = "<!-- build:assets -->", END = "<!-- /build:assets -->";
const ENTRY = "main.js";

const hash = (path) => createHash("sha256").update(readFileSync(join(root, path))).digest("hex").slice(0, 10);
const files = (dir, ext) => readdirSync(join(root, dir)).filter((f) => f.endsWith(ext)).sort().map((f) => `${dir}/${f}`);

const css = files("assets/css", ".css");
const js = files("assets/js", ".js");
const url = (path) => `./${path}?v=${hash(path)}`;

const imports = Object.fromEntries(js.map((p) => [`./${p}`, url(p)]));
const block = [
  START,
  ...css.map((p) => `<link rel="stylesheet" href="${url(p)}">`),
  `<script type="importmap">`,
  JSON.stringify({ imports }, null, 2),
  `</script>`,
  ...js.filter((p) => !p.endsWith(`/${ENTRY}`)).map((p) => `<link rel="modulepreload" href="${url(p)}">`),
  `<script type="module" src="${url(`assets/js/${ENTRY}`)}"></script>`,
  END
].join("\n");

const html = readFileSync(HTML, "utf8");
const i = html.indexOf(START), j = html.indexOf(END);
if (i < 0 || j < i) { console.error(`index.html needs ${START} … ${END} markers`); process.exit(2); }
const next = html.slice(0, i) + block + html.slice(j + END.length);

if (process.argv.includes("--check")) {
  if (next !== html) { console.error("public/index.html asset hashes are out of date. Run: node build.mjs"); process.exit(1); }
  console.log("public/index.html asset hashes are up to date.");
} else if (next !== html) {
  writeFileSync(HTML, next);
  console.log(`Updated public/index.html (${css.length} CSS, ${js.length} JS files).`);
} else {
  console.log("public/index.html already up to date.");
}
