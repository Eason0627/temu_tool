<template>
  <div class="prepare">
    <div class="prepare-container">
      <h2>📁 项目结构初始化</h2>
      <div class="initHeader">
        <InitProjectDirctory />
        <MoveImage />
      </div>
      <h2>📁 上传本地文件夹中的图片</h2>
      <div class="submit">
        <div class="folder-buttons">
          <button
            class="upload-btn"
            @click="handleFileSelect"
            v-loading.fullscreen.lock="isLoadingImage"
            element-loading-background="rgba(0, 0, 0, 0.5)"
          >
            📁 选择文件夹
          </button>
          <button
            v-if="previews.length"
            class="clear-btn"
            @click="clearSelection"
          >
            🗑️ 清空选择
          </button>
        </div>
        <button @click="uploadImages" :disabled="isUploading || isLoadingToken">
          <span v-if="isLoadingToken">⏳ 获取Token中...</span>
          <span v-else-if="isUploading">⏳ 上传中...</span>
          <span v-else>🚀 开始上传</span>
        </button>
      </div>
      <!-- 预览列表 (仅在选择文件后且未开始上传时显示) -->
      <div
        v-if="previews.length && !isUploading && !uploadFinished"
        class="file-summary"
      >
        <h3>已选择 {{ previews.length }} 个文件</h3>

        <!-- 文件夹信息 -->
        <div class="folders-container">
          <div
            v-for="(count, folder) in folderCounts"
            :key="folder"
            class="folder-info-card"
          >
            <div class="folder-icon">📁</div>
            <div class="folder-details">
              <div class="folder-name">
                <span>{{ folder }}</span>
                <div class="folder-count">
                  <div>{{ count }} 个文件</div>
                  <div class="close" @click.stop="removeFolder(folder)">
                    <el-icon><Close /></el-icon>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 文件预览网格 -->
        <div class="file-preview-grid">
          <div
            v-for="(items, folder) in groupedPreviews"
            :key="folder"
            class="folder-section"
          >
            <h4 class="folder-title">{{ folder }}</h4>
            <div class="file-grid-scroll">
              <div class="file-grid">
                <div
                  v-for="item in (items as UploadItem[])"
                  :key="item.id"
                  class="file-item"
                >
                  <div class="file-thumbnail">
                    <img :src="item.previewUrl" alt="预览图" />
                  </div>
                  <el-tooltip placement="top" :content="item.file.name">
                    <div class="file-name">{{ item.file.name }}</div>
                  </el-tooltip>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        v-if="!previews.length && !isUploading && !uploadFinished"
        class="empty"
      >
        <el-empty>
          <template #description>
            <div class="empty-message">
              <p>
                请选择一个文件夹，然后点击"开始上传"按钮，即可开始上传文件夹中的图片。
              </p>
            </div>
          </template>
        </el-empty>
      </div>
      <!-- Token加载状态 -->
      <div v-if="isLoadingToken" class="token-loading">
        <el-alert
          title="正在获取上传授权，请稍候..."
          type="info"
          :closable="false"
          show-icon
        >
          <template #icon
            ><el-icon class="is-loading"><Loading /></el-icon
          ></template>
        </el-alert>
      </div>

      <!-- 总进度条 -->
      <div v-if="isUploading || uploadFinished" class="upload-progress">
        <div class="progress-header">
          <h3>上传进度</h3>
          <div class="progress-stats">
            <span>{{ uploadedCount }}/{{ totalCount }} 文件</span>
            <span>{{ failedCount }} 失败</span>
          </div>
        </div>
        <el-progress
          :percentage="totalProgress"
          :status="uploadStatus"
          :stroke-width="20"
        ></el-progress>
        <div class="progress-info">
          <p v-if="uploadFinished && failedCount === 0">
            ✅ 所有文件上传成功！
          </p>
          <p v-else-if="uploadFinished">
            ⚠️ 上传完成，但有 {{ failedCount }} 个文件失败
          </p>
          <p v-else>正在上传中，请稍候...</p>
        </div>
      </div>

      <!-- 上传结果 -->
      <div v-if="uploadFinished" class="upload-results">
        <h3>上传结果</h3>
        <el-tabs type="border-card">
          <el-tab-pane label="成功文件">
            <div class="success-count">
              成功上传: {{ successItems.length }} 个文件
            </div>
            <el-button type="primary" @click="exportSuccessUrls" size="small">
              导出成功URL
            </el-button>

            <!-- 按文件夹分组显示URL -->
            <div class="grouped-urls">
              <div
                v-for="(items, folder) in groupedSuccessItems"
                :key="folder"
                class="folder-urls"
              >
                <h4>📁 {{ folder }}</h4>
                <div class="url-list">
                  <div
                    v-for="(item, index) in items"
                    :key="index"
                    class="url-item"
                  >
                    <div class="file-name">{{ (item as any).name }}</div>
                    <div class="url">
                      <el-input
                        v-model="(item as any).url"
                        readonly
                        size="small"
                      >
                        <template #append>
                          <el-button
                            @click="copyToClipboard((item as any).url)"
                            size="small"
                          >
                            复制
                          </el-button>
                        </template>
                      </el-input>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </el-tab-pane>
          <el-tab-pane label="失败文件">
            <div v-if="failedItems.length === 0" class="no-failed">
              没有上传失败的文件
            </div>
            <div v-else class="preview-list">
              <div
                v-for="item in failedItems"
                :key="item.id"
                class="preview-card error-card"
              >
                <img :src="item.previewUrl" v-if="item.previewUrl" />
                <div class="info">
                  <p><strong>文件名:</strong> {{ item.file.name }}</p>
                  <p><strong>文件夹:</strong> {{ item.folder }}</p>
                  <p class="error-message">
                    <strong>错误:</strong> {{ item.error }}
                  </p>
                  <el-button
                    type="primary"
                    size="small"
                    @click="retryUpload(item)"
                  >
                    重试上传
                  </el-button>
                </div>
              </div>
            </div>
          </el-tab-pane>
          <el-tab-pane label="本地存储的URL">
            <div v-if="!savedUrls" class="no-saved-urls">没有本地存储的URL</div>
            <div v-else class="grouped-urls">
              <div
                v-for="(items, folder) in savedUrls"
                :key="folder"
                class="folder-urls"
              >
                <h4>📁 {{ folder }}</h4>
                <div class="url-list">
                  <div
                    v-for="(item, index) in items"
                    :key="index"
                    class="url-item"
                  >
                    <div class="file-name">{{ item.name }}</div>
                    <div class="url">
                      <el-input v-model="item.url" readonly size="small">
                        <template #append>
                          <el-button
                            @click="copyToClipboard(item.url)"
                            size="small"
                          >
                            复制
                          </el-button>
                        </template>
                      </el-input>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { ElMessage } from "element-plus";
