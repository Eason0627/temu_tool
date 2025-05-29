// 初始化配置
require("dotenv").config();
const { app, BrowserWindow, dialog, ipcMain, clipboard } = require("electron");
const path = require("path");
const fs = require("fs");
const util = require("util");
const qiniu = require("qiniu");
const { exec, spawn } = require("child_process");
// 将 fs 的异步方法转换为 Promise
const readdir = util.promisify(fs.readdir);
const iconv = require("iconv-lite");
const os = require("os");
const axios = require("axios");
const XLSX = require("xlsx");
const protection = require("./protection");
const {
  verifyLicense,
  loadLicense,
  saveLicense,
  getMachineId,
  getMacAddress,
  checkDeviceAuthorization,
} = require("./license");
// 保持对window对象的全局引用
let mainWindow;
// 根据平台选择 qshell 路径
function getQshellPath() {
  const platform = process.platform;
  const binDir = path.join(__dirname, "bin");
  if (platform === "win32") return path.join(binDir, "qshell-win.exe");
  if (platform === "darwin") return path.join(binDir, "qshell-mac");
  return path.join(binDir, "qshell-linux");
}

const accessKey = "_FnSgS59Hm_tcJjO-afClV9_eiblS7I81xEgD66i";
const secretKey = "wLoO6gAWjFgWYw0b5VL2PMlgBvoVhRSwSKg42ZVu";
const bucketName = "test-123czxc";
const domain = "http://sw6qp9sts.hd-bkt.clouddn.com/";

// 初始化认证
const mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
const config = new qiniu.conf.Config();
const bucketManager = new qiniu.rs.BucketManager(mac, config);
// ================= 封装可直接调用的函数 =================
/**
 * 检测七牛云虚拟文件夹是否存在
 * @param {string} folderPath 文件夹路径（必须以/结尾，例如 '合成文件/项目A/'）
 * @returns {Promise<{exists: boolean, error?: string}>}
 */
const checkQiniuFolderExists = async (folderPath) => {
  // 参数校验
  if (!folderPath.endsWith("/")) {
    return {
      exists: false,
      error: "文件夹路径必须以斜杠结尾，示例：合成文件/项目A/",
    };
  }

  try {
    const result = await new Promise((resolve) => {
      bucketManager.listPrefix(
        bucketName,
        {
          prefix: folderPath,
          limit: 1, // 只需要检测是否存在至少一个文件
        },
        (err, respBody) => {
          if (err) {
            resolve({ exists: false, error: err.message });
          } else {
            resolve({
              exists: respBody.items && respBody.items.length > 0,
            });
          }
        }
      );
    });
    return result;
  } catch (err) {
    return {
      exists: false,
      error: `检测失败: ${err.message}`,
    };
  }
};
/**
 * 创建七牛云虚拟文件夹（通过上传占位文件）
 * 修复版本：包含可靠的占位文件清理
 */
const createQiniuFolder = async (folderPath, options = {}) => {
  const { forceCheck = true } = options;
  const normalizedPath = folderPath.endsWith("/")
    ? folderPath
    : `${folderPath}/`;
  const placeholderKey = `${normalizedPath}.keep`;

  // 1. 检查文件夹是否存在（可选）
  if (forceCheck) {
    const { exists } = await checkQiniuFolderExists(normalizedPath);
    if (exists) return { success: true };
  }

  // 2. 生成上传凭证
  const putPolicy = new qiniu.rs.PutPolicy({
    scope: `${bucketName}:${placeholderKey}`,
    expires: 3600,
  });
  const token = putPolicy.uploadToken(mac);

  // 3. 上传占位文件
  const formUploader = new qiniu.form_up.FormUploader();
  const putExtra = new qiniu.form_up.PutExtra();

  const uploadResult = await new Promise((resolve) => {
    formUploader.put(
      token,
      placeholderKey,
      Buffer.from(""),
      putExtra,
      (err, respBody, respInfo) => {
        if (err) {
          resolve({ success: false, error: err.message });
        } else if (respInfo.statusCode === 200) {
          resolve({ success: true });
        } else {
          resolve({ success: false, error: respBody?.error || "上传失败" });
        }
      }
    );
  });

  if (!uploadResult.success) {
    return uploadResult;
  }

  // 4. 删除占位文件
  const deleteResult = await new Promise((resolve) => {
    bucketManager.delete(
      bucketName,
      placeholderKey,
      (err, respBody, respInfo) => {
        if (err) {
          console.error("删除失败:", err);
          resolve({ success: false, error: err.message });
        } else if (respInfo.statusCode === 200 || respInfo.statusCode === 612) {
          // 612 表示文件不存在（可能已被删除）
          resolve({ success: true });
        } else {
          console.error("删除异常状态码:", respInfo.statusCode);
          resolve({ success: false, error: "删除失败" });
        }
      }
    );
  });

  return deleteResult;
};
/**
 * 检查文件是否存在
 * @param {string} fileKey 文件在七牛云的key
 * @returns {Promise<boolean>}
 */
