<template>
  <div class="change-picture-container">
    <div class="box">
      <el-card>
        <h2>产品图片批量填充</h2>

        <!-- 项目选择 -->
        <el-form label-width="180px" class="form-container">
          <el-form-item label="选择项目:">
            <el-select
              v-model="selectedProject"
              placeholder="请选择项目"
              style="width: 400px"
              @change="handleProjectChange"
            >
              <el-option
                v-for="project in projectList"
                :key="project.folderName"
                :label="project.folderName"
                :value="project.folderName"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="轮播图组文件夹:">
            <el-select
              v-model="selectedCarouselFolders"
              multiple
              placeholder="请选择轮播图组文件夹"
              style="width: 400px"
              v-if="selectedProject"
              :disabled="!selectedProject"
            >
              <el-option
                v-for="(folder, index) in projectFolders"
                :key="index"
                :label="folder"
                :value="folder"
              />
            </el-select>
            <el-button
              type="primary"
              :disabled="!selectedProject"
              @click="generateCarouselImages"
              style="margin-left: 10px"
            >
              生成轮播图组
            </el-button>
          </el-form-item>

          <!-- 预览图组选择 -->
          <el-form-item label="预览图组文件夹:">
            <el-select
              v-model="selectedPreviewFolders"
              multiple
              placeholder="请选择预览图组文件夹"
              style="width: 400px"
              :disabled="!selectedProject"
              v-if="selectedProject"
            >
              <el-option
                v-for="(folder, index) in projectFolders"
                :key="index"
                :label="folder"
                :value="folder"
              />
            </el-select>
            <el-button
              type="primary"
              :disabled="!selectedProject"
              @click="generatePreviewImages"
              style="margin-left: 10px"
            >
              生成预览图组
            </el-button>
          </el-form-item>

          <!-- 映射信息文档选择 -->
          <el-form-item label="图组映射信息文档:">
            <el-alert
              type="warning"
              title="映射文件说明"
              :closable="false"
              show-icon
              style="margin-bottom: 15px"
            >
              <template #default>
                <ol class="tips">
                  <li>
                    在商品列表用<span
                      style="
                        margin: 0 10px;
                        color: #f55555;
                        font-size: 18px;
                        font-weight: bold;
                      "
                      >SKC查询</span
                    >需要换图的商品,
                  </li>
                  <li>
                    点击
                    <span
                      style="
                        margin: 0 5px;
                        color: #f55555;
                        font-size: 18px;
                        font-weight: bold;
                      "
                      >下载查询结果, 只勾选SKC ID、规格1名称 -> 确认,</span
                    >
                  </li>
                  <li>
                    这便是需要的初始映射文件,选择该文件进行初始化填充配置后即可开始填充索引.
                  </li>
                  <li style="color: #67c23a">
                    初始化后会在项目下生成映射数据文档,选择该文档可直接进行填表
                  </li>
                </ol>
              </template>
            </el-alert>
            <el-input
              v-model="selectedMappingFile"
              placeholder="请选择映射文档"
              readonly
              style="width: 400px"
            />
            <el-button
              type="primary"
              @click="selectMappingFile"
              style="margin-left: 10px"
            >
              选择文件
            </el-button>
          </el-form-item>

          <!-- 填充模式选择 -->
          <el-form-item label="填充模式:">
            <el-radio-group v-model="fillMode">
              <el-radio label="carousel">轮播图</el-radio>
              <el-radio label="preview">预览图</el-radio>
            </el-radio-group>
          </el-form-item>

          <!-- 填充延时设置 -->
          <el-form-item label="填充延时(秒):">
            <el-input-number
              v-model="fillDelay"
              :min="0.1"
              :max="10"
              :step="0.1"
              :precision="1"
              style="width: 150px"
            />
          </el-form-item>
        </el-form>
        <!-- 开始填充按钮 -->
        <el-row>
          <el-col style="display: flex; justify-content: end">
            <el-button
              type="success"
              :disabled="!selectedMappingFile"
              @click="initializeMapping"
              style="margin-left: 10px"
            >
              初始化填充配置
            </el-button>
            <el-button
              type="primary"
              :disabled="!isMappingInitialized"
              @click="startAutoFill"
              :loading="isProcessing"
            >
              开始自动填充
            </el-button>
            <el-button
              type="danger"
              @click="stopAutoFill"
              :disabled="!isProcessing"
            >
              停止填充
            </el-button>
          </el-col>
        </el-row>
      </el-card>

      <el-card style="margin-top: 20px">
        <!-- 运行日志 -->
        <div class="log-container">
          <div class="log-header">
            <h3>运行日志</h3>
            <el-button type="info" size="small" @click="clearLogs"
              >清空日志</el-button
            >
          </div>
          <el-scrollbar height="300px">
            <div class="log-content">
              <p v-for="(log, index) in logs" :key="index" :class="log.type">
                {{ log.time }} - {{ log.message }}
              </p>
              <div ref="logEnd"></div>
            </div>
          </el-scrollbar>

          <!-- 填充进度 -->
          <div class="progress-container" v-if="isProcessing">
            <el-progress
              :percentage="fillProgress"
              :format="progressFormat"
              :status="fillProgress === 100 ? 'success' : ''"
            ></el-progress>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import * as XLSX from "xlsx";

// 项目相关
const projectList = ref<any[]>([]);
const selectedProject = ref<any>("");
const projectPath = ref("");
const projectFolders = ref<string[]>([]);

// 文件夹选择
const selectedCarouselFolder = ref("");
const selectedPreviewFolder = ref("");
const selectedMappingFile = ref("");
// 添加状态变量来跟踪文件夹是否存在
const carouselGroupFileCount = ref(0);
const previewGroupFileCount = ref(0);

