<template>
  <div class="product-attr-page">
    <div class="scroll-content">
      <el-card class="form-card">
        <el-form class="grouped-form" label-position="left">
          <template
            v-for="(specForm, index) in specFormList"
            :key="specForm.规格名"
          >
            <el-row>
              <el-col :span="24">
                <el-divider content-position="left"
                  >规格名：{{ specForm.规格名 }}</el-divider
                >
                <el-row :gutter="20">
                  <el-col :span="8">
                    <el-form-item
                      label="变种属性名称一"
                      style="margin-right: 20px"
                    >
                      <el-input v-model="specForm.变种属性名称一" />
                    </el-form-item>
                  </el-col>
                  <el-col
                    :span="8"
                    style="
                      display: flex;
                      justify-content: end;
                      margin-left: auto;
                    "
                  >
                    <el-button type="primary" @click="applyToAll($event, index)"
                      >应用到全部</el-button
                    >
                  </el-col>
                </el-row>
                <el-row>
                  <el-col :span="24" style="display: flex">
                    <el-form-item
                      label="长(cm):"
                      style="margin-right: 10px; margin-bottom: 0"
                    >
                      <el-input
                        type="number"
                        v-model="specForm.长"
                        :min="0"
                        style="width: 80px"
                      ></el-input>
                    </el-form-item>
                    <el-form-item
                      label="宽(cm):"
                      style="margin-right: 10px; margin-bottom: 0"
                    >
                      <el-input
                        type="number"
                        v-model="specForm.宽"
                        :min="0"
                        style="width: 80px"
                      ></el-input>
                    </el-form-item>
                    <el-form-item
                      label="高(cm):"
                      style="margin-right: 10px; margin-bottom: 0"
                    >
                      <el-input
                        type="number"
                        v-model="specForm.高"
                        :min="0"
                        style="width: 80px"
                      ></el-input>
                    </el-form-item>
                    <el-form-item
                      label="重量(g):"
                      style="margin-right: 10px; margin-bottom: 0"
                    >
                      <el-input
                        type="number"
                        v-model="specForm.重量"
                        :min="0"
                        style="width: 80px"
                      ></el-input>
                    </el-form-item>
                    <el-form-item
                      label="申报价格(￥人民币)"
                      style="margin-right: 10px; margin-bottom: 0"
                    >
                      <el-input
                        type="number"
                        v-model="specForm.申报价格"
                        :min="0"
                        style="width: 80px"
                      ></el-input>
                    </el-form-item>
                    <el-form-item
                      label="建议零售价($美元)"
                      style="margin-right: 10px; margin-bottom: 0"
                    >
                      <el-input
                        type="number"
                        v-model="specForm.建议零售价"
                        :min="0"
                        style="width: 80px"
                      ></el-input>
                    </el-form-item>
                  </el-col>
                </el-row>
              </el-col>
            </el-row>
          </template>

          <el-divider content-position="left">包装信息</el-divider>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="外包装形状">
                <el-input v-model="formData.外包装形状" size="small" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="外包装类型">
                <el-input v-model="formData.外包装类型" size="small" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-divider content-position="left">SKU 信息</el-divider>
          <el-row :gutter="24">
            <el-col :span="6">
              <el-form-item label="产地">
                <el-input v-model="formData.产地" size="small" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="SKU分类">
                <el-input v-model="formData.SKU分类" size="small" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="SKU数量">
                <el-input-number
                  v-model="formData.SKU分类数量"
                  :min="1"
                  size="small"
                />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="SKU单位">
                <el-input v-model="formData.SKU分类单位" size="small" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-divider content-position="left">视频上传</el-divider>
          <el-row>
            <el-col :span="24">
              <el-form-item label="视频Url">
                <el-alert
                  type="warning"
                  title="视频要求"
                  :closable="false"
                  description="视频时长不超过60秒。请先选择项目后再上传视频。"
                  show-icon
                  style="margin-bottom: 15px"
                />
                <el-upload
                  class="upload-demo"
                  action="http://121.41.45.224:3100/upload-video"
                  :headers="uploadHeaders"
                  :data="uploadData"
                  :on-progress="handleVideoUploadProgress"
                  :on-success="handleVideoUploadSuccess"
                  :on-error="handleVideoUploadError"
                  :before-upload="beforeVideoUpload"
                  :show-file-list="false"
                  accept="video/*"
                  :disabled="!hasSelectedProject"
                >
                  <el-button
                    type="primary"
                    :loading="uploading"
                    :disabled="!hasSelectedProject"
                  >
                    {{
                      uploading
                        ? "上传中..."
                        : hasSelectedProject
                        ? "上传视频"
                        : "请先选择项目"
                    }}
                  </el-button>
                  <el-progress
                    v-if="uploading"
                    :percentage="uploadProgress"
                    style="margin-top: 10px"
                  />
                </el-upload>
                <div v-if="!hasSelectedProject" class="warning-text">
                  请先选择项目后再上传视频
                </div>
                <div v-if="currentVideoUrl" class="video-preview">
                  <span class="video-url">{{ currentVideoUrl }}</span>
                  <el-button
                    type="text"
                    @click="previewVideo"
                    icon="VideoPlay"
                    style="margin-left: 10px"
                  >
                    预览
                  </el-button>
                  <el-button
                    type="text"
                    @click="removeVideo"
                    icon="Delete"
                    style="margin-left: 10px; color: #f56c6c"
                  >
                    删除
                  </el-button>
                </div>
              </el-form-item>
            </el-col>
          </el-row>

          <el-divider content-position="left">导出配置</el-divider>
          <el-row>
            <el-col :span="8">
              <el-form-item label="选择项目">
                <el-select
                  v-model="selectedProject"
                  @change="handleProjectChange"
                  placeholder="请选择"
                  style="width: 100%"
                >
                  <el-option
                    v-for="project in projectList"
                    :key="project.folderName"
                    :label="project.folderName"
                    :value="project.folderName"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="16">
              <el-button
                type="success"
                @click="exportFormDataTemplate"
                style="float: right"
                >导出固定数据模板</el-button
              >
            </el-col>
          </el-row>
        </el-form>
      </el-card>
    </div>
  </div>
  <!-- 添加视频预览对话框 -->
  <el-dialog
    v-model="videoDialogVisible"
    title="视频预览"
    width="500px"
    height="500px"
    draggable
    destroy-on-close
  >
    <div
      class="preBox"
      style="
        display: flex;
        justify-content: center;
        align-items: center;
        margin: 10px;
      "
    >
      <video
        v-if="currentVideoUrl"
        controls
        style="width: 100%; height: 100%"
        :src="currentVideoUrl"
      ></video>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch, computed } from "vue";
