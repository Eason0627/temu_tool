export {}; // 防止模块作用域冲突

declare global {
  interface Window {
    qiniu: any;
    electronAPI: {
      selectDirectory: () => Promise<string | undefined>;
      saveFile: (
        content: string,
        defaultFileName: string,
        defaultPath?: string
      ) => Promise<string | undefined>;
      saveFileSilently: (content: string, filePath: string) => Promise<boolean>;
      saveImage: (
        content: string,
        defaultFileName: string,
        defaultPath?: string
      ) => Promise<string | undefined>;
      saveImageSilently: (
        content: string,
        filePath: string
      ) => Promise<boolean>;
      readAllImagesRecursively: (
        directoryPath: string
      ) => Promise<Array<string>>;
      selectFile: (options) => Promise<string | undefined>;
      getDirectoryFileCount: (dirPath) => Promise<number>;
      readFile: (filePath: string) => Promise<ArrayBuffer>;
      readExcel: (filePath: string) => Promise<Array<any>>;
      saveProjectList: (projectList: string) => Promise<void>;
      loadProjectList: () => Promise<string>;
      existsFolder: (path: string) => Promise<boolean>;
      checkFolderExists: (folderPath: string) => Promise<boolean>;
      readDirectoryNames: (path: string) => Promise<string[]>;
      checkFileExists: (filePath: string) => Promise<boolean>;
      launchComfyUI: () => Promise<void>;
      checkComfyUIReady: () => Promise<boolean>;
      checkSystemCompatibility: () => Promise<Object>;
      terminateComfyUI: () => Promise<void>;
      getMacAddress: () => Promise<string>;
      exitApp: () => Promise<void>;
    };
  }
}
