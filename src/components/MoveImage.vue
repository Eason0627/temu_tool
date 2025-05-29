<template>
  <div @click="openMoveDialog" class="initBtn">
    <div style="display: flex; justify-content: center; align-items: center">
      <el-icon :size="20"><DArrowRight /></el-icon><span>一键移图</span>
    </div>
  </div>
  <el-dialog
    v-model="dialogVisible"
    title="文件夹映射"
    @close="handleClose"
    style="max-width: 1200px; min-width: 960px"
  >
    <el-form
      label-width="150px"
      label-position="left"
      :model="form"
      style="
        width: 100%;
        padding: 50px;
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
                <el-tag closable="true" @close="handleCloseTag(item)">{{
                  item
                }}</el-tag>
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
        <template #label v-if="effectivePicture[item].length">
          <div class="label-container">
            <div class="sourceDir">
              <el-tag type="error">
                {{ sourceDirList[num] }}
              </el-tag>
              <span>文件夹</span>
            </div>

            <el-tooltip placement="top">
              <template #content v-if="effectivePicture[item].length">
                <div>{{ effectivePicture[item] }}</div>
              </template>
              <div>
                <el-tag type="success">{{
                  effectivePicture[item].length
                }}</el-tag>
                可用图片
              </div>
            </el-tooltip>
          </div>
        </template>
        <template #default v-if="effectivePicture[item].length">
          <el-row>
            <el-col :span="24">
              <el-table
                :span-method="objectSpanMethod"
                :data="selectedProjectList"
                style="max-width: 800px"
                border
              >
                <el-table-column label="项目名称">
                  <template #default="scope">
                    <div style="display: flex; align-items: center">
                      {{ scope.row.folderName }}
                    </div>
                  </template>
                </el-table-column>
                <el-table-column label="源图文件夹" width="200px">
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
                <el-table-column label="移动数量" width="200px">
                  <template #default="scope">
                    <template v-if="scope.row.listDir[num]">
                      <div
                        class="movePicture"
                        style="display: flex; justify-content: space-around"
                      >
                        <el-input
                          type="number"
                          min="0"
                          :max="effectivePicture[item].length"
                          v-model="scope.row.listDir[num].moveImageCount"
                          style="width: 80px"
                        ></el-input>
                        <el-button @click="applyToAll(num, scope.$index)"
                          >应用</el-button
                        >
                      </div>
                    </template>
                    <el-tag v-else type="danger">目录未配置</el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="映射文件夹" width="200px">
                  <template #default="scope">
                    <template v-if="scope.row.listDir[num]">
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
                    <el-tag v-else type="danger">目录未配置</el-tag>
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
      <el-button
        type="primary"
        :loading="isMoving"
        @click="executeImageTransfer"
        >确定</el-button
      >
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
const isMoving = ref(false); // 移动状态
// 文件夹相关
const sourceImagePath = ref(""); // 源图文件夹
const sourceDirList = ref<string[]>([]); // 源图文件夹列表
const effectivePicture = ref({});
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

  // 增加空值保护
  const rawData = await window.electronAPI.loadProjectList();
  projectList.value = JSON.parse(rawData || "[]").map((project) => ({
    folderName: project.folderName || "",
    folderPath: project.folderPath || "",
    uploadedUrls: project.uploadedUrls || {}, // 确保对象存在
    listDir: Object.keys(project.uploadedUrls || {}).map((key) => ({
      sourceDir: key,
      defaultDir: key,
      moveImageCount: 0,
    })),
  }));
  console.log("projectList", projectList.value);
};
// 选择文件夹
const selectPath = async () => {
  sourceImagePath.value = await window.electronAPI.selectDirectory();
  sourceDirList.value = (await window.electronAPI.listDirectories(
    sourceImagePath.value
  )) as string[];
  // 获取每个文件夹下的图片数量
  for (let i = 0; i < sourceDirList.value.length; i++) {
    effectivePicture.value[sourceDirList.value[i]] =
      await window.electronAPI.listFiles(
        sourceImagePath.value + "\\" + sourceDirList.value[i]
      );
  }
  console.log("effectivePicture", effectivePicture.value);
};
// 移除源图文件夹
const handleCloseTag = (tag: string) => {
  sourceDirList.value = sourceDirList.value.filter((item) => item !== tag);
};
//  选择项目
const handleProjectChange = async (value: string[]) => {
  // 匹配项目
  const matchProjects = projectList.value.filter((project) => {
    return value.includes(project.folderPath);
  });
  selectedProject.value = value;
  selectedProjectList.value = matchProjects;
  await nextTick();
};
// 移除项目
const handleRemoveProject = (removedPath: string) => {
  // 清除关联的表格数据
  selectedProjectList.value = selectedProjectList.value.filter(
    (proj) => !proj.folderPath.includes(removedPath)
  );

  // 使用filter保持响应式
  selectedProject.value = selectedProject.value.filter(
    (path) => path !== removedPath
  );
};
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