// 轮播图组和预览图组生成相关
// 修改响应式变量定义
// 变更单个选择为多选数组
const selectedCarouselFolders = ref<string[]>([]);
const selectedPreviewFolders = ref<string[]>([]);

// 标记是否有轮播图组和预览图组
const hasCarouselGroups = ref(false);
const hasPreviewGroups = ref(false);

// 存放生成的轮播图组和预览图组的路径
const carouselGroupPath = ref("");
const previewGroupPath = ref("");
const selectedFoldersForCarousel = ref<string[]>([]);
const selectedFoldersForPreview = ref<string[]>([]);
const imagePoolsByFolder = ref<Record<string, string[]>>({});

// 填充配置
const fillMode = ref("carousel");
const fillDelay = ref(1);
const isMappingInitialized = ref(false);
const mappingData = ref<any[]>([]);
const processedMappingData = ref<any[]>([]);

// 处理状态
const isProcessing = ref(false);
const shouldStop = ref(false);
const fillProgress = ref(0);
const currentItemIndex = ref(0);
const totalItems = ref(0);

// 日志
const logs = ref<{ time: string; message: string; type: string }[]>([]);
const logEnd = ref<HTMLElement | null>(null);

// 进度格式化
const progressFormat = (percentage: number) => {
  return `${currentItemIndex.value}/${totalItems.value} (${percentage}%)`;
};

// 添加日志
const addLog = (
  message: string,
  type: "info" | "success" | "error" = "info"
) => {
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now
    .getMinutes()
    .toString()
    .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

  logs.value.push({
    time: timeStr,
    message,
    type,
  });

  // 滚动到底部
  nextTick(() => {
    if (logEnd.value) {
      logEnd.value.scrollIntoView({ behavior: "smooth" });
    }
  });
};

// 清空日志
const clearLogs = () => {
  logs.value = [];
};

// 加载项目列表
onMounted(async () => {
  try {
    const raw = await window.electronAPI.loadProjectList();
    projectList.value = JSON.parse(raw);
    addLog("项目列表加载成功", "info");
  } catch (error) {
    addLog("加载项目列表失败: " + error, "error");
    ElMessage.error("加载项目列表失败");
  }
});

// 项目选择后加载文件夹
const handleProjectChange = async () => {
  try {
    const project = projectList.value.find(
      (p) => p.folderName === selectedProject.value
    );
    if (!project) {
      addLog("未找到选中的项目", "error");
      return;
    }

    projectPath.value = project.folderPath;
    selectedProject.value = project;
    addLog(
      `已选择项目: ${project.folderName}，路径: ${projectPath.value}`,
      "info"
    );

    // 重置选择
    selectedCarouselFolders.value = [];
    selectedPreviewFolders.value = [];
    selectedMappingFile.value = "";
    isMappingInitialized.value = false;

    // 获取项目目录下的所有文件夹
    const folders = await window.electronAPI.readDirectoryNames(
      projectPath.value
    );
    projectFolders.value = folders;

    // 检查轮播图组和预览图组文件夹是否存在
    await checkImageGroupFolders();
  } catch (error) {
    addLog("加载项目文件夹失败: " + error, "error");
    ElMessage.error("加载项目文件夹失败");
  }
};

// 初始化函数，检查项目路径下是否有相关文件夹
const checkImageGroupFolders = async () => {
  if (!selectedProject.value) return;

  try {
    // 检查轮播图组文件夹
    const carouselPath = `${selectedProject.value.folderPath}/轮播图组`;
    const carouselGroupsExist = await window.electronAPI.checkDirectoryExists(
      carouselPath
    );
    hasCarouselGroups.value = carouselGroupsExist;

    // 检查预览图组文件夹
    const previewPath = `${selectedProject.value.folderPath}/预览图组`;
    const previewGroupsExist = await window.electronAPI.checkDirectoryExists(
      previewPath
    );
    hasPreviewGroups.value = previewGroupsExist;

    // 如果文件夹存在，设置路径
    if (hasCarouselGroups.value) {
      carouselGroupPath.value = carouselPath;
      // 获取轮播图组文件夹中的文件数量
      const carouselResult = await window.electronAPI.listDirectories(
        carouselPath
      );

      carouselGroupFileCount.value = carouselResult.length;
      addLog(`轮播图组文件夹包含 ${carouselResult.length} 个子文件夹`, "info");
    } else {
      carouselGroupPath.value = "";
      carouselGroupFileCount.value = 0;
    }

    if (hasPreviewGroups.value) {
      previewGroupPath.value = previewPath;
      // 获取预览图组文件夹中的文件数量
      const previewResult = await window.electronAPI.getDirectoryFileCount(
        previewPath
      );
      previewGroupFileCount.value = previewResult.total;
      addLog(`预览图组文件夹包含 ${previewResult.total} 个文件`, "info");
    } else {
      previewGroupPath.value = "";
      previewGroupFileCount.value = 0;
    }

    if (hasCarouselGroups.value && hasPreviewGroups.value) {
      addLog("轮播图组和预览图组文件夹已存在", "success");
    } else {
      addLog("需要创建轮播图组或预览图组文件夹", "info");
    }
  } catch (error) {
    addLog(`检查图片组文件夹失败: ${error}`, "error");
  }
};

