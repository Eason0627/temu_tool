const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const JavaScriptObfuscator = require("javascript-obfuscator");
const config = require("./obfuscator.config.js");

// 先使用 electron-vite 构建
exec("electron-vite build", (error) => {
  if (error) {
    console.error(`构建错误: ${error}`);
    return;
  }

  // 混淆主进程代码
  const mainPath = path.join(__dirname, "out", "main");
  obfuscateDirectory(mainPath);

  // 混淆预加载脚本
  const preloadPath = path.join(__dirname, "out", "preload");
  obfuscateDirectory(preloadPath);

  // 复制依赖文件到构建目录
  copyDependencies();
  // 使用 electron-builder 打包
  exec("electron-builder --win", (err) => {
    if (err) {
      console.error(`打包错误: ${err}`);
      return;
    }
    console.log("构建完成！");
  });
});

function obfuscateDirectory(directory) {
  fs.readdirSync(directory).forEach((file) => {
    const filePath = path.join(directory, file);
    if (fs.statSync(filePath).isDirectory()) {
      obfuscateDirectory(filePath);
    } else if (file.endsWith(".js")) {
      const code = fs.readFileSync(filePath, "utf8");
      const obfuscatedCode = JavaScriptObfuscator.obfuscate(
        code,
        config
      ).getObfuscatedCode();
      fs.writeFileSync(filePath, obfuscatedCode);
      console.log(`混淆文件: ${filePath}`);
    }
  });
}

// 复制依赖文件到构建目录
function copyDependencies() {
  // 获取 electron/main 目录中的所有 JS 文件
  const sourceDir = path.join(__dirname, "electron", "main");
  const targetDir = path.join(__dirname, "out", "main");

  fs.readdirSync(sourceDir).forEach((file) => {
    if (file.endsWith(".js") && file !== "main.js") {
      const sourcePath = path.join(sourceDir, file);
      const targetPath = path.join(targetDir, file);

      // 读取源文件内容
      const code = fs.readFileSync(sourcePath, "utf8");

      // 混淆代码
      const obfuscatedCode = JavaScriptObfuscator.obfuscate(
        code,
        config
      ).getObfuscatedCode();

      // 写入混淆后的代码到目标路径
      fs.writeFileSync(targetPath, obfuscatedCode);
      console.log(`混淆并复制依赖文件: ${file}`);
    }
  });
}
