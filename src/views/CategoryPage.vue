<template>
  <div class="page">
    <div class="category-tree-page">
      <el-card>
        <el-divider>选择项目</el-divider>
        <el-row>
          <el-col :span="12" style="margin: 0 auto">
            <el-form label-width="100px">
              <el-form-item label="选择项目">
                <el-select
                  v-model="selectedProject"
                  @change="handleProjectChange"
                  placeholder="请选择项目"
                >
                  <el-option
                    v-for="project in projectList"
                    :key="project.folderName"
                    :label="project.folderName"
                    :value="project.folderName"
                  />
                </el-select>
              </el-form-item>
            </el-form>
          </el-col>
        </el-row>

        <el-row
          style="display: flex; justify-content: space-around"
          v-loading="isFetchLoading"
        >
          <el-divider>选择分类</el-divider>
          <el-col :span="6">
            <el-input
              v-model="searchKeyword"
              placeholder="请输入关键词过滤分类"
              @input="debouncedSearch"
              style="margin: 10px 0"
              clearable
            />

            <el-tree
              ref="treeRef"
              class="tree-container"
              :data="treeData"
              node-key="catId"
              lazy
              :load="loadNode"
              :props="{
                label: 'catName',
                children: 'children',
                isLeaf: 'isLeaf',
              }"
              highlight-current
              @node-click="handleNodeClick"
              style="height: 300px; overflow: auto"
              v-if="!isSearchMode"
            />
          </el-col>
          <el-col :span="16">
            <!-- 搜索结果滚动容器 -->
            <div class="search-result-container">
              <el-table
                :data="isSearchMode ? searchResultList : []"
                height="380"
              >
                <el-table-column prop="catId" label="分类ID" width="100" />
                <el-table-column prop="catName" label="分类名称" />
                <el-table-column prop="nodePath" label="完整类目路径" />
                <el-table-column label="操作" width="100">
                  <template #default="{ row }">
                    <el-button
                      size="small"
                      type="primary"
                      @click="selectSearched(row)"
                    >
                      添加
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </el-col>
        </el-row>

        <el-divider>已选择子分类</el-divider>
        <el-alert
          type="warning"
          title="导出提示！！！"
          :closable="false"
          description="该项目所有产品属性编辑完成之前请勿进行如下操作: 切换项目、功能模块、关闭项目、退出程序, 若有以上需求请先导出分类保存已编辑属性"
          show-icon
          style="margin-bottom: 15px"
        />
        <!-- 搜索和导出操作区域 -->
        <el-row style="margin-bottom: 10px">
          <el-col :span="4">
            <el-input
              v-model="selectedSearchKeyword"
              placeholder="搜索已选择分类"
              @click="searchSelectedCategories"
              clearable
            />
          </el-col>
          <el-col :span="2" style="margin-left: 10px">
            <el-button type="primary">搜索</el-button>
          </el-col>
          <el-col :span="8" style="margin-left: auto; text-align: right">
            <el-button type="primary" @click="refreshData">刷新</el-button>
            <el-button type="danger" @click="handleBatchRemove"
              >批量删除</el-button
            >
            <el-button type="success" @click="exportSelectedToExcel"
              >导出 Excel</el-button
            >
          </el-col>
        </el-row>
        <el-table
          :data="pagedSelectedSubcategories"
          style="width: 100%"
          v-loading="isFetchLoading"
          @selection-change="(val: any) => (multipleSelection = val)"
          :row-class-name="getRowClassName"
        >
          <el-table-column type="selection" width="50" />
          <el-table-column prop="catId" label="分类ID" width="100" />
          <el-table-column prop="catName" label="分类名称" width="250" />
          <el-table-column prop="fullNodePath" label="完整类目路径" />
          <el-table-column label="状态" width="80">
            <template #default="{ row }">
              <el-tag v-if="editedCategoryIds.has(row.catId)" type="success"
                >已编辑</el-tag
              >
              <el-tag v-else type="info">未编辑</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180">
            <template #default="{ row }">
              <el-button type="primary" size="small" @click="handleEdit(row)"
                >编辑属性</el-button
              >
              <el-button
                type="danger"
                size="small"
                @click="handleRemove(row.catId)"
                >移除</el-button
              >
            </template>
          </el-table-column>
        </el-table>

        <el-pagination
          v-if="filteredSelectedSubcategories.length > pageSize"
          class="pagination-right"
          style="margin-top: 20px; text-align: right"
          background
          layout="prev, pager, next"
          :current-page="currentPage"
          :page-size="pageSize"
          :total="filteredSelectedSubcategories.length"
          @current-change="handlePageChange"
        />
      </el-card>
    </div>
  </div>
  <EditAttributeDialog
    v-model:visible="dialogVisible"
    :attribute-list="dialogData.formProperty"
    :attr-match="dialogData.defaultData"
    @submit="handleAttrSubmit"
  />