import * as XLSX from "xlsx";
import { ElMessage, ElMessageBox } from "element-plus";

interface Project {
  folderName: string;
  folderPath: string;
}

const projectList = ref<Project[]>([]);
const selectedProject = ref<string>("");
const specList = ref<string[]>([]);
const specFormList = ref<any[]>([]);
const fixedDataList = ref<Record<string, any>[]>([]);

// 视频上传相关
const uploading = ref(false);
const uploadProgress = ref(0);
const videoDialogVisible = ref(false);
const videoInfo = reactive({
  url: "",
  key: "",
});

// 计算当前显示的视频URL
const currentVideoUrl = computed(() => {
  // 首先从规格中获取
  if (specFormList.value.length > 0 && specFormList.value[0].视频Url) {
    return specFormList.value[0].视频Url;
  }
  // 然后从全局表单获取
  return formData.视频Url || videoInfo.url;
});

const formData = reactive({
  外包装形状: "不规则",
  外包装类型: "软包装+硬物",
  产地: "中国-浙江省",
  SKU分类: "单品",
  SKU分类数量: 1,
  SKU分类单位: "件",
  视频Url: "",
});
const applyToAll = ($event, index) => {
  // 使用触发函数的行作为模板
  const template = specFormList.value[index];

  // 确保模板存在
  if (!template) {
    ElMessage.error("找不到源数据行");
    return;
  }

  // 应用到除了当前行以外的所有行
  specFormList.value.forEach((spec, i) => {
    if (i !== index) {
      // 跳过当前行自身
      for (let key in template) {
        // 排除"规格名"和"变种属性名称"两个字段
        if (key !== "规格名" && key !== "变种属性名称一") {
          spec[key] = template[key];
        }
      }
    }
  });

  ElMessage.success(`已将第 ${index + 1} 行数据应用到其他所有行`);
};

// 上传请求头和数据
const uploadHeaders = reactive({
  // 如果需要认证，可以在这里添加
});