const checkQiniuFileExists = async (fileKey) => {
  return new Promise((resolve) => {
    bucketManager.stat(bucketName, fileKey, (err, respBody, respInfo) => {
      resolve(respInfo.statusCode === 200 && !err);
    });
  });
};

/**
 * 下载七牛云文件到本地
 * @param {object} params
 * @param {string} params.fileKey - 七牛云文件key
 * @param {string} params.savePath - 本地保存路径（需包含文件名）
 * @returns {Promise<{ success: boolean, message?: string }>}
 */
const downloadQiniuFile = async ({ fileKey, savePath }) => {
  try {
    // 生成下载链接（私有空间需要 token）
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const privateUrl = bucketManager.privateDownloadUrl(
      domain,
      fileKey,
      deadline
    );

    // 创建目录（如果不存在）
    const dir = path.dirname(savePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 使用 axios 下载（更稳定的方案）
    const response = await axios({
      method: "GET",
      url: privateUrl,
      responseType: "arraybuffer", // 二进制流模式
    });

    // 写入文件
    fs.writeFileSync(savePath, Buffer.from(response.data));

    return { success: true };
  } catch (err) {
    return {
      success: false,
      message: `下载失败: ${err.response?.status || err.message}`,
    };
  }
};

// ================= 暴露给渲染进程 =================
// 检测文件夹存在性
ipcMain.handle("checkQiniuFolder", (event, folderPath) =>
  checkQiniuFolderExists(folderPath)
);
// 创建文件夹
ipcMain.handle("createQiniuFolder", (event, folderPath, options) =>
  createQiniuFolder(folderPath, options)
);
ipcMain.handle("checkQiniuFileExists", (event, fileKey) =>
  checkQiniuFileExists(fileKey)
);
ipcMain.handle("downloadQiniuFile", (event, params) =>
  downloadQiniuFile(params)
);
ipcMain.handle("listQiniuFiles", async (_, { prefix, limit }) => {
  return new Promise((resolve) => {
    bucketManager.listPrefix(bucketName, { prefix, limit }, (err, resp) => {
      if (err) return resolve({ error: err.message });
      resolve({
        files: resp.items.map((item) => ({
          key: item.key,
          size: item.fsize,
          putTime: item.putTime,
        })),
      });
    });
  });
});
ipcMain.handle("uploadProjectJSON", async (_, { data, key, token }) => {
  let tempPath;
  try {
    // 1. 创建临时文件（使用promises API保持一致性）
    tempPath = path.join(os.tmpdir(), `upload_${Date.now()}.json`);
    await fs.promises.writeFile(tempPath, data, "utf-8");

    // 2. 上传逻辑
    const formUploader = new qiniu.form_up.FormUploader();
    const putExtra = new qiniu.form_up.PutExtra();

    const result = await new Promise((resolve) => {
      formUploader.putFile(
        token,
        key,
        tempPath,
        putExtra,
        (err, respBody, respInfo) => {
          if (err) {
            resolve({ success: false, error: err.message });
          } else if (respInfo.statusCode === 200) {
            resolve({ success: true, data: respBody });
          } else {
            resolve({ success: false, error: respBody.error });
          }
        }
      );
    });

    return result;
  } catch (err) {
    console.error("文件上传过程中出错:", err);
    return { success: false, error: err.message };
  } finally {
    // 3. 更安全的清理逻辑
    if (tempPath) {
      try {
        // 先检查文件是否存在
        await fs.promises.access(tempPath, fs.constants.F_OK);
        // 存在才删除
        await fs.promises.unlink(tempPath);
      } catch (cleanErr) {
        // 如果文件不存在（ENOENT），忽略这个错误
        if (cleanErr.code !== "ENOENT") {
          console.error("临时文件清理失败:", cleanErr);
        }
      }
    }
  }
});
ipcMain.handle("readJSONFile", async (_, path) => {
  try {
    return fs.promises.readFile(path, "utf-8");
  } catch (err) {
    throw new Error(`读取文件失败: ${err.message}`);
  }
});

// 主进程直接检查账户是否存在
ipcMain.handle("check-account", async (event, bucket) => {
  const qshell = getQshellPath();
  const proc = spawn(qshell, ["user", "ls"]);

  return new Promise((resolve) => {
    let output = "";
    proc.stdout.on("data", (data) => {
      output += data.toString();
    });
    proc.on("close", () => {
      resolve(output.includes(bucket));
    });
  });
});

// 初始化 qshell 账户
ipcMain.handle("init-qshell", (event, { ak, sk, bucket }) => {
  const qshell = getQshellPath();
  const args = ["account", ak, sk, bucket];
  console.log("[args]", args);

  return new Promise((resolve, reject) => {
    const proc = spawn(qshell, args);
    proc.on("close", (code) => {
      code === 0 ? resolve() : reject("初始化失败");
    });
  });
});

// 执行上传并返回 URL 列表
ipcMain.handle("start-upload", async (event, { localDir, timestampDir }) => {
  const qshell = getQshellPath();
  const logFile = path.join(app.getPath("temp"), "upload.log");
  const folder = localDir.split("\\").pop();
  const args = [
    "qupload2",
    "--src-dir",
    localDir,
    "--bucket",
    "test-123czxc",
    "--key-prefix",
    `${timestampDir}/${folder}/`,
    "--overwrite",
    "--thread-count",
    "100",
    "--log-file",
    logFile,
  ];
  console.log("[qshell]", args.join(" "));
  return new Promise((resolve, reject) => {
    const proc = spawn(qshell, args);
    const urls = [];
    let processedCount = 0;
    let totalCount = 0;

    function scanDir(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      let count = 0;
      entries.forEach((entry) => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          count += scanDir(fullPath); // 递归子目录
        } else if (/\.(jpg|jpeg|png)$/i.test(entry.name)) {
          count++;
        }
      });
      return count;
    }
    totalCount = scanDir(localDir);
    // 发送初始进度信息
    event.sender.send("upload-progress", {
      current: 0,
      total: totalCount,
      percent: 0,
    });
    proc.stdout.on("data", (data) => {
      const lines = data.toString().split("\n");
      lines.forEach((line) => {
        if (line.includes("Upload File success")) {
          // 获取url
          const match = line.match(/\[[^:]+:((?:[^\]\[]|\[[^\]]*\])+)(?:\]|$)/);
          if (match && match[1]) {
            const parts = match[1].split("/");
            console.log("match", match[1], parts);

            const folder = parts[2];
            let name;

            if (!folder.split(".")[1]) {
              name = parts[3];
              urls.push({
                folder,
                name,
                url: `http://sw6qp9sts.hd-bkt.clouddn.com/${match[1]}`,
              });
              // 更新进度
              processedCount++;
              const percent =
                totalCount > 0
                  ? Math.floor((processedCount / totalCount) * 100)
                  : 0;
              console.log(`已上传 ${processedCount} 个文件，进度 ${percent}%`);

              event.sender.send("upload-progress", {
                current: processedCount,
                total: totalCount,
                percent: percent,
              });
            }
          }
        }
      });
    });

    proc.on("close", (code) => {
      // 发送最终进度
      event.sender.send("upload-progress", {
        current: processedCount,
        total: totalCount,
        percent: 100,
        finished: true,
      });

      code === 0
        ? resolve({ urls, logPath: logFile })
        : reject(`上传失败，查看日志: ${logFile}`);
    });
  });
});
// Windows 控制台编码配置
if (process.platform === "win32") {
  process.env.LANG = "zh_CN.UTF-8";
  process.env.LC_ALL = "zh_CN.UTF-8";

  // 重写控制台输出编码
  const originalWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = (chunk, encoding, callback) => {
    if (typeof chunk === "string") {
      chunk = iconv.encode(chunk, "cp936");
    }
    return originalWrite(chunk, encoding, callback);
  };
}
// 主窗口创建
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 960,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      webSecurity: false,
    },
  });

  // 加载内容
  const loadURL = app.isPackaged
    ? `file://${path.join(app.getAppPath(), "dist/index.html")}`
    : "http://localhost:5173";

  mainWindow.loadURL(loadURL);

  // 开发工具
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }

  // 窗口关闭处理
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
// 安全退出处理
async function gracefulShutdown() {
  try {
    // 退出应用
    if (process.platform !== "darwin") {
      app.quit();
    }
  } catch (err) {
    console.error("退出失败:", err);
    process.exit(1);
  }
}

