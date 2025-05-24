<template>
  <div class="picture-page">
    <div class="container">
      <el-card style="width: 40%">
        <h2>🖼️ 本地已上传图片管理</h2>

        <!-- 项目选择 -->
        <el-form-item label="选择项目">
          <el-select
            v-model="selectedProject"
            placeholder="请选择项目"
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

        <el-form label-width="100px" label-position="left">
          <!-- 轮播图组成方式 -->
          <el-form-item label="轮播图方式">
            <el-radio-group v-model="carouselMode">
              <el-radio label="random">随机选择</el-radio>
              <el-radio label="ordered">按顺序组成</el-radio>
            </el-radio-group>
          </el-form-item>

          <!-- 轮播图选择 -->
          <el-form-item label="轮播图文件夹">
            <el-select
              v-model="selected.carousel"
              multiple
              filterable
              placeholder="请选择轮播图文件夹"
            >
              <el-option
                v-for="folder in folderOptions"
                :key="folder"
                :label="folder"
                :value="folder"
              />
            </el-select>
          </el-form-item>

          <!-- 产品素材图 -->
          <el-form-item label="产品素材图">
            <el-select
              v-model="selected.material"
              multiple
              filterable
              placeholder="请选择素材图文件夹"
            >
              <el-option
                v-for="folder in folderOptions"
                :key="folder + '-material'"
                :label="folder"
                :value="folder"
              />
            </el-select>
          </el-form-item>

          <!-- 产品介绍图 -->
          <el-form-item label="产品介绍图">
            <el-select
              v-model="selected.description"
              multiple
              filterable
              placeholder="请选择介绍图文件夹"
            >
              <el-option
                v-for="folder in folderOptions"
                :key="folder + '-desc'"
                :label="folder"
                :value="folder"
              />
            </el-select>
          </el-form-item>

          <!-- 外包装图片 -->
          <el-form-item label="外包装图片">
            <el-select
              v-model="selected.outerbox"
              multiple
              filterable
              placeholder="请选择外包装图文件夹"
            >
              <el-option
                v-for="folder in folderOptions"
                :key="folder + '-outer'"
                :label="folder"
                :value="folder"
              />
            </el-select>
          </el-form-item>

          <!-- 是否生成商品详情图 -->
          <el-form-item label="商品详情图">
            <el-switch
              v-model="generateDetailsFromCarousel"
              active-text="是"
              inactive-text="否"
            />
          </el-form-item>

          <!-- 导出文件保存路径 -->
          <el-form-item label="导出路径">
            <el-input
              v-model="exportPath"
              placeholder="默认使用源文件夹路径，可以手动修改"
              clearable
            >
              <template #append>
                <el-button @click="resetToSourcePath">重置</el-button>
              </template>
            </el-input>
          </el-form-item>

          <!-- 导出图片URL文档 -->
          <el-form-item>
            <el-button type="primary" @click="exportPictureSheet"
              >📦 导出图片URL文档</el-button
            >
          </el-form-item>
        </el-form>
      </el-card>

      <!-- SKU预览图 -->
      <el-card
        class="sku-preview"
        style="width: 70%; margin-left: 20px; overflow-y: auto"
      >
        <h3>🔍 SKU预览图（按文件夹分组）</h3>
        <div
          v-for="(items, folder) in skuGroups"
          :key="folder"
          class="sku-group"
        >
          <el-divider content-position="left">{{ folder }}</el-divider>
          <div class="sku-thumbnails">
            <el-image
              v-for="item in items"
              :key="item.url"
              :src="item.url"
              :preview-src-list="[item.url]"
              style="
                width: 100px;
                margin-right: 10px;
                border-radius: 10px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
              "
              @error="handleImageError(item.url)"
            />
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { ElMessage } from "element-plus";
import * as XLSX from "xlsx";

// 项目列表
const projectList = ref<
  {
    folderName: string;
    folderPath: string;
    uploadedUrls: Record<string, { name: string; url: string }[]>;
  }[]
>([]);

// 当前选中的项目
const selectedProject = ref("");

const uploadedUrls = ref<Record<string, { name: string; url: string }[]>>({});
const folderOptions = ref<string[]>([]);
const skuGroups = ref<Record<string, { name: string; url: string }[]>>({});
const exportPath = ref("");

