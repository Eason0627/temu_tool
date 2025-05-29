<template>
  <div class="upload">
    <h2>📁 {{ currentProject.folderPath }}</h2>
    <div class="submit">
      <div class="folder-buttons">
        <button
          class="upload-btn"
          @click="handleFileSelect"
          v-loading.fullscreen.lock="isLoadingImage"
          element-loading-background="rgba(0, 0, 0, 0.5)"
        >
          📁 更换路径
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

    <!-- 预览列表 -->
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
        <p v-if="uploadFinished && failedCount === 0">✅ 所有文件上传成功！</p>
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
                    <el-input v-model="(item as any).url" readonly size="small">
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
          <div v-else>
            <div class="batch-retry-actions">
              <el-button type="primary" @click="retryAllFailed" size="small">
                🔄 批量重传所有失败文件
              </el-button>
              <span class="retry-count"
                >共 {{ failedItems.length }} 个失败文件</span
              >
            </div>
            <div class="preview-list">
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
</template>

<script setup lang="ts">
import {
  ref,
  reactive,
  watch,
  computed,
  onMounted,
  defineProps,
  defineEmits,
} from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Loading, Close } from "@element-plus/icons-vue";

interface UploadItem {
  id: number;
  file: File;
  folder: string;
  previewUrl: string;
  progress: number;
  qiniuUrl?: string;
  error?: string;
  status: "pending" | "uploading" | "success" | "error";
  filePath?: string;
}

interface Project {
  folderName: string;
  timestampDir: string;
  folderPath: string;
  uploadedUrls: Record<string, Array<{ name: string; url: string }>>;
  isValid: boolean;
  urls?: Array<{ url: string; folder: string; fileName: string }>;
  files?: number;
}

// 定义Props
const props = defineProps({
  projectPath: {
    type: String,
    required: true,
  },
  autoUpload: {
    type: Boolean,
    default: false,
  },
  timestampDir: {
    type: String,
    default: "",
  },
});

// 定义Emits
const emits = defineEmits([
  "upload-complete",
  "update:projectPath",
  "request-timestamp",
  "upload:list",
]);

const projectList = ref<Project[]>([]);
const currentProject = ref<Partial<Project>>({});
const previews = reactive<UploadItem[]>([]);
let uid = 0;

// 上传状态
const isUploading = ref(false);
const uploadFinished = ref(false);
const uploadedCount = ref(0);
const totalCount = ref(0);
const failedCount = ref(0);
const totalProgress = ref(0);
const dir = ref("");
const urls = ref<{ [key: string]: [] }>({});
const files = ref<{ [key: string]: number }>({});
const uploadStatus = ref("");
const isLoadingToken = ref(false);
const isLoadingImage = ref(false);

// 每个组件实例独立的 token 缓存
const tokenCache = reactive({
  token: "",
  expireTime: 0,
});

// 防止并发保存的锁
let isSaving = false;

// 计算属性
const folderCounts = computed(() => {
  const counts: Record<string, number> = {};
  previews.forEach((item) => {
    counts[item.folder] = (counts[item.folder] || 0) + 1;
  });
  return counts;
});

const groupedPreviews = computed(() => {
  const grouped: Record<string, UploadItem[]> = {};
  previews.forEach((item) => {
    grouped[item.folder] = grouped[item.folder] || [];
    grouped[item.folder].push(item);
  });
  return grouped;
});

const successItems = computed(() => {
  return previews.filter((item) => item.status === "success");
});

const failedItems = computed(() => {
  return previews.filter((item) => item.status === "error");
});

const groupedSuccessItems = computed(() => {
  const grouped: Record<string, Array<{ name: string; url: string }>> = {};
  successItems.value.forEach((item) => {
    if (!item.qiniuUrl) return;
    grouped[item.folder] = grouped[item.folder] || [];
    grouped[item.folder].push({
      name: item.file.name,
      url: item.qiniuUrl,
    });
  });
  return grouped;
});