</template>

<script setup lang="ts">
import {
  ref,
  onMounted,
  onBeforeUnmount,
  reactive,
  computed,
  watch,
} from "vue";
import { ElMessage } from "element-plus";
// @ts-ignore 忽略类型检查,因为Vue单文件组件没有类型定义
import debounce from "lodash/debounce";
import * as XLSX from "xlsx";
// @ts-ignore 忽略类型检查,因为Vue单文件组件没有类型定义
import EditAttributeDialog from "../components/EditAttributeDialog.vue";

// 本地存储键名常量
const STORAGE_KEY_EDITED_CATEGORIES = "category-editor-edited-categories";
const STORAGE_KEY_CATEGORY_DATA = "category-editor-category-data";

interface Project {
  folderName: string;
  folderPath: string;
}

const selectedProject = ref("");
const projectList = ref<Project[]>([]);
const dxmCookie = ref(localStorage.getItem("dxm_cookie") || "");
const treeData = ref<any[]>([]);
const selectedSubcategories = ref<any[]>([]);
const treeRef = ref();
const searchKeyword = ref("");
const isSearchMode = ref(false);
const searchResultList = ref<any[]>([]);
const isFetchLoading = ref(false);

const selectedSearchKeyword = ref("");
const filteredSelectedSubcategories = computed(() => {
  if (!selectedSearchKeyword.value) return selectedSubcategories.value;
  return selectedSubcategories.value.filter(
    (item) =>
      item.catName.includes(selectedSearchKeyword.value) ||
      item.nodePath.includes(selectedSearchKeyword.value)
  );
});
// 添加一个变量来记录当前正在编辑的类目
const currentEditingCategory = ref<any>(null);
const categoryDataMap = ref<Record<string, any[]>>({});
const multipleSelection = ref<any[]>([]);
const pageSize = 10;
const currentPage = ref(1);
const pagedSelectedSubcategories = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  const end = start + pageSize;
  return filteredSelectedSubcategories.value.slice(start, end);
});
const dialogVisible = ref(false);
const dialogData = reactive({
  defaultData: {},
  category: {},
  formProperty: [],
  platformData: [],
});

// 使用本地存储初始化编辑状态
const editedCategoryIds = ref<Set<string>>(
  new Set(
    JSON.parse(localStorage.getItem(STORAGE_KEY_EDITED_CATEGORIES) || "[]")
  )
);

// 监听编辑状态变化，保存到本地存储
watch(
  () => [...editedCategoryIds.value],
  (newValue) => {
    localStorage.setItem(
      STORAGE_KEY_EDITED_CATEGORIES,
      JSON.stringify(newValue)
    );
  }
);

// 添加行样式函数
const getRowClassName = ({ row }) => {
  return editedCategoryIds.value.has(row.catId) ? "edited-row" : "";
};

// 保存类目数据到本地存储
function saveCategoryDataToLocalStorage() {
  const dataToSave = {
    selectedProject: selectedProject.value,
    categoryDataMap: categoryDataMap.value,
    selectedSubcategories: selectedSubcategories.value,
  };

  localStorage.setItem(STORAGE_KEY_CATEGORY_DATA, JSON.stringify(dataToSave));
}

// 从本地存储加载类目数据
function loadCategoryDataFromLocalStorage() {
  const savedData = localStorage.getItem(STORAGE_KEY_CATEGORY_DATA);
  if (!savedData) return false;

  try {
    const parsedData = JSON.parse(savedData);

    // 只有当项目相同时才恢复数据
    if (parsedData.selectedProject === selectedProject.value) {
      categoryDataMap.value = parsedData.categoryDataMap || {};
      selectedSubcategories.value = parsedData.selectedSubcategories || [];
      return true;
    }
  } catch (e) {
    console.error("加载本地存储数据失败:", e);
  }

  return false;
}

