<template>
  <div class="prepare">
    <div class="prepare-container">
      <div class="initHeader">
        <div
          style="display: flex; justify-content: center; align-items: center"
        >
          <h2>📁 项目结构初始化</h2>
          <el-button type="success" @click="allUp" style="margin-left: 20px"
            >批量上传</el-button
          >
        </div>

        <div class="btn">
          <InitProjectDirctory @project-created="handleProjectCreated" />
          <MoveImage />
        </div>
      </div>
      <div class="projectList">
        <el-card>
          <div
            class="title"
            style="font-size: 24px; font-weight: bold; margin-bottom: 20px"
          >
            上传完成的项目
          </div>
          <div class="completeProject">
            <!-- 上传完成的项目 -->
            <el-row
              style="
                display: grid;
                grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
                gap: 20px;
              "
            >
              <el-row
                style="width: 100%"
                v-for="(project, index) in projectList"
                :key="index"
              >
                <el-card
                  class="project-info"
                  style="width: 100%"
                  shadow="hover"
                  v-if="
                    project.files &&
                    project.urls &&
                    project.files == project.urls.length
                  "
                >
                  <template #header>
                    <div class="project-name">{{ project.folderName }}</div>
                  </template>
                  <template #default>
                    <div
                      class="elBody"
                      style="
                        display: flex;
                        justify-content: center;
                        width: 100%;
                        height: 100%;
                      "
                    >
                      <div class="picture" style="width: 100px; height: 100px">
                        <el-image
                          :src="project.urls[project.urls.length - 1].url"
                          :preview-src-list="
                            project.urls.map((item) => item.url)
                          "
                          :initial-index="0"
                          show-progress
                          hide-on-click-modal
                          style="width: 100%"
                        />
                      </div>
                    </div>
                  </template>
                  <template #footer>
                    <div class="project-result">
                      上传完成：<el-tag type="success">
                        {{ project.files }}/{{ project.urls.length }}</el-tag
                      >
                    </div>
                  </template>
                </el-card>
              </el-row>
            </el-row>
          </div>
        </el-card>
        <div class="item" v-for="(project, index) in projectList" :key="index">
          <Upload
            :projectPath="project.folderPath"
            :timestamp-dir="timeStr"
            v-if="
              !(
                project.files &&
                project.urls &&
                project.files == project.urls.length
              )
            "
            @upload-complete="handleUploadComplete"
            @upload:list="handleUploadList"
            :ref="uploadRef"
          />
        </div>
      </div>
      <div class="empty" v-if="!projectList.length">
        <el-empty description="暂无数据"></el-empty>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import InitProjectDirctory from "../components/InitProjectDirctory.vue";
import MoveImage from "../components/MoveImage.vue";
import Upload from "../components/Upload.vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { nextTick } from "vue";
const projectList = ref<
  {
    folderName: string;
    timestampDir: string;
    folderPath: string;
    uploadedUrls: { [key: string]: [{ name: string; url: string }] };
    isValid: boolean;
    files?: number;
    urls?: {
      folder: string;
      fileName: string;
      url: string;
    }[];
  }[]
>([]);
const timeStr = ref("");
// 上传结果
const uploadResult = ref(null);
// 上传组件实例
// 存储所有上传组件的引用
const uploaderRefs = ref<InstanceType<typeof Upload>[]>([]);

// 设置ref的函数
const uploadRef = (el: any) => {
  if (el) {
    uploaderRefs.value.push(el);
  }
};
// 获取时间戳目录
const getTimestampDir = async () => {
  const response = await fetch("http://121.41.45.224:3100/get-token");
  const { timestampDir } = await response.json();
  timeStr.value = timestampDir;
  console.log("时间戳目录获取成功：", timestampDir);
};
const handleProjectCreated = async (project) => {
  // 重载项目数据
  // 1. 添加到项目列表
  projectList.value.push(project);
  // 2. 保存项目列表
  await window.electronAPI.saveProjectList(JSON.stringify(projectList.value));
  console.log("项目信息已保存");
};
// 批量上传完成
const handleUploadList = async (urlList, files) => {
  console.log("收到子组件上传列表数据:", urlList);
  for (const key in urlList) {
    const grouped: Record<string, Array<{ name: string; url: string }>> = {};
    urlList[key].forEach((item: any) => {
      if (!item || !item.folder) return;
      grouped[item.folder] = grouped[item.folder] || [];
      grouped[item.folder].push({
        name: item.fileName || item.file?.name || "",
        url: item.url || item.qiniuUrl || "",
      });
    });
    projectList.value.forEach((project: any) => {
      if (project.folderName === key) {
        project.uploadedUrls = grouped;
        project.urls = urlList[key];
        project.files = files[key];
      }
    });
  }
  console.log(projectList.value);

  await window.electronAPI.saveProjectList(JSON.stringify(projectList.value));
  console.log("项目信息已更新并保存");
  await nextTick();
};
// 处理上传完成事件
const handleUploadComplete = (projectData: any) => {
  console.log("收到子组件上传完成数据:", projectData);
  uploadResult.value = projectData;
  // 更新项目信息
  updateProjectInfo(projectData);
};
// 更新项目信息
const updateProjectInfo = async (projectData: any) => {
  const projectIndex = projectList.value.findIndex(
    (project) => project.folderPath === projectData.folderPath
  );
  // 深层拷贝数据
  const updatedProject = JSON.parse(JSON.stringify(projectData));
  // 更新项目信息
  projectList.value[projectIndex] = updatedProject;
  // 保存项目列表
  await window.electronAPI.saveProjectList(JSON.stringify(projectList.value));
  console.log("项目信息已更新并保存");
};
// 批量上传
const allUp = async () => {
  if (!uploaderRefs.value.length) return;

  try {
    await ElMessageBox.confirm("确认批量上传吗？", "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    });

    console.log("开始批量上传");

    // 并行上传所有组件
    await Promise.all(
      uploaderRefs.value.map((uploader) => uploader.uploadImages())
    );

    console.log("所有上传完成");
  } catch (error) {
    console.error("上传取消或出错:", error);
  }
};
onMounted(async () => {
  try {
    // 先加载项目列表
    const data = await window.electronAPI.loadProjectList();
    projectList.value = JSON.parse(data);
    console.log("加载项目列表成功：", projectList.value);

    // 然后获取时间戳
    await getTimestampDir();

    // 确保时间戳获取完成后再渲染子组件
    await nextTick();
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

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.prepare-container {
  position: relative;
  max-width: 1200px;
  margin: 0 auto;
  .initHeader {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid #e5e5e5;
    background: #fff;
    border-radius: 10px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  }
  .projectList {
    min-height: 200px;
    margin-top: 20px;
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
}
</style>