// @ts-ignore 忽略类型检查,因为Vue单文件组件没有类型定义
import { Loading, Close } from "@element-plus/icons-vue";
import InitProjectDirctory from "../components/InitProjectDirctory.vue";
import MoveImage from "../components/MoveImage.vue";

interface UploadItem {
  id: number;
  file: File;
  folder: string;
  previewUrl: string;
  progress: number;
  qiniuUrl?: string;
  error?: string;
  status: "pending" | "uploading" | "success" | "error";
  filePath?: string; // 添加文件路径属性
}
const projectList = ref<
  {
    folderName: string;
    timestampDir: string;
    folderPath: string;
    uploadedUrls: { [key: string]: [{ name: string; url: string }] };
    isValid: boolean;
  }[]
>([]);
const previews = reactive<UploadItem[]>([]);
let uid = 0;

// 上传状态
const isUploading = ref(false);
const uploadFinished = ref(false);
const uploadedCount = ref(0);
const totalCount = ref(0);
const failedCount = ref(0);
const totalProgress = ref(0);
const uploadStatus = ref("");
const isLoadingToken = ref(false); // token加载状态
const isLoadingImage = ref(false);
const dir = ref("");
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const REQUIRED_WIDTH = 800;
const REQUIRED_HEIGHT = 800;

// 计算属性
const folderCounts = computed(() => {
  const counts = {};
  previews.forEach((item) => {
    if (!Object.prototype.hasOwnProperty.call(counts, item.folder)) {
      (counts as Record<string, number>)[item.folder] = 0;
    }
    (counts as Record<string, number>)[item.folder]++;
  });
  return counts;
});

