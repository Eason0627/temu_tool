const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // 文件系统操作API（带安全校验）
  listFiles: (dirPath) => {
    return fs.readdirSync(dirPath);
  },
  moveFile: (source, target) => {
    fs.renameSync(source, target);
  },
  selectDirectory: () => ipcRenderer.invoke("select-directory"),
  readDirectory: (dirPath) => ipcRenderer.invoke("read-directory", dirPath),
  readAllImagesRecursively: (dirPath) =>
    ipcRenderer.invoke("read-images-recursively", dirPath), // 添加这一行
  saveFile: (content, filename, defaultPath) =>
    ipcRenderer.invoke("save-file", {
      content: Buffer.from(content), // 关键：转换为 Buffer
      filename,
      defaultPath,
    }),
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
