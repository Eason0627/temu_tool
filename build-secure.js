const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

console.log("开始安全构建流程...");

// 确保目录存在
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 检查混淆文件是否存在
const obfuscatedMainPath = path.resolve(__dirname, "./dist/obfuscated/main.js");
const obfuscatedPreloadPath = path.resolve(
  __dirname,
  "./dist/obfuscated/preload.js"
);

// 如果混淆文件不存在，先执行混淆
if (
  !fs.existsSync(obfuscatedMainPath) ||
  !fs.existsSync(obfuscatedPreloadPath)
) {
  console.log("混淆文件不存在，先执行混淆...");
  try {
    execSync("node obfuscate-code.js", { stdio: "inherit" });
  } catch (error) {
    console.error("❌ 混淆代码失败:", error);
    process.exit(1);
  }
}

// 修改 electron-vite 配置以使用混淆后的文件
const configPath = path.resolve(__dirname, "./electron-vite.config.js");
let configBackupPath = null;

try {
  // 备份原始配置
  if (fs.existsSync(configPath)) {
    configBackupPath = `${configPath}.backup`;
    fs.copyFileSync(configPath, configBackupPath);
    console.log("已备份 electron-vite 配置");
  }

  // 创建临时配置文件
  const tempConfigPath = path.resolve(
    __dirname,
    "./electron-vite.config.temp.js"
  );

  // 读取原始配置
  let configContent = "";
  if (fs.existsSync(configPath)) {
    configContent = fs.readFileSync(configPath, "utf8");
  } else {
    // 如果配置文件不存在，创建一个基本配置
    configContent = `
      const { defineConfig } = require('electron-vite');
      
      module.exports = defineConfig({
        main: {
          build: {
            rollupOptions: {
              input: {
                index: './electron/main/main.js'
              }
            }
          }
        },
        preload: {
          build: {
            rollupOptions: {
              input: {
                index: './electron/preload/preload.js'
              }
            }
          }
        },
        renderer: {}
      });
    `;
  }

  // 修改配置以使用混淆后的文件
  configContent = configContent.replace(
    /input\s*:\s*{[^}]*index\s*:\s*['"]\.\/electron\/main\/main\.js['"]/g,
    `input: { index: './dist/obfuscated/main.js'`
  );

  configContent = configContent.replace(
    /input\s*:\s*{[^}]*index\s*:\s*['"]\.\/electron\/preload\/preload\.js['"]/g,
    `input: { index: './dist/obfuscated/preload.js'`
  );

  // 写入临时配置
  fs.writeFileSync(tempConfigPath, configContent);

  // 替换原始配置
  fs.copyFileSync(tempConfigPath, configPath);
  console.log("已修改 electron-vite 配置以使用混淆后的文件");

  // 运行 electron-vite 构建
  console.log("运行 electron-vite 构建...");
  try {
    execSync("electron-vite build", { stdio: "inherit" });
    console.log("electron-vite 构建完成");
  } catch (error) {
    console.error("❌ 构建过程中出错:", error);
    throw error;
  }

  // 复制加密资源到构建目录
  const encryptedAssetsDir = path.resolve(__dirname, "../encrypted-assets");
  if (fs.existsSync(encryptedAssetsDir)) {
    const targetDir = path.resolve(
      __dirname,
      "./dist/resources/encrypted-assets"
    );
    ensureDir(targetDir);

    // 复制加密资源
    copyDir(encryptedAssetsDir, targetDir);
    console.log("已复制加密资源到构建目录");
  }
} catch (error) {
  console.error("❌ 构建过程中出错:", error);
} finally {
  // 恢复原始配置
  if (configBackupPath && fs.existsSync(configBackupPath)) {
    fs.copyFileSync(configBackupPath, configPath);
    fs.unlinkSync(configBackupPath);
    console.log("已恢复原始 electron-vite 配置");
  }
}

// 复制目录函数
function copyDir(src, dest) {
  ensureDir(dest);

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log("安全构建流程完成");
