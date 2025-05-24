const { app } = require("electron");
const crypto = require("crypto");
const os = require("os");
const fs = require("fs");
const path = require("path");

// 检测调试工具
function detectDebugger() {
  const isDebuggerAttached =
    process._breakFirstLine ||
    /--inspect|--debug/.test(process.execArgv.join(" "));
  if (isDebuggerAttached) {
    console.log("调试器已检测到，应用将退出");
    app.exit(1);
  }
}

// 检测虚拟机环境
function detectVM() {
  // 简单的虚拟机检测
  const totalMem = os.totalmem();
  const cpus = os.cpus().length;

  if (totalMem < 2 * 1024 * 1024 * 1024 || cpus < 2) {
    console.log("可能在虚拟机中运行，应用将退出");
    app.exit(1);
  }
}
// 检验文件完整性
// function checkFileIntegrity() {
//   // 开发模式下跳过文件完整性检查
//   if (process.env.NODE_ENV === "development") {
//     console.log("开发模式下跳过文件完整性检查");
//     return;
//   }

//   console.log("正在执行文件完整性检查...");
//   console.log("当前环境:", process.env.NODE_ENV);
//   console.log("资源路径:", process.resourcesPath);
//   console.log("应用路径:", app.getAppPath());
//   console.log("当前工作目录:", process.cwd());
//   console.log("__dirname:", __dirname);
//   console.log("可执行文件路径:", process.execPath);

//   // 更新预期哈希值 - 实际部署时应使用正确的哈希值
//   const expectedHashes = {
//     "main.js": "1234567890abcdef", // 这里应该是实际的哈希值
//     "preload.js": "abcdef1234567890",
//   };

//   // 确定应用程序目录 - 考虑打包和非打包环境
//   const isPackaged = app.isPackaged;
//   console.log("应用是否已打包:", isPackaged);

//   // 包内文件路径处理函数
//   function checkFileIntegrity() {
//     // 开发模式下跳过文件完整性检查
//     if (process.env.NODE_ENV === "development") {
//       console.log("开发模式下跳过文件完整性检查");
//       return;
//     }

//     console.log("正在执行文件完整性检查...");
//     console.log("当前环境:", process.env.NODE_ENV);
//     console.log("资源路径:", process.resourcesPath);
//     console.log("应用路径:", app.getAppPath());
//     console.log("当前工作目录:", process.cwd());
//     console.log("__dirname:", __dirname);

//     // 更新预期哈希值 - 实际部署时应使用正确的哈希值
//     const expectedHashes = {
//       "electron/main/main.js": "1234567890abcdef", // 更新为正确的路径
//       "electron/preload/preload.js": "abcdef1234567890", // 假设预加载脚本也在类似路径
//     };

//     // 确定应用程序目录 - 考虑打包和非打包环境
//     const isPackaged = app.isPackaged;
//     console.log("应用是否已打包:", isPackaged);

//     // 包内文件路径处理函数
//     function getFilePaths(filename) {
//       // 基于您提取的目录结构调整路径
//       if (isPackaged) {
//         // 打包环境下可能的路径
//         return [
//           path.join(app.getAppPath(), filename),
//           path.join(process.resourcesPath, "app.asar", filename),
//           // 如果文件名已经包含子目录，不需要再添加
//           path.join(__dirname, "..", "..", filename), // 相对于 electron/main/ 目录
//         ];
//       } else {
//         // 开发环境下可能的路径
//         return [
//           path.join(app.getAppPath(), filename),
//           path.join(__dirname, "..", "..", filename), // 相对于 electron/main/ 目录
//         ];
//       }
//     }

//     // 检查每个文件
//     for (const [file, expectedHash] of Object.entries(expectedHashes)) {
//       const possiblePaths = getFilePaths(file);
//       let fileFound = false;

//       console.log(`正在查找文件: ${file}`);
//       console.log("检查以下路径:");
//       possiblePaths.forEach((p) => console.log(`- ${p}`));

//       for (const filePath of possiblePaths) {
//         try {
//           if (fs.existsSync(filePath)) {
//             fileFound = true;
//             console.log(`找到文件: ${filePath}`);

//             // 读取文件内容计算哈希值
//             const fileContent = fs.readFileSync(filePath);
//             const actualHash = crypto
//               .createHash("sha256")
//               .update(fileContent)
//               .digest("hex");

//             console.log(`文件哈希值: ${actualHash}`);
//             console.log(`预期哈希值: ${expectedHash}`);

//             // 在开发环境或调试模式下，可以禁用哈希值检查
//             const skipHashCheck = process.argv.includes("--skip-hash-check");
//             if (actualHash !== expectedHash && !skipHashCheck) {
//               console.error(`文件完整性检查失败: ${file}`);