// 当Electron完成初始化并准备创建浏览器窗口时调用此方法
app
  .whenReady()
  .then(() => {
    createWindow();
    // return startBackendServer();
  })
  .catch((err) => {
    console.error("启动失败:", err);
    app.quit();
  });

// 当所有窗口关闭时退出应用
app.on("window-all-closed", gracefulShutdown);

app.on("before-quit", gracefulShutdown);
// 后端服务管理
// async function startBackendServer() {
//   const serverPath = app.isPackaged
//     ? path.join(process.resourcesPath, "node_server")
//     : path.join(__dirname, "../../node_server");

//   const indexPath = path.join(serverPath, "index.js");

//   // 验证入口文件
//   if (!fs.existsSync(indexPath)) {
//     const msg = `后端入口文件不存在: ${indexPath}`;
//     dialog.showErrorBox("启动错误", msg);
//     throw new Error(msg);
//   }

//   // 生产环境依赖安装
//   if (app.isPackaged) {
//     const nodeModulesPath = path.join(serverPath, "node_modules");
//     if (!fs.existsSync(nodeModulesPath)) {
//       console.log("⚙️ 正在安装生产依赖...");
//       await new Promise((resolve, reject) => {
//         const installer = spawn("npm", ["install", "--production"], {
//           cwd: serverPath,
//           stdio: "ignore",
//           windowsHide: true,
//         });