const selected = ref({
  carousel: [],
  material: [],
  description: [],
  outerbox: [],
});
const carouselMode = ref<"random" | "ordered">("ordered");
const generateDetailsFromCarousel = ref(true);
// 全局图片池配置（新增sizePool）
const globalPools = {
  sku: new Map<string, { available: string[]; used: Set<string> }>(),
  carouselGroups: new Map<string, { available: string[]; used: Set<string> }>(), // 轮播图组池
  size: { available: [], used: new Set<string>() }, // 尺寸图池
  material: new Set<string>(),
  outerbox: new Set<string>(),
};
// 自然排序函数（用于正确处理类似"image2"和"image10"的排序）
const naturalSort = (a: string, b: string) => {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
};

// 计算最小行数（根据所有SKU文件夹中最少的图片列表）
const calculateMaxRows = () => {
  // 过滤掉空文件夹，以防止得到0
  const nonEmptyFolders = Object.values(skuGroups.value)
    .filter((arr) => arr.length > 0)
    .map((arr) => arr.length);

  if (nonEmptyFolders.length === 0) {
    return 1; // 如果所有文件夹都为空，则返回1
  }

  return Math.min(...nonEmptyFolders);
};
// 添加重置所有图池状态的函数
const resetAllPools = () => {
  // 重置SKU池
  globalPools.sku.forEach((pool) => {
    pool.used.clear();
  });

  // 重置轮播图组池
  globalPools.carouselGroups.forEach((pool) => {
    pool.used.clear();
  });

  // 重置尺寸图池
  globalPools.size.used.clear();

  // 重置特殊池（这些不需要重置，因为每次都重新创建）
  // globalPools.material.clear();
  // globalPools.outerbox.clear();

  console.log("所有图池状态已重置");
};
const initGlobalPools = () => {
  // 初始化轮播图组池（排除特定类型的文件夹）
  selected.value.carousel.forEach((folder) => {
    // 排除掉名称中包含"尺寸图"或"预览图"的文件夹
    if (folder.includes("尺寸图") || folder.includes("预览图")) {
      return; // 跳过这些文件夹
    }

    const sorted = (uploadedUrls.value[folder] || [])
      .map((img) => img.url)
      .sort(naturalSort);

    globalPools.carouselGroups.set(folder, {
      available: sorted,
      used: new Set(),
    });
  });

  // 初始化尺寸图池（专门处理尺寸图文件夹）
  globalPools.size.available = (uploadedUrls.value["尺寸图"] || [])
    .map((img) => img.url)
    .sort(naturalSort);
  console.log(globalPools.size.available);
};

// 初始化SKU池（为每个SKU文件夹创建独立的图片池）
const initSkuPools = () => {
  Object.keys(skuGroups.value).forEach((folder) => {
    const sorted = (skuGroups.value[folder] || [])
      .map((img) => img.url)
      .sort(naturalSort);

    globalPools.sku.set(folder, {
      available: sorted,
      used: new Set(),
    });
  });
};