// 从源文件夹随机抽取图片生成轮播图组
const generateCarouselImages = async () => {
  if (!selectedProject.value) {
    ElMessage.warning("请先选择项目");
    return;
  }

  if (!mappingData.value || mappingData.value.length === 0) {
    ElMessage.warning("请先选择映射文件");
    return;
  }

  if (
    !selectedCarouselFolders.value ||
    selectedCarouselFolders.value.length === 0
  ) {
    ElMessage.warning("请先选择轮播图源文件夹");
    return;
  }

  try {
    // 创建轮播图组主文件夹
    const carouselGroupsPath = `${selectedProject.value.folderPath}/轮播图组`;
    await window.electronAPI.createDirectory(carouselGroupsPath);

    addLog("开始初始化图片池...", "info");

    // 初始化图片池
    const imagePoolsByFolder = {};

    // 获取所有选定文件夹中的图片
    for (const folderName of selectedCarouselFolders.value) {
      const folderPath = `${selectedProject.value.folderPath}/${folderName}`;
      addLog(`读取文件夹: ${folderName}`, "info");

      try {
        // 递归读取文件夹中的所有图片文件
        const images = await window.electronAPI.readAllImagesRecursively(
          folderPath
        );

        if (images.length > 0) {
          imagePoolsByFolder[folderPath] = images;
          addLog(`已加载 ${images.length} 张图片到图片池`, "info");
        } else {
          addLog(`文件夹 ${folderName} 中没有图片文件`, "warning");
        }
      } catch (error) {
        addLog(`读取文件夹 ${folderName} 失败: ${error}`, "error");
      }
    }

    // 检查是否有可用的图片
    const availableFolders = Object.keys(imagePoolsByFolder).filter(
      (folder) => imagePoolsByFolder[folder].length > 0
    );

    if (availableFolders.length === 0) {
      addLog("没有可用的图片源文件夹", "error");
      ElMessage.error("没有可用的图片源文件夹");
      return;
    }

    // 获取去重后的 SKC ID 列表
    const skcIds = mappingData.value.map((item) => item["SKC ID"]);
    const uniqueSkcIds = [...new Set(skcIds.filter((id) => id))];

    addLog(`开始生成轮播图组，共 ${uniqueSkcIds.length} 个SKC ID`, "info");

    // 计算可创建的最大轮播图组数量
    // 每组轮播图需要从每个文件夹抽取一张图片，所以受限于文件夹数量
    const maxImagesPerGroup = availableFolders.length;
    addLog(
      `每组轮播图将包含 ${maxImagesPerGroup} 张图片（每个文件夹抽取一张）`,
      "info"
    );

    // 计算需要创建多少组轮播图
    const totalGroups = uniqueSkcIds.length;

    addLog(`将创建 ${totalGroups} 个轮播图组`, "info");

    let processedCount = 0;
    let groupCount = 0;

    // 为每个 SKC ID 创建一个轮播图组
    for (let groupIndex = 0; groupIndex < totalGroups; groupIndex++) {
      const skcId = uniqueSkcIds[groupIndex];

      // 如果某个文件夹没有可用图片了，跳过此组
      const currentAvailableFolders = Object.keys(imagePoolsByFolder).filter(
        (folder) => imagePoolsByFolder[folder].length > 0
      );

      if (currentAvailableFolders.length === 0) {
        addLog("所有文件夹中的图片已用完，无法继续生成", "warning");
        break;
      }

      // 为当前组创建文件夹
      const groupNumber = groupIndex + 1; // 从1开始编号
      const groupFolderPath = `${carouselGroupsPath}/${groupNumber}`;

      // 创建轮播图组子文件夹
      await window.electronAPI.createDirectory(groupFolderPath);
      addLog(`创建轮播图组文件夹: ${groupNumber} (SKC ID: ${skcId})`, "info");
      groupCount++;

      // 从每个可用文件夹中抽取一张图片
      let imageNumberInGroup = 1;

      for (const folderPath of currentAvailableFolders) {
        if (imagePoolsByFolder[folderPath].length === 0) {
          continue; // 跳过没有图片的文件夹
        }

        const targetFileName = `${imageNumberInGroup}.jpg`;
        const targetFilePath = `${groupFolderPath}/${targetFileName}`;

        // 从当前文件夹随机选择一张图片
        const randomImageIndex = Math.floor(
          Math.random() * imagePoolsByFolder[folderPath].length
        );
        const selectedImage = imagePoolsByFolder[folderPath][randomImageIndex];

        // 从图池中移除已选图片，避免重复
        imagePoolsByFolder[folderPath].splice(randomImageIndex, 1);

        // 复制图片到轮播图组文件夹
        try {
          const imageBuffer = await window.electronAPI.readFile(selectedImage);
          const result = await window.electronAPI.saveImageSilently({
            content: imageBuffer,
            filePath: targetFilePath,
          });

          if (!result) {
            addLog(
              `保存轮播图失败: ${targetFilePath}, 错误: ${result.error}`,
              "error"
            );
            continue;
          }

          const folderName = folderPath.split("/").pop();
          addLog(
            `已从文件夹 "${folderName}" 为 SKC ID ${skcId} 生成轮播图 ${groupNumber}/${targetFileName}`,
            "success"
          );

          processedCount++;
          imageNumberInGroup++;
        } catch (error) {
          addLog(`复制图片失败: ${error}`, "error");
        }
      }
    }

    // 更新轮播图组文件数量
    carouselGroupFileCount.value = processedCount;
    hasCarouselGroups.value = processedCount > 0;

    addLog(
      `轮播图组生成完成，共 ${groupCount} 组，${processedCount} 张图片`,
      "success"
    );
    ElMessage.success(
      `轮播图组生成完成，共 ${groupCount} 组，${processedCount} 张图片`
    );
  } catch (error) {
    addLog(`生成轮播图组失败: ${error}`, "error");
    ElMessage.error("生成轮播图组失败");
  }
};