//         installer.on("close", (code) =>
//           code === 0 ? resolve() : reject(code)
//         );
//         installer.on("error", reject);
//       });
//     }
//   }

//   // 启动后端进程
//   backendProcess = fork(indexPath, [], {
//     cwd: serverPath,
//     stdio: app.isPackaged ? "ignore" : "inherit",
//     env: {
//       ...process.env,
//       NODE_PATH: [
//         path.join(serverPath, "node_modules"),
//         path.join(serverPath, "../node_modules"), // 添加上级node_modules
//       ].join(path.delimiter),
//     },
//   });

//   // 进程事件处理
//   backendProcess
//     .on("message", (msg) => console.log("[Backend]", msg))
//     .on("error", (err) => {
//       console.error("❌ 后端错误:", err);
//       dialog.showErrorBox("后端错误", err.message);
//     })
//     .on("exit", (code) => {
//       console.log(`⚠️ 后端退出 Code: ${code}`);
//       if (code !== 0 && mainWindow?.isDestroyed() === false) {
//         dialog.showErrorBox("服务异常", `后端意外终止 (${code})`);
//       }
//     });
// }

// 处理选择目录的IPC消息
ipcMain.handle("select-directory", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
  });

  if (!result.canceled) {
    return result.filePaths[0];
  }
  return null;
});
// 流式上传文件到七牛云
ipcMain.handle("uploadFileStream", async (event, options) => {
  try {
    const { filePath, key, token } = options;

    // 创建文件读取流
    const readStream = fs.createReadStream(filePath);

    // 配置七牛云上传
    const mac = new qiniu.auth.digest.Mac(null, null);
    const config = new qiniu.conf.Config();
    config.zone = qiniu.zone.Zone_z0;
    config.useHttpsDomain = true;
    config.useCdnDomain = true;

    const formUploader = new qiniu.form_up.FormUploader(config);
    const putExtra = new qiniu.form_up.PutExtra();

    // 使用Promise包装回调式API
    return new Promise((resolve, reject) => {
      // 使用putStream方法进行流式上传
      formUploader.putStream(
        token,
        key,
        readStream,
        putExtra,
        (err, body, info) => {
          // 关闭流
          readStream.destroy();

          if (err) {
            console.error("七牛云上传失败:", err);
            reject({ success: false, error: err.message });
            return;
          }

          if (info.statusCode === 200) {
            console.log("七牛云上传成功:", body);
            resolve({
              success: true,
              data: body,
            });
          } else {
            console.error("七牛云上传失败:", info.statusCode, body);
            reject({
              success: false,
              error: `状态码: ${info.statusCode}, 信息: ${JSON.stringify(
                body
              )}`,
            });
          }
        }
      );
    });
  } catch (error) {
    console.error("七牛云流式上传处理错误:", error);
    return { success: false, error: error.message };
  }
});
// 七牛云上传处理
ipcMain.handle("uploadToQiniu", async (event, options) => {
  try {
    const { filePath, key, token } = options;

    // 简化配置，不使用区域配置
    const mac = new qiniu.auth.digest.Mac(null, null);
    const config = new qiniu.conf.Config();
    // 空间对应的机房
    config.zone = qiniu.zone.Zone_z0;
    // 是否使用https域名
    config.useHttpsDomain = true;
    // 上传是否使用cdn加速
    config.useCdnDomain = true;

    const formUploader = new qiniu.form_up.FormUploader(config);
    const putExtra = new qiniu.form_up.PutExtra();

    // 使用Promise包装回调式API
    return new Promise((resolve, reject) => {
      formUploader.putFile(
        token,
        key,
        filePath,
        putExtra,
        (err, body, info) => {
          if (err) {
            console.error("七牛云上传失败:", err);
            reject({ success: false, error: err.message });
            return;
          }

          if (info.statusCode === 200) {
            console.log("七牛云上传成功:", body);
            resolve({
              success: true,
              data: body,
            });
          } else {
            console.error("七牛云上传失败:", info.statusCode, body);
            reject({
              success: false,
              error: `状态码: ${info.statusCode}, 信息: ${JSON.stringify(
                body
              )}`,
            });
          }
        }
      );
    });
  } catch (error) {
    console.error("七牛云上传处理错误:", error);
    return { success: false, error: error.message };
  }
});
// 处理读取目录内容的IPC消息
ipcMain.handle("read-directory", async (event, dirPath) => {
  try {
    const files = await fs.promises.readdir(dirPath, { withFileTypes: true });
    const result = [];

    for (const file of files) {
      if (file.isFile() && /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name)) {
        const filePath = path.join(dirPath, file.name);
        const stats = await fs.promises.stat(filePath);

        result.push({
          name: file.name,
          path: filePath,
          size: stats.size,
          isDirectory: false,
        });
      } else if (file.isDirectory()) {
        result.push({
          name: file.name,
          path: path.join(dirPath, file.name),
          isDirectory: true,
        });
      }
    }

    return result;
  } catch (error) {
    console.error("读取目录失败:", error);
    throw error;
  }
});