// 按文件夹分组的预览
const groupedPreviews = computed(() => {
  const grouped = {};
  previews.forEach((item) => {
    if (!Object.prototype.hasOwnProperty.call(grouped, item.folder)) {
      (grouped as Record<string, UploadItem[]>)[item.folder] = [];
    }
    (grouped as Record<string, UploadItem[]>)[item.folder].push(item);
  });
  return grouped;
});

const successItems = computed(() => {
  return previews.filter((item) => item.status === "success");
});

const failedItems = computed(() => {
  return previews.filter((item) => item.status === "error");
});

// 处理文件选择（清空之前的选择）
const handleFileSelect = async () => {
  try {
    // 使用Electron的API选择目录.
    if (!window.electronAPI?.selectDirectory) {
      ElMessage.error("electronAPI 尚未注入！");
      return;
    }
    const selectedPath = await window.electronAPI.selectDirectory();
    if (!selectedPath) return;

    // 保存源目录路径和名称
    localStorage.setItem("sourceDirectoryPath", selectedPath);
    // 提取源目录名称
    const sourceDirectoryName = selectedPath.split(/[\/\\]/).pop();
    if (sourceDirectoryName) {
      localStorage.setItem("sourceDirectoryName", sourceDirectoryName);
    }
    // 检查文件夹是否存在
    const isValid = await window.electronAPI.existsFolder(selectedPath);
    if (!isValid) {
      ElMessage.error("所选文件夹不存在或无法访问！");
      return;
    }

    // 检查是否已经存在相同的文件夹路径
    if (
      projectList.value.some((project) => project.folderPath === selectedPath)
    ) {
      // 覆盖存储
      projectList.value = projectList.value.map((project) => {
        if (project.folderPath === selectedPath) {
          return {
            ...project,
            folderName: sourceDirectoryName || "未命名文件夹",
            timestampDir: "",
            isValid: true,
          };
        }
        return project;
      });
    } else {
      projectList.value.push({
        folderName: sourceDirectoryName || "未命名文件夹",
        timestampDir: "",
        folderPath: selectedPath,
        uploadedUrls: {},
        isValid: true,
      });
    }

    // 重置状态
    previews.length = 0;
    isUploading.value = false;
    uploadFinished.value = false;
    uploadedCount.value = 0;
    totalCount.value = 0;
    failedCount.value = 0;
    totalProgress.value = 0;
    uploadStatus.value = "";

    processDirectoryFiles(selectedPath);
  } catch (error: any) {
    console.error("选择文件夹失败:", error);
    ElMessage.error("选择文件夹失败: " + error.message);
  }
};
// 清空选择
const clearSelection = () => {
  // 清空预览数组前先释放预览URL资源
  previews.forEach((item) => {
    if (item.previewUrl) {
      URL.revokeObjectURL(item.previewUrl);
    }
  });

  // 清空预览数组
  previews.length = 0;

  // 重置所有上传状态
  isUploading.value = false;
  uploadFinished.value = false;
  uploadedCount.value = 0;
  totalCount.value = 0;
  failedCount.value = 0;
  totalProgress.value = 0;
  uploadStatus.value = "";

  ElMessage.success("已清空所有选择的文件");
};
const removeFolder = (folderName: string) => {
  // 移除 previews 中该文件夹所有内容
  const remaining = previews.filter((item) => item.folder !== folderName);
  // 释放旧的 blob URL 资源
  previews
    .filter((item) => item.folder === folderName)
    .forEach((item) => URL.revokeObjectURL(item.previewUrl));
  previews.length = 0;
  previews.push(...remaining);
  ElMessage.success(`已删除文件夹「${folderName}」下的所有图片`);
};

