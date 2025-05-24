import { defineConfig } from "electron-vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";
import fs from "fs";

export default defineConfig(({ mode }) => {
  const isDev = mode === "development";
  // 检测是否是安全构建模式
  const isSecureBuild = process.env.SECURE_BUILD === "true";

  // 获取加密资源的路径
  const encryptedAssetsDir = resolve(__dirname, "src/encrypted-assets");
  // 确保在非开发模式下加密资产目录存在
  const hasEncryptedAssets =
    !isDev && isSecureBuild && fs.existsSync(encryptedAssetsDir);

  // 检查 node_server 目录是否存在
  const nodeServerDir = resolve(__dirname, "node_server");
  const hasNodeServer = fs.existsSync(nodeServerDir);

  // 如果 node_server 不存在，记录警告信息
  if (!hasNodeServer) {
    console.warn(
      `警告: node_server 目录 (${nodeServerDir}) 不存在！它将不会被打包到应用中。`
    );
  } else {
    console.log(`找到 node_server 目录: ${nodeServerDir}`);
  }

  return {
    main: {
      build: {
        lib: {
          entry: isSecureBuild ? "obfuscated/main.js" : "electron/main/main.js",
        },
        rollupOptions: {
          external: ["electron", "crypto", "fs", "path", "os", "http", "https"],
        },
        // 确保不会压缩混淆后的代码
        minify: isSecureBuild ? false : "esbuild",
      },
    },
    preload: {
      build: {
        lib: {
          entry: isSecureBuild
            ? "obfuscated/preload.js"
            : "electron/preload/preload.js",
        },
        rollupOptions: {
          external: ["electron", "crypto", "fs", "path"],
        },
        minify: isSecureBuild ? false : "esbuild",
      },
    },
    renderer: {
      root: ".", // 项目根目录
      // 确保 Vue 插件被正确应用
      plugins: [
        vue({
          template: {
            compilerOptions: {
              isCustomElement: (tag) => tag === "webview",
            },
          },
        }),
        // 如果是安全构建，可以添加额外的插件来处理资源
        ...(isSecureBuild
          ? [
              {
                name: "secure-build-plugin",
                enforce: "post",
                // 在生成的HTML中注入解密逻辑
                transformIndexHtml(html) {
                  if (!isDev && isSecureBuild) {
                    return html.replace(
                      "</head>",
                      `<script>
                  // 简单的资源加载保护
                  (function() {
                    window.__secureLoad = true;
                    console.log = function() {}; // 禁用控制台日志
                    console.warn = function() {};
                    console.error = function() {};
                  })();
                  </script></head>`
                    );
                  }
                  return html;
                },
              },
            ]
          : []),
      ],
      build: {
        outDir: "dist",
        emptyOutDir: !isSecureBuild, // 安全构建时不清空输出目录，因为可能已包含混淆文件
        assetsInlineLimit: isSecureBuild ? 0 : 4096, // 安全构建时禁用内联，以便单独加密资源
        // 设置基础路径为相对路径
        base: "./",
        rollupOptions: {
          input: {
            index: resolve(__dirname, "index.html"),
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
                "@vue/runtime-core",
              ],
            },
            // 确保生成的脚本使用正确的格式
            format: "es",
          },
        },
      },
      resolve: {
        alias: {
          "@": resolve(__dirname, "src"),
        },
        // 添加这个配置，帮助解析模块
        dedupe: ["vue", "@vue/runtime-dom", "@vue/shared"],
      },
      define: {
        // 注入加密密钥环境变量（仅在构建时）
        ...(isSecureBuild && !isDev
          ? {
              "process.env.VITE_ENCRYPTION_KEY": JSON.stringify(
                process.env.VITE_ENCRYPTION_KEY || ""
              ),
            }
          : {}),
      },
      optimizeDeps: {
        include: ["vue", "element-plus", "@vue/shared"],
        esbuildOptions: {
          // 确保 ESBuild 能够处理这些模块
          mainFields: ["module", "main"],
          resolveExtensions: [".mjs", ".js", ".ts", ".jsx", ".tsx", ".json"],
          format: "esm",
        },
      },
      server: {
        port: 5173,
      },
      ssr: {
        noExternal: ["jimp", "@nut-tree/nut-js"],
      },
    },
    // 为electron-builder配置额外资源
    build: {
      config: {
        // 复制加密资源到应用包中
        extraResources: [
          ...(hasEncryptedAssets
            ? [
                {
                  from: "src/encrypted-assets",
                  to: "resources/encrypted-assets",
                  filter: ["**/*"],
                },
              ]
            : []),
          // 其他需要复制的资源
          {
            from: "electron/assets",
            to: "resources/assets",
            filter: ["**/*"],
          },
        ],
        // 将加密环境变量添加到应用配置中
        extraMetadata: {
          ...(isSecureBuild
            ? {
                secureApp: true,
              }
            : {}),
        },
        // 应用安全设置
        asar: true, // 使用 asar 格式打包
        // 为不同平台配置不同的设置
        mac: {
          hardenedRuntime: true,
          gatekeeperAssess: false,
          entitlements: "build/entitlements.mac.plist",
          entitlementsInherit: "build/entitlements.mac.plist",
          extraResources: ["resources/**/*"], // 确保在 Mac 上也复制资源
        },
        win: {
          // 防止反编译
          rfc3161TimeStampServer: "http://timestamp.digicert.com",
          timeStampServer: "http://timestamp.digicert.com",
          // 添加以下内容可以确保额外资源被正确复制（特别是在 Windows 上）
          extraResources: ["resources/**/*"],
        },
        // 添加文件关联来防止侧载
        fileAssociations: [
          {
            ext: "yourapp",
            name: "YourApp File",
            role: "Editor",
          },
        ],
        // 添加调试日志，在构建过程中记录额外资源的复制情况
        afterPack: function (context) {
          console.log("打包后的资源检查:");
          console.log("打包的构建目录:", context.appOutDir);
          console.log("平台:", context.electronPlatformName);
          console.log("正在查找 node_server 目录...");

          // 这里会在控制台打印构建过程的信息
          const expectedPath = resolve(
            context.appOutDir,
            "resources",
            "node_server"
          );
          if (fs.existsSync(expectedPath)) {
            console.log(
              "✅ 成功: node_server 目录已复制到打包应用中:",
              expectedPath
            );

            // 列出目录内容以确认
            const files = fs.readdirSync(expectedPath);
            console.log("node_server 目录内容:", files);
          } else {
            console.error("❌ 错误: node_server 目录未能复制到打包应用中。");
            console.log("检查备用位置...");

            // 检查其他可能的位置
            const altPath1 = resolve(context.appOutDir, "node_server");
            const altPath2 = resolve(context.appOutDir, "resources");

            if (fs.existsSync(altPath1)) {
              console.log("在备用位置找到 node_server:", altPath1);
            } else if (fs.existsSync(altPath2)) {
              console.log("找到 resources 目录:", altPath2);
              console.log("resources 目录内容:", fs.readdirSync(altPath2));
            } else {
              console.error("没有找到 node_server 目录，请确保源目录存在。");
            }
          }

          return Promise.resolve();
        },
        // 修改打包后的文件
        afterSign: function (context) {
          console.log("签名后检查资源:");
          console.log("查找签名后的 node_server 目录...");

          const expectedPath = resolve(
            context.appOutDir,
            "resources",
            "node_server"
          );
          if (fs.existsSync(expectedPath)) {
            console.log("✅ 签名后 node_server 目录存在:", expectedPath);
          } else {
            console.error("❌ 签名后 node_server 目录不存在");
          }

          return Promise.resolve();
        },
      },
    },
  };
});
