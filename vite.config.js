import { defineConfig } from "vite-plus";

const base = process.env.VITE_BASE_URL || "/";
const baseDir = process.env.VITE_BASE_URL?.replace(/^\//, "").replace(/\/$/, "");
const outDir = baseDir ? `dist/${baseDir}` : "dist";

export default defineConfig({
  root: "src",
  build: {
    outDir: `../${outDir}`,
  },
  staged: {
    "*": "vp check --fix",
  },
  fmt: {},
  base,
  lint: { options: { typeAware: true, typeCheck: true } },
});
