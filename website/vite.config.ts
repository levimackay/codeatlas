import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  base: "./",
  build: {
    target: "es2020",
    cssCodeSplit: false,
  },
});