const getCookie = async () => {
  if (dxmCookie.value) return;
  try {
    const res = await fetch("http://121.41.45.224:3100/dxmCookie", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: "Hu9527aa",
        password: "Xw131421",
      }),
    });
    const data = await res.json();

    if (data.success) {
      dxmCookie.value = data.cookies;
      localStorage.setItem("dxm_cookie", dxmCookie.value);
    }
  } catch {
    ElMessage.error("❌ 获取 cookie 失败");
  }
};

const handlePageChange = (page: number) => {
  currentPage.value = page;
};

const handleProjectChange = async () => {
  await fetchRootCategory();

  // 先尝试从本地存储加载数据
  if (loadCategoryDataFromLocalStorage()) {
    ElMessage.success("已从本地存储恢复数据");
    return;
  }

  try {
    const selectedFolder = projectList.value.find(
      (p) => p.folderName === selectedProject.value
    );
    if (!selectedFolder) return;

    const categoryExcelPath = `${selectedFolder.folderPath}/类目数据.xlsx`;
    const fileBuffer = await window.electronAPI.readFile(categoryExcelPath);

    const workbook = XLSX.read(fileBuffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(sheet);

    // 重置编辑状态和数据映射
    editedCategoryIds.value.clear();
    categoryDataMap.value = {};

    // 处理Excel中的数据
    const processedCategories = jsonData.map((row: any) => {
      const catId = String(row["分类id"]);
      let productAttr;

      try {
        productAttr =
          typeof row["产品属性"] === "string"
            ? JSON.parse(row["产品属性"])
            : row["产品属性"] || [];
      } catch (e) {
        console.error(`解析 ${row["类目名称"]} 的产品属性失败:`, e);
        productAttr = [];
      }

      // 更新数据映射
      categoryDataMap.value[catId] = productAttr;

      // 如果有产品属性数据，标记为已编辑
      if (productAttr && Array.isArray(productAttr) && productAttr.length > 0) {
        editedCategoryIds.value.add(catId);
      }

      return {
        catId,
        catName: row["类目名称"],
        nodePath: row["完整类目路径"],
        productAttr,
      };
    });

    // 先设置基础数据
    selectedSubcategories.value = processedCategories;

    // 然后异步获取完整路径
    selectedSubcategories.value = await Promise.all(
      processedCategories.map(async (category) => {
        // 如果已经有完整路径，就不需要再次获取
        if (category.nodePath && category.nodePath.includes(">")) {
          return category;
        }

        let fullNodePath = category.nodePath || category.catName;
        try {
          const res = await fetch("http://121.41.45.224:3100/getByCategoryId", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              categoryId: category.catId,
              cookie: dxmCookie.value,
            }),
          });
          const result = await res.json();
          if (result.code === 0 && result.data && result.data.nodePath) {
            fullNodePath = result.data.nodePath;
          }
        } catch (e) {
          console.warn(`获取 ${category.catName} 的完整路径失败:`, e);
        }

        return {
          ...category,
          nodePath: fullNodePath,
        };
      })
    );

    // 保存到本地存储
    saveCategoryDataToLocalStorage();

    console.log("加载的类目数据:", selectedSubcategories.value);
    console.log("加载的属性映射:", categoryDataMap.value);
    console.log("已编辑类目:", [...editedCategoryIds.value]);

    ElMessage.success("成功加载类目数据");
  } catch (e) {
    console.warn("当前目录无类目数据.xlsx或加载失败:", e);
    // 重置所有数据
    selectedSubcategories.value = [];
    editedCategoryIds.value.clear();
    categoryDataMap.value = {};

    // 保存空状态到本地存储
    saveCategoryDataToLocalStorage();

    ElMessage.info("未找到类目数据文件，已创建新的工作区");
  }
};

const fetchRootCategory = async () => {
  await getCookie();
  isSearchMode.value = false;
  isFetchLoading.value = true;
  try {
    const res = await fetch("http://121.41.45.224:3100/fetchCategory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cookie: dxmCookie.value,
        categoryParentId: 0,
      }),
    });
    const result = await res.json();
    if (result?.data?.code === 0) {
      treeData.value = result.data.data;
    } else {
      ElMessage.warning("未获取到一级分类");
    }
    setTimeout(() => {
      isFetchLoading.value = false;
    }, 1000);
  } catch (e) {
    console.log(e);
    ElMessage.error("❌ 获取一级分类失败");
    setTimeout(() => {
      isFetchLoading.value = false;
    }, 1000);
  }
};