// 应用到所有移动输入框
const applyToAll = (num: number, $index: number) => {
  console.log(num, $index);

  const moveImageCount =
    selectedProjectList.value[num].listDir[$index].moveImageCount;
  console.log(moveImageCount);

  selectedProjectList.value.forEach((project) => {
    project.listDir.forEach((dir, index) => {
      // 检测对应的sourceDirPicture数量是否足够
      console.log(dir.sourceDir);
      if (!effectivePicture.value[dir.sourceDir])
        return ElMessage.error(
          `源文件夹不存在${dir.sourceDir} 目录, 请正确创建映射文件`
        );
      if (effectivePicture.value[dir.sourceDir].length < moveImageCount) {
        ElMessage.error(
          `目标文件夹 ${dir.sourceDir} 的图片数量最多可移动 ${
            effectivePicture.value[dir.sourceDir].length
          } 张`
        );
        dir.moveImageCount = effectivePicture.value[dir.sourceDir].length;
        return;
      } else {
        dir.moveImageCount = moveImageCount;
      }
    });
  });
};

// 移动图片
const executeImageTransfer = async () => {
  isMoving.value = true;
  let totalTransferred = 0;
  const errorLog: string[] = [];
  const transferDetails: string[] = []; // 记录详细转移日志

  try {
    // 1. 参数校验
    if (!sourceImagePath.value || !selectedProjectList.value.length) {
      throw new Error("请先选择源目录和目标项目");
    }

    // 2. 预检查 - 计算总需求量和可用量
    const totalRequiredBySource: Record<string, number> = {};
    const sourceDirectories = new Set<string>();

    // 2.1 统计每个源文件夹的总需求量
    selectedProjectList.value.forEach((project) => {
      project.listDir.forEach((dirConfig) => {
        if (dirConfig.moveImageCount > 0) {
          sourceDirectories.add(dirConfig.sourceDir);
          totalRequiredBySource[dirConfig.sourceDir] =
            (totalRequiredBySource[dirConfig.sourceDir] || 0) +
            Number(dirConfig.moveImageCount);
        }
      });
    });

    // 2.2 检查每个源文件夹的可用图片数量
    const sourcePools: Record<
      string,
      {
        files: string[];
        pointer: number;
        required: number;
      }
    > = {};

    await Promise.all(
      Array.from(sourceDirectories).map(async (sourceDir) => {
        const dirPath = `${sourceImagePath.value}\\${sourceDir}`;
        try {
          const files = await window.electronAPI.listFiles(dirPath);
          const validFiles = files.filter((f) => /\.(jpg|jpeg|png)$/i.test(f));

          sourcePools[sourceDir] = {
            files: validFiles,
            pointer: 0,
            required: totalRequiredBySource[sourceDir] || 0,
          };

          if (validFiles.length < sourcePools[sourceDir].required) {
            throw new Error(
              `源文件夹 "${sourceDir}" 只有 ${validFiles.length} 张图片，但需要 ${sourcePools[sourceDir].required} 张`
            );
          }
        } catch (err) {
          errorLog.push(`[预检查失败] ${sourceDir}: ${err.message}`);
          throw err;
        }
      })
    );

    // 如果有预检查错误，提前终止
    if (errorLog.length > 0) {
      throw new Error("预检查失败，请查看错误日志");
    }

    // 3. 执行图片转移
    const totalRequired = Object.values(totalRequiredBySource).reduce(
      (a, b) => a + b,
      0
    );
    transferDetails.push(`开始转移，总计需要移动 ${totalRequired} 张图片`);

    for (const project of selectedProjectList.value) {
      transferDetails.push(`\n处理项目: ${project.folderName}`);

      for (const dirConfig of project.listDir) {
        if (dirConfig.moveImageCount <= 0) continue;

        const { sourceDir, moveImageCount } = dirConfig;
        const targetDir = `${project.folderPath}\\${
          dirConfig.targetDir || sourceDir
        }`;
        const pool = sourcePools[sourceDir];

        // 确保目标目录存在
        try {
          await window.electronAPI.checkDirectoryExists(targetDir);
        } catch (err) {
          errorLog.push(`[目录创建失败] ${targetDir}: ${err.message}`);
          continue;
        }

        // 计算实际移动数量
        const remainingFiles = pool.files.length - pool.pointer;
        const actualMoveCount = Math.min(moveImageCount, remainingFiles);

        transferDetails.push(
          `  ${sourceDir} → ${targetDir}: 移动 ${actualMoveCount}/${moveImageCount} 张`
        );

        // 执行移动操作
        for (let i = 0; i < actualMoveCount; i++) {
          const filename = pool.files[pool.pointer + i];
          const sourceFile = `${sourceImagePath.value}\\${sourceDir}\\${filename}`;
          const targetFile = `${targetDir}\\${filename}`;

          try {
            await window.electronAPI.moveFile(sourceFile, targetFile);
            totalTransferred++;

            // 更新进度 (每10张更新一次或最后一次)
            if (
              totalTransferred % 10 === 0 ||
              totalTransferred === totalRequired
            ) {
              transferProgress.value = Math.floor(
                (totalTransferred / totalRequired) * 100
              );
            }
          } catch (moveErr) {
            errorLog.push(`[移动失败] ${filename}: ${moveErr.message}`);
          }
        }

        // 更新指针位置
        pool.pointer += actualMoveCount;
      }
    }

    // 4. 生成最终报告
    const successRate = ((totalTransferred / totalRequired) * 100).toFixed(2);
    transferDetails.push(
      `\n转移完成: ${totalTransferred}/${totalRequired} (${successRate}%)`
    );

    if (errorLog.length > 0) {
      transferDetails.push(`\n遇到 ${errorLog.length} 个错误:`);
      errorLog.forEach((err, index) => {
        transferDetails.push(`  ${index + 1}. ${err}`);
      });
    }

    // 5. 保存详细日志到文件
    try {
      const logContent = transferDetails.join("\n");
      const logPath = await window.electronAPI.saveTransferLog(
        logContent,
        `transfer_log_${new Date().toISOString().replace(/[:.]/g, "-")}.txt`
      );
      transferDetails.push(`\n详细日志已保存到: ${logPath}`);
    } catch (logErr) {
      console.error("保存日志失败:", logErr);
    }

    // 6. 显示最终结果
    if (errorLog.length === 0) {
      ElMessage.success(`成功转移 ${totalTransferred} 张图片`);
    } else {
      ElMessage.warning(
        `完成转移 ${totalTransferred} 张，失败 ${errorLog.length} 项`
      );
    }

    console.log(transferDetails.join("\n"));
  } catch (err) {
    ElMessage.error(`图片转移失败: ${err.message}`);
    console.error("转移错误详情:", errorLog);
  } finally {
    isMoving.value = false;
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
  selectedProjectList.value = [];
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
.label-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin-bottom: 5px;
}
</style>