const processDirectoryFiles = async (dirPath: string, append = false) => {
  if (!append) {
    previews.length = 0;
  }
  isLoadingImage.value = true;
  try {
    // 读取目录中的所有图片文件
    const listDir = await window.electronAPI.listDirectories(dirPath);
    // 过滤 文件夹名称末尾为 组的文件夹
    const filteredList = listDir.filter((folder) => {
      return !folder.endsWith("组");
    });
    const pathList: string[] = [];
    for (const folder of filteredList) {
      const folderPath = `${dirPath}/${folder}`;
      const imagePaths = await window.electronAPI.readAllImagesRecursively(
        folderPath
      );
      pathList.push(...imagePaths);
    }
    const oversizedFiles: string[] = [];
    const wrongResolutionFiles: string[] = [];

    const checkImage = async (filePath: string): Promise<UploadItem | null> => {
      try {
        // 读取图片为 buffer
        const buffer = await window.electronAPI.readFile(filePath);
        const blob = new Blob([buffer]);
        const blobUrl = URL.createObjectURL(blob);

        // 用 blob 方式检测图片宽高
        const dimensions = await new Promise<{ width: number; height: number }>(
          (resolve, reject) => {
            const img = new Image();
            img.onload = () =>
              resolve({ width: img.width, height: img.height });
            img.onerror = reject;
            img.src = blobUrl;
          }
        );

        // 尺寸校验
        if (
          dimensions.width !== REQUIRED_WIDTH ||
          dimensions.height !== REQUIRED_HEIGHT
        ) {
          wrongResolutionFiles.push(filePath);
          return null;
        }

        const pathParts = filePath.replace(/\\/g, "/").split("/");
        const fileName = pathParts[pathParts.length - 1];
        const folderName =
          pathParts.length >= 2 ? pathParts[pathParts.length - 2] : "未分类";

        // 创建上传项
        const item: UploadItem = {
          id: uid++,
          file: new File([buffer], fileName, {
            type: `image/${fileName.split(".").pop()}`,
          }),
          folder: folderName,
          previewUrl: blobUrl, // ✅ 用 blob url 替代 file://
          progress: 0,
          status: "pending",
          filePath: filePath,
        };

        return item;
      } catch (err) {
        console.error("图片处理失败:", filePath, err);
        wrongResolutionFiles.push(filePath);
        return null;
      }
    };

    const results = await Promise.all(pathList.map((p) => checkImage(p)));
    const validItems = results.filter(Boolean) as UploadItem[];

    if (oversizedFiles.length || wrongResolutionFiles.length) {
      let msg = "";
      if (oversizedFiles.length) {
        msg += `❌ 以下文件超过2MB：\n${oversizedFiles.join(", ")}\n`;
      }
      if (wrongResolutionFiles.length) {
        msg += `📐 以下文件不是800x800：\n${wrongResolutionFiles.join(", ")}`;
      }
      ElMessage.error(msg);
    }

    previews.push(...validItems);
    isLoadingImage.value = false;
  } catch (err: any) {
    isLoadingImage.value = false;
    console.error("读取图片失败", err);
    ElMessage.error("读取图片失败: " + err.message);
  }
};

