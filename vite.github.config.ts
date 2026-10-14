import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/kingdom-craft/",
  plugins: [react()],
  build: {
    outDir: "github-pages",
    emptyOutDir: true,
  },
});