// 初始化特殊图片池（素材图和外包装图）
const initSpecialPools = () => {
  // 产品素材图
  if (selected.value.material?.[0]) {
    const materialFolder = selected.value.material[0];
    const materialImages = (uploadedUrls.value[materialFolder] || [])
      .map((img) => img.url)
      .sort(naturalSort);
    materialImages.forEach((url) => globalPools.material.add(url));
  }

  // 外包装图
  if (selected.value.outerbox?.[0]) {
    const outerboxFolder = selected.value.outerbox[0];
    const outerboxImages = (uploadedUrls.value[outerboxFolder] || [])
      .map((img) => img.url)
      .sort(naturalSort);
    outerboxImages.forEach((url) => globalPools.outerbox.add(url));
  }
};
const buildCarousel = (): string[] => {
  const result: string[] = [];

  // Step 1: 按模式选择轮播图组图片
  if (carouselMode.value === "ordered") {
    // 顺序模式：按文件夹顺序取图
    selected.value.carousel.forEach((folder) => {
      const pool = globalPools.carouselGroups.get(folder);
      if (!pool) return; // 如果池不存在（被排除的文件夹），直接跳过

      const available = pool.available.filter((url) => !pool.used.has(url));
      if (available.length > 0) {
        result.push(available[0]);
        pool.used.add(available[0]);
      }
    });
  } else {
    // 随机模式：打乱文件夹顺序
    const shuffledFolders = [...selected.value.carousel].sort(
      () => Math.random() - 0.5
    );
    shuffledFolders.forEach((folder) => {
      const pool = globalPools.carouselGroups.get(folder);
      if (!pool) return; // 如果池不存在（被排除的文件夹），直接跳过

      const available = pool.available.filter((url) => !pool.used.has(url));
      if (available.length > 0) {
        const picked = available[Math.floor(Math.random() * available.length)];
        result.push(picked);
        pool.used.add(picked);
      }
    });
  }

  // Step 2: 插入尺寸图到第3位（保留原始逻辑）
  const availableSizes = globalPools.size.available.filter(
    (url) => !globalPools.size.used.has(url)
  );
  if (availableSizes.length > 0) {
    const insertPos = Math.min(2, result.length); // 确保插入位置有效
    result.splice(insertPos, 0, availableSizes[0]);
    globalPools.size.used.add(availableSizes[0]);
  }

  return result.filter(Boolean);
};
async function exportPictureSheet() {
  try {
    // 初始化所有池
    initGlobalPools();
    initSkuPools();
    initSpecialPools();
    const maxRows = calculateMaxRows();
    const rows = [];

    // 获取所有SKU文件夹
    const skuFolders = Object.keys(skuGroups.value);

    // 为素材图和外包装图维护使用记录
    const materialUsed = new Set<string>();
    const outerboxUsed = new Set<string>();

    const isRandomMode = carouselMode.value === "random";

    for (let i = 0; i < maxRows; i++) {
      const row: Record<string, string> = {};

      // SKU预览图（支持随机模式）
      skuFolders.forEach((folder) => {
        const pool = globalPools.sku.get(folder)!;
        const available = pool.available.filter((url) => !pool.used.has(url));

        if (available.length > 0) {
          if (isRandomMode) {
            // 随机模式
            const randomIndex = Math.floor(Math.random() * available.length);
            row[folder] = available[randomIndex];
          } else {
            // 顺序模式
            row[folder] = available[0];
          }

          pool.used.add(row[folder]);
        } else {
          row[folder] = "";
        }
      });

      // 轮播图（含尺寸图）
      const carouselUrls = buildCarousel();
      // 调试日志 - 检查轮播图数组
      console.log(`第${i + 1}行轮播图URLs:`, carouselUrls);
      row["轮播图"] = carouselUrls.join("\n");

      // 产品素材图（支持随机模式）
      const availableMaterial = [...globalPools.material].filter(
        (url) => !materialUsed.has(url)
      );
      if (availableMaterial.length > 0) {
        if (isRandomMode) {
          // 随机模式
          const randomIndex = Math.floor(
            Math.random() * availableMaterial.length
          );
          row["产品素材图"] = availableMaterial[randomIndex];
        } else {
          // 顺序模式
          row["产品素材图"] = availableMaterial[0];
        }

        materialUsed.add(row["产品素材图"]);
      } else {
        row["产品素材图"] = "";
      }

      // 外包装图（支持随机模式）
      const availableOuterbox = [...globalPools.outerbox].filter(
        (url) => !outerboxUsed.has(url)
      );
      if (availableOuterbox.length > 0) {
        if (isRandomMode) {
          // 随机模式
          const randomIndex = Math.floor(
            Math.random() * availableOuterbox.length
          );
          row["外包装图"] = availableOuterbox[randomIndex];
        } else {
          // 顺序模式
          row["外包装图"] = availableOuterbox[0];
        }

        outerboxUsed.add(row["外包装图"]);
      } else {
        row["外包装图"] = "";
      }

      rows.push(row);
    }

    // 生成Excel文件
    generateExcel(rows);
    resetAllPools();
  } catch (err: any) {
    resetAllPools();
    console.error("导出失败:", err);
    ElMessage.error("导出失败：" + (err.message || "未知错误"));
  }
}