ipcMain.handle("read-images-recursively", async (event, dirPath) => {
  const walk = async (dir) => {
    let results = [];
    const list = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const file of list) {
      const fullPath = path.join(dir, file.name);
      if (file.isDirectory()) {
        results = results.concat(await walk(fullPath));
      } else if (/\.(jpg|jpeg|png|gif|webp)$/i.test(file.name)) {
        results.push(fullPath);
      }
    }
    return results;
  };

  return await walk(dirPath);
});
// 处理文件保存的IPC消息
ipcMain.handle(
  "save-excel",
  async (event, { content, filename, defaultPath }) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      defaultPath: path.join(defaultPath || os.homedir(), filename),
      filters: [{ name: "Excel 文件", extensions: ["xlsx"] }],
    });
    if (canceled || !filePath) return null;
    fs.writeFileSync(filePath, Buffer.from(content));
    return filePath;
  }
);
ipcMain.handle(
  "save-json",
  async (event, { content, filename, defaultPath }) => {
    // 确保 filename 有值
    const safeFilename = filename || "export.json";

    // 安全地构建默认路径
    let dialogOptions = {
      filters: [
        { name: "JSON 文件", extensions: ["json"] },
        { name: "所有文件", extensions: ["*"] },
      ],
    };

    // 只有当 defaultPath 和 filename 都有值时才设置 defaultPath
    if (defaultPath) {
      dialogOptions.defaultPath = path.join(defaultPath, safeFilename);
    } else {
      dialogOptions.defaultPath = path.join(os.homedir(), safeFilename);
    }

    const { canceled, filePath } = await dialog.showSaveDialog(dialogOptions);
    if (canceled || !filePath) return null;

    // 检查内容类型并正确处理
    let buffer;
    if (Buffer.isBuffer(content)) {
      buffer = content;
    } else if (content instanceof ArrayBuffer) {
      buffer = Buffer.from(content);
    } else if (typeof content === "string") {
      buffer = Buffer.from(content);
    } else if (content && typeof content === "object") {
      // 对象转为 JSON 字符串
      buffer = Buffer.from(JSON.stringify(content, null, 2));
    } else {
      buffer = Buffer.from(String(content || ""));
    }

    fs.writeFileSync(filePath, buffer);
    return filePath;
  }
);
ipcMain.handle("save-file-silently", async (event, arg1, arg2) => {
  try {
    let content, filePath;

    // 检查参数格式
    if (
      arg1 &&
      typeof arg1 === "object" &&
      "content" in arg1 &&
      "filePath" in arg1
    ) {
      // 对象格式: { content, filePath }
      content = arg1.content;
      filePath = arg1.filePath;
    } else {
      // 直接参数: content, filePath
      content = arg1;
      filePath = arg2;
    }

    console.log("准备保存文件:", {
      contentType: typeof content,
      isArrayBuffer: content instanceof ArrayBuffer,
      filePath,
    });

    // 参数验证
    if (!content) {
      console.error("保存内容为空");
      return { success: false, error: "保存内容为空" };
    }

    if (!filePath || typeof filePath !== "string") {
      console.error("无效的文件路径:", filePath);
      return { success: false, error: "无效的文件路径" };
    }

    // 确保目录存在
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // 核心修复: 将 ArrayBuffer 转换为 Buffer
    let buffer;
    if (content instanceof ArrayBuffer) {
      // 关键修复: 将 ArrayBuffer 转换为 Buffer
      buffer = Buffer.from(content);
      console.log(`已将 ArrayBuffer 转换为 Buffer，长度: ${buffer.length}`);
    } else if (Buffer.isBuffer(content)) {
      buffer = content;
    } else if (typeof content === "string") {
      buffer = Buffer.from(content);
    } else if (content instanceof Uint8Array) {
      buffer = Buffer.from(content);
    } else {
      return {
        success: false,
        error: `不支持的数据类型: ${typeof content}`,
      };
    }

    // 写入文件
    console.log(`写入文件: ${filePath}, buffer 长度: ${buffer.length}`);
    fs.writeFileSync(filePath, buffer);
    console.log("文件已成功保存到:", filePath);

    return { success: true, filePath };
  } catch (err) {
    console.error("静默保存失败:", err);
    return { success: false, error: err.message };
  }
});