//               // 仅在生产环境退出应用
//               if (
//                 !process.env.NODE_ENV ||
//                 process.env.NODE_ENV === "production"
//               ) {
//                 try {
//                   const { dialog } = require("electron");
//                   dialog.showErrorBox(
//                     "文件完整性检查失败",
//                     `文件 ${file} 可能已被修改或损坏。应用将退出。`
//                   );
//                 } catch (dialogError) {
//                   console.error("无法显示错误对话框:", dialogError);
//                 }

//                 app.exit(1);
//               } else {
//                 console.warn("由于不是生产环境，应用将继续运行。");
//               }
//             } else {
//               console.log(`文件 ${file} 完整性检查通过`);
//             }
//             break;
//           }
//         } catch (error) {
//           console.error(`检查文件 ${filePath} 时出错:`, error);
//         }
//       }

//       if (!fileFound) {
//         console.error(`找不到文件: ${file}`);

//         if (!process.env.NODE_ENV || process.env.NODE_ENV === "production") {
//           try {
//             const { dialog } = require("electron");
//             dialog.showErrorBox(
//               "缺少文件",
//               `应用无法找到文件: ${file}。应用将退出。`
//             );
//           } catch (dialogError) {
//             console.error("无法显示错误对话框:", dialogError);
//           }

//           app.exit(1);
//         } else {
//           console.warn(`文件 ${file} 未找到，但不是生产环境，应用将继续运行。`);
//         }
//       }
//     }

//     console.log("文件完整性检查完成");
//   }

//   // 检查每个文件
//   for (const [file, expectedHash] of Object.entries(expectedHashes)) {
//     const possiblePaths = getFilePaths(file);
//     let fileFound = false;

//     console.log(`正在查找文件: ${file}`);
//     console.log("检查以下路径:");
//     possiblePaths.forEach((p) => console.log(`- ${p}`));

//     for (const filePath of possiblePaths) {
//       try {
//         if (fs.existsSync(filePath)) {
//           fileFound = true;
//           console.log(`找到文件: ${filePath}`);

//           // 读取文件内容计算哈希值
//           const fileContent = fs.readFileSync(filePath);
//           const actualHash = crypto
//             .createHash("sha256")
//             .update(fileContent)
//             .digest("hex");

//           console.log(`文件哈希值: ${actualHash}`);
//           console.log(`预期哈希值: ${expectedHash}`);

//           // 在开发环境或调试模式下，可以禁用哈希值检查
//           const skipHashCheck = process.argv.includes("--skip-hash-check");
//           if (actualHash !== expectedHash && !skipHashCheck) {
//             console.error(`文件完整性检查失败: ${file}`);
//             console.error(`预期哈希值: ${expectedHash}`);
//             console.error(`实际哈希值: ${actualHash}`);

//             // 仅在生产环境退出应用
//             if (
//               !process.env.NODE_ENV ||
//               process.env.NODE_ENV === "production"
//             ) {
//               // 显示错误对话框
//               try {
//                 const { dialog } = require("electron");
//                 dialog.showErrorBox(
//                   "文件完整性检查失败",
//                   `文件 ${file} 可能已被修改或损坏。应用将退出。`
//                 );
//               } catch (dialogError) {
//                 console.error("无法显示错误对话框:", dialogError);
//               }

//               app.exit(1);
//             } else {
//               console.warn("由于不是生产环境，应用将继续运行。");
//             }
//           } else {
//             console.log(`文件 ${file} 完整性检查通过`);
//           }
//           break;
//         }
//       } catch (error) {
//         console.error(`检查文件 ${filePath} 时出错:`, error);
//       }
//     }

//     if (!fileFound) {
//       console.error(`找不到文件: ${file}`);

//       // 根据是否是必要文件决定是否退出
//       const isCriticalFile = file === "main.js";

//       if (
//         isCriticalFile &&
//         (!process.env.NODE_ENV || process.env.NODE_ENV === "production")
//       ) {
//         // 显示错误对话框
//         try {
//           const { dialog } = require("electron");
//           dialog.showErrorBox(
//             "缺少关键文件",
//             `应用无法找到必要的文件: ${file}。应用将退出。`
//           );
//         } catch (dialogError) {
//           console.error("无法显示错误对话框:", dialogError);
//         }

//         app.exit(1);
//       } else {
//         console.warn(
//           `文件 ${file} 未找到，但不是关键文件或不是生产环境，应用将继续运行。`
//         );
//       }
//     }
//   }

//   console.log("文件完整性检查完成");
// }

module.exports = {
  initialize: function () {
    detectDebugger();
    detectVM();
    // checkFileIntegrity();
  },
};
