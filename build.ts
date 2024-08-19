import { build } from "esbuild";

build({
  logLevel: "info",
  entryPoints: ["src/main.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  charset: "utf8",
  minify: true,
  outfile: "index.mjs",
});
