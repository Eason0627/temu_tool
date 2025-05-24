<template>
  <div @click="dialogVisible = true" class="initBtn">
    <div style="display: flex; justify-content: center; align-items: center">
      <el-icon :size="20"><Plus /></el-icon><span>初始化项目</span>
    </div>
  </div>
  <el-dialog v-model="dialogVisible" title="项目配置" width="600px">
    <el-form label-width="120px" :model="form">
      <!-- 项目路径 -->
      <el-form-item label="项目路径：" required>
        <div class="path-selector">
          <el-input v-model="basePath" placeholder="请选择项目路径" readonly />
          <el-button @click="selectPath">浏览</el-button>
        </div>
      </el-form-item>
      <!-- 项目名称 -->
      <el-form-item label="项目名称：" required>
        <div class="project-name">
          <el-input v-model="projectName" placeholder="请输入项目名称" />
        </div>
      </el-form-item>
      <!-- 轮播图目录区 -->
      <el-form-item label="轮播图目录：">
        <el-row
          v-for="(item, index) in carousels"
          :key="item.id"
          class="directory-item"
        >
          <el-col
            :span="24"
            style="
              display: flex;
              justify-content: space-between;
              align-items: center;
            "
          >
            <el-input
              :model-value="`${item.order}`"
              readonly
              :class="{ 'is-disabled': carousels.length === 1 }"
            />
            <el-button
              type="danger"
              @click="removeCarousel(item.id)"
              style="margin-left: 10px"
              :disabled="carousels.length === 1"
              >删除</el-button
            >
            <el-button
              type="primary"
              @click="addCarousel"
              v-if="index === carousels.length - 1"
              >新增</el-button
            >
          </el-col>
        </el-row>
      </el-form-item>
      <!-- 轮播图目录区 -->
      <el-form-item label="尺寸图目录：">
        <el-row class="directory-item">
          <el-col
            :span="24"
            style="
              display: flex;
              justify-content: space-between;
              align-items: center;
            "
          >
            <el-input
              value="尺寸图"
              readonly
              :class="{ 'is-disabled': carousels.length === 1 }"
            />
          </el-col>
        </el-row>
      </el-form-item>
      <!-- 预览图目录区 -->
      <el-form-item label="预览图目录：" v-show="previews.length > 0">
        <div
          v-for="(item, index) in previews"
          :key="item.id"
          class="directory-item"
        >
          <el-input v-model="item.name" placeholder="请输入规格名称" />
          <el-button
            type="danger"
            @click="removePreview(item.id)"
            :disabled="previews.length === 1"
            >删除</el-button
          >
        </div>
      </el-form-item>

      <!-- 规格名称 -->
      <el-form-item label="规格名称：" prop="specName" required>
        <el-row>
          <el-col :span="16">
            <el-input
              v-model="form.specName"
              @keydown.enter="addPreview"
              placeholder="示例：黑色"
            />
          </el-col>
          <el-col :span="3">
            <el-button
              @click="addPreview"
              :disabled="!form.specName"
              style="margin-left: 10px"
              >新增规格</el-button
            >
          </el-col>
        </el-row>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="loading" @click="generateProject"
        >确认生成</el-button
      >
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ElMessage } from "element-plus";
import { Plus } from "@element-plus/icons-vue";
import { ref, reactive, watch } from "vue";

interface CarouselItem {
  id: number;
  order: number;
}

interface PreviewItem {
  id: number;
  name: string;
}
// 弹窗状态
const dialogVisible = ref(false);
// 项目名称
const projectName = ref("");
// 项目路径
const basePath = ref("");
// 初始轮播图目录
const carousels = reactive<CarouselItem[]>([
  { id: 1, order: 1 },
  { id: 2, order: 2 },
  { id: 3, order: 3 },
  { id: 4, order: 4 },
]);

// 预览图目录
const previews = reactive<PreviewItem[]>([]);

// 表单数据
const form = reactive({
  specName: "",
});
const loading = ref(false);
// 选择项目路径
const selectPath = async () => {
  try {
    // 调用Electron对话框
    const result = await window.electronAPI.openDirectoryDialog();

    if (result.canceled) {
      console.log("用户取消选择");
      return;
    }

    const selectedPath = result.filePaths[0];

    // 空路径校验
    if (!selectedPath) {
      ElMessage.error("未选择有效路径");
      return;
    }

    // 路径格式校验（支持Windows和Unix-like系统）
    const isValidPath = /^(?:[a-zA-Z]:\\|\\\\|\/|~\/)/.test(selectedPath);
    if (!isValidPath) {
      ElMessage.error({
        message: `非法路径格式: ${selectedPath}`,
        duration: 3000,
      });
      return;
    }

    // 检查路径是否存在
    const exists = await window.electronAPI.checkDirectoryExists(selectedPath);
    if (!exists) {
      ElMessage.warning({
        message: "路径不存在，将自动创建",
        duration: 2000,
      });
    }

    // 更新路径状态
    basePath.value = selectedPath;

    ElMessage.success({
      message: `已选择路径: ${selectedPath}`,
      duration: 1500,
    });
  } catch (error) {
    console.error("路径选择失败:", error);
    ElMessage.error({
      message: `路径选择失败: ${error.message}`,
      duration: 3000,
    });
  }
};
// 添加轮播图目录
const addCarousel = () => {
  const nextOrder = Math.max(...carousels.map((c) => c.order)) + 1;
  carousels.push({
    id: Date.now(),
    order: nextOrder,
  });
};

