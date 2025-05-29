const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  initQshell: (ak, sk, bucket) =>
    ipcRenderer.invoke("init-qshell", { ak, sk, bucket }),
  checkQshell: (bucket) => ipcRenderer.invoke("check-account", bucket),
  startUpload: (options) => ipcRenderer.invoke("start-upload", options),
  onUploadProgress: (callback) =>
    ipcRenderer.on("upload-progress", (_, data) => callback(data)),
  uploadToQiniu: (options) => ipcRenderer.invoke("uploadToQiniu", options),
  uploadFileStream: (options) =>
    ipcRenderer.invoke("uploadFileStream", options),
  uploadProjectJSON: (options) =>
    ipcRenderer.invoke("uploadProjectJSON", options),
  listQiniuFiles: (options) => ipcRenderer.invoke("listQiniuFiles", options),
  checkQiniuFolder: (folderPath) =>
    ipcRenderer.invoke("checkQiniuFolder", folderPath),
  createQiniuFolder: (folderPath) =>
    ipcRenderer.invoke("createQiniuFolder", folderPath),
  checkQiniuFile: (fileKey) =>
    ipcRenderer.invoke("checkQiniuFileExists", fileKey),
  downLoadQiniuFile: (params) =>
    ipcRenderer.invoke("downloadQiniuFile", params),
  readJSONFile: (path) => ipcRenderer.invoke("readJSONFile", path),
  listFiles: (dirPath) => ipcRenderer.invoke("listFiles", dirPath),
  moveFile: (source, target) => ipcRenderer.invoke("moveFile", source, target),
  deleteFile: (filePath) => ipcRenderer.invoke("deleteFile", filePath),
  selectDirectory: () => ipcRenderer.invoke("select-directory"),
  readDirectory: (dirPath) => ipcRenderer.invoke("read-directory", dirPath),
  readAllImagesRecursively: (dirPath) =>
    ipcRenderer.invoke("read-images-recursively", dirPath), // 添加这一行
  saveFile: (content, filename, defaultPath) =>
    ipcRenderer.invoke("save-excel", {
      content, // 直接传递内容，不要在这里转换
      filename,
      defaultPath,
    }),
  saveJSON: (options) => {
    // 确保传递的是一个对象，包含必要的参数
    return ipcRenderer.invoke("save-json", options);
  },
  saveFileSilently: (content, filePath) =>
    ipcRenderer.invoke("save-file-silently", { content, filePath }),
  saveImage: (content, filename, defaultPath) =>
    ipcRenderer.invoke("save-image", {
      content: Buffer.from(content), // 关键：转换为 Buffer
      filename,
      defaultPath,
    }),
  saveImageSilently: (options) =>
    ipcRenderer.invoke("save-image-silently", options),
  // 剪贴板相关操作
  writeClipboardText: (text) =>
    ipcRenderer.invoke("write-clipboard-text", text),
  simulatePaste: () => ipcRenderer.invoke("simulate-paste"),
  checkDirectoryExists: (dirPath) =>
    ipcRenderer.invoke("check-directory-exists", dirPath),
  createDirectory: (dirPath) => ipcRenderer.invoke("create-directory", dirPath),
  listDirectories: async (dirPath) => {
    const result = await ipcRenderer.invoke("listDirectories", dirPath);
    if (result.success) {
      return result.directories;
    } else {
      throw new Error(result.error);
    }
  },
  getDirectoryFileCount: (dirPath) =>
    ipcRenderer.invoke("get-directory-file-count", dirPath),
  openDirectoryDialog: () => ipcRenderer.invoke("open-directory-dialog"),
  selectFile: (options) => ipcRenderer.invoke("select-file", options),
  readFile: (filePath) => ipcRenderer.invoke("read-file", filePath),
  readExcel: (filePath) => ipcRenderer.invoke("read-excel", filePath),
  saveProjectList: (jsonString) =>
    ipcRenderer.invoke("save-project-list", jsonString),
  loadProjectList: () => ipcRenderer.invoke("load-project-list"),
  existsFolder: (folderPath) =>
    ipcRenderer.invoke("check-folder-exists", folderPath),
  readDirectoryNames: (dirPath) =>
    ipcRenderer.invoke("read-directory-names", dirPath),
  checkFileExists: (filePath) =>
    ipcRenderer.invoke("check-file-exists", filePath),
  getMacAddress: () => ipcRenderer.invoke("get-mac-address"),
  exitApp: () => ipcRenderer.invoke("exit-app"),
});

// 添加环境变量
contextBridge.exposeInMainWorld("env", {
  isDev: process.env.NODE_ENV === "development",
});

// 添加更新相关API
contextBridge.exposeInMainWorld("updateAPI", {
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  quitAndInstall: () => ipcRenderer.send("quit-and-install"),
  onUpdateMessage: (callback) =>
    ipcRenderer.on("update-message", (_, message) => callback(message)),
  onUpdateAvailable: (callback) =>
    ipcRenderer.on("update-available", (_, info) => callback(info)),
  onUpdateNotAvailable: (callback) =>
    ipcRenderer.on("update-not-available", () => callback()),
  onDownloadProgress: (callback) =>
    ipcRenderer.on("download-progress", (_, progressObj) =>
      callback(progressObj)
    ),
  onUpdateDownloaded: (callback) =>
    ipcRenderer.on("update-downloaded", () => callback()),
  onUpdateError: (callback) =>
    ipcRenderer.on("update-error", (_, err) => callback(err)),
});
