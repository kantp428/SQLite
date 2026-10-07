import { build } from "esbuild";
await build({
  entryPoints: ["frontend/app.jsx"],
  bundle: true,
  minify: true,
  format: "esm",
  outfile: "public/app.js",
  define: { "process.env.NODE_ENV": '"production"' },
  jsx: "automatic",
});
console.log("Frontend built: public/app.js");