const loadNode = async (node: any, resolve: Function) => {
  if (node.level === 0) return resolve(treeData.value);
  if (node.data.isLeaf) return resolve([]);

  const res = await fetch("http://121.41.45.224:3100/fetchCategory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cookie: dxmCookie.value,
      categoryParentId: node.data.catId,
    }),
  });
  const result = await res.json();
  if (result?.data?.code === 0) {
    resolve(result.data.data);
  } else {
    resolve([]);
  }
};

const handleNodeClick = async (node: any) => {
  if (!node.isLeaf) return;

  const exists = selectedSubcategories.value.find(
    (n) => String(n.catId) === String(node.catId)
  );
  if (exists) return;

  let nodePath = node.nodePath || node.catName;
  try {
    const res = await fetch("http://121.41.45.224:3100/getByCategoryId", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ categoryId: node.catId }),
    });
    const result = await res.json();
    if (result?.data?.nodePath) {
      nodePath = result.data.nodePath;
    }
  } catch (e) {
    console.warn("获取 nodePath 失败:", e);
  }

  selectedSubcategories.value.push({
    catId: String(node.catId),
    catName: node.catName,
    nodePath,
  });

  // 更新本地存储
  saveCategoryDataToLocalStorage();
};

const selectSearched = (row: any) => {
  const exists = selectedSubcategories.value.find((n) => n.catId === row.catId);
  if (!exists) {
    selectedSubcategories.value.push({
      catId: row.catId,
      catName: row.catName,
      nodePath: row.nodePath,
    });

    // 更新本地存储
    saveCategoryDataToLocalStorage();
  }
};

const doSearch = async () => {
  let keyword = searchKeyword.value.trim();
  if (!keyword) {
    isSearchMode.value = false;
    await fetchRootCategory();
    return;
  }
  // 英文()转中文（）
  keyword = keyword.replace(/\(/g, "（");
  keyword = keyword.replace(/\)/g, "）");

  isSearchMode.value = true;
  const res = await fetch("http://121.41.45.224:3100/searchCategory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cookie: dxmCookie.value,
      category: keyword,
    }),
  });
  const result = await res.json();
  if (result?.code === 0) {
    searchResultList.value = result.data;
  } else {
    ElMessage.warning("搜索失败");
  }
};

const handleRemove = (catId: string) => {
  const index = selectedSubcategories.value.findIndex(
    (item) => item.catId === catId
  );
  if (index !== -1) {
    selectedSubcategories.value.splice(index, 1);
    // 从已编辑集合中移除
    editedCategoryIds.value.delete(catId);
    // 从数据映射中移除
    delete categoryDataMap.value[catId];
    // 更新本地存储
    saveCategoryDataToLocalStorage();

    ElMessage.success("已移除该分类");
  }
};

const handleBatchRemove = () => {
  const idsToRemove = multipleSelection.value.map((item) => item.catId);
  selectedSubcategories.value = selectedSubcategories.value.filter(
    (item) => !idsToRemove.includes(item.catId)
  );

  // 从已编辑集合中移除批量删除的项
  idsToRemove.forEach((id) => {
    editedCategoryIds.value.delete(id);
    delete categoryDataMap.value[id];
  });

  // 更新本地存储
  saveCategoryDataToLocalStorage();

  multipleSelection.value = [];
  ElMessage.success("已批量移除选中分类");
};

const debouncedSearch = debounce(doSearch, 400);

const handleEdit = async (row: any) => {
  console.log("编辑属性:", row);

  // 记录当前正在编辑的类目
  currentEditingCategory.value = row;

  const response = await fetch(
    "http://121.41.45.224:3100/fetchCategoryAttributes",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cookie: dxmCookie.value,
        categoryId: row.catId,
      }),
    }
  );
  const { data: result } = await response.json();
  const { attrMatch, categoryDetail, attributeList, variationTemplate } =
    result;

  // 确保数据已经是解析过的对象
  try {
    // 优先使用已经保存在 categoryDataMap 中的数据
    if (
      categoryDataMap.value[row.catId] &&
      Array.isArray(categoryDataMap.value[row.catId]) &&
      categoryDataMap.value[row.catId].length > 0
    ) {
      dialogData.defaultData = categoryDataMap.value[row.catId];
      console.log("使用已保存的属性数据");
    } else {
      // 如果没有已保存的数据，则使用 API 返回的数据
      dialogData.defaultData =
        typeof attrMatch.data.productAttr === "string"
          ? JSON.parse(attrMatch.data.productAttr)
          : attrMatch.data.productAttr || [];
      console.log("使用 API 返回的属性数据");
    }
  } catch (e) {
    console.error("解析产品属性失败:", e);
    dialogData.defaultData = [];
  }

  dialogData.category = categoryDetail.data;
  dialogData.formProperty = attributeList.data;
  console.log("表单属性:", dialogData.formProperty);
  console.log("默认数据:", dialogData.defaultData);

  dialogData.platformData = variationTemplate.data;
  dialogVisible.value = true;
};