const savedUrls = computed(() => {
  return currentProject.value.uploadedUrls;
});
// 监听timestampDir变化
watch(
  () => props.timestampDir,
  (newTimestamp) => {
    if (!newTimestamp) return;
    dir.value = newTimestamp;
    // 如果当前项目名称不包含时间戳后缀
    if (
      currentProject.value.folderName &&
      !/_[\d]{7}$/.test(currentProject.value.folderName)
    ) {
      // 清除可能存在的旧后缀
      const cleanName = currentProject.value.folderName.replace(
        /_[\d]{7}$/,
        ""
      );
      // 添加新时间戳后7位
      currentProject.value.folderName = `${cleanName}_${newTimestamp.slice(
        -7
      )}`;
    }
  },
  { immediate: true } // 初始化时立即执行一次
);
watch(
  () => urls.value[currentProject.value.folderName],
  (newUrls, oldUrls) => {
    if (
      currentProject.value.folderName &&
      urls.value[currentProject.value.folderName] &&
      urls.value[currentProject.value.folderName].length ==
        files.value[currentProject.value.folderName]
    ) {
      emits("upload:list", urls.value, files.value);
    }
  },
  { deep: true }
);
// 方法
const handleFileSelect = async () => {
  try {
    const selectedPath = await window.electronAPI.selectDirectory();
    if (!selectedPath) return;

    emits("update:projectPath", selectedPath);
    await processSelectedDirectory(selectedPath);
  } catch (error: any) {
    console.error("选择文件夹失败:", error);
    ElMessage.error("选择文件夹失败: " + error.message);
  }
};

const processSelectedDirectory = async (selectedPath: string) => {
  const isValid = await window.electronAPI.existsFolder(selectedPath);
  if (!isValid) {
    ElMessage.error("所选文件夹不存在或无法访问！");
    return;
  }

  // 加载最新项目列表
  const latestProjectList = await window.electronAPI
    .loadProjectList()
    .then((data) => JSON.parse(data))
    .catch(() => []);

  const existingProject = latestProjectList.find(
    (p: Project) => p.folderPath === selectedPath
  );

  if (existingProject) {
    currentProject.value = {
      ...existingProject,
      urls: [],
    };
    projectList.value = latestProjectList.map((p: Project) =>
      p.folderPath === selectedPath ? { ...p, isValid: true } : p
    );
  } else {
    currentProject.value = {
      folderName: selectedPath.split("\\").pop() || "",
      timestampDir: "",
      folderPath: selectedPath,
      uploadedUrls: {},
      urls: [],
      isValid: true,
    };
    projectList.value = [
      ...latestProjectList,
      { ...currentProject.value } as Project,
    ];
    await safeSaveProjectList(JSON.stringify(projectList.value));
  }

  resetUploadState();
  await processDirectoryFiles(selectedPath);

  if (props.autoUpload) {
    await uploadImages();
  }
};

const resetUploadState = () => {
  previews.length = 0;
  isUploading.value = false;
  uploadFinished.value = false;
  uploadedCount.value = 0;
  totalCount.value = 0;
  failedCount.value = 0;
  totalProgress.value = 0;
  uploadStatus.value = "";
};

const clearSelection = () => {
  previews.forEach((item) => {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
  });
  previews.length = 0;
  resetUploadState();
  ElMessage.success("已清空所有选择的文件");
};

const removeFolder = (folderName: string) => {
  const remaining = previews.filter((item) => item.folder !== folderName);
  previews
    .filter((item) => item.folder === folderName)
    .forEach((item) => URL.revokeObjectURL(item.previewUrl));
  previews.length = 0;
  previews.push(...remaining);
  ElMessage.success(`已删除文件夹「${folderName}」下的所有图片`);
};

