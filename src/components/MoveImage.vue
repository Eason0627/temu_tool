<template>
  <div @click="openMoveDialog" class="initBtn">
    <div style="display: flex; justify-content: center; align-items: center">
      <el-icon :size="20"><DArrowRight /></el-icon><span>一键移图</span>
    </div>
  </div>
  <el-dialog
    v-model="dialogVisible"
    title="文件夹映射"
    width="80vw"
    @close="handleClose"
  >
    <el-form
      label-width="150px"
      label-position="left"
      :model="form"
      style="
        width: 100%;
        padding: 20px;
        padding-left: 100px;
        box-sizing: border-box;
      "
    >
      <!-- 源图路径 -->
      <el-form-item label="源图文件夹：" required>
        <el-row>
          <el-col :span="8">
            <el-input
              v-model="sourceImagePath"
              placeholder="请选择项目路径"
              readonly
            />
          </el-col>
          <el-col :span="3" style="margin-left: 10px">
            <el-button @click="selectPath">浏览</el-button>
          </el-col>
        </el-row>
      </el-form-item>
      <!-- 源图子文件夹 -->
      <el-form-item label="源图子文件夹：" required>
        <el-row v-if="sourceDirList.length">
          <el-col :span="24">
            <div
              class="dirList"
              style="display: flex; align-items: center; flex-wrap: wrap"
            >
              <div
                class="listItem"
                style="height: 40px; margin-right: 5px"
                v-for="item in sourceDirList"
                :key="item"
              >
                <el-tag>{{ item }}</el-tag>
              </div>
            </div>
          </el-col>
        </el-row>
        <el-row v-else>
          <el-empty
            image-size="64"
            style="display: flex; flex-direction: row; padding: 0"
          ></el-empty>
        </el-row>
      </el-form-item>
      <!-- 目标图路径 -->
      <el-form-item label="分配项目" required>
        <el-row>
          <el-col :span="10">
            <el-select
              v-model="selectedProject"
              placeholder="请选择分配项目"
              @change="handleProjectChange"
              @remove-tag="handleRemoveProject"
              multiple
            >
              <el-option
                :value="item.folderPath"
                :label="item.folderName"
                v-for="(item, index) in projectList"
              ></el-option>
            </el-select>
          </el-col>
        </el-row>
      </el-form-item>
      <!-- 映射关系 -->
      <el-form-item
        v-if="selectedProjectList.length"
        required
        v-for="(item, num) in sourceDirList"
      >
        <template #label>
          <div class="label-container">
            <el-tag>
              {{ sourceDirList[num] }}
            </el-tag>
            <span>文件夹映射关系</span>
          </div>
        </template>
        <template #default>
          <el-row>
            <el-col :span="24">
              <el-table
                :span-method="objectSpanMethod"
                :data="selectedProjectList"
                border
                style="width: 80%"
              >
                <el-table-column label="项目名称">
                  <template #default="scope">
                    <div style="display: flex; align-items: center">
                      {{ scope.row.folderName }}
                    </div>
                  </template>
                </el-table-column>
                <el-table-column label="源图文件夹" width="300px">
                  <template #default="scope">
                    <div style="display: flex; align-items: center">
                      <el-select v-model="sourceDirList[num]" disabled>
                        <el-option
                          v-for="(dir, index) in sourceDirList"
                          v-bind:key="index"
                          :label="dir"
                          :value="dir"
                        ></el-option>
                      </el-select>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column label="移动图片数量" width="150px">
                  <template #default="scope">
                    <el-input
                      type="number"
                      v-model="scope.row.listDir[num].moveImageCount"
                    >
                    </el-input>
                  </template>
                </el-table-column>
                <el-table-column label="各项目映射文件夹" width="300px">
                  <template #default="scope">
                    <div style="display: flex; align-items: center">
                      <el-select v-model="scope.row.listDir[num].sourceDir">
                        <el-option
                          v-for="(dir, index) in scope.row.listDir"
                          v-bind:key="index"
                          :label="dir.defaultDir"
                          :value="dir.defaultDir"
                        ></el-option>
                      </el-select>
                    </div>
                  </template>
                </el-table-column>
              </el-table>
            </el-col>
          </el-row>
        </template>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="executeImageTransfer">确定</el-button>
    </template>
  </el-dialog>
</template>
<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from "vue";
import { DArrowRight } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
interface ProjectItem {
  folderName: string;
  folderPath: string;
  listDir: { sourceDir: string; defaultDir: string; moveImageCount: number }[];
  uploadedUrls: {
    [key: string]: string[];
  };
}

// 对话框相关
const dialogVisible = ref(false);