// 修改 handleAttrSubmit 函数
const handleAttrSubmit = (data: any) => {
  if (!currentEditingCategory.value) {
    console.error("没有正在编辑的类目");
    return;
  }

  const catId = currentEditingCategory.value.catId;

  // 1. 更新 categoryDataMap
  categoryDataMap.value[catId] = data;

  // 2. 更新 selectedSubcategories 中的对应项
  const index = selectedSubcategories.value.findIndex(
    (item) => item.catId === catId
  );
  if (index !== -1) {
    // 直接修改对象的属性，确保引用不变
    selectedSubcategories.value[index].productAttr = data;
  }

  // 3. 标记为已编辑
  editedCategoryIds.value.add(catId);

  // 4. 保存到本地存储
  saveCategoryDataToLocalStorage();

  // 5. 强制更新视图（通过创建新数组）
  selectedSubcategories.value = [...selectedSubcategories.value];

  ElMessage.success(`${currentEditingCategory.value.catName} 属性已保存`);

  // 6. 清除当前编辑的类目引用
  currentEditingCategory.value = null;
};

// 添加刷新功能
const refreshData = () => {
  // 重新加载当前项目数据
  handleProjectChange();
};

const exportSelectedToExcel = async () => {
  if (selectedSubcategories.value.length === 0) {
    ElMessage.warning("没有可导出的数据");
    return;
  }

  const data = selectedSubcategories.value.map((item) => ({
    分类id: item.catId,
    类目名称: item.catName,
    完整类目路径: item.fullNodePath || item.nodePath,
    产品属性: JSON.stringify(item.productAttr || []),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "已选择分类");

  const blob = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const fileBuffer = new Blob([blob], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
  });

  const fileReader = new FileReader();
  fileReader.onload = async function () {
    const arrayBuffer = this.result as ArrayBuffer;

    try {
      const project = projectList.value.find(
        (p) => p.folderName === selectedProject.value
      );
      const defaultPath = project?.folderPath || "";

      const filePath = await window.electronAPI.saveFile(
        arrayBuffer as any,
        "类目数据.xlsx",
        defaultPath
      );

      if (filePath) {
        ElMessage.success(`✅ 类目数据已保存至：${filePath}`);
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

// 搜索已选择的分类
const searchSelectedCategories = () => {
  // 搜索逻辑已经通过计算属性 filteredSelectedSubcategories 实现
  // 这里只需要重置页码
  currentPage.value = 1;
};

onMounted(async () => {
  try {
    const raw = await window.electronAPI.loadProjectList();
    projectList.value = JSON.parse(raw);

    // 如果有选中的项目，尝试加载本地存储的数据
    if (selectedProject.value) {
      loadCategoryDataFromLocalStorage();
    }
  } catch {
    ElMessage.error("加载项目失败");
  }
});
onBeforeUnmount(() => {
  // 确保在组件卸载前保存最新数据
  saveCategoryDataToLocalStorage();
});
</script>

<style scoped>
.page {
  height: 100vh;
  overflow-y: auto;
  box-sizing: border-box;
  .category-tree-page {
    display: flex;
    flex-direction: column;
    justify-content: center;
    max-width: 1200px;
    padding: 20px;
    padding-bottom: 100px;
    margin: 0 auto;
  }
  .tree-container {
    border: 1px solid #e4e7ed;
    padding: 10px;
    margin: 10px 0;
    max-height: 480px;
    overflow-y: auto;
  }
  .search-result-container {
    max-height: 420px;
    overflow-y: auto;
    border: 1px solid #dcdfe6;
    margin-top: 10px;
  }
}
/* 添加已编辑行的样式 */
:deep(.edited-row) {
  background-color: rgba(103, 194, 58, 0.1);
}
</style>