const processDirectoryFiles = async (dirPath: string, append = false) => {
  if (!append) previews.length = 0;
  isLoadingImage.value = true;

  try {
    const listDir = await window.electronAPI.listDirectories(dirPath);
    const filteredList = listDir.filter((folder) => !folder.endsWith("组"));

    const pathList: string[] = [];
    for (const folder of filteredList) {
      const folderPath = `${dirPath}\\${folder}`;
      const files = await window.electronAPI.listFiles(folderPath);
      const imageFiles = files.filter(
        (file) =>
          file.toLowerCase().endsWith(".jpg") ||
          file.toLowerCase().endsWith(".jpeg") ||
          file.toLowerCase().endsWith(".png")
      );
      pathList.push(...imageFiles.map((file) => `${folderPath}/${file}`));
    }
    files.value[currentProject.value.folderName] = pathList.length;
    currentProject.value.files = pathList.length;
    if (pathList.length > 1000) {
      const confirmed = await ElMessageBox.confirm(
        `检测到 ${pathList.length} 张图片，处理可能需要较长时间，是否继续？`,
        "图片数量较多",
        {
          confirmButtonText: "继续处理",
          cancelButtonText: "取消",
          type: "warning",
        }
      ).catch(() => false);
      if (!confirmed) {
        isLoadingImage.value = false;
        return;
      }
    }

    const BATCH_SIZE = 100;
    const validItems: UploadItem[] = [];

    for (let i = 0; i < pathList.length; i += BATCH_SIZE) {
      const batch = pathList.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (filePath) => {
          try {
            const buffer = await window.electronAPI.readFile(filePath);
            const pathParts = filePath.replace(/\\/g, "/").split("/");
            const fileName = pathParts[pathParts.length - 1];
            const folderName =
              pathParts.length >= 2
                ? pathParts[pathParts.length - 2]
                : "未分类";

            return {
              id: uid++,
              file: new File([buffer], fileName, {
                type: `image/${fileName.split(".").pop()}`,
              }),
              folder: folderName,
              previewUrl: URL.createObjectURL(new Blob([buffer])),
              progress: 0,
              status: "pending",
              filePath: filePath,
            } as UploadItem;
          } catch (err) {
            console.error("图片处理失败:", filePath, err);
            return null;
          }
        })
      );

      validItems.push(...(batchResults.filter(Boolean) as UploadItem[]));
      ElMessage.info({
        message: `正在处理图片... ${Math.min(
          i + BATCH_SIZE,
          pathList.length
        )}/${pathList.length}`,
        duration: 1000,
        showClose: false,
      });
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    previews.push(...validItems);
    ElMessage.success({
      message: `处理完成！成功加载 ${validItems.length} 张图片`,
      duration: 2000,
    });
  } catch (err: any) {
    console.error("读取图片失败", err);
    ElMessage.error("读取图片失败: " + err.message);
  } finally {
    isLoadingImage.value = false;
  }
};

const uploadImages = async () => {
  if (previews.length === 0) {
    ElMessage.warning("请先选择文件夹");
    return;
  }

  if (isUploading.value || isLoadingToken.value) return;

  if (dir.value === "") {
    return ElMessage.warning("请先获取时间戳");
  }
  urls.value[currentProject.value.folderName] = [];

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

    // 使用父组件传入的时间戳或已有的时间戳
    const timestampDir =
      props.timestampDir || currentProject.value.timestampDir || "";
    await uploadInBatches(previews, 100, timestampDir);

    uploadFinished.value = true;
    isUploading.value = false;

    if (failedCount.value === 0) {
      uploadStatus.value = "success";
      ElMessage.success("所有文件上传成功！");
    } else {
      uploadStatus.value = "exception";
      ElMessage.warning(`上传完成，但有 ${failedCount.value} 个文件失败`);
    }

    await saveUrlsToLocalStorage();
    emits("upload-complete", currentProject.value);
  } catch (error) {
    console.error("上传出错:", error);
    ElMessage.error((error as Error).message || "上传失败");
    uploadStatus.value = "exception";
    isUploading.value = false;
    uploadFinished.value = true;
  }
};

const uploadInBatches = async (
  items: UploadItem[],
  batchSize: number,
  timestampDir: string
) => {
  try {
    isLoadingToken.value = true;
    await getQiniuToken();
    isLoadingToken.value = false;

    const concurrentLimit = 10;
    const queue = [...items];
    let activeUploads = 0;

    await new Promise<void>((resolve) => {
      const processQueue = async () => {
        if (queue.length === 0 && activeUploads === 0) {
          resolve();
          return;
        }

        while (queue.length > 0 && activeUploads < concurrentLimit) {
          const item = queue.shift();
          if (!item) continue;

          activeUploads++;

          uploadOneFileStream(item, timestampDir)
            .then(() => {
              activeUploads--;
              processQueue();
            })
            .catch(() => {
              activeUploads--;
              processQueue();
            });
        }
      };

      processQueue();
    });
  } catch (error) {
    console.error("批量上传错误:", error);
    throw error;
  }
};

const getQiniuToken = async () => {
  try {
    const response = await fetch("http://121.41.45.224:3100/get-token");
    const { data } = await response.json();
    tokenCache.token = data.token;
    tokenCache.expireTime = Date.now() + 3600 * 1000;
  } catch (error) {
    console.error("获取上传Token失败:", error);
    ElMessage.error("获取上传Token失败，请检查网络连接");
    throw error;
  }
};