// 文件夹相关
const sourceImagePath = ref(""); // 源图文件夹
const sourceDirList = ref<string[]>([]); // 源图文件夹列表
const selectedProject = ref<string[]>([]); // 目标文件夹列表
const selectedProjectList = ref<ProjectItem[]>([]); // 目标文件夹列表
// 当前系统初始化项目
const projectList = ref<ProjectItem[]>([]); // 项目列表
// 进度反馈
const transferProgress = reactive({
  total: 0,
  current: 0,
  visible: false,
});
// 打开对话框
const openMoveDialog = async () => {
  dialogVisible.value = true;
  // 获取当前系统初始化项目
  projectList.value = JSON.parse(await window.electronAPI.loadProjectList());
  projectList.value.forEach((project) => {
    const listDir: {
      sourceDir: string;
      defaultDir: string;
      moveImageCount: number;
    }[] = [];
    for (const key in project.uploadedUrls) {
      listDir.push({
        sourceDir: key,
        defaultDir: key,
        moveImageCount: 0,
      });
    }
    project.listDir = listDir;
  });
  console.log(projectList.value);
};
// 选择文件夹
const selectPath = async () => {
  sourceImagePath.value = await window.electronAPI.selectDirectory();
  sourceDirList.value = (await window.electronAPI.listDirectories(
    sourceImagePath.value
  )) as string[];
};
//  选择项目
const handleProjectChange = (value: string[]) => {
  // 匹配项目
  const matchProjects = projectList.value.filter((project) => {
    return value.includes(project.folderPath);
  });
  selectedProject.value = value;
  selectedProjectList.value = matchProjects;
};
// 移除项目
const handleRemoveProject = (value: string) => {
  selectedProject.value = selectedProject.value.filter(
    (project) => project !== value
  );
  selectedProjectList.value = selectedProjectList.value.filter(
    (project) => project.folderPath !== value
  );
}
// 表格合并方法
const objectSpanMethod = ({ row, column, rowIndex, columnIndex }) => {
  if (columnIndex === 1) {
    if (rowIndex === 0) {
      return {
        rowspan: projectList.value.length,
        colspan: 1,
      };
    } else {
      return {
        rowspan: 0,
        colspan: 0,
      };
    }
  }
};

// 在setup部分新增方法
const executeImageTransfer = async () => {
  try {
    if (!sourceImagePath.value || !selectedProjectList.value.length) {
      ElMessage.error("请先选择源目录和目标项目");
      return;
    }

    let totalTransferred = 0;
    const errorLog: string[] = [];

    // 遍历每个目标项目
    for (const project of selectedProjectList.value) {
      // 遍历项目的目录映射配置
      for (const dirConfig of project.listDir) {
        if (dirConfig.moveImageCount <= 0) continue;

        // 构建源路径（不使用path模块）
        const sourceDir = `${sourceImagePath.value}/${dirConfig.sourceDir}`;
        const targetDir = `${project.folderPath}/${dirConfig.sourceDir}`;

        try {
          // 获取文件列表
          const files = await window.electronAPI.listFiles(sourceDir);
          const validFiles = files
            .filter(
              (f) =>
                f.toLowerCase().endsWith(".jpg") ||
                f.toLowerCase().endsWith(".png")
            )
            .slice(0, dirConfig.moveImageCount);

          // 执行文件转移
          await Promise.all(
            validFiles.map(async (filename, index) => {
              const sourceFile = `${sourceDir}/${filename}`;
              const targetFile = `${targetDir}/${filename}`;

              try {
                await window.electronAPI.moveFile(sourceFile, targetFile);
                totalTransferred++;
                transferProgress.value = totalTransferred;
              } catch (moveErr) {
                errorLog.push(`移动失败: ${filename} (${moveErr.message})`);
              }
            })
          );
        } catch (listErr) {
          errorLog.push(`目录访问失败: ${sourceDir} (${listErr.message})`);
        }
      }
    }

    // 结果反馈
    if (errorLog.length === 0) {
      ElMessage.success(`成功转移 ${totalTransferred} 张图片`);
      handleClose();
    } else {
      ElMessage.error(
        `完成转移 ${totalTransferred} 张，失败 ${errorLog.length} 项`
      );
      console.error("错误详情:", errorLog);
    }
  } catch (err) {
    ElMessage.error(`全局错误: ${err.message}`);
  }
};

// 对话框关闭回调
const handleClose = () => {
  dialogVisible.value = false;
  // 重置组件状态
  resetComponent();
};

const resetComponent = () => {
  sourceImagePath.value = "";
  sourceDirList.value = [];
  selectedProject.value = [];
  projectList.value = [];
};
</script>
<style lang="scss" scoped>
.initBtn {
  display: inline-block;
  height: 40px;
  padding: 8px 20px;
  margin-right: 10px;
  background-color: #fff;
  color: #333;
  border: 2px solid transparent;
  font-size: 14px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.4);
  box-sizing: border-box;
  user-select: none;
}
.initBtn:hover {
  color: #409eff;
  border: 2px solid #409eff;
}
.el-row {
  width: 100%;
}
</style>