const uploadData = computed(() => {
  return {
    projectName: selectedProject.value || "default",
    specName:
      specFormList.value.length > 0 ? specFormList.value[0].规格名 : "默认规格",
  };
});
const hasSelectedProject = computed(() => {
  return !!selectedProject.value;
});
// 视频上传前验证 - 检查是否选择项目、格式、大小、比例和时长
const beforeVideoUpload = (file: File) => {
  console.log(file.size);

  // 首先检查是否选择了项目
  if (!hasSelectedProject.value) {
    ElMessage.error("请先选择项目后再上传视频!");
    return false;
  }

  const isVideo = file.type.startsWith("video/");
  const isLt100M = file.size / 1024 / 1024 < 100;

  if (!isVideo) {
    ElMessage.error("只能上传视频文件!");
    return false;
  }
  if (!isLt100M) {
    ElMessage.error("视频大小不能超过 100MB!");
    return false;
  }

  // 创建一个Promise来检查视频比例和时长
  return new Promise<boolean>((resolve) => {
    // 创建一个视频元素来获取视频的元数据
    const video = document.createElement("video");
    video.preload = "metadata";

    // 创建一个临时的URL
    const url = URL.createObjectURL(file);
    video.src = url;

    // 设置加载超时
    const timeout = setTimeout(() => {
      URL.revokeObjectURL(url);
      ElMessage.error("视频元数据加载超时，请检查视频格式");
      resolve(false);
    }, 10000); // 10秒超时

    // 当元数据加载完成时
    video.onloadedmetadata = () => {
      clearTimeout(timeout);
      // 释放URL
      URL.revokeObjectURL(url);

      // 检查视频长宽比
      // const aspectRatio = video.videoWidth / video.videoHeight;
      // const isSquare = Math.abs(aspectRatio - 1) <= 0.01; // 允许0.01的误差

      // 检查视频时长(秒)
      const duration = video.duration;
      const isValidDuration = duration <= 60;

      // if (!isSquare) {
      //   ElMessage.error("视频比例必须为1:1（正方形）!");
      //   resolve(false);
      //   return;
      // }

      if (!isValidDuration) {
        ElMessage.error(
          `视频时长不能超过60秒！当前时长: ${Math.round(duration)}秒`
        );
        resolve(false);
        return;
      }

      uploading.value = true;
      uploadProgress.value = 0;
      resolve(true);
    };

    // 错误处理
    video.onerror = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      ElMessage.error("无法读取视频信息，请确保视频格式正确");
      resolve(false);
    };
  });
};

// 处理上传进度
const handleVideoUploadProgress = (event: any) => {
  uploadProgress.value = Math.round(event.percent);
};

// 处理上传成功
const handleVideoUploadSuccess = (response: any) => {
  uploading.value = false;
  uploadProgress.value = 100;

  if (response && response.success && response.url) {
    // 保存视频信息
    videoInfo.url = response.url;
    videoInfo.key = response.key || "";

    // 更新所有规格的视频URL
    specFormList.value.forEach((spec) => {
      spec.视频Url = response.url;
      spec.视频Key = response.key || ""; // 保存key用于删除
    });

    // 更新全局表单
    formData.视频Url = response.url;

    ElMessage.success("视频上传成功");
  } else if (response && response.url) {
    // 兼容旧的API格式
    videoInfo.url = response.url;

    // 更新所有规格的视频URL
    specFormList.value.forEach((spec) => {
      spec.视频Url = response.url;
    });

    // 更新全局表单
    formData.视频Url = response.url;

    ElMessage.success("视频上传成功");
  } else {
    ElMessage.error("视频上传失败: " + (response?.message || "未知错误"));
  }
};

// 处理上传错误 - 增强错误处理
const handleVideoUploadError = (err: any) => {
  uploading.value = false;
  uploadProgress.value = 0;

  console.error("视频上传错误:", err);

  if (err.status === 413) {
    ElMessage.error("视频文件过大，超出服务器限制");
    return;
  }

  if (err.message && err.message.includes("Network Error")) {
    ElMessage.error("网络错误：无法连接到上传服务器，请确保服务器已启动");
    return;
  }

  if (
    err.code === "ERR_CONNECTION_REFUSED" ||
    (err.message && err.message.includes("Connection refused"))
  ) {
    ElMessage.error("连接被拒绝：上传服务器未启动或不可用");
    return;
  }

  let errorMessage = "上传失败";

  try {
    if (err.message) {
      errorMessage = err.message;
    } else if (typeof err === "string") {
      errorMessage = err;
    } else if (err.response && err.response.data) {
      const responseData = err.response.data;
      errorMessage = responseData.message || JSON.stringify(responseData);
    }
  } catch (e) {
    console.error("解析错误信息失败:", e);
  }

  ElMessage.error(`视频上传失败: ${errorMessage}`);
};

