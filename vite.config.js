import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

export default defineConfig(({ mode }) => {
  const isDev = mode === "development";

  return {
    plugins: [
      vue({
        template: {
          compilerOptions: {
            isCustomElement: (tag) => tag === "webview",
          },
        },
      }),
    ],
    base: isDev ? "/" : "./", // ✅ dev用'/'，build用相对路径
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    server: {
      port: 5173,
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
    },
  };
});