const uploadOneFileStream = async (
  item: UploadItem,
  timestampDir: string,
  retryCount = 0
) => {
  const MAX_RETRY = 3;

  try {
    item.status = "uploading";
    const key = `${timestampDir}/${
      currentProject.value.folderName?.split("_")[0]
    }/${item.folder}/${item.file.name}`;
    const qiniuUrl = `http://sw6qp9sts.hd-bkt.clouddn.com/${key}`;

    if (item.filePath) {
      const result = await window.electronAPI.uploadFileStream({
        filePath: item.filePath,
        key,
        token: tokenCache.token,
      });

      if (!result.success) throw new Error(result.error || "上传失败");
    } else {
      await new Promise<void>((resolve, reject) => {
        const observable = window.qiniu.upload(
          item.file,
          key,
          tokenCache.token,
          { chunkSize: 4 * 1024 * 1024 },
          {
            useCdnDomain: true,
            region: window.qiniu.region.z0,
            concurrentRequestLimit: 3,
          }
        );

        observable.subscribe({
          next: (res: any) => {
            item.progress = parseFloat(res.total.percent.toFixed(2));
            updateTotalProgress();
          },
          error: (err: any) => {
            if (err.code === 614) {
              resolve();
            } else {
              reject(err);
            }
          },
          complete: () => resolve(),
        });
      });
    }

    // 上传成功处理
    item.qiniuUrl = qiniuUrl;
    item.status = "success";
    item.progress = 100;
    uploadedCount.value++;
    console.log(urls.value);
    for (const key in urls.value) {
      if (key.includes(currentProject.value.folderName)) {
        urls.value[key].push({
          url: qiniuUrl,
          folder: item.folder,
          fileName: item.file.name,
        });
      }
    }
    // 存储URL到项目
    if (!currentProject.value.urls) currentProject.value.urls = [];
    currentProject.value.urls.push({
      url: qiniuUrl,
      folder: item.folder,
      fileName: item.file.name,
    });
    updateTotalProgress();
  } catch (error: any) {
    if (retryCount < MAX_RETRY && error.code !== 614) {
      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * (retryCount + 1))
      );
      return uploadOneFileStream(item, timestampDir, retryCount + 1);
    }

    if (error.code === 614) {
      // 614错误特殊处理
      const key = `${timestampDir}/${currentProject.value.folderName}/${item.folder}/${item.file.name}`;
      item.qiniuUrl = `http://sw6qp9sts.hd-bkt.clouddn.com/${key}`;
      item.status = "success";
      item.progress = 100;
      uploadedCount.value++;

      if (!currentProject.value.urls) currentProject.value.urls = [];
      currentProject.value.urls.push({
        url: item.qiniuUrl,
        folder: item.folder,
        fileName: item.file.name,
      });
      return;
    }

    item.status = "error";
    item.error = error.message || "上传失败";
    failedCount.value++;
    uploadedCount.value++;
    updateTotalProgress();
    throw error;
  }
};

const safeSaveProjectList = async (data: string) => {
  while (isSaving) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  try {
    isSaving = true;

    return await window.electronAPI.saveProjectList(data);
  } finally {
    isSaving = false;
  }
};

const saveUrlsToLocalStorage = async () => {
  if (!currentProject.value.urls || currentProject.value.urls.length === 0) {
    console.warn("没有可保存的URL数据");
    return;
  }

  const grouped: Record<string, Array<{ name: string; url: string }>> = {};
  currentProject.value.urls.forEach((item: any) => {
    if (!item || !item.folder) return;
    grouped[item.folder] = grouped[item.folder] || [];
    grouped[item.folder].push({
      name: item.fileName || item.file?.name || "",
      url: item.url || item.qiniuUrl || "",
    });
  });

  try {
    const projectName = currentProject.value.folderName || "";
    const timestampDir = props.timestampDir;

    if (!projectName || !timestampDir) {
      throw new Error("缺少项目名称或时间戳目录");
    }

    // 获取最新项目列表
    const latestProjectList = await window.electronAPI
      .loadProjectList()
      .then((data) => JSON.parse(data))
      .catch(() => []);

    const originalName = currentProject.value.folderName?.split("_")[0];

    const hasTimestampSuffix =
      currentProject.value.folderName?.includes(timestampDir);

    // 智能生成最终名称
    const finalName = hasTimestampSuffix
      ? currentProject.value.folderName // 已有后缀则保留
      : `${originalName}_${timestampDir.slice(-7)}`; // 无后缀则添加
    console.log("finalName", finalName);

    // 创建当前项目的深拷贝
    const projectToSave = {
      ...currentProject.value,
      folderName: finalName,
      timestampDir: timestampDir,
      uploadedUrls: grouped,
    };
    urls.value[finalName] = urls.value[originalName];
    files.value[finalName] = files.value[originalName];
    delete urls.value[originalName];
    delete files.value[originalName];
    // 更新项目列表
    const updatedList = latestProjectList.map((project: Project) =>
      project.folderPath === projectToSave.folderPath ? projectToSave : project
    );

    // 如果是新项目，添加到列表
    if (
      !updatedList.some(
        (p: Project) => p.folderPath === projectToSave.folderPath
      )
    ) {
      updatedList.push(projectToSave as Project);
    }

    await safeSaveProjectList(JSON.stringify(updatedList));
    projectList.value = updatedList;
    currentProject.value = projectToSave;
  } catch (error: any) {
    console.error("❌ 存储上传结果失败：", error);
    ElMessage.error("保存上传结果失败: " + error.message);
  }
};