const processFiles = async (files: FileList) => {
  previews.length = 0; // 清空之前选择
  const oversizedFiles: string[] = [];
  const wrongResolutionFiles: string[] = [];

  const checkImage = (file: File): Promise<UploadItem | null> => {
    return new Promise((resolve) => {
      // 检查大小
      if (file.size > MAX_FILE_SIZE) {
        oversizedFiles.push(file.name);
        return resolve(null);
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          if (img.width !== REQUIRED_WIDTH || img.height !== REQUIRED_HEIGHT) {
            wrongResolutionFiles.push(file.name);
            return resolve(null);
          }

          const relativePath = (file as any).webkitRelativePath || file.name;
          const pathParts = relativePath.split("/");
          const folderName = pathParts.length > 1 ? pathParts[1] : "未分类";

          const item: UploadItem = {
            id: uid++,
            file,
            folder: folderName,
            previewUrl: URL.createObjectURL(file),
            progress: 0,
            status: "pending",
          };
          resolve(item);
        };
        img.onerror = () => {
          wrongResolutionFiles.push(file.name);
          resolve(null);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const tasks: Promise<UploadItem | null>[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file.type.startsWith("image/")) continue;
    tasks.push(checkImage(file));
  }

  const results = await Promise.all(tasks);
  const validItems = results.filter(Boolean) as UploadItem[];

  if (oversizedFiles.length || wrongResolutionFiles.length) {
    let msg = "";
    if (oversizedFiles.length) {
      msg += `❌ 以下文件超过2MB：\n${oversizedFiles.join(", ")}\n`;
    }
    if (wrongResolutionFiles.length) {
      msg += `📐 以下文件不是800x800：\n${wrongResolutionFiles.join(", ")}`;
    }
    ElMessage.error(msg);
    return;
  }

  // 所有校验通过，加载到 previews
  previews.push(...validItems);
};

// 添加token缓存
const tokenCache = reactive({
  token: "",
  expireTime: 0,
});

// 新增上传逻辑，替代原 uploadImages()
const uploadImages = async () => {
  if (previews.length === 0) {
    ElMessage.warning("请先选择文件夹");
    return;
  }

  if (isUploading.value || isLoadingToken.value) return;

  isUploading.value = true;
  uploadFinished.value = false;
  uploadedCount.value = 0;
  failedCount.value = 0;
  totalCount.value = previews.length;
  totalProgress.value = 0;
  uploadStatus.value = "";

  try {
    if (typeof window.qiniu === "undefined") {
      throw new Error("七牛云SDK未加载");
    }

    await uploadInBatches(previews, 5); // 每次最多并发 5 个上传任务

    uploadFinished.value = true;
    isUploading.value = false;

    if (failedCount.value === 0) {
      uploadStatus.value = "success";
      ElMessage.success("所有文件上传成功！");
      saveUrlsToLocalStorage();
    } else {
      uploadStatus.value = "exception";
      ElMessage.warning(`上传完成，但有 ${failedCount.value} 个文件失败`);
      saveUrlsToLocalStorage();
    }
  } catch (error) {
    console.error("上传出错:", error);
    ElMessage.error((error as Error).message || "上传失败");
    uploadStatus.value = "exception";
    isUploading.value = false;
    uploadFinished.value = true;
  }
};

// 获取上传token和时间戳key
const getQiniuTokenAndKey = async () => {
  const response = await fetch("http://121.41.45.224:3100/get-token");
  const { data, timestampDir } = await response.json();
  tokenCache.token = data.token;
  tokenCache.expireTime = Date.now() + 3600 * 1000;
  dir.value = timestampDir;
};

// 批量上传器：限制并发上传数
const uploadInBatches = async (items: any, batchSize: any) => {
  await getQiniuTokenAndKey();
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const tasks = batch.map((item: any) => uploadOneFile(item));
    await Promise.allSettled(tasks);
  }
};

// 上传单个文件封装
const uploadOneFile = async (item: any) => {
  const token = tokenCache.token;
  return new Promise((resolve, reject) => {
    item.status = "uploading";

    // 获取源目录名称，如果没有则使用当前文件夹名称
    const sourceDirectoryName =
      localStorage.getItem("sourceDirectoryName") || item.folder;

    // 使用源目录名称构建上传路径
    const key = `${dir.value}/${sourceDirectoryName}/${item.folder}/${item.file.name}`;

    // 使用文件路径而不是file对象进行上传
    const filePath = item.filePath || "";
    const file = filePath ? { path: filePath } : item.file;
    // 如果有原始文件路径，使用fs读取文件内容
    if (item.filePath) {
      // 使用Electron API读取文件
      window.electronAPI
        .readFile(item.filePath)
        .then((fileData) => {
          // 创建真实的File对象
          const file = new File([fileData], item.file.name, {
            type: `image/${item.file.name.split(".").pop()}`,
          });

          // 使用七牛云SDK上传
          const observable = window.qiniu.upload(
            file,
            key,
            token,
            {},
            {
              useCdnDomain: true,
              region: window.qiniu.region.z0,
            }
          );
          observable.subscribe({
            next(res: any) {
              item.progress = parseFloat(res.total.percent.toFixed(2));
              updateTotalProgress();
            },
            error(err: any) {
              item.status = "error";
              item.error = err.message || "上传失败";
              failedCount.value++;
              uploadedCount.value++;
              updateTotalProgress();
              reject(err);
            },
            complete(res: any) {
              item.qiniuUrl = `http://sw6qp9sts.hd-bkt.clouddn.com/${res.key}`;
              item.status = "success";
              item.progress = 100;
              uploadedCount.value++;
              updateTotalProgress();
              resolve(res);
            },
          });
        })
        .catch((err) => {
          item.status = "error";
          item.error = "读取文件失败: " + err.message;
          failedCount.value++;
          updateTotalProgress();
          reject(err);
        });
    } else {
      // 使用原有的File对象上传
      const observable = window.qiniu.upload(
        item.file,
        key,
        token,
        {},
        {
          useCdnDomain: true,
          region: window.qiniu.region.z0,
        }
      );
      observable.subscribe({
        next(res: any) {
          item.progress = parseFloat(res.total.percent.toFixed(2));
          updateTotalProgress();
        },
        error(err: any) {
          item.status = "error";
          item.error = err.message || "上传失败";
          failedCount.value++;
          uploadedCount.value++;
          updateTotalProgress();
          reject(err);
        },
        complete(res: any) {
          item.qiniuUrl = `http://sw6qp9sts.hd-bkt.clouddn.com/${res.key}`;
          item.status = "success";
          item.progress = 100;
          uploadedCount.value++;
          updateTotalProgress();
          resolve(res);
        },
      });
    }
  });
};

const saveUrlsToLocalStorage = async () => {
  const grouped = {};

  successItems.value.forEach((item) => {
    if (!Object.prototype.hasOwnProperty.call(grouped, item.folder)) {
      (grouped as Record<string, Array<{ name: string; url: string }>>)[
        item.folder
      ] = [];
    }

    (grouped as Record<string, Array<{ name: string; url: string }>>)[
      item.folder
    ].push({
      name: item.file.name,
      url: item.qiniuUrl || "",
    });
  });

  try {
    const projectName = localStorage.getItem("sourceDirectoryName");
    projectList.value.forEach((project) => {
      if (project.folderName === projectName) {
        project.folderName = projectName + dir.value.slice(-7);
        project.timestampDir = dir.value;
        project.uploadedUrls = grouped;
      }
    });
    await window.electronAPI.saveProjectList(JSON.stringify(projectList.value));
  } catch (error) {
    console.error("❌ 存储上传结果失败：", error);
    ElMessage.error("保存上传结果失败，请检查存储空间");
  }
};

// 从localStorage加载之前上传的URL
const loadUrlsFromLocalStorage = () => {
  try {
    const savedData = localStorage.getItem("uploadedUrls");
    if (savedData) {
      return JSON.parse(savedData);
    }
    return null;
  } catch (error) {
    console.error("从本地存储加载URL失败:", error);
    return null;
  }
};

// 添加一个计算属性，用于显示本地存储的URL
const savedUrls = computed(() => {
  return loadUrlsFromLocalStorage();
});
// 更新总进度
const updateTotalProgress = () => {
  if (totalCount.value === 0) return;
  totalProgress.value = Math.floor(
    (uploadedCount.value / totalCount.value) * 100
  );
};
// 复制URL到剪贴板
const copyToClipboard = (text: string) => {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      ElMessage.success("已复制到剪贴板");
    })
    .catch((err) => {
      console.error("复制失败:", err);
      ElMessage.error("复制失败");
    });
};
// 重试上传单个文件 - 使用缓存的token
const retryUpload = async (item: UploadItem) => {
  try {
    item.status = "uploading";
    item.progress = 0;
    item.error = undefined;

    // 获取源目录名称，如果没有则使用当前文件夹名称
    const sourceDirectoryName =
      localStorage.getItem("sourceDirectoryName") || item.folder;

    // 构建上传key，使用文件夹结构
    const key = `${dir.value}/${sourceDirectoryName}/${item.folder}/${item.file.name}`;
    const token = tokenCache.token;
    // 使用文件路径而不是file对象进行上传
    const filePath = item.filePath || "";
    const file = filePath ? { path: filePath } : item.file;

    return new Promise((resolve, reject) => {
      const observable = (window as any).qiniu.upload(
        file,
        key,
        token,
        {},
        {
          useCdnDomain: true,
          region: (window as any).qiniu.region.z0,
        }
      );

      observable.subscribe({
        next(res: any) {
          item.progress = parseFloat(res.total.percent.toFixed(2));
        },
        error(err: any) {
          console.error("重试上传失败:", err);
          item.error = err.message || "重试上传失败";
          item.status = "error";
          ElMessage.error(`文件 ${item.file.name} 重试上传失败`);
          reject(err);
        },
        complete(res: any) {
          item.qiniuUrl = `http://sw6qp9sts.hd-bkt.clouddn.com/${res.key}`;
          item.progress = 100;
          item.status = "success";
          failedCount.value--;
          ElMessage.success(`文件 ${item.file.name} 重试上传成功`);
          resolve(res);
        },
      });
    });
  } catch (error: any) {
    console.error(`重试上传文件 ${item.file.name} 失败:`, error);
    item.error = error.message || "重试上传过程中发生错误";
    item.status = "error";
    ElMessage.error(`重试上传失败: ${error.message}`);
  }
};