const generateExcel = (rows) => {
  // 生成工作簿
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "图片URL");

  // 写入为Blob
  const blob = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const fileBuffer = new Blob([blob], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
  });

  // 读取并保存文件
  const fileReader = new FileReader();
  fileReader.onload = async function () {
    const arrayBuffer = this.result as ArrayBuffer;

    try {
      // 使用当前选中的项目路径作为默认保存目录
      const project = projectList.value.find(
        (p) => p.folderName === selectedProject.value
      );
      const defaultPath = exportPath.value || project?.folderPath || "";

      const filePath = await window.electronAPI.saveFile(
        arrayBuffer as any,
        "图片URL.xlsx",
        defaultPath
      );

      if (filePath) {
        ElMessage.success(`✅ 已保存至：${filePath}`);
        console.log(`成功导出 ${rows.length} 行数据`);
      } else {
        ElMessage.warning("用户取消了保存");
      }
    } catch (err: any) {
      console.error("保存失败:", err);
      ElMessage.error("导出失败：" + (err.message || "未知错误"));
    }
  };

  fileReader.readAsArrayBuffer(fileBuffer);
};
// 监听选中项目变化
const handleProjectChange = () => {
  if (!selectedProject.value) return;

  const project = projectList.value.find(
    (p) => p.folderName === selectedProject.value
  );
  if (project) {
    uploadedUrls.value = project.uploadedUrls || {};
    folderOptions.value = Object.keys(project.uploadedUrls || {});

    // 更新SKU预览图
    const skuGrouped: any = {};
    for (const folder in project.uploadedUrls) {
      if (folder.startsWith("预览图")) {
        skuGrouped[folder] = project.uploadedUrls[folder];
      }
    }
    skuGroups.value = skuGrouped;

    // 更新导出路径
    exportPath.value = project.folderPath || "";
  }
};

onMounted(async () => {
  // 获取保存的源目录路径
  const savedPath = localStorage.getItem("sourceDirectoryPath");
  if (savedPath) {
    exportPath.value = savedPath;
  }

  try {
    const data = await window.electronAPI.loadProjectList();
    projectList.value = JSON.parse(data);

    // 默认选中第一个项目
    if (projectList.value.length > 0) {
      selectedProject.value = projectList.value[0].folderName;
      console.log(projectList.value);

      handleProjectChange();
    }
  } catch (err) {
    console.error("加载项目列表失败：", err);
    ElMessage.error("读取项目列表失败");
  }
});

// 辅助函数：根据URL查找所属文件夹
function findFolderByUrl(url: string): string | undefined {
  for (const folder in uploadedUrls.value) {
    if (uploadedUrls.value[folder].some((img) => img.url === url)) {
      return folder;
    }
  }
  return undefined;
}

// 修改后的轮播图生成函数
function generateCarouselImages(
  mode: "random" | "ordered",
  folders: string[],
  used: Set<string> // 现在接受全局+行级的已用集合
) {
  const result: string[] = [];

  if (mode === "ordered") {
    for (const folder of folders) {
      const available = (uploadedUrls.value[folder] || []).filter(
        (item) => !used.has(item.url)
      );
      if (available.length > 0) {
        const img = available[0];
        result.push(img.url);
        used.add(img.url);
      }
    }
  } else {
    const shuffled = [...folders].sort(() => Math.random() - 0.5);
    for (const folder of shuffled) {
      const available = (uploadedUrls.value[folder] || []).filter(
        (item) => !used.has(item.url)
      );
      if (available.length > 0) {
        const picked = available[Math.floor(Math.random() * available.length)];
        result.push(picked.url);
        used.add(picked.url);
      }
    }
  }
  return result.filter((url) => url !== "");
}

// async function exportPictureSheet() {
//   const skuFolders = Object.keys(skuGroups.value);
//   const maxRows = Math.max(
//     ...Object.values(skuGroups.value).map((arr) => arr.length),
//     1
//   );

//   // 全局已用URL跟踪（按文件夹）
//   const globalUsedUrls = new Map<string, Set<string>>();

//   // 初始化全局跟踪
//   skuFolders.forEach((folder) => globalUsedUrls.set(folder, new Set()));
//   selected.value.carousel?.forEach((folder) =>
//     globalUsedUrls.set(folder, new Set())
//   );

//   const rows: Record<string, string>[] = [];

//   for (let i = 0; i < maxRows; i++) {
//     const row: Record<string, string> = {};
//     const rowUsedUrls = new Set<string>();

//     // 合并全局和当前行已用（用于去重检查）
//     const combinedUsed = new Set<string>([
//       ...Array.from(globalUsedUrls.values()).flatMap((set) => [...set]),
//       ...rowUsedUrls,
//     ]);

//     // SKU图片分配（更新全局使用记录）
//     skuFolders.forEach((folder) => {
//       const available = (skuGroups.value[folder] || []).filter(
//         (item) => !globalUsedUrls.get(folder)?.has(item.url)
//       );

