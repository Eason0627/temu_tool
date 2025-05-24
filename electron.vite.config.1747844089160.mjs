// electron.vite.config.js
import { defineConfig } from "electron-vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";
import fs from "fs";
var __electron_vite_injected_dirname = "C:\\Users\\Administrator\\Desktop\\temuTool\\autoTransfer";
var electron_vite_config_default = defineConfig(({ mode }) => {
  const isDev = mode === "development";
  const isSecureBuild = process.env.SECURE_BUILD === "true";
  const encryptedAssetsDir = resolve(__electron_vite_injected_dirname, "src/encrypted-assets");
  const hasEncryptedAssets = !isDev && isSecureBuild && fs.existsSync(encryptedAssetsDir);
  const nodeServerDir = resolve(__electron_vite_injected_dirname, "node_server");
  const hasNodeServer = fs.existsSync(nodeServerDir);
  if (!hasNodeServer) {
    console.warn(
      `\u8B66\u544A: node_server \u76EE\u5F55 (${nodeServerDir}) \u4E0D\u5B58\u5728\uFF01\u5B83\u5C06\u4E0D\u4F1A\u88AB\u6253\u5305\u5230\u5E94\u7528\u4E2D\u3002`
    );
  } else {
    console.log(`\u627E\u5230 node_server \u76EE\u5F55: ${nodeServerDir}`);
  }
  return {
    main: {
      build: {
        lib: {
          entry: isSecureBuild ? "obfuscated/main.js" : "electron/main/main.js"
        },
        rollupOptions: {
          external: ["electron", "crypto", "fs", "path", "os", "http", "https"]
        },
        // 确保不会压缩混淆后的代码
        minify: isSecureBuild ? false : "esbuild"
      }
    },
    preload: {
      build: {
        lib: {
          entry: isSecureBuild ? "obfuscated/preload.js" : "electron/preload/preload.js"
        },
        rollupOptions: {
          external: ["electron", "crypto", "fs", "path"]
        },
        minify: isSecureBuild ? false : "esbuild"
      }
    },
    renderer: {
      root: ".",
      // 项目根目录
      // 确保 Vue 插件被正确应用
      plugins: [
        vue({
          template: {
            compilerOptions: {
              isCustomElement: (tag) => tag === "webview"
            }
          }
        }),
        // 如果是安全构建，可以添加额外的插件来处理资源
        ...isSecureBuild ? [
          {
            name: "secure-build-plugin",
            enforce: "post",
            // 在生成的HTML中注入解密逻辑
            transformIndexHtml(html) {
              if (!isDev && isSecureBuild) {
                return html.replace(
                  "</head>",
                  `<script>
                  // \u7B80\u5355\u7684\u8D44\u6E90\u52A0\u8F7D\u4FDD\u62A4
                  (function() {
                    window.__secureLoad = true;
                    console.log = function() {}; // \u7981\u7528\u63A7\u5236\u53F0\u65E5\u5FD7
                    console.warn = function() {};
                    console.error = function() {};
                  })();
                  </script></head>`
                );
              }
              return html;
            }
          }
        ] : []
      ],
      build: {
        outDir: "dist",
        emptyOutDir: !isSecureBuild,
        // 安全构建时不清空输出目录，因为可能已包含混淆文件
        assetsInlineLimit: isSecureBuild ? 0 : 4096,
        // 安全构建时禁用内联，以便单独加密资源
        // 设置基础路径为相对路径
        base: "./",
        rollupOptions: {
          input: {
            index: resolve(__electron_vite_injected_dirname, "index.html")
          },
          // 不要将Vue相关包标记为外部依赖
          output: {
            // 调整输出格式，以便更容易加密
            entryFileNames: "assets/[name]-[hash].js",
            chunkFileNames: "assets/[name]-[hash].js",
            assetFileNames: "assets/[name]-[hash].[ext]",
            // 添加手动分块配置，确保Vue相关依赖被正确打包
            manualChunks: {
              "vue-vendor": [
                "vue",
                "@vue/runtime-dom",
                "@vue/shared",
                "@vue/runtime-core"
              ]
            },
            // 确保生成的脚本使用正确的格式
            format: "es"
          }
        }
      },
      resolve: {
        alias: {
          "@": resolve(__electron_vite_injected_dirname, "src")
        },
        // 添加这个配置，帮助解析模块
        dedupe: ["vue", "@vue/runtime-dom", "@vue/shared"]
      },
      define: {
        // 注入加密密钥环境变量（仅在构建时）
        ...isSecureBuild && !isDev ? {
          "process.env.VITE_ENCRYPTION_KEY": JSON.stringify(
            process.env.VITE_ENCRYPTION_KEY || ""
          )
        } : {}
      },
      optimizeDeps: {
        include: ["vue", "element-plus", "@vue/shared"],
        esbuildOptions: {
          // 确保 ESBuild 能够处理这些模块
          mainFields: ["module", "main"],
          resolveExtensions: [".mjs", ".js", ".ts", ".jsx", ".tsx", ".json"],
          format: "esm"
        }
      },
      server: {
        port: 5173
      }
    },
    // 为electron-builder配置额外资源
    build: {
      config: {
        // 复制加密资源到应用包中
        extraResources: [
          ...hasEncryptedAssets ? [
            {
              from: "src/encrypted-assets",
              to: "resources/encrypted-assets",
              filter: ["**/*"]
            }
          ] : [],
          // 其他需要复制的资源
          {
            from: "electron/assets",
            to: "resources/assets",
            filter: ["**/*"]
          }
        ],
        // 将加密环境变量添加到应用配置中
        extraMetadata: {
          ...isSecureBuild ? {
            secureApp: true
          } : {}
        },
        // 应用安全设置
        asar: true,
        // 使用 asar 格式打包
        // 为不同平台配置不同的设置
        mac: {
          hardenedRuntime: true,
          gatekeeperAssess: false,
          entitlements: "build/entitlements.mac.plist",
          entitlementsInherit: "build/entitlements.mac.plist",
          extraResources: ["resources/**/*"]
          // 确保在 Mac 上也复制资源
        },
        win: {
          // 防止反编译
          rfc3161TimeStampServer: "http://timestamp.digicert.com",
          timeStampServer: "http://timestamp.digicert.com",
          // 添加以下内容可以确保额外资源被正确复制（特别是在 Windows 上）
          extraResources: ["resources/**/*"]
        },
        // 添加文件关联来防止侧载
        fileAssociations: [
          {
            ext: "yourapp",
            name: "YourApp File",
            role: "Editor"
          }
        ],
        // 添加调试日志，在构建过程中记录额外资源的复制情况
        afterPack: function(context) {
          console.log("\u6253\u5305\u540E\u7684\u8D44\u6E90\u68C0\u67E5:");
          console.log("\u6253\u5305\u7684\u6784\u5EFA\u76EE\u5F55:", context.appOutDir);
          console.log("\u5E73\u53F0:", context.electronPlatformName);
          console.log("\u6B63\u5728\u67E5\u627E node_server \u76EE\u5F55...");
          const expectedPath = resolve(
            context.appOutDir,
            "resources",
            "node_server"
          );
          if (fs.existsSync(expectedPath)) {
            console.log(
              "\u2705 \u6210\u529F: node_server \u76EE\u5F55\u5DF2\u590D\u5236\u5230\u6253\u5305\u5E94\u7528\u4E2D:",
              expectedPath
            );
            const files = fs.readdirSync(expectedPath);
            console.log("node_server \u76EE\u5F55\u5185\u5BB9:", files);
          } else {
            console.error("\u274C \u9519\u8BEF: node_server \u76EE\u5F55\u672A\u80FD\u590D\u5236\u5230\u6253\u5305\u5E94\u7528\u4E2D\u3002");
            console.log("\u68C0\u67E5\u5907\u7528\u4F4D\u7F6E...");
            const altPath1 = resolve(context.appOutDir, "node_server");
            const altPath2 = resolve(context.appOutDir, "resources");
            if (fs.existsSync(altPath1)) {
              console.log("\u5728\u5907\u7528\u4F4D\u7F6E\u627E\u5230 node_server:", altPath1);
            } else if (fs.existsSync(altPath2)) {
              console.log("\u627E\u5230 resources \u76EE\u5F55:", altPath2);
              console.log("resources \u76EE\u5F55\u5185\u5BB9:", fs.readdirSync(altPath2));
            } else {
              console.error("\u6CA1\u6709\u627E\u5230 node_server \u76EE\u5F55\uFF0C\u8BF7\u786E\u4FDD\u6E90\u76EE\u5F55\u5B58\u5728\u3002");
            }
          }
          return Promise.resolve();
        },
        // 修改打包后的文件
        afterSign: function(context) {
          console.log("\u7B7E\u540D\u540E\u68C0\u67E5\u8D44\u6E90:");
          console.log("\u67E5\u627E\u7B7E\u540D\u540E\u7684 node_server \u76EE\u5F55...");
          const expectedPath = resolve(
            context.appOutDir,
            "resources",
            "node_server"
          );
          if (fs.existsSync(expectedPath)) {
            console.log("\u2705 \u7B7E\u540D\u540E node_server \u76EE\u5F55\u5B58\u5728:", expectedPath);
          } else {
            console.error("\u274C \u7B7E\u540D\u540E node_server \u76EE\u5F55\u4E0D\u5B58\u5728");
          }
          return Promise.resolve();
        }
      }
    }
  };
});
export {
  electron_vite_config_default as default
};