const updateTotalProgress = () => {
  if (totalCount.value === 0) return;
  totalProgress.value = Math.floor(
    (uploadedCount.value / totalCount.value) * 100
  );
};

const copyToClipboard = (text: string) => {
  navigator.clipboard
    .writeText(text)
    .then(() => ElMessage.success("已复制到剪贴板"))
    .catch((err) => {
      console.error("复制失败:", err);
      ElMessage.error("复制失败");
    });
};

// 添加批量重传方法
const retryAllFailed = async () => {
  try {
    const confirmed = await ElMessageBox.confirm(
      `确定要重传所有 ${failedItems.value.length} 个失败文件吗?`,
      "批量重传确认",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      }
    );

    if (!confirmed) return;

    const timestampDir =
      props.timestampDir || currentProject.value.timestampDir;
    if (!timestampDir) {
      throw new Error("缺少时间戳目录信息");
    }
    // 重置计数
    const originalFailedCount = failedCount.value;
    failedCount.value = 0;
    uploadedCount.value -= originalFailedCount;

    // 批量重传
    await uploadInBatches(failedItems.value, 100, timestampDir);

    ElMessage.success(`已重传所有失败文件`);
  } catch (error) {
    console.error("批量重传失败:", error);
    ElMessage.error(`批量重传失败: ${error.message}`);
  }
};
const retryUpload = async (item: UploadItem) => {
  if (item.status === "uploading") {
    ElMessage.warning("文件正在上传中，请稍候");
    return;
  }

  try {
    item.status = "uploading";
    item.progress = 0;
    item.error = undefined;

    if (item.status === "error") failedCount.value--;

    const timestampDir =
      props.timestampDir || currentProject.value.timestampDir;
    if (!timestampDir) {
      throw new Error("缺少时间戳目录信息");
    }

    const success = await doRetryUpload(item, timestampDir);
    if (success) {
      // 可选：执行成功后的额外操作
    }
  } catch (error: any) {
    item.status = "error";
    item.error = error.message || "重试上传过程中发生错误";
    console.error(`重试上传文件 ${item.file.name} 失败:`, error);
    ElMessage.error(`重试上传失败: ${error.message}`);
  }
};