// 根据映射文件生成预览图组
const generatePreviewImages = async () => {
  if (!selectedProject.value) {
    ElMessage.warning("请先选择项目");
    return;
  }

  if (!mappingData.value || mappingData.value.length === 0) {
    ElMessage.warning("请先选择映射文件");
    return;
  }

  if (
    !selectedPreviewFolders.value ||
    selectedPreviewFolders.value.length === 0
  ) {
    ElMessage.warning("请先选择预览图源文件夹");
    return;
  }

  try {
    // 创建预览图组文件夹（单一文件夹）
    const previewGroupPath = `${selectedProject.value.folderPath}/预览图组`;
    await window.electronAPI.createDirectory(previewGroupPath);

    addLog("开始初始化预览图文件夹映射和图片池...", "info");

    // 创建规格到文件夹的映射
    const specFolderMap = {};

    // 建立图片池，避免重复抽取
    const imagePoolsByFolder = {};

    // 解析所有预览图文件夹名称，建立规格到文件夹的映射和图片池
    for (const folderName of selectedPreviewFolders.value) {
      const folderPath = `${selectedProject.value.folderPath}/${folderName}`;

      // 将文件夹名称作为关键词添加到映射中
      specFolderMap[folderName] = folderPath;

      // 使用正则表达式匹配 "预览图x[xxx]" 格式
      // 匹配方括号中的内容作为规格名称
      const match = folderName.match(/预览图\d*$$(.*?)$$/);
      if (match && match[1]) {
        const specName = match[1].trim();
        if (specName) {
          specFolderMap[specName] = folderPath;
          addLog(
            `为规格 "${specName}" 映射了预览图文件夹: ${folderName}`,
            "info"
          );
        }
      }

      // 递归读取文件夹中的所有图片文件
      try {
        const images = await window.electronAPI.readAllImagesRecursively(
          folderPath
        );

        if (images.length > 0) {
          imagePoolsByFolder[folderPath] = images;
          addLog(
            `已加载 ${images.length} 张图片到 ${folderName} 的图片池`,
            "info"
          );
        } else {
          addLog(`文件夹 ${folderName} 中没有图片文件`, "warning");
        }
      } catch (error) {
        addLog(`读取文件夹 ${folderName} 图片失败: ${error}`, "error");
      }
    }

    // 从映射数据中提取所有规格名称，按照在Excel中的顺序
    const specInfos = [];

    for (const item of mappingData.value) {
      const fullSpec = item["规格1名称"];
      if (!fullSpec) continue;

      // 提取规格名称（使用"-"分割并取最后一部分）
      let extractedSpec = fullSpec.split("-").pop()?.trim();
      if (!extractedSpec) continue;

      // 加入列表，不去重
      specInfos.push({
        fullSpec,
        extractedSpec,
      });
    }

    if (specInfos.length === 0) {
      addLog("映射文件中没有有效的规格名称", "error");
      ElMessage.error("映射文件中没有有效的规格名称");
      return;
    }

    addLog(`开始生成预览图，共 ${specInfos.length} 个规格`, "info");

    // 为每个规格生成一张预览图，按顺序命名
    let processedCount = 0;

    for (let i = 0; i < specInfos.length; i++) {
      const { fullSpec, extractedSpec } = specInfos[i];
      const targetFileName = `${i + 1}.jpg`; // 从1开始编号
      const targetFilePath = `${previewGroupPath}/${targetFileName}`;

      // 查找匹配的规格文件夹
      let matchedFolder = null;
      let bestMatchScore = 0;

      // 记录匹配尝试的日志，帮助调试
      let matchAttempts = [];

      for (const [folderSpec, folderPath] of Object.entries(specFolderMap)) {
        // 先检查该文件夹是否还有可用图片
        if (
          !imagePoolsByFolder[folderPath] ||
          imagePoolsByFolder[folderPath].length === 0
        ) {
          continue; // 跳过已经没有图片的文件夹
        }

        // 先尝试精确匹配
        if (folderSpec === extractedSpec) {
          matchedFolder = folderPath;
          addLog(
            `找到精确匹配：规格 "${extractedSpec}" 对应文件夹 "${folderSpec}"`,
            "info"
          );
          break;
        }

        // 如果没有精确匹配，计算相似度
        if (
          extractedSpec.includes(folderSpec) ||
          folderSpec.includes(extractedSpec)
        ) {
          // 计算匹配程度
          const matchScore =
            Math.min(extractedSpec.length, folderSpec.length) /
            Math.max(extractedSpec.length, folderSpec.length);

          matchAttempts.push({
            folderSpec,
            score: matchScore.toFixed(2),
          });

          if (matchScore > bestMatchScore) {
            bestMatchScore = matchScore;
            matchedFolder = folderPath;
          }
        }
      }

      if (
        !matchedFolder ||
        !imagePoolsByFolder[matchedFolder] ||
        imagePoolsByFolder[matchedFolder].length === 0
      ) {
        // 如果没找到匹配的文件夹，或者匹配的文件夹已经没有图片了
        if (!matchedFolder) {
          addLog(
            `未找到匹配规格 "${extractedSpec}" 的预览图文件夹 (完整规格: "${fullSpec}")`,
            "warning"
          );
          if (matchAttempts.length > 0) {
            addLog(`尝试的匹配: ${JSON.stringify(matchAttempts)}`, "info");
          }
        } else {
          addLog(
            `文件夹 ${matchedFolder.split("/").pop()} 中图片已经用完`,
            "warning"
          );
        }

        // 尝试从任何还有图片的文件夹中获取
        const availableFolders = Object.keys(imagePoolsByFolder).filter(
          (folder) => imagePoolsByFolder[folder].length > 0
        );

        if (availableFolders.length === 0) {
          addLog("所有文件夹中的图片已用完，无法继续生成", "warning");
          break;
        }

        // 随机选择一个可用文件夹
        const randomFolderIndex = Math.floor(
          Math.random() * availableFolders.length
        );
        matchedFolder = availableFolders[randomFolderIndex];
        addLog(
          `为规格 "${extractedSpec}" 随机选择了文件夹: ${matchedFolder
            .split("/")
            .pop()}`,
          "info"
        );
      }

      // 从图片池中随机选择一张图片
      try {
        const images = imagePoolsByFolder[matchedFolder];

        // 随机选择一张图片
        const randomImageIndex = Math.floor(Math.random() * images.length);
        const selectedImage = images[randomImageIndex];

        // 从图池中移除已选图片，避免重复
        images.splice(randomImageIndex, 1);

        // 复制图片到预览图组文件夹
        const imageBuffer = await window.electronAPI.readFile(selectedImage);

        // 保存图片
        const result = await window.electronAPI.saveImageSilently({
          content: imageBuffer,
          filePath: targetFilePath,
        });

        if (!result) {
          addLog(
            `保存预览图失败: ${targetFilePath}, 错误: ${result.error}`,
            "error"
          );
          continue;
        }

        processedCount++;
        const folderName = matchedFolder.split("/").pop();
        addLog(
          `已从文件夹 "${folderName}" 为规格 "${extractedSpec}" 生成预览图 ${targetFileName}`,
          "success"
        );
      } catch (error) {
        addLog(`处理规格 "${extractedSpec}" 预览图失败: ${error}`, "error");
      }
    }

    // 更新预览图组状态
    previewGroupFileCount.value = processedCount;
    hasPreviewGroups.value = processedCount > 0;

    if (processedCount > 0) {
      addLog(`预览图生成完成，共 ${processedCount} 张图片`, "success");
      ElMessage.success(`预览图生成完成，共 ${processedCount} 张图片`);
    } else {
      addLog("预览图生成失败，没有生成任何图片", "error");
      ElMessage.error("预览图生成失败，没有生成任何图片");
    }
  } catch (error) {
    addLog(`生成预览图失败: ${error}`, "error");
    ElMessage.error("生成预览图失败");
  }
};