// 预览视频
const previewVideo = () => {
  if (currentVideoUrl.value) {
    console.log("原始视频URL:", currentVideoUrl.value);
    console.log("解码后URL:", decodeURIComponent(currentVideoUrl.value));
    videoDialogVisible.value = true;
  } else {
    ElMessage.warning("没有可预览的视频");
  }
};

// 删除视频
const removeVideo = () => {
  if (!currentVideoUrl.value) {
    ElMessage.warning("没有可删除的视频");
    return;
  }

  ElMessageBox.confirm("确定要删除此视频吗?", "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  })
    .then(async () => {
      // 如果有视频key，尝试从服务器删除
      if (videoInfo.key) {
        try {
          const response = await fetch(
            "http://121.41.45.224:3100/delete-video",
            {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ key: videoInfo.key }),
            }
          );

          const result = await response.json();

          if (!result.success) {
            console.warn("服务器删除视频失败:", result.message);
            // 继续执行本地删除，即使服务器删除失败
          }
        } catch (error) {
          console.error("删除视频请求错误:", error);
          // 即使请求失败，也继续执行本地删除
        }
      }

      // 清除视频信息
      videoInfo.url = "";
      videoInfo.key = "";

      // 清除所有规格的视频URL
      specFormList.value.forEach((spec) => {
        spec.视频Url = "";
        spec.视频Key = "";
      });

      // 清除全局表单视频URL
      formData.视频Url = "";

      ElMessage.success("视频已删除");
    })
    .catch(() => {
      // 取消删除操作
    });
};

onMounted(async () => {
  try {
    const data = await window.electronAPI.loadProjectList();
    projectList.value = JSON.parse(data);
  } catch (err) {
    ElMessage.error("加载项目失败");
  }
});