// 按文件夹分组的成功上传项目
const groupedSuccessItems = computed(() => {
  const grouped = {};

  // 只处理成功上传的项目
  successItems.value.forEach((item) => {
    if (!Object.prototype.hasOwnProperty.call(grouped, item.folder)) {
      (
        grouped as Record<
          string,
          Array<{ name: string; url: string; folder: string }>
        >
      )[item.folder] = [];
    }

    (
      grouped as Record<
        string,
        Array<{ name: string; url: string; folder: string }>
      >
    )[item.folder].push({
      name: item.file.name,
      url: item.qiniuUrl || "",
      folder: item.folder,
    });
  });

  return grouped;
});
// 导出成功URL（按文件夹分组）
const exportSuccessUrls = async () => {
  if (successItems.value.length === 0) {
    ElMessage.warning("没有成功上传的文件");
    return;
  }

  let csvContent = "文件夹,文件名,URL\n";

  // 使用分组后的数据
  Object.entries(groupedSuccessItems.value).forEach(([folder, items]) => {
    (items as Array<{ name: string; url: string; folder: string }>).forEach(
      (item) => {
        csvContent += `${folder},${item.name},${item.url}\n`;
      }
    );
  });

  try {
    // 使用Electron的API保存文件
    const filePath = await window.electronAPI.saveFile(
      csvContent,
      `上传成功文件_${new Date().toISOString().slice(0, 10)}.csv`,
      localStorage.getItem("sourceDirectoryPath") || undefined
    );

    if (filePath) {
      ElMessage.success(`文件已保存至: ${filePath}`);
    }
  } catch (error: any) {
    console.error("导出文件失败:", error);
    ElMessage.error("导出文件失败: " + error.message);
  }
};