// 选择映射文件
const selectMappingFile = async () => {
  try {
    // 使用文件选择 API
    const filePath = await window.electronAPI.selectFile({
      title: "选择映射文件",
      filters: [{ name: "Excel 文件", extensions: ["xlsx", "xls"] }],
    });

    if (!filePath) {
      // 用户取消了选择
      return;
    }

    // 保存选中的文件路径
    selectedMappingFile.value = filePath;
    addLog(`已选择映射文件: ${filePath}`, "info");
    isMappingInitialized.value = true;
    // 读取 Excel 文件内容
    const jsonData = await window.electronAPI.readExcel(filePath);

    if (!jsonData || jsonData.length === 0) {
      addLog("映射文件没有数据", "error");
      ElMessage.error("映射文件没有数据");
      return;
    }

    // 检查必要的列是否存在
    const firstRow = jsonData[0] as any;
    if (!firstRow["SKC ID"] || !firstRow["规格1名称"]) {
      addLog(
        "映射文件格式不正确，缺少必要的列 'SKC ID' 或 '规格1名称'",
        "error"
      );
      ElMessage.error("映射文件格式不正确，缺少必要的列");
      return;
    }

    mappingData.value = jsonData;
    totalItems.value = jsonData.length;

    addLog(`映射数据加载成功，共 ${jsonData.length} 条记录`, "success");
    ElMessage.success(`映射数据加载成功，共 ${jsonData.length} 条记录`);

    // 移除自动生成图组的代码，让用户通过按钮点击来生成
  } catch (error) {
    addLog("选择或读取映射文件失败: " + error, "error");
    ElMessage.error("选择或读取映射文件失败");
  }
};