const doRetryUpload = async (item: UploadItem, timestampDir: string) => {
  // 确保获取最新的项目数据
  const latestProjectList = await window.electronAPI
    .loadProjectList()
    .then((data) => JSON.parse(data))
    .catch(() => []);

  // 创建当前项目的深拷贝
  const currentProj = JSON.parse(
    JSON.stringify(
      latestProjectList.find(
        (p: Project) => p.folderPath === currentProject.value.folderPath
      ) || { ...currentProject.value }
    )
  );

  const projectName = currentProj.folderPath?.split(/[\\/]/).pop() || "";
  const key = `${timestampDir}/${projectName}/${item.folder}/${item.file.name}`;
  const qiniuUrl = `http://sw6qp9sts.hd-bkt.clouddn.com/${key}`;

  if (!tokenCache.token || Date.now() >= tokenCache.expireTime) {
    isLoadingToken.value = true;
    await getQiniuToken();
    isLoadingToken.value = false;
  }

  try {
    let result;
    if (item.filePath) {
      result = await window.electronAPI.uploadFileStream({
        filePath: item.filePath,
        key,
        token: tokenCache.token,
      });
      if (!result.success) throw new Error(result.error || "上传失败");
    } else {
      result = await new Promise((resolve, reject) => {
        const observable = window.qiniu.upload(
          item.file,
          key,
          tokenCache.token,
          {},
          {
            useCdnDomain: true,
            region: window.qiniu.region.z0,
          }
        );

        observable.subscribe({
          next: (res: any) => {
            item.progress = parseFloat(res.total.percent.toFixed(2));
            updateTotalProgress();
          },
          error: (err: any) => {
            if (err.code === 614) resolve({ code: 614 });
            else reject(err);
          },
          complete: resolve,
        });
      });
    }

    // 更新上传项目状态
    item.qiniuUrl = qiniuUrl;
    item.status = "success";
    item.progress = 100;
    uploadedCount.value++;

    const urlObj = {
      name: item.file.name,
      url: qiniuUrl,
      folder: item.folder,
    };

    // 初始化 uploadedUrls 如果不存在
    if (!currentProj.uploadedUrls) {
      currentProj.uploadedUrls = {};
    }

    // 初始化文件夹数组如果不存在
    if (!currentProj.uploadedUrls[item.folder]) {
      currentProj.uploadedUrls[item.folder] = [];
    }

    // 查找并更新或添加URL
    const existingIndex = currentProj.uploadedUrls[item.folder].findIndex(
      (f: any) => f.name === item.file.name
    );

    if (existingIndex >= 0) {
      currentProj.uploadedUrls[item.folder][existingIndex] = urlObj;
    } else {
      currentProj.uploadedUrls[item.folder].push(urlObj);
    }
    // 更新项目列表
    const updatedList = latestProjectList.map((project: Project) =>
      project.folderPath === currentProj.folderPath ? currentProj : project
    );

    // 如果是新项目，添加到列表
    if (!updatedList.some((p) => p.folderPath === currentProj.folderPath)) {
      updatedList.push(currentProj);
    }

    // 保存到本地
    await safeSaveProjectList(JSON.stringify(updatedList));

    // 同步更新本地状态
    projectList.value = updatedList;
    currentProject.value = currentProj;

    // 确保更新预览列表中的状态
    const previewItem = previews.find((p) => p.id === item.id);
    if (previewItem) {
      previewItem.status = "success";
      previewItem.qiniuUrl = qiniuUrl;
      previewItem.progress = 100;
      previewItem.error = undefined;
    }

    updateTotalProgress();

    if (result?.code === 614) {
      ElMessage.warning(`文件 ${item.file.name} 已存在(614)，URL已更新`);
    } else {
      ElMessage.success(`文件 ${item.file.name} 重试上传成功`);
    }

    return true;
  } catch (error: any) {
    item.status = "error";
    item.error = error.message || "上传失败";
    failedCount.value++;
    uploadedCount.value++;

    // 确保更新预览列表中的状态
    const previewItem = previews.find((p) => p.id === item.id);
    if (previewItem) {
      previewItem.status = "error";
      previewItem.error = error.message || "上传失败";
    }

    updateTotalProgress();
    throw error;
  }
};
const exportSuccessUrls = async () => {
  if (successItems.value.length === 0) {
    ElMessage.warning("没有成功上传的文件");
    return;
  }

  let csvContent = "文件夹,文件名,URL\n";
  Object.entries(groupedSuccessItems.value).forEach(([folder, items]) => {
    (items as Array<{ name: string; url: string }>).forEach((item) => {
      csvContent += `${folder},${item.name},${item.url}\n`;
    });
  });

  try {
    const filePath = await window.electronAPI.saveFile(
      csvContent,
      `上传成功文件_${new Date().toISOString().slice(0, 10)}.csv`,
      localStorage.getItem("sourceDirectoryPath") || undefined
    );
    if (filePath) ElMessage.success(`文件已保存至: ${filePath}`);
  } catch (error: any) {
    console.error("导出文件失败:", error);
    ElMessage.error("导出文件失败: " + error.message);
  }
};

// 监听props变化
watch(
  () => props.projectPath,
  async (newPath) => {
    if (newPath) await processSelectedDirectory(newPath);
  }
);

// 组件挂载时初始化
onMounted(async () => {
  try {
    const data = await window.electronAPI.loadProjectList();
    projectList.value = JSON.parse(data);
    if (props.projectPath) await processSelectedDirectory(props.projectPath);
  } catch (err) {
    console.error("加载项目列表失败：", err);
    projectList.value = [];
  }
});

defineExpose({
  uploadImages,
});
</script>

<style scoped lang="scss">
.upload {
  position: relative;
  max-width: 1200px;
  max-height: 400px;
  padding: 20px;
  margin: 0 auto;
  margin-top: 20px;
  overflow: hidden;
  overflow-y: auto;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
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
    height: 300px;
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