const readFixedData = async (folderPath: string) => {
  const path = `${folderPath}/固定数据.xlsx`;
  try {
    const buffer = await window.electronAPI.readFile(path);
    const uint8 = new Uint8Array(buffer);
    const workbook = XLSX.read(uint8, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    fixedDataList.value = data as Record<string, any>[];
  } catch (err) {
    fixedDataList.value = [];
    console.warn("未找到固定数据.xlsx 或读取失败");
  }
};

watch(selectedProject, async (val) => {
  const project = projectList.value.find((p) => p.folderName === val);
  if (!project) return;

  const folders: string[] = await window.electronAPI.readDirectoryNames(
    project.folderPath
  );
  const specs = folders
    .filter((name) => /^预览图\d+\[.*\]$/.test(name)) // 修改正则表达式以匹配新的格式
    .map((name) => {
      const match = name.match(/^预览图\d+\[(.*?)\]$/); // 提取方括号中的内容
      return match ? match[1] : null;
    })
    .filter(Boolean);

  specList.value = Array.from(new Set(specs)) as string[];
  if (specList.value.length === 0) {
    specList.value = ["默认规格"];
  }

  await readFixedData(project.folderPath);
  specFormList.value = specList.value.map((spec) => {
    const old = specFormList.value.find((s) => s.规格名 === spec); // 保留旧数据
    const match = fixedDataList.value.find((row) => row["规格名"] === spec);

    return {
      规格名: spec,
      变种属性名称一: old?.变种属性名称一
        ? old?.变种属性名称一
        : match?.["变种属性名称一"],
      申报价格: old?.申报价格 ? old?.申报价格 : Number(match?.["申报价格"]),
      长: old?.长 ? old?.长 : Number(match?.["长"]),
      宽: old?.宽 ? old?.宽 : Number(match?.["宽"]),
      高: old?.高 ? old?.高 : Number(match?.["高"]),
      重量: old?.重量 ? old?.重量 : Number(match?.["重量"]),
      建议零售价: old?.建议零售价
        ? old?.建议零售价
        : Number(match?.["建议零售价(建议零售价币种)"]),
      视频Url: old?.视频Url ? old?.视频Url : match?.["视频Url"],
    };
  });

  // 更新视频信息
  if (specFormList.value.length > 0 && specFormList.value[0].视频Url) {
    videoInfo.url = specFormList.value[0].视频Url;
    videoInfo.key = specFormList.value[0].视频Key || "";
  } else {
    videoInfo.url = "";
    videoInfo.key = "";
  }
});
const handleProjectChange = () => {
  if (!selectedProject.value) return;

  const project = projectList.value.find(
    (p) => p.folderName === selectedProject.value
  );
  if (project) {
    // 更新规格名和变种属性名称一
    specFormList.value.forEach((specForm) => {
      specForm.变种属性名称一 = specForm.规格名;
      console.log(
        `规格 "${specForm.规格名}" 的变种属性名称一已更新为: ${specForm.变种属性名称一}`
      );
    });
  }
};
const exportFormDataTemplate = async () => {
  try {
    const project = projectList.value.find(
      (p) => p.folderName === selectedProject.value
    );
    if (!project) return ElMessage.warning("请先选择项目");
    // 特别处理合并数据，确保不会覆盖重要字段
    const mergedData = specFormList.value.map((item) => {
      // 创建一个新对象，先复制formData，再用item的值覆盖
      const result = { ...formData };

      // 保留规格表单中的关键字段，不被formData覆盖
      const keysToPreserve = [
        "规格名",
        "变种属性名称一",
        "申报价格",
        "长",
        "宽",
        "高",
        "重量",
        "建议零售价",
        "视频Url",
        "视频Key",
      ];

      // 复制item中的字段到结果对象
      for (const key of keysToPreserve) {
        if (item[key] !== undefined && item[key] !== null) {
          result[key] = item[key];
        }
      }

      // 特别处理视频URL - 确保它有值
      if (!result.视频Url && currentVideoUrl.value) {
        result.视频Url = currentVideoUrl.value;
      }

      return result;
    });

    console.log("合并数据:", mergedData);

    // 校验空值或为0的数据
    for (let i = 0; i < mergedData.length; i++) {
      const item = mergedData[i];
      for (const [key, value] of Object.entries(item)) {
        if (
          value === null ||
          value === undefined ||
          value === "" ||
          (typeof value === "number" && value === 0)
        ) {
          ElMessage.error(`第 ${i + 1} 行的 "${key}" 字段为空或为0`);
          return; // 终止导出操作
        }
      }
    }
    // 建议零售价 -> 建议零售价(建议零售价币种)
    mergedData.forEach((item) => {
      item["建议零售价(建议零售价币种)"] = item["建议零售价"];
      delete item["建议零售价"];
    });

    const headers = [
      "规格名",
      "变种属性名称一",
      "申报价格",
      "长",
      "宽",
      "高",
      "重量",
      "识别码类型",
      "识别码",
      "站外产品链接",
      "建议零售价(建议零售价币种)",
      "外包装形状",
      "外包装类型",
      "产地",
      "SKU分类",
      "SKU分类数量",
      "SKU分类单位",
      "视频Url",
    ];
    const sheetData = [
      headers,
      ...mergedData.map((row) => headers.map((key) => row[key])),
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "模板");

    // 转为 Blob 再读为 ArrayBuffer（关键步骤）
    const blob = new Blob(
      [XLSX.write(workbook, { bookType: "xlsx", type: "array" })],
      {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
      }
    );

    const reader = new FileReader();
    reader.onload = async () => {
      const arrayBuffer = reader.result as ArrayBuffer;

      const filePath = await window.electronAPI.saveFile(
        arrayBuffer as any,
        "固定数据.xlsx",
        project.folderPath // 默认路径仅作为起点
      );

      if (filePath) {
        ElMessage.success("导出成功");
      } else {
        ElMessage.warning("用户取消保存");
      }
    };

    reader.readAsArrayBuffer(blob);
  } catch (err) {
    console.error("导出失败", err);
    ElMessage.error("模板导出失败");
  }
};
</script>

<style scoped lang="scss">
.product-attr-page {
  max-width: 1200px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin: 0 auto;
}
.scroll-content {
  flex: 1;
  height: 100%;
  padding: 0 10px 10px;
  overflow-y: auto;
}
:deep(.el-scrollbar__wrap) {
  display: flex;
  justify-content: center;
  align-items: center;
}
.form-card {
  padding: 10px;
  margin: 10px 0;
}
.warning-text {
  color: #e6a23c;
  font-size: 14px;
  margin-left: 10px;
}

.video-preview {
  display: flex;
  align-items: center;
  padding: 0 10px;
  margin-left: 10px;
  border: 1px dashed #ccc;
  border-radius: 4px;
}

.video-url {
  flex: 1;
  word-break: break-all;
  color: #409eff;
  font-size: 14px;
}
</style>