// 初始化填充配置
const initializeMapping = async () => {
  if (!selectedMappingFile.value || mappingData.value.length === 0) {
    ElMessage.warning("请先选择有效的映射文件");
    return;
  }

  try {
    // 1. 检查必要数据列
    const firstRow = mappingData.value[0] as any;
    if (!firstRow["SKC ID"] || !firstRow["规格1名称"]) {
      ElMessage.error(
        "映射文件格式不正确，缺少必要的列 'SKC ID' 或 '规格1名称'"
      );
      return;
    }

    // 2. 检查轮播图组、预览图组文件夹内图片数据是否匹配映射文件数据
    if (!hasCarouselGroups.value || !hasPreviewGroups.value) {
      ElMessage.error("请先创建轮播图组和预览图组文件夹");
      return;
    }

    // 确保目录路径正确
    const carouselGroupPath = `${selectedProject.value.folderPath}/轮播图组`;
    const previewGroupPath = `${selectedProject.value.folderPath}/预览图组`;

    // 检查目录是否存在
    const carouselGroupExists = await window.electronAPI.existsFolder(
      carouselGroupPath
    );
    const previewGroupExists = await window.electronAPI.existsFolder(
      previewGroupPath
    );

    if (!carouselGroupExists) {
      ElMessage.error("轮播图组文件夹不存在");
      addLog("轮播图组文件夹不存在", "error");
      return;
    }

    if (!previewGroupExists) {
      ElMessage.error("预览图组文件夹不存在");
      addLog("预览图组文件夹不存在", "error");
      return;
    }

    // 获取轮播图组文件夹中的子文件夹列表
    const carouselFolders = await window.electronAPI.listDirectories(
      carouselGroupPath
    );

    // 获取预览图组文件夹中的文件数量
    const previewResult = await window.electronAPI.getDirectoryFileCount(
      previewGroupPath
    );

    carouselGroupFileCount.value = carouselFolders.length;
    previewGroupFileCount.value = previewResult.total;

    // 获取去重后的 SKC ID 数量
    const skcIds = mappingData.value
      .map((item) => item["SKC ID"])
      .filter((id) => id); // 过滤掉空值
    const uniqueSkcIds = [...new Set(skcIds)];
    const uniqueSkcIdsCount = uniqueSkcIds.length;

    // 获取规格1名称列的数量
    const specs = mappingData.value
      .map((item) => item["规格1名称"])
      .filter((spec) => spec); // 过滤掉空值
    const specsCount = specs.length;

    // 检查数量是否匹配
    if (carouselGroupFileCount.value !== uniqueSkcIdsCount) {
      ElMessage.error(
        `轮播图组文件夹内子文件夹数量(${carouselGroupFileCount.value})与映射文件SKC ID去重后的数量(${uniqueSkcIdsCount})不匹配`
      );
      addLog(
        `轮播图组文件夹内子文件夹数量(${carouselGroupFileCount.value})与映射文件SKC ID去重后的数量(${uniqueSkcIdsCount})不匹配`,
        "error"
      );
      return;
    }

    if (previewGroupFileCount.value !== specsCount) {
      ElMessage.error(
        `预览图组文件夹内图片数量(${previewGroupFileCount.value})与规格1名称列的数据数量(${specsCount})不匹配`
      );
      addLog(
        `预览图组文件夹内图片数量(${previewGroupFileCount.value})与规格1名称列的数据数量(${specsCount})不匹配`,
        "error"
      );
      return;
    }

    // 3. 处理映射数据
    // 读取预览图组文件夹中的文件
    const previewFiles = await window.electronAPI.readDirectory(
      previewGroupPath
    );
    const previewImageFiles = previewFiles
      .filter(
        (file) =>
          !file.isDirectory && /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name)
      )
      .sort((a, b) => {
        const numA = parseInt(a.name.replace(/\D/g, "")) || 0;
        const numB = parseInt(b.name.replace(/\D/g, "")) || 0;
        return numA - numB;
      });

    // 获取预览图文件名（不含扩展名）
    const previewFileNames = previewImageFiles.map((file) => {
      const name = file.name.split(".")[0];
      return name;
    });

    // 创建处理后的数据
    const processedData = [];
    const skcIdMap = new Map(); // 用于记录每个SKC ID的轮播图序号
    let currentCarouselIndex = 1;

    // 首先为每个唯一的SKC ID分配轮播图序号
    for (const skcId of uniqueSkcIds) {
      skcIdMap.set(skcId, currentCarouselIndex++);
    }

    // 为每条记录添加轮播图序号和预览图序号
    for (let i = 0; i < mappingData.value.length; i++) {
      const item = { ...mappingData.value[i] };
      const skcId = item["SKC ID"];

      // 添加轮播图组序号
      item["轮播图组序号"] = skcIdMap.get(skcId);

      // 添加预览图序号（按照预览图组内的文件名称）
      if (i < previewFileNames.length) {
        item["预览图序号"] = previewFileNames[i];
      } else {
        item["预览图序号"] = i + 1; // 如果没有对应的文件名，则使用索引+1
      }

      processedData.push(item);
    }

    processedMappingData.value = processedData;
    console.log("处理后的数据：", processedData);

    // 4. 保存处理后的映射文件
    // 使用 XLSX 库处理数据
    const workbook = XLSX.utils.book_new();

    // 将数据转换为工作表
    const worksheet = XLSX.utils.json_to_sheet(processedData);
    // 合并SKC ID列相同数据的单元格
    const merges = [];
    let startRow = 0; // 开始行索引初始化为0（第一行数据，不包括表头）
    let currentSkcId = processedData[0]["SKC ID"];

    for (let i = 1; i < processedData.length; i++) {
      if (processedData[i]["SKC ID"] !== currentSkcId) {
        // 如果当前行的SKC ID与前一行不同，则合并之前的相同SKC ID的单元格
        if (i - startRow > 1) {
          // 只有当有多行相同SKC ID时才进行合并
          // 注意：表格的行索引是从0开始的，但我们的数据是从表格的第1行开始的（0行是表头）
          // 所以合并时需要加1来匹配实际的表格行
          merges.push({
            s: { r: startRow + 1, c: 0 }, // 开始单元格（r=行，c=列，从0开始）
            e: { r: i, c: 0 }, // 结束单元格
          });

          // 同时合并轮播图组序号列
          const carouselColumnIndex = Object.keys(processedData[0]).findIndex(
            (key) => key === "轮播图组序号"
          );

          if (carouselColumnIndex !== -1) {
            merges.push({
              s: { r: startRow + 1, c: carouselColumnIndex },
              e: { r: i, c: carouselColumnIndex },
            });
          }
        }

        // 更新当前SKC ID和起始行
        currentSkcId = processedData[i]["SKC ID"];
        startRow = i;
      }
    }

    // 处理最后一组相同的SKC ID
    if (processedData.length - startRow > 1) {
      merges.push({
        s: { r: startRow + 1, c: 0 },
        e: { r: processedData.length, c: 0 },
      });

      const carouselColumnIndex = Object.keys(processedData[0]).findIndex(
        (key) => key === "轮播图组序号"
      );

      if (carouselColumnIndex !== -1) {
        merges.push({
          s: { r: startRow + 1, c: carouselColumnIndex },
          e: { r: processedData.length, c: carouselColumnIndex },
        });
      }
    }

    // 添加合并单元格配置
    worksheet["!merges"] = merges;

    // 将工作表添加到工作簿
    XLSX.utils.book_append_sheet(workbook, worksheet, "映射数据");

    // 获取文件名（不含路径）
    const originalFileName = selectedMappingFile.value.substring(
      selectedMappingFile.value.lastIndexOf("\\") + 1
    );
    console.log("原始文件名:", originalFileName);

    try {
      // 写入为数组数据
      const blob = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

      // 创建 Blob 对象
      const fileBlob = new Blob([blob], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
      });

      // 使用 FileReader 读取为 ArrayBuffer
      const fileReader = new FileReader();

      // 直接使用 onload 回调，而不是创建 Promise
      fileReader.onload = async function () {
        const arrayBuffer = this.result;
        console.log("读取Excel文件成功:", arrayBuffer);

        console.log("准备保存Excel文件:", {
          类型: typeof arrayBuffer,
          是否为ArrayBuffer: arrayBuffer instanceof ArrayBuffer,
        });

        try {
          const fullPath =
            selectedProject.value.folderPath + "\\" + "映射数据.xlsx";
          console.log("准备保存Excel文件:", fullPath);

          // 使用原始参数的调用方式
          const saveResult = await window.electronAPI.saveFileSilently(
            arrayBuffer,
            fullPath
          );
          console.log("保存Excel结果:", saveResult);

          // 将映射数据路径保存到 selectedMappingFile.value
          if (saveResult) {
            selectedMappingFile.value = saveResult.filePath;
            addLog(
              `处理后的映射数据已保存到: ${saveResult.filePath}`,
              "success"
            );
            console.log("保存Excel结果:", saveResult);

            // 映射初始化成功
            isMappingInitialized.value = true;
          } else {
            ElMessage.warning("用户取消了保存");
          }
        } catch (err) {
          console.error("保存Excel错误:", err);
          addLog(`保存处理后的映射文件失败: ${err.message || err}`, "error");
          ElMessage.error(`保存文件失败: ${err.message || "未知错误"}`);
          throw new Error(`保存处理后的映射文件失败: ${err.message || err}`);
        }
      };

      fileReader.onerror = function () {
        const err = new Error("读取文件数据失败");
        console.error("读取Excel数据错误:", err);
        addLog("读取文件数据失败", "error");
        ElMessage.error("读取文件数据失败");
        throw err;
      };

      // 开始读取 Blob 为 ArrayBuffer
      fileReader.readAsArrayBuffer(fileBlob);
    } catch (error) {
      console.error("准备Excel文件错误:", error);
      addLog(`准备Excel文件失败: ${error.message || error}`, "error");
      ElMessage.error(`准备Excel文件失败: ${error.message || "未知错误"}`);
      throw new Error(`准备Excel文件失败: ${error.message || error}`);
    }

    // 5. 完成初始化
    isMappingInitialized.value = true;
    addLog("映射配置初始化完成", "success");
    ElMessage.success("映射配置初始化完成");
  } catch (error) {
    addLog(`初始化映射配置失败: ${error}`, "error");
    ElMessage.error("初始化映射配置失败");
  }
};