// 处理文件保存的IPC消息
ipcMain.handle("save-image", async (event, arg1, arg2, arg3) => {
  try {
    let content, filename, defaultPath;

    // 检查调用方式：新方式使用单个对象参数，旧方式使用多个参数
    if (arg1 && typeof arg1 === "object" && "content" in arg1) {
      // 新的调用方式: { content, filename, defaultPath }
      content = arg1.content;
      filename = arg1.filename;
      defaultPath = arg1.defaultPath;
    } else {
      // 旧的调用方式: content, filename, defaultPath
      content = arg1;
      filename = arg2;
      defaultPath = arg3;
    }

    const { canceled, filePath } = await dialog.showSaveDialog({
      defaultPath: path.join(defaultPath || os.homedir(), filename),
      filters: [{ name: "Excel 文件", extensions: ["xlsx"] }],
    });

    if (canceled || !filePath) return null;

    // 检查数据类型，并进行必要的转换
    let buffer;
    if (content instanceof ArrayBuffer) {
      buffer = Buffer.from(content);
    } else if (Buffer.isBuffer(content)) {
      buffer = content;
    } else if (typeof content === "string") {
      buffer = Buffer.from(content);
    } else if (ArrayBuffer.isView(content)) {
      // TypedArray 或 DataView
      buffer = Buffer.from(
        content.buffer,
        content.byteOffset,
        content.byteLength
      );
    } else if (content && typeof content === "object") {
      // 如果是一个普通对象，尝试将其转换为字符串或Buffer
      console.log("内容是普通对象，尝试转换", typeof content);
      try {
        buffer = Buffer.from(JSON.stringify(content));
      } catch (e) {
        throw new Error(`无法将对象转换为可保存格式: ${e.message}`);
      }
    } else {
      throw new Error(
        `不支持的数据类型: ${Object.prototype.toString.call(content)}`
      );
    }

    fs.writeFileSync(filePath, buffer);
    return {
      success: true,
      filePath,
    };
  } catch (error) {
    console.error("保存文件失败:", error);
    return null;
  }
});

ipcMain.handle("save-image-silently", async (event, arg1, arg2) => {
  console.log("save-image-silently 被调用，参数类型:", typeof arg1);

  try {
    let content, filePath;

    // 检查是否为对象格式调用
    if (
      arg1 &&
      typeof arg1 === "object" &&
      "content" in arg1 &&
      "filePath" in arg1
    ) {
      // 新方式: { content, filePath }
      content = arg1.content;
      filePath = arg1.filePath;
      console.log("使用对象格式参数，filePath:", filePath);
    } else {
      // 旧方式: content, filePath 作为独立参数
      content = arg1;
      filePath = arg2;
      console.log("使用独立参数，filePath:", filePath);
    }

    // 验证参数
    if (!filePath || typeof filePath !== "string") {
      console.error("文件路径无效:", filePath);
      throw new Error(`文件路径无效: ${filePath}`);
    }

    if (!content) {
      console.error("内容为空");
      throw new Error("内容为空");
    }

    // 创建目录（如果不存在）
    const dirPath = path.dirname(filePath);
    console.log("创建目录:", dirPath);

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // 处理不同类型的内容
    let buffer;

    if (Buffer.isBuffer(content)) {
      console.log("内容是 Buffer");
      buffer = content;
    } else if (content instanceof ArrayBuffer) {
      console.log("内容是 ArrayBuffer");
      buffer = Buffer.from(content);
    } else if (ArrayBuffer.isView(content)) {
      console.log("内容是 TypedArray");
      buffer = Buffer.from(
        content.buffer,
        content.byteOffset,
        content.byteLength
      );
    } else if (typeof content === "string") {
      console.log("内容是字符串");
      buffer = Buffer.from(content);
    } else if (typeof content === "object") {
      console.log("内容是对象，尝试序列化");

      // 如果对象有 data 属性且是 Buffer 或 TypedArray
      if (
        content.data &&
        (Buffer.isBuffer(content.data) || ArrayBuffer.isView(content.data))
      ) {
        console.log("使用对象的 data 属性");
        buffer = Buffer.isBuffer(content.data)
          ? content.data
          : Buffer.from(
              content.data.buffer,
              content.data.byteOffset,
              content.data.byteLength
            );
      } else {
        // 最后尝试 JSON 序列化
        try {
          buffer = Buffer.from(JSON.stringify(content));
        } catch (e) {
          throw new Error(`无法序列化内容: ${e.message}`);
        }
      }
    } else {
      throw new Error(`不支持的数据类型: ${typeof content}`);
    }

    if (!buffer) {
      throw new Error("无法创建有效的缓冲区");
    }

    console.log(`写入文件: ${filePath}, 大小: ${buffer.length} 字节`);
    fs.writeFileSync(filePath, buffer);
    console.log("文件保存成功");

    return { success: true, filePath };
  } catch (err) {
    console.error("静默保存文件失败:", err);
    return { success: false, error: err.message };
  }
});

