import { defineConfig } from "vite-plus";

export default defineConfig({
  root: "src",
  base: process.env.VITE_BASE_URL || "/",
  build: {
    outDir: `../dist`,
  },
  staged: {
    "*": "vp check --fix",
  },
});