// 开始自动填充
const startAutoFill = async () => {
  if (!isMappingInitialized.value) {
    ElMessage.warning("请完成所有必要的配置");
    return;
  }

  try {
    let remainingTime = ref(5); // 5秒倒计时
    let dialogVisible = ref(true);
    let timer = null;

    // 使用 ElMessageBox 来实现，这是另一种方式
    const handleCountdown = async () => {
      return new Promise((resolve, reject) => {
        let secondsLeft = 5;

        const msgBoxInstance = ElMessageBox.alert(
          `请将鼠标移动到目标位置，将在 ${secondsLeft} 秒后开始填充`,
          "准备开始填充",
          {
            confirmButtonText: "立即开始",
            showCancelButton: true,
            cancelButtonText: "取消",
            type: "warning",
            closeOnClickModal: false,
            closeOnPressEscape: false,
            beforeClose: (action, instance, done) => {
              if (action === "confirm") {
                clearInterval(countdownTimer);
                done();
                resolve(true);
              } else if (action === "cancel") {
                clearInterval(countdownTimer);
                done();
                resolve(false);
              }
            },
          }
        );

        const countdownTimer = setInterval(() => {
          secondsLeft--;

          if (secondsLeft > 0) {
            msgBoxInstance.message = `请将鼠标移动到目标位置，将在 ${secondsLeft} 秒后开始填充`;
          } else {
            clearInterval(countdownTimer);
            // 查找并点击确认按钮
            const confirmBtn = document.querySelector(
              ".el-message-box__btns .el-button--primary"
            );
            if (confirmBtn) {
              confirmBtn.click();
            } else {
              resolve(true);
            }
          }
        }, 1000);
      });
    };

    // 采用第二种方式实现
    const shouldStart = await handleCountdown();
    if (shouldStart) {
      // 开始填充
      performAutoFill();
    } else {
      ElMessage.info("自动填充已取消");
    }
  } catch (error) {
    addLog("启动自动填充失败: " + error, "error");
    ElMessage.error("启动自动填充失败");
  }
};