onMounted(async () => {
  try {
    const data = await window.electronAPI.loadProjectList();
    projectList.value = JSON.parse(data);
    console.log("加载项目列表成功：", projectList.value);
  } catch (err) {
    console.error("加载项目列表失败：", err);
    projectList.value = [];
  }
});
</script>

<style scoped lang="scss">
.prepare {
  height: 100vh;
  overflow-y: auto;
  padding: 2rem;
  background: #f8f8f8;
}

.prepare-container {
  position: relative;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  .initHeader {
    padding: 10px 16px;
    border-bottom: 1px solid #e5e5e5;
  }
  .submit {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 16px;
    margin-bottom: 20px;
    .upload-btn {
      display: inline-block;
      padding: 10px 20px;
      margin-right: 10px;
      background-color: #42b983;
      color: white;
      font-size: 14px;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.2s ease;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
      user-select: none;

      &:hover {
        background-color: #369c6c;
      }
    }
    button {
      padding: 0.6rem 1.2rem;
      background: #42b983;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;

      &:disabled {
        background: #a8d5c2;
        cursor: not-allowed;
      }
    }
  }

  .file-summary {
    background: white;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);

    h3 {
      margin-top: 0;
      margin-bottom: 15px;
      color: #303133;
      font-weight: 600;
    }
    .folders-container {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(50%, 1fr));
      // 文件夹信息卡片
      .folder-info-card {
        display: flex;
        justify-content: center;
        align-items: center;
        background: #f0f9eb;
        border-radius: 8px;
        padding: 5px;
        margin: 0 16px;
        margin-bottom: 20px;
        border-left: 4px solid #67c23a;

        .folder-icon {
          font-size: 16px;
          margin-right: 15px;
          color: #67c23a;
        }

        .folder-details {
          flex: 1;
          display: flex;
          justify-content: space-between;
          align-self: center;
          .folder-name {
            flex: 1;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-weight: 600;
            font-size: 18px;
            color: #303133;
          }

          .folder-count {
            display: flex;
            font-size: 14px;
            color: #606266;
            .close {
              display: flex;
              justify-content: center;
              align-items: center;
              width: 20px;
              height: 20px;
              margin-left: 10px;
              border-radius: 50%;
              color: #fff;
              cursor: pointer;
              background: #f56c6c;
            }
          }
        }
      }
    }

    // 文件预览网格
    .file-preview-grid {
      margin-top: 20px;

      .file-grid {
        display: grid;
        grid-auto-flow: column;
        grid-auto-columns: min-content;
        gap: 1rem;
        overflow-x: auto;
        overflow-y: hidden;
        white-space: nowrap;
        padding-bottom: 8px;

        .file-item {
          .file-thumbnail {
            width: 100px;
            height: 100px;
            border-radius: 4px;
            overflow: hidden;
            border: 1px solid #ebeef5;

            img {
              width: 100%;
              height: 100%;
              object-fit: cover;
              transition: transform 0.3s ease;

              &:hover {
                transform: scale(1.05);
              }
            }
          }

          .file-name {
            width: 100px;
            text-align: center;
            margin-top: 5px;
            font-size: 12px;
            color: #606266;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        }

        .more-files {
          grid-column: 1 / -1;
          text-align: center;
          padding: 10px;
          background: #f5f7fa;
          border-radius: 4px;
          color: #909399;
          font-size: 13px;
          cursor: pointer;

          &:hover {
            background: #ecf5ff;
            color: #409eff;
          }
        }
      }
    }
  }
  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 800px;
  }
  .token-loading {
    margin-bottom: 20px;
  }

  .upload-progress {
    background: white;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);

    .progress-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;

      h3 {
        margin: 0;
      }

      .progress-stats {
        font-size: 14px;
        color: #606266;

        span {
          margin-left: 10px;
        }
      }
    }

    .progress-info {
      margin-top: 10px;
      text-align: center;
      font-size: 14px;
    }
  }

  .upload-results {
    background: white;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);

    h3 {
      margin-top: 0;
      margin-bottom: 15px;
      color: #303133;
      font-weight: 600;
    }

    // 文件夹信息卡片
    .folder-info-card {
      display: flex;
      align-items: center;
      background: #f0f9eb;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      border-left: 4px solid #67c23a;

      .folder-icon {
        font-size: 32px;
        margin-right: 15px;
        color: #67c23a;
      }

      .folder-details {
        .folder-name {
          font-weight: 600;
          font-size: 18px;
          color: #303133;
          margin-bottom: 5px;
        }

        .folder-count {
          font-size: 14px;
          color: #606266;
        }
      }
    }

    // 文件预览网格
    .file-preview-grid {
      margin-top: 20px;

      .file-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
        gap: 12px;

        .file-item {
          .file-thumbnail {
            height: 100px;
            border-radius: 4px;
            overflow: hidden;
            border: 1px solid #ebeef5;

            img {
              width: 100%;
              height: 100%;
              object-fit: cover;
              transition: transform 0.3s ease;

              &:hover {
                transform: scale(1.05);
              }
            }
          }

          .file-name {
            margin-top: 5px;
            font-size: 12px;
            color: #606266;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        }

        .more-files {
          grid-column: 1 / -1;
          text-align: center;
          padding: 10px;
          background: #f5f7fa;
          border-radius: 4px;
          color: #909399;
          font-size: 13px;
          cursor: pointer;

          &:hover {
            background: #ecf5ff;
            color: #409eff;
          }
        }
      }
    }
  }

  .preview-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }

  .preview-card {
    background: white;
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 0.5rem;

    &.error-card {
      border-color: #f56c6c;
      background: #fef0f0;
    }

    img {
      width: 100%;
      height: 150px;
      object-fit: cover;
      margin-bottom: 0.5rem;
      border-radius: 4px;
    }

    .info {
      font-size: 0.8rem;
      word-break: break-all;

      .error-message {
        color: #f56c6c;
        margin: 5px 0;
      }
    }
  }
}
</style>
