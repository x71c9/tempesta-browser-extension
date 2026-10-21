// Builds dist/chromium and dist/firefox from the shared sources.
// Usage: node build.mjs [--watch] [--release]
//
// --release leaves out the Chromium `key`, which only pins the extension ID of
// unpacked development builds

import * as esbuild from "esbuild";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";

const TARGETS = {
  chromium: "chrome116",
  firefox: "firefox140",
};

const watch = process.argv.includes("--watch");
const release = process.argv.includes("--release");
const pkg = JSON.parse(await readFile("package.json", "utf8"));

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function build(target, esbuildTarget) {
  const outdir = `dist/${target}`;
  await rm(outdir, { recursive: true, force: true });
  await mkdir(outdir, { recursive: true });
  const manifest = {
    ...(await readJson("manifests/base.json")),
    ...(await readJson(`manifests/${target}.json`)),
    version: pkg.version,
  };
  if (release) {
    delete manifest.key;
  }
  await writeFile(
    `${outdir}/manifest.json`,
    JSON.stringify(manifest, null, 2) + "\n",
  );
  for (const page of ["fallback.html", "options.html"]) {
    await cp(`src/${page}`, `${outdir}/${page}`);
  }
  await cp("icons", `${outdir}/icons`, {
    recursive: true,
    filter: (path) => !path.endsWith(".svg"),
  });
  const options = {
    entryPoints: {
      background: "src/background.ts",
      content: "src/content.ts",
      fallback: "src/fallback.ts",
      options: "src/options.ts",
    },
    outdir,
    bundle: true,
    format: "iife",
    target: esbuildTarget,
    // Readable output keeps store reviews simple
    minify: false,
    loader: { ".css": "text" },
    logLevel: "info",
  };
  if (watch) {
    const context = await esbuild.context(options);
    await context.watch();
  } else {
    await esbuild.build(options);
  }
}

for (const [target, esbuildTarget] of Object.entries(TARGETS)) {
  await build(target, esbuildTarget);
}
