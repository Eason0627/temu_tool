const fs = require("fs");
const path = require("path");
const JavaScriptObfuscator = require("javascript-obfuscator");
const dotenv = require("dotenv");

// 加载 .env 文件
dotenv.config();

// 确保输出目录保持原始结构
const outputMainDir = path.resolve(__dirname, "./obfuscated/electron/main");
const outputPreloadDir = path.resolve(
  __dirname,
  "./obfuscated/electron/preload"
);
const outputNodeServerDir = path.resolve(__dirname, "./obfuscated/node_server");

// 创建目录
[outputMainDir, outputPreloadDir, outputNodeServerDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 要混淆的文件 - 保持目录结构
const filesToObfuscate = [
  {
    input: path.resolve(__dirname, "electron/main/main.js"),
    output: path.resolve(outputMainDir, "main.js"),
  },
  {
    input: path.resolve(__dirname, "electron/main/license.js"),
    output: path.resolve(outputMainDir, "license.js"),
  },
  {
    input: path.resolve(__dirname, "electron/main/protection.js"),
    output: path.resolve(outputMainDir, "protection.js"),
  },
  {
    input: path.resolve(__dirname, "electron/preload/preload.js"),
    output: path.resolve(outputPreloadDir, "preload.js"),
  },
];

// Node服务器文件
const nodeServerFiles = [
  {
    input: path.resolve(__dirname, "node_server/index.js"),
    output: path.resolve(outputNodeServerDir, "index.js"),
  },
  {
    input: path.resolve(__dirname, "node_server/aiClient.js"),
    output: path.resolve(outputNodeServerDir, "aiClient.js"),
  },
  {
    input: path.resolve(__dirname, "node_server/dxm.js"),
    output: path.resolve(outputNodeServerDir, "dxm.js"),
  },
  {
    input: path.resolve(__dirname, "node_server/qiniu.js"),
    output: path.resolve(outputNodeServerDir, "qiniu.js"),
  },
];

// 获取加密密钥（用于一些可能需要嵌入密钥的代码）
let encryptionKey = process.env.APP_KEY;
if (!encryptionKey) {
  const keyFilePath = path.resolve(__dirname, "./.encryption-key");
  if (fs.existsSync(keyFilePath)) {
    encryptionKey = fs.readFileSync(keyFilePath, "utf8").trim();
  }
}

// 主进程和预加载脚本的混淆配置
const mainObfuscationOptions = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  debugProtection: true,
  debugProtectionInterval: 1000,
  disableConsoleOutput: true,
  identifierNamesGenerator: "hexadecimal",
  log: false,
  numbersToExpressions: true,
  renameGlobals: false,
  selfDefending: true,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 5,
  stringArray: true,
  stringArrayEncoding: ["base64"],
  stringArrayThreshold: 0.8,
  unicodeEscapeSequence: false,
};

// Node服务器文件的混淆配置 - 更温和的设置
const serverObfuscationOptions = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.5, // 降低以减少性能影响
  deadCodeInjection: false, // 禁用死代码注入，避免服务器性能问题
  debugProtection: false, // 禁用调试保护，避免干扰服务器
  debugProtectionInterval: 0,
  disableConsoleOutput: false, // 保留控制台输出，服务器需要日志
  identifierNamesGenerator: "hexadecimal",
  log: false,
  numbersToExpressions: true,
  renameGlobals: false, // 避免重命名全局变量
  selfDefending: false, // 禁用自我保护，避免运行时问题
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 10,
  stringArray: true,
  stringArrayEncoding: ["base64"],
  stringArrayThreshold: 0.7,
  unicodeEscapeSequence: false,
  // 重要：保留模块导出名称
  reservedNames: ["^module", "^exports", "^require"],
};

// 混淆主进程和预加载脚本
console.log("开始混淆主进程和预加载脚本...");
filesToObfuscate.forEach((file) => {
  try {
    if (!fs.existsSync(file.input)) {
      console.error(`❌ 输入文件不存在: ${file.input}`);
      return;
    }

    let code = fs.readFileSync(file.input, "utf8");

    if (encryptionKey && code.includes("process.env.APP_KEY")) {
      code = code.replace(/process\.env\.APP_KEY/g, `"${encryptionKey}"`);
      console.log(
        `已将环境变量 APP_KEY 替换为实际值在文件: ${path.basename(file.input)}`
      );
    }

    const obfuscatedCode = JavaScriptObfuscator.obfuscate(
      code,
      mainObfuscationOptions
    ).getObfuscatedCode();

    fs.writeFileSync(file.output, obfuscatedCode);
    console.log(`✅ 已混淆: ${path.basename(file.input)}`);
  } catch (error) {
    console.error(`❌ 混淆文件失败: ${file.input}`, error);
  }
});

// 混淆Node服务器文件
console.log("开始混淆Node服务器文件...");
nodeServerFiles.forEach((file) => {
  try {
    if (!fs.existsSync(file.input)) {
      console.error(`❌ 输入文件不存在: ${file.input}`);
      return;
    }

    let code = fs.readFileSync(file.input, "utf8");

    if (encryptionKey && code.includes("process.env.APP_KEY")) {
      code = code.replace(/process\.env\.APP_KEY/g, `"${encryptionKey}"`);
      console.log(
        `已将环境变量 APP_KEY 替换为实际值在文件: ${path.basename(file.input)}`
      );
    }

    const obfuscatedCode = JavaScriptObfuscator.obfuscate(
      code,
      serverObfuscationOptions
    ).getObfuscatedCode();

    fs.writeFileSync(file.output, obfuscatedCode);
    console.log(`✅ 已混淆: ${path.basename(file.input)}`);
  } catch (error) {
    console.error(`❌ 混淆文件失败: ${file.input}`, error);
  }
});

// 复制node_server目录中的其他非JS文件
const nodeServerDir = path.resolve(__dirname, "node_server");
if (fs.existsSync(nodeServerDir)) {
  try {
    const files = fs.readdirSync(nodeServerDir);
    files.forEach((file) => {
      const filePath = path.join(nodeServerDir, file);
      // 如果不是JS文件且是文件(不是目录)
      if (!file.endsWith(".js") && fs.statSync(filePath).isFile()) {
        const destPath = path.join(outputNodeServerDir, file);
        fs.copyFileSync(filePath, destPath);
        console.log(`📄 已复制: ${file}`);
      }
    });
  } catch (error) {
    console.error("❌ 复制非JS文件失败:", error);
  }
}

// 创建一个package.json文件在混淆后的node_server目录中
// 这确保了Node.js能正确解析模块
const packageJsonContent = {
  name: "obfuscated-node-server",
  version: "1.0.0",
  private: true,
  type: "commonjs",
};
fs.writeFileSync(
  path.join(outputNodeServerDir, "package.json"),
  JSON.stringify(packageJsonContent, null, 2)
);

console.log("代码混淆完成!");
console.log(`混淆后的文件位于: ${path.resolve(__dirname, "./obfuscated")}`);