//       if (available.length > 0) {
//         const index = i % available.length;
//         const item = available[index];
//         row[folder] = item.url;
//         globalUsedUrls.get(folder)?.add(item.url);
//         rowUsedUrls.add(item.url);
//       } else {
//         row[folder] = "";
//       }
//     });

//     // 轮播图生成（使用全局+行级去重）
//     const carouselUrls = generateCarouselImages(
//       carouselMode.value,
//       selected.value.carousel,
//       combinedUsed
//     );

//     // 更新全局使用记录
//     carouselUrls.forEach((url) => {
//       const folder = findFolderByUrl(url);
//       if (folder && globalUsedUrls.has(folder)) {
//         globalUsedUrls.get(folder)!.add(url);
//       }
//     });

//     // 尺寸图插入（全局去重）
//     const sizeFolder = folderOptions.value.find((f) => f.includes("尺寸图"));
//     if (sizeFolder) {
//       const available = (uploadedUrls.value[sizeFolder] || []).filter(
//         (item) => !combinedUsed.has(item.url)
//       );

//       if (available.length > 0) {
//         const picked = available[Math.floor(Math.random() * available.length)];
//         const insertIndex = 2;
//         if (carouselUrls.length >= insertIndex) {
//           carouselUrls.splice(insertIndex, 0, picked.url);
//         } else {
//           carouselUrls.push(picked.url);
//         }
//         globalUsedUrls.get(sizeFolder)?.add(picked.url);
//         rowUsedUrls.add(picked.url);
//       }
//     }

//     // 产品介绍图（全局去重）
//     if (selected.value.description?.length) {
//       const descFolder = selected.value.description[0];
//       const available = (uploadedUrls.value[descFolder] || []).filter(
//         (item) => !combinedUsed.has(item.url)
//       );

//       if (available.length > 0) {
//         const picked = available[Math.floor(Math.random() * available.length)];
//         carouselUrls.push(picked.url);
//         globalUsedUrls.get(descFolder)?.add(picked.url);
//         rowUsedUrls.add(picked.url);
//       }
//     }

//     // 剩余逻辑保持不变...
//     row["轮播图"] = carouselUrls.join("\n");

//     // 产品素材图和外包装图（使用全局检查）
//     const getGlobalUnique = (folder: string) => {
//       const available = (uploadedUrls.value[folder] || []).filter(
//         (item) => !globalUsedUrls.get(folder)?.has(item.url)
//       );
//       return available.length > 0 ? available[0].url : "";
//     };

//     if (selected.value.material?.length) {
//       const url = getGlobalUnique(selected.value.material[0]);
//       row["产品素材图"] = url || carouselUrls[0] || "";
//     }

//     if (selected.value.outerbox?.length) {
//       const url = getGlobalUnique(selected.value.outerbox[0]);
//       row["外包装图"] = url || carouselUrls[0] || "";
//     }

//     // 产品描述 - 将轮播图嵌入HTML中
//     if (generateDetailsFromCarousel.value) {
//       row["产品描述"] = carouselUrls
//         .map((url) => `<img src="${url}"/><br>`)
//         .join("");
//     } else {
//       row["产品描述"] = "";
//     }

//     rows.push(row);
//   }
// }

// 添加重置路径的方法
const resetToSourcePath = () => {
  const project = projectList.value.find(
    (p) => p.folderName === selectedProject.value
  );
  if (project) {
    exportPath.value = project.folderPath;
    ElMessage.success("已重置为项目文件夹路径");
  } else {
    ElMessage.warning("未找到项目文件夹路径");
  }
};

// 用于记录是否已经提示过错误
const errorNotified = ref(false);

// 图片加载错误处理函数
const handleImageError = (url: string) => {
  if (!errorNotified.value) {
    ElMessage.error(`图片加载失败，请检查图片空间或重新上传`);
    errorNotified.value = true; // 设置标志，表示已经提示过错误
  }
};
</script>

<style scoped>
.picture-page {
  display: flex;
  flex-direction: column;
  justify-content: center;
  max-width: 1200px;
  height: 100vh;
  padding: 20px;
  margin: 0 auto;
}
.container {
  display: flex;
  justify-content: center;
  max-height: 800px;
}
.sku-group {
  margin-bottom: 20px;
}
.sku-thumbnails {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 5fr));
  gap: 10px;
  padding: 10px;
}
</style>
