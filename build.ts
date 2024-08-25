import { build } from "esbuild";

build({
  logLevel: "info",
  entryPoints: ["src/main.ts"],
  bundle: true,
  platform: "node",
  charset: "utf8",
  minifyWhitespace: true,
  minifySyntax: true,
  outfile: "index.js",
});