// 执行实际的填充操作
const performAutoFill = async () => {
  try {
    isProcessing.value = true;
    shouldStop.value = false;
    fillProgress.value = 0;
    currentItemIndex.value = 0;

    // 读取 映射数据.xlsx 文件
    const xlsxData = await window.electronAPI.readExcel(
      selectedMappingFile.value
    );
    // 检查是否存在必要数据列
    if (
      xlsxData[0].hasOwnProperty("SKC ID") ||
      xlsxData[0].hasOwnProperty("规格1名称")
    ) {
      addLog("映射数据文件格式正确", "success");
      processedMappingData.value = xlsxData;
    } else {
      addLog("映射数据文件格式不正确", "error");
      ElMessage.error("映射数据文件格式不正确");
      return;
    }
    // 根据 SKU ID 去重并分组
    const skuGroups = {};

    // 首先按 SKU ID 分组
    processedMappingData.value.forEach((item) => {
      const skuId = item["SKC ID"] || "";
      if (!skuGroups[skuId]) {
        skuGroups[skuId] = [];
      }
      skuGroups[skuId].push(item);
    });

    // 转换为数组形式，每个元素是一个 SKU 组
    const uniqueSkuGroups = Object.values(skuGroups);
    totalItems.value = uniqueSkuGroups.length;

    addLog(
      `开始自动${fillMode.value === "carousel" ? "轮播图" : "预览图"}填充，共 ${
        totalItems.value
      } 个SKU组`,
      "info"
    );

    let processedCount = 0; // 记录已处理的总数

    // 遍历处理每个 SKU 组
    for (let i = 0; i < uniqueSkuGroups.length; i++) {
      // 检查是否应该停止
      if (shouldStop.value) {
        addLog("填充过程被用户中断", "info");
        break;
      }

      const skuGroup = uniqueSkuGroups[i];
      const skuId = skuGroup[0]["SKC ID"] || "";

      // 获取第一个项目的规格名，仅用于日志显示
      const firstSpecName = skuGroup[0]["规格1名称"] || "";

      // 根据填充模式获取不同的序号
      if (fillMode.value === "carousel") {
        const columnValue =
          skuGroup[0][
            fillMode.value === "carousel" ? "轮播图组序号" : "预览图序号"
          ];
        addLog(
          `正在处理 SKU组 [${skuId}]（包含 ${skuGroup.length} 个规格），${
            fillMode.value === "carousel" ? "轮播图" : "预览图"
          }序号: ${columnValue}`,
          "info"
        );

        try {
          // 将对应列的值写入剪贴板
          const writeResult = await window.electronAPI.writeClipboardText(
            String(columnValue)
          );

          if (!writeResult.success) {
            throw new Error(writeResult.error || "写入剪贴板失败");
          }

          const pasteResult = await window.electronAPI.simulatePaste();

          if (!pasteResult.success) {
            throw new Error(pasteResult.error || "粘贴操作失败");
          }

          // 等待指定延时，以便操作完成
          await new Promise((resolve) =>
            setTimeout(resolve, fillDelay.value * 1000)
          );

          // 记录成功日志
          addLog(
            `SKU组 [${skuId}] ${
              fillMode.value === "carousel" ? "轮播图" : "预览图"
            }填充成功`,
            "success"
          );
        } catch (error) {
          addLog(`SKU组 [${skuId}] 处理出错: ${error}`, "error");
        }

        processedCount += 1;
        currentItemIndex.value = processedCount;
        fillProgress.value = Math.round(
          (currentItemIndex.value / totalItems.value) * 100
        );
      } else {
        // 预览图模式
        for (let j = 0; j < skuGroup.length; j++) {
          const item = skuGroup[j];
          const columnValue = item["预览图序号"];

          addLog(
            `正在处理 SKU组 [${skuId}] 中的规格 [${
              item["规格1名称"] || ""
            }]，预览图序号: ${columnValue}`,
            "info"
          );

          try {
            // 将对应列的值写入剪贴板
            const writeResult = await window.electronAPI.writeClipboardText(
              String(columnValue)
            );

            if (!writeResult.success) {
              throw new Error(writeResult.error || "写入剪贴板失败");
            }

            const pasteResult = await window.electronAPI.simulatePaste();

            if (!pasteResult.success) {
              throw new Error(pasteResult.error || "粘贴操作失败");
            }

            // 等待指定延时，以便操作完成
            await new Promise((resolve) =>
              setTimeout(resolve, fillDelay.value * 1000)
            );

            // 记录成功日志
            addLog(
              `SKU组 [${skuId}] 中的规格 [${
                item["规格1名称"] || ""
              }] 预览图填充成功`,
              "success"
            );
          } catch (error) {
            addLog(
              `SKU组 [${skuId}] 中的规格 [${
                item["规格1名称"] || ""
              }] 处理出错: ${error}`,
              "error"
            );
          }

          processedCount += 1;
          currentItemIndex.value = processedCount;
          fillProgress.value = Math.round(
            (currentItemIndex.value / totalItems.value) * 100
          );
        }
      }
    }

    if (!shouldStop.value) {
      fillProgress.value = 100;
      addLog("自动填充完成", "success");
      ElMessage.success("自动填充完成");
    }
  } catch (error) {
    addLog("自动填充过程出错: " + error, "error");
    ElMessage.error("自动填充过程出错");
  } finally {
    isProcessing.value = false;
  }
};

// 停止自动填充
const stopAutoFill = () => {
  shouldStop.value = true;
  addLog("正在停止填充过程...", "info");
};
</script>

<style scoped>
.change-picture-container {
  width: 100%;
  height: 100%;
  overflow-y: auto;
}

.change-picture-container .box {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}
.form-container {
  max-width: 800px;
  margin: 0 auto;
  margin-bottom: 20px;
}

.log-container {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 10px;
  margin-top: 20px;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.log-header h3 {
  margin: 0;
}

.log-content {
  font-family: monospace;
  white-space: pre-wrap;
}

.log-content p {
  margin: 5px 0;
  line-height: 1.5;
}

.log-content .info {
  color: #606266;
}

.log-content .success {
  color: #67c23a;
}

.log-content .error {
  color: #f56c6c;
}

.progress-container {
  margin-top: 15px;
}
</style>