// 写入文本到剪贴板
ipcMain.handle("write-clipboard-text", async (event, text) => {
  try {
    clipboard.writeText(text);
    return { success: true };
  } catch (error) {
    console.error("写入剪贴板文本失败:", error);
    return { success: false, error: error.message };
  }
});

// 模拟粘贴操作
ipcMain.handle("simulate-paste", async () => {
  try {
    // 设置剪贴板内容
    const textToPaste = clipboard.readText();
    console.log("剪贴板内容:", textToPaste);
    require("electron").clipboard.writeText(textToPaste);

    // 发送 Ctrl+V 到当前焦点的应用程序
    exec(
      `powershell -command "$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys('^v'); Start-Sleep -Milliseconds 100; $wshell.SendKeys('{TAB}')"`
    );

    return { success: true };
  } catch (error) {
    console.error("模拟粘贴失败:", error);
    return { success: false, error: error.message };
  }
});
// 检查目录是否存在
ipcMain.handle("check-directory-exists", async (event, dirPath) => {
  try {
    const stats = await fs.promises.stat(dirPath);
    return stats.isDirectory();
  } catch (error) {
    return false;
  }
});

// 创建目录
ipcMain.handle("create-directory", async (event, dirPath) => {
  try {
    await fs.promises.mkdir(dirPath, { recursive: true });
    return true;
  } catch (error) {
    console.error("创建目录失败:", error);
    throw error;
  }
});

// 列出目录文件
ipcMain.handle("listFiles", (event, dirPath) => {
  try {
    return fs
      .readdirSync(dirPath)
      .filter((file) =>
        [".jpg", ".png"].includes(path.extname(file).toLowerCase())
      );
  } catch (error) {
    throw new Error(`读取目录失败: ${error.message}`);
  }
});

// 移动文件
ipcMain.handle("moveFile", (event, source, target) => {
  try {
    fs.renameSync(source, target);
    return { success: true };
  } catch (error) {
    throw new Error(`移动文件失败: ${error.message}`);
  }
});

ipcMain.handle("listDirectories", async (event, dirPath) => {
  try {
    // 检查路径是否存在
    if (!fs.existsSync(dirPath)) {
      return {
        success: false,
        error: "Directory does not exist",
        directories: [],
      };
    }

    // 读取目录内容
    const entries = await readdir(dirPath, { withFileTypes: true });

    // 过滤出子目录
    const directories = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        directories.push(entry.name);
      }
    }
    return {
      success: true,
      directories: directories,
    };
  } catch (error) {
    console.error("Error listing directories:", error);
    return {
      success: false,
      error: error.message,
      directories: [],
    };
  }
});
ipcMain.handle("get-directory-file-count", async (event, dirPath) => {
  try {
    // 检查目录是否存在
    const stats = await fs.promises.stat(dirPath);
    if (!stats.isDirectory()) {
      throw new Error("指定的路径不是目录");
    }

    // 读取目录内容
    const files = await fs.promises.readdir(dirPath);

    // 过滤掉子目录，只计算文件
    const fileStats = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(dirPath, file);
        try {
          const stat = await fs.promises.stat(filePath);
          return {
            name: file,
            isFile: stat.isFile(),
            size: stat.size,
            mtime: stat.mtime,
          };
        } catch (error) {
          return null;
        }
      })
    );

    // 过滤掉错误和目录，只保留文件
    const onlyFiles = fileStats.filter((item) => item && item.isFile);

    return {
      total: onlyFiles.length,
    };
  } catch (error) {
    console.error("获取目录文件数量失败:", error);
    throw error;
  }
});
// 添加IPC通信处理
ipcMain.handle("open-directory-dialog", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory", "createDirectory"],
    title: "选择项目路径",
    buttonLabel: "选择此目录",
  });

  return {
    canceled: result.canceled,
    filePaths: result.filePaths,
  };
});
ipcMain.handle("deleteFile", async (_, filePath) => {
  try {
    await fs.promises.unlink(filePath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
// 选择文件
ipcMain.handle("select-file", async (event, options = {}) => {
  const {
    filters = [{ name: "Excel", extensions: ["xlsx", "xls"] }],
    ...otherOptions
  } = options;

  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters,
    ...otherOptions,
  });

  if (result.canceled) {
    return null;
  }

  return result.filePaths[0];
});
// 处理读取文件内容的IPC消息
ipcMain.handle("read-file", async (event, filePath) => {
  try {
    const buffer = await fs.promises.readFile(filePath);
    return buffer.buffer;
  } catch (error) {
    console.error("读取文件失败:", error);
    throw error;
  }
});
ipcMain.handle("read-excel", async (event, filePath) => {
  try {
    const data = fs.readFileSync(filePath);
    const workbook = XLSX.read(data, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    return jsonData;
  } catch (e) {
    console.error("读取 Excel 文件失败:", e);
    throw e;
  }
});
const getProjectListPath = () => {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, "projectList.json");
};

ipcMain.handle("save-project-list", async (event, jsonString) => {
  try {
    const filePath = getProjectListPath();
    await fs.promises.writeFile(filePath, jsonString, "utf-8");
    return true;
  } catch (error) {
    console.error("保存 projectList 失败：", error);
    throw error;
  }
});

ipcMain.handle("load-project-list", async () => {
  try {
    const filePath = getProjectListPath();
    if (fs.existsSync(filePath)) {
      const content = await fs.promises.readFile(filePath, "utf-8");
      return content;
    } else {
      return "[]";
    }
  } catch (error) {
    console.error("读取 projectList 失败：", error);
    throw error;
  }
});
ipcMain.handle("check-folder-exists", async (_, path) => {
  try {
    // 验证输入路径
    if (!filePath || typeof filePath !== "string") {
      return {
        exists: false,
        error: "Invalid path provided",
      };
    }

    // 标准化路径，处理不同操作系统的路径分隔符
    const normalizedPath = path.normalize(filePath);

    // 检查路径是否存在
    await access(normalizedPath, fs.constants.F_OK);

    // 如果没有抛出异常，则文件存在
    return {
      exists: true,
    };
  } catch (error) {
    // 如果路径不存在或者其他错误
    return {
      exists: false,
      error: error.code === "ENOENT" ? "Path does not exist" : error.message,
    };
  }
});
ipcMain.handle("check-file-exists", async (_, filePath) => {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    console.error("检查文件存在失败：", error);
    return false;
  }
});
ipcMain.handle("read-directory-names", async (event, dirPath) => {
  const files = await fs.promises.readdir(dirPath, { withFileTypes: true });
  return files.filter((f) => f.isDirectory()).map((f) => f.name);
});

// 获取设备mac地址
ipcMain.handle("get-mac-address", async () => {
  return await getMacAddress();
});

// 退出程序,关闭所有相关进程
ipcMain.handle("exit-app", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
  app.quit();
});