// 删除轮播图目录
const removeCarousel = (id: number) => {
  const index = carousels.findIndex((c) => c.id === id);
  if (index !== -1) {
    carousels.splice(index, 1);
  }
  // 重排序号
  carousels.forEach((c, index) => {
    c.order = index + 1;
  });
};

// 添加预览图规格
const addPreview = () => {
  previews.push({
    id: Date.now(),
    name: "预览图" + (previews.length + 1) + "[" + form.specName + "]",
  });
  // 清空输入框
  form.specName = "";
};

// 删除预览图规格
const removePreview = (id: number) => {
  const index = previews.findIndex((p) => p.id === id);
  if (index !== -1 && previews.length > 1) {
    previews.splice(index, 1);
  }
  // 重排序号
  previews.forEach((p, index) => {
    p.name = "预览图" + (index + 1) + "[" + form.specName + "]";
  });
};

// 生成逻辑（保持之前的核心逻辑，调整目录生成规则）
const generateProject = async () => {
  loading.value = true;
  // 构建项目目录结构
  // 生成项目文件夹
  const projectPath = basePath.value + "\\" + projectName.value;
  await window.electronAPI.createDirectory(
    basePath.value + "\\" + projectName.value
  );
  // 生成轮播图目录
  carousels.forEach(async (c) => {
    await window.electronAPI.createDirectory(projectPath + "\\" + c.order);
  });
  // 生成尺寸图目录
  await window.electronAPI.createDirectory(projectPath + "\\尺寸图");
  // 生成预览图目录
  previews.forEach(async (p) => {
    await window.electronAPI.createDirectory(projectPath + "\\" + p.name);
  });
  // 检查是否生成成功
  const exists = await window.electronAPI.checkDirectoryExists(projectPath);
  if (exists) {
    // 遍历检查轮播图目录是否存在
    for (let i = 1; i <= carousels.length; i++) {
      const carouselPath = projectPath + "\\" + i;
      const exists = await window.electronAPI.checkDirectoryExists(
        carouselPath
      );
      if (!exists) {
        ElMessage.error({
          message: `轮播图目录 ${carouselPath} 不存在`,
          duration: 3000,
        });
      }
    }
    // 检查尺寸图目录是否存在
    const sizePath = projectPath + "\\尺寸图";
    const exists = await window.electronAPI.checkDirectoryExists(sizePath);
    if (!exists) {
      ElMessage.error({
        message: `尺寸图目录 ${sizePath} 不存在`,
        duration: 3000,
      });
    }
    // 遍历检查预览图目录是否存在
    for (let i = 0; i < previews.length; i++) {
      const previewPath = projectPath + "\\" + previews[i].name;
      const exists = await window.electronAPI.checkDirectoryExists(previewPath);
      if (!exists) {
        ElMessage.error({
          message: `预览图目录 ${previewPath} 不存在`,
          duration: 3000,
        });
      }
    }
    // 保存项目列表到本地
    const projectList = JSON.parse(await window.electronAPI.loadProjectList());
    const projectObj = {
      folderName: projectName.value,
      folderPath: projectPath,
      uploadedUrls: {},
    };
    const dirList = await window.electronAPI.listDirectories(projectPath);
    dirList.forEach((val) => {
      projectObj.uploadedUrls[val] = [];
    });
    projectList.push(projectObj);
    await window.electronAPI.saveProjectList(JSON.stringify(projectList));
    loading.value = false;
    dialogVisible.value = false;
    ElMessage.success({
      message: `项目初始化成功: ${projectPath}`,
      duration: 1500,
    });
  }
};
</script>

<style scoped>
.directory-item {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.initBtn {
  display: inline-block;
  padding: 10px 20px;
  margin-right: 10px;
  background-color: #409eff;
  color: white;
  font-size: 14px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s ease;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.4);
  user-select: none;
}
.initBtn:hover {
  background-color: #79bbff;
}
.path-selector {
  display: flex;
  gap: 8px;
}

:deep(.el-form-item__label) {
  font-weight: 500;
  color: #606266;
}

.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
