import path from "node:path";
import { cloudflare } from "@cloudflare/vite-plugin";
import { paraglideVitePlugin } from "@inlang/paraglide-js";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import packageJson from "./package.json";

const config = defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  resolve: {
    tsconfigPaths: true,
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // workerd throws "Top-level await in module is unsettled" when the SSR
  // entry dynamically imports a chunk that statically imports that same
  // entry. Keep the worker graph in one module.
  environments: {
    client: {
      // Rolldown splits shared modules into one chunk per module by default;
      // that turned the homepage into 100+ tiny requests, which is painful on
      // high-latency networks. Consolidate the eager vendor families instead.
      build: {
        rolldownOptions: {
          output: {
            codeSplitting: {
              groups: [
                {
                  name: "react",
                  test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
                  priority: 30,
                },
                {
                  name: "tanstack",
                  test: /node_modules[\\/]@tanstack[\\/]/,
                  priority: 20,
                },
                {
                  name: "icons",
                  test: /node_modules[\\/]lucide-react[\\/]/,
                  priority: 20,
                },
                {
                  name: "ui",
                  test: /node_modules[\\/](sonner|@floating-ui|clsx|tailwind-merge)[\\/]/,
                  priority: 20,
                },
                {
                  name: "messages",
                  test: /src[\\/]paraglide[\\/]/,
                  priority: 20,
                },
              ],
            },
          },
        },
      },
    },
    ssr: {
      // TanStack Devtools' shell is Solid. Cloudflare SSR resolves
      // solid-js/web to dist/server.js, which has no DOM exports like `use`.
      // Exclude it from the SSR optimizer only; the client still prebundles
      // so nested CJS (dayjs) is converted to ESM. @tanstack/devtools already
      // ships a workerd stub, but @tanstack/devtools-ui does not.
      optimizeDeps: {
        exclude: [
          "@tanstack/react-devtools",
          "@tanstack/devtools",
          "@tanstack/devtools-ui",
          "solid-js",
          "solid-js/web",
        ],
      },
      build: {
        rolldownOptions: {
          output: {
            codeSplitting: false,
          },
        },
      },
    },
  },
  plugins: [
    paraglideVitePlugin({
      project: "./project.inlang",
      outdir: "./src/paraglide",
      strategy: ["cookie", "preferredLanguage", "baseLocale"],
      cookieName: "LOCALE",
    }),
    cloudflare({
      viteEnvironment: {
        name: "ssr",
      },
      // Read the Worker from cloudflare.config.ts instead of wrangler.jsonc.
      experimental: { newConfig: true },
    }),
    tailwindcss(),
    devtools(),
    tanstackStart({
      importProtection: {
        enabled: false,
      },
    }),
    viteReact(),
  ],
});

export default config;