// 导入自动更新模块
const { autoUpdater } = require("electron-updater");
const log = require("electron-log");
const isDev = process.env.NODE_ENV === "development";

// 配置日志
log.transports.file.level = "info";
autoUpdater.logger = log;
autoUpdater.autoDownload = true;

// 检查更新
function checkForUpdates() {
  // 只在生产环境中检查更新
  if (isDev && !process.env.FORCE_DEV_UPDATE) {
    log.info("开发环境中跳过更新检查");
    return Promise.resolve({ updateAvailable: false });
  }

  return autoUpdater.checkForUpdatesAndNotify();
}

// 在应用准备就绪后检查更新
app.whenReady().then(() => {
  // ... existing code ...

  // 只在生产环境中自动检查更新
  if (!isDev) {
    // 延迟几秒检查更新，确保应用已完全启动
    setTimeout(checkForUpdates, 3000);
  }
});

// 添加更新事件监听
autoUpdater.on("checking-for-update", () => {
  log.info("正在检查更新...");
  if (mainWindow) {
    mainWindow.webContents.send("update-message", "正在检查更新...");
  }
});

autoUpdater.on("update-available", (info) => {
  log.info("发现新版本，开始下载...");
  if (mainWindow) {
    mainWindow.webContents.send("update-available", info);
  }
});

autoUpdater.on("update-not-available", () => {
  log.info("当前已是最新版本");
  if (mainWindow) {
    mainWindow.webContents.send("update-not-available");
  }
});

autoUpdater.on("download-progress", (progressObj) => {
  let message = `下载速度: ${progressObj.bytesPerSecond} - 已下载 ${progressObj.percent}% (${progressObj.transferred}/${progressObj.total})`;
  log.info(message);
  if (mainWindow) {
    mainWindow.webContents.send("download-progress", progressObj);
  }
});

autoUpdater.on("update-downloaded", () => {
  log.info("更新已下载，将在退出时安装");
  if (mainWindow) {
    mainWindow.webContents.send("update-downloaded");
  }
});

autoUpdater.on("error", (err) => {
  log.error("更新出错", err);
  if (mainWindow) {
    mainWindow.webContents.send("update-error", err);
  }
});

// 添加IPC监听器，用于手动检查更新和安装更新
ipcMain.handle("check-for-updates", () => {
  return checkForUpdates();
});

ipcMain.on("quit-and-install", () => {
  autoUpdater.quitAndInstall();
});
