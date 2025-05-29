<template>
  <div class="project-table">
    <el-card>
      <div
        style="
          margin-bottom: 16px;
          display: flex;
          justify-content: space-between;
        "
      >
        <h2>📁 已保存项目列表</h2>
        <div class="action-buttons">
          <el-button type="primary" @click="exportProjects">
            <el-icon><Download /></el-icon> 导出项目
          </el-button>
          <el-button type="success" @click="showImportDialog">
            <el-icon><Upload /></el-icon> 导入项目
          </el-button>
          <el-button type="danger" plain @click="clearAllProjects"
            >清空全部项目</el-button
          >
        </div>
      </div>
      <el-table 
        :data="projectList" 
        style="min-height: 500px"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column label="项目名称" prop="folderName" align="center" />
        <el-table-column
          label="文件夹路径"
          prop="folderPath"
          show-overflow-tooltip
          min-width="300px"
        >
          <template #default="{ row }">
            <span
              class="nowrap-text"
              :style="{ color: row.isValid ? '#67C23A' : '#F56C6C' }"
            >
              {{
                row.isValid
                  ? `✅ 有效：${row.folderPath}`
                  : `❌ 已失效： ${row.folderPath}`
              }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="上传文件数" align="center">
          <template #default="{ row }">
            {{ Object.values(row.uploadedUrls || {}).flat().length }}
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="300px" align="center">
          <template #default="{ row, $index }">
            <el-button
              size="small"
              type="success"
              @click="importProjectData(row)"
            >
              <el-icon>
                <Upload />
              </el-icon>
              <span>导入数据</span>
            </el-button>
            <el-button
              size="small"
              type="primary"
              @click="changeFolderPath($index)"
            >
              <el-icon><Edit /></el-icon>
              <span>更改路径</span>
            </el-button>
            <el-button
              size="small"
              type="danger"
              @click="removeProject($index)"
            >
              <el-icon><Delete /></el-icon>
              <span> 删除 </span>
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
  
  <!-- 导入项目对话框 -->
  <el-dialog
    v-model="importDialogVisible"
    title="导入项目数据"
    width="500px"
    :close-on-click-modal="false"
  >
    <div class="import-dialog-content">
      <el-upload
        class="upload-demo"
        drag
        action=""
        :auto-upload="false"
        :on-change="handleFileChange"
        :limit="1"
        accept=".json"
      >
        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
        <div class="el-upload__text">
          拖拽文件到此处或 <em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            请上传JSON格式的项目数据文件
          </div>
        </template>
      </el-upload>
      
      <div v-if="importPreview.length > 0" class="import-preview">
        <h4>即将导入的项目：</h4>
        <el-table :data="importPreview" style="width: 100%">
          <el-table-column prop="folderName" label="项目名称" />
          <el-table-column prop="fileCount" label="文件数量" />
        </el-table>
      </div>
    </div>
    
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="importDialogVisible = false">取消</el-button>
        <el-button 
          type="primary" 
          @click="importProjectsData" 
          :disabled="!importFile || importPreview.length === 0"
        >
          确认导入
        </el-button>
      </span>
    </template>
  </el-dialog>
  
  <el-dialog
    v-model="dialogVisible"
    title="导入设置"
    width="60vw"
    :close-on-click-modal="false"
  >
    <el-form
      :model="dialogForm"
      label-position="left"
      label-width="100px"
      style="padding: 50px"
    >
      <el-form-item label="导出模式">
        <el-radio-group v-model="dialogForm.mode">
          <el-radio label="single">Single 图组不重复</el-radio>
          <el-radio label="multiple">Multiple 单类目不重复</el-radio>
        </el-radio-group>
        <el-button type="success" @click="exportExcel" style="margin-left: 20px"
          >生成导入文档</el-button
        >
      </el-form-item>

      <el-form-item label="选择账号">
        <el-select
          v-model="dialogForm.selectedAccount"
          placeholder="请选择账号"
          style="max-width: 420px"
          @change="handleAccountChange"
        >
          <el-option label="请选择账号" :value="0"></el-option>
          <el-option
            v-for="(account, index) in accounts"
            :key="index"
            :label="account.username"
            :value="index + 1"
          />
        </el-select>
        <el-button
          type="primary"
          text
          bg
          style="margin-left: 10px"
          @click="showAccountForm = !showAccountForm"
        >
          <span v-if="!showAccountForm">
            <el-icon><ArrowDown /></el-icon>
            <span> 展开 </span>
          </span>
          <span v-else>
            <el-icon><ArrowUp /></el-icon>
            <span> 收起 </span>
          </span>
        </el-button>
      </el-form-item>

      <el-row
        v-show="showAccountForm"
        style="
          width: 500px;
          padding: 10px;
          margin-left: 100px;
          background: #f3f3f3;
        "
      >
        <el-col :span="9">
          <el-form-item
            label="账号"
            label-width="40px"
            style="margin-bottom: 0"
          >
            <el-input v-model="newAccount.username" placeholder="请输入账号" />
          </el-form-item>
        </el-col>
        <el-col :span="9" style="margin-left: 10px">
          <el-form-item
            label="密码"
            label-width="40px"
            style="margin-bottom: 0"
          >
            <el-input
              v-model="newAccount.password"
              placeholder="请输入密码"
              show-password
            />
          </el-form-item>
        </el-col>
        <el-col :span="5" style="margin-left: 10px">
          <el-button
            type="success"
            @click="handleLogin"
            plain
            :loading="loginLoading"
            >登录</el-button
          >
        </el-col>
      </el-row>
      <el-row v-show="dialogForm.selectedAccount !== 0">
        <el-divider>选择导入店铺</el-divider>

        <el-table
          :data="shopList"
          border
          @selection-change="(val: any) => (multipleSelection = val)"
          style="width: 60%; margin: 0 auto"
        >
          <el-table-column type="selection" width="50" />
          <el-table-column prop="id" label="店铺ID" />
          <el-table-column prop="name" label="店铺名称" />
        </el-table>
      </el-row>
    </el-form>

    <!-- 修改预览表格部分 -->
    <el-dialog
      v-model="showPreviewTable"
      title="数据预览"
      width="80vw"
      append-to-body
      :close-on-click-modal="false"
    >
      <div v-if="previewData.length > 0">
        <el-alert
          title="请检查以下数据是否正确，确认无误后点击确认导入"
          type="warning"
          :closable="false"
          show-icon
          style="margin-bottom: 15px"
        />

        <!-- 添加视图切换按钮 -->
        <div style="margin-bottom: 15px">
          <el-radio-group v-model="previewMode" size="small">
            <el-radio-button label="original">原始数据视图</el-radio-button>
            <el-radio-button label="grouped">产品分组视图</el-radio-button>
          </el-radio-group>
        </div>

        <!-- 原始数据视图 -->
        <div v-if="previewMode === 'original'">
          <el-table
            :data="previewData.slice(0, 100)"
            border
            style="width: 100%"
            max-height="800px"
          >
            <el-table-column
              v-for="column in sortedColumns"
              :key="column"
              :prop="column"
              :label="column"
              min-width="120"
              :width="column === '产品标题' ? '1000px' : '120px'"
              align="center"
              show-overflow-tooltip
            >
              <!-- 自定义单元格内容 -->
              <template #default="scope">
                <!-- 如果是轮播图URL列表 -->
                <template
                  v-if="column === '轮播图' || column.includes('轮播图')"
                >
                  <div
                    class="image-preview-cell"
                    style="
                      display: flex;
                      justify-content: center;
                      align-items: center;
                      margin: 5px;
                      border-radius: 8px;
                      overflow: hidden;
                      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.5);
                    "
                  >
                    <el-image
                      v-if="parseImageUrls(scope.row[column]).length > 0"
                      :src="parseImageUrls(scope.row[column])[0]"
                      :preview-src-list="parseImageUrls(scope.row[column])"
                      @close="handleClose"
                      fit="contain"
                      style="width: 80px; height: 80px"
                    >
                      <template #error>
                        <div class="image-error">
                          <el-icon><Picture /></el-icon>
                          <span>加载失败</span>
                        </div>
                      </template>
                    </el-image>
                    <div v-else class="image-error">
                      <el-icon><Picture /></el-icon>
                      <span>无图片</span>
                    </div>
                    <div class="image-count-badge">
                      <el-badge
                        :value="parseImageUrls(scope.row[column]).length"
                        type="primary"
                      />
                    </div>
                  </div>
                </template>
                <!-- 如果是单张图片URL -->
                <template v-else-if="isImageUrl(scope.row[column])">
                  <div
                    class="box"
                    style="
                      display: flex;
                      justify-content: center;
                      align-items: center;
                      margin: 5px;
                      border-radius: 8px;
                      overflow: hidden;
                      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.5);
                    "
                  >
                    <el-image
                      :src="scope.row[column]"
                      :preview-src-list="[scope.row[column]]"
                      fit="contain"
                      @close="handleClose"
                      style="width: 80px; height: 80px; border-radius: 8px"
                    >
                      <template #error>
                        <div class="image-error">
                          <el-icon><Picture /></el-icon>
                          <span>加载失败</span>
                        </div>
                      </template>
                    </el-image>
                  </div>
                </template>

                <!-- 其他类型数据正常显示 -->
                <template v-else>
                  {{ scope.row[column] }}
                </template>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 分组视图 - 新增 -->
        <div v-else>
          <el-table
            :data="groupedPreviewData"
            border
            style="width: 100%"
            max-height="800px"
          >
            <!-- 公共字段列 -->
            <el-table-column
              label="产品标题"
              min-width="400"
              show-overflow-tooltip
            >
              <template #default="scope">
                {{ scope.row.产品标题 }}
              </template>
            </el-table-column>

            <el-table-column label="轮播图" width="120" align="center">
              <template #default="scope">
                <div class="image-preview-cell">
                  <el-image
                    v-if="parseImageUrls(scope.row.轮播图).length > 0"
                    :src="parseImageUrls(scope.row.轮播图)[0]"
                    @close="handleClose"
                    :preview-src-list="parseImageUrls(scope.row.轮播图)"
                    fit="contain"
                    style="width: 80px; height: 80px"
                  >
                    <template #error>
                      <div class="image-error">
                        <el-icon><Picture /></el-icon>
                        <span>加载失败</span>
                      </div>
                    </template>
                  </el-image>
                  <div v-else class="image-error">
                    <el-icon><Picture /></el-icon>
                    <span>无图片</span>
                  </div>
                  <div class="image-count-badge">
                    <el-badge
                      :value="parseImageUrls(scope.row.轮播图).length"
                      type="primary"
                    />
                  </div>
                </div>
              </template>
            </el-table-column>

            <!-- 变体信息列 -->
            <el-table-column label="变体信息" min-width="600">
              <template #default="scope">
                <el-table
                  :data="scope.row.variants"
                  border
                  size="small"
                  style="width: 100%"
                >
                  <el-table-column label="预览图" width="100" align="center">
                    <template #default="variantScope">
                      <el-image
                        v-if="variantScope.row.预览图"
                        :src="variantScope.row.预览图"
                        @close="handleClose"
                        :preview-src-list="[variantScope.row.预览图]"
                        fit="contain"
                        style="width: 60px; height: 60px"
                      >
                        <template #error>
                          <div
                            class="image-error"
                            style="width: 60px; height: 60px"
                          >
                            <el-icon><Picture /></el-icon>
                            <span>加载失败</span>
                          </div>
                        </template>
                      </el-image>
                    </template>
                  </el-table-column>

                  <el-table-column
                    label="变种属性值"
                    prop="变种属性值一"
                    min-width="120"
                  />

                  <el-table-column label="尺寸" min-width="200">
                    <template #default="variantScope">
                      长: {{ variantScope.row.长 }} 宽:
                      {{ variantScope.row.宽 }} 高: {{ variantScope.row.高 }}
                    </template>
                  </el-table-column>

                  <el-table-column label="重量" prop="重量" width="80" />

                  <el-table-column label="价格信息" min-width="200">
                    <template #default="variantScope">
                      申报价格: {{ variantScope.row.申报价格 }}<br />
                      建议零售价:
                      {{ variantScope.row["建议零售价(建议零售价币种)"] }}
                    </template>
                  </el-table-column>
                </el-table>
              </template>
            </el-table-column>

            <!-- 其他重要字段 -->
            <el-table-column label="分类ID" prop="分类id" width="120" />
          </el-table>
        </div>

        <div
          v-if="previewData.length > 100 && previewMode === 'original'"
          style="margin-top: 10px; color: #999; text-align: center"
        >
          仅显示前100条数据，共 {{ previewData.length }} 条
        </div>
      </div>
      <template #footer>
        <el-button @click="showPreviewTable = false">取消</el-button>
        <el-button
          type="primary"
          @click="confirmImport"
          :loading="importLoading"
          >确认导入</el-button
        >
      </template>
    </el-dialog>

    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button
        type="primary"
        :loading="importLoading"
        @click="handleDialogConfirm"
        >预览数据</el-button
      >
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  Upload,
  Edit,
  Delete,
  ArrowDown,
  ArrowUp,
  Download,
  UploadFilled,
} from "@element-plus/icons-vue";
import * as XLSX from "xlsx";
// @ts-ignore 忽略类型检查
import { generateImportExcel } from "../utils/generateImportExcel";

interface Project {
  folderName: string;
  timestampDir: string;
  folderPath: string;
  uploadedUrls: Record<string, { name: string; url: string }[]>;
  isValid: boolean;
}
interface Account {
  username: string;
  password: string;
  cookie: string;
}

const projectList = ref<Project[]>([]);
const validityMap = ref<boolean[]>([]);
const dialogVisible = ref(false);
const currentProject = ref<Project | null>(null);
const accounts = ref<Account[]>([]);
const showAccountForm = ref(false);
const loginLoading = ref(false);
const importLoading = ref(false);
const multipleSelection = ref<any[]>([]);

// 添加导入导出相关状态
const importDialogVisible = ref(false);
const importFile = ref<File | null>(null);
const importPreview = ref<{ folderName: string; fileCount: number }[]>([]);
const selectedProjects = ref<Project[]>([]);

const shopList = ref([]);

const dialogForm = ref({
  mode: "multiple", // 或 "single"
  selectedAccount: 0,
  account: "",
  password: "",
});

const newAccount = ref({
  username: "",
  password: "",
  cookie: "",
});
// 添加预览相关的状态
const showPreviewTable = ref(false);
const previewData = ref<any[]>([]);
// 添加新的状态变量
const previewMode = ref("original"); // 'original' 或 'grouped'
const groupedPreviewData = ref([]);
// 判断字符串是否为图片URL
const isImageUrl = (str: string): boolean => {
  if (typeof str !== "string") return false;

  // 检查是否是URL格式
  const urlPattern = /^(https?:\/\/|\/\/)/i;
  if (!urlPattern.test(str)) return false;

  // 检查是否是图片扩展名
  const imageExtensions = /\.(jpg|jpeg|png|gif|bmp|webp|svg)($|\?)/i;
  return imageExtensions.test(str);
};
// 解析轮播图URL列表
const parseImageUrls = (str: string): string[] => {
  if (typeof str !== "string") return [];

  // 尝试按换行符或空格分割字符串
  const urls = str.split(/[\n\s]+/).filter((url) => {
    // 过滤掉空字符串和非图片URL
    return url.trim() !== "" && isImageUrl(url.trim());
  });

  return urls;
};
// 判断列是否为图片列
const isImageColumn = (column: string): boolean => {
  if (
    column === "轮播图" ||
    column.includes("轮播图") ||
    column.includes("图片")
  ) {
    return true;
  }

  // 检查该列的第一个非空值是否为图片URL
  if (previewData.value.length > 0) {
    for (const row of previewData.value) {
      const value = row[column];
      if (value && typeof value === "string") {
        // 如果是图片URL或包含图片URL的列表
        if (isImageUrl(value) || parseImageUrls(value).length > 0) {
          return true;
        }
        break;
      }
    }
  }

  return false;
};

// 检查列是否全为空值
const isEmptyColumn = (column: string): boolean => {
  if (!previewData.value || previewData.value.length === 0) return true;

  return previewData.value.every((row) => {
    const value = row[column];
    return value === null || value === undefined || value === "";
  });
};

// 排序并过滤列
const sortedColumns = computed(() => {
  if (!previewData.value || previewData.value.length === 0) return [];

  // 获取第一行的所有键
  const allColumns = Object.keys(previewData.value[0] || {});

  // 过滤掉空列
  const nonEmptyColumns = allColumns.filter((column) => !isEmptyColumn(column));

  // 分离图片列和非图片列
  const imageColumns = nonEmptyColumns.filter((column) =>
    isImageColumn(column)
  );
  // 轮播图在前，其他图片列在后
  const sortedColumns = imageColumns.sort((a, b) => {
    if (a.includes("轮播图") && !b.includes("轮播图")) return -1;
    if (!a.includes("轮播图") && b.includes("轮播图")) return 1;
    return 0;
  });

  const otherColumns = nonEmptyColumns.filter(
    (column) => !isImageColumn(column)
  );
  // 图片列在前，其他列在后
  return [...sortedColumns, ...otherColumns];
});
// 从本地存储加载账号
const loadAccounts = () => {
  try {
    const savedAccounts = localStorage.getItem("accountList");
    if (savedAccounts) {
      accounts.value = JSON.parse(savedAccounts);
      console.log("已加载账号:", accounts.value.length);
    }
  } catch (error) {
    console.error("加载账号失败:", error);
    accounts.value = [];
  }
};

// 保存账号到本地存储
const saveAccounts = () => {
  try {
    localStorage.setItem("accountList", JSON.stringify(accounts.value));
    console.log("账号已保存");
  } catch (error) {
    console.error("保存账号失败:", error);
  }
};
// 处理账号选择变更
const handleAccountChange = async (index: number) => {
  if (index > 0) {
    const selectedAccount = accounts.value[index - 1];
    dialogForm.value.account = selectedAccount.username;
    dialogForm.value.password = selectedAccount.password;

    await fetch("http://121.41.45.224:3100/dxmShopMap", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cookie: accounts.value[index - 1].cookie }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          shopList.value = data.shop || [];
        }
      });
  }
};
// 处理登录
const handleLogin = async () => {
  if (!newAccount.value.username || !newAccount.value.password) {
    ElMessage.warning("请输入账号和密码");
    return;
  }

  loginLoading.value = true;
  try {
    // 调用获取 cookie 的接口
    const response = (await fetch("http://121.41.45.224:3100/dxmCookie", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: newAccount.value.username,
        password: newAccount.value.password,
      }),
    })) as any;

    if (response.success) {
      ElMessage.success("登录成功");
    }
    const data = await response.json();

    if (data.cookies) {
      // 保存 cookie
      newAccount.value.cookie = data.cookies;

      // 检查是否已存在相同用户名的账号
      const existingIndex = accounts.value.findIndex(
        (acc) => acc.username === newAccount.value.username
      );
      if (existingIndex >= 0) {
        // 更新现有账号
        accounts.value[existingIndex] = { ...newAccount.value };
        ElMessage.success("账号已更新");
      } else {
        // 添加新账号
        accounts.value.push({ ...newAccount.value });
        ElMessage.success("账号已添加");
      }

      // 保存到本地存储
      saveAccounts();

      // 选择新添加的账号
      dialogForm.value.selectedAccount = accounts.value.length - 1;
      dialogForm.value.account = newAccount.value.username;
      dialogForm.value.password = newAccount.value.password;

      // 重置表单
      newAccount.value.username = "";
      newAccount.value.password = "";
      newAccount.value.cookie = "";

      // 隐藏表单
      showAccountForm.value = false;
    } else {
      ElMessage.error("获取 Cookie 失败");
    }
  } catch (error) {
    console.error("登录失败:", error);
    ElMessage.error("登录失败，请检查网络连接或账号密码");
  } finally {
    loginLoading.value = false;
  }
};
// 处理表格选择变化
const handleSelectionChange = (selection: Project[]) => {
  selectedProjects.value = selection;
};

// 显示导入对话框
const showImportDialog = () => {
  importDialogVisible.value = true;
  importFile.value = null;
  importPreview.value = [];
};

// 处理文件选择
const handleFileChange = (file: any) => {
  if (!file) return;
  
  importFile.value = file.raw;
  
  // 读取文件内容并预览
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const content = e.target?.result as string;
      const data = JSON.parse(content);
      
      if (Array.isArray(data)) {
        importPreview.value = data.map(project => ({
          folderName: project.folderName,
          fileCount: Object.values(project.uploadedUrls || {}).flat().length
        }));
      } else {
        ElMessage.error('导入的JSON格式不正确，应为项目数组');
        importPreview.value = [];
      }
    } catch (error) {
      console.error('解析JSON失败:', error);
      ElMessage.error('解析JSON失败，请检查文件格式');
      importPreview.value = [];
    }
  };
  reader.readAsText(file.raw);
};

// 导入项目数据
const importProjectsData = async () => {
  if (!importFile.value) return;
  
  try {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const importedProjects = JSON.parse(content);
        
        if (!Array.isArray(importedProjects)) {
          ElMessage.error('导入的JSON格式不正确，应为项目数组');
          return;
        }
        
        // 验证导入的项目数据结构
        const validProjects = importedProjects.filter(project => {
          return (
            project.folderName && 
            project.folderPath && 
            typeof project.uploadedUrls === 'object'
          );
        });
        
        if (validProjects.length === 0) {
          ElMessage.error('导入的项目数据无效');
          return;
        }
        
        // 检查项目路径是否存在
        for (const project of validProjects) {
          const isValid = await window.electronAPI.existsFolder(project.folderPath);
          project.isValid = isValid;
        }
        
        // 合并项目列表，避免重复
        const existingNames = projectList.value.map(p => p.folderName);
        const newProjects = validProjects.filter(p => !existingNames.includes(p.folderName));
        const duplicateCount = validProjects.length - newProjects.length;
        
        projectList.value = [...projectList.value, ...newProjects];
        
        // 保存到本地
        await window.electronAPI.saveProjectList(JSON.stringify(projectList.value));
        
        ElMessage.success(`成功导入 ${newProjects.length} 个项目${duplicateCount > 0 ? `，${duplicateCount} 个项目因重名被忽略` : ''}`);
        importDialogVisible.value = false;
      } catch (error) {
        console.error('导入项目失败:', error);
        ElMessage.error('导入项目失败，请检查文件格式');
      }
    };
    reader.readAsText(importFile.value);
  } catch (error) {
    console.error('读取文件失败:', error);
    ElMessage.error('读取文件失败');
  }
};

// 导出项目数据
const exportProjects = async () => {
  try {
    // 如果有选中的项目，则导出选中的，否则导出全部
    const projectsToExport = selectedProjects.value.length > 0 
      ? selectedProjects.value 
      : projectList.value;
    
    if (projectsToExport.length === 0) {
      ElMessage.warning('没有可导出的项目');
      return;
    }
    
    // 创建导出数据
    const exportData = JSON.stringify(projectsToExport, null, 2);
    const filename = `项目数据_${new Date().toISOString().slice(0, 10)}.json`;
    
    // 使用 Electron API 保存文件，确保提供所有必要参数
    const result = await window.electronAPI.saveJSON({
      content: exportData,
      filename: filename,
    });
    
    if (!result) {
      return; // 用户取消了保存
    }
    
    ElMessage.success(`成功导出 ${projectsToExport.length} 个项目`);
  } catch (error) {
    console.error('导出项目失败:', error);
    ElMessage.error('导出项目失败: ' + error.message);
  }
};

// 检查文件是否存在
const checkFolderExists = async (path: string): Promise<boolean> => {
  try {
    const requiredFiles = ["图片URL.xlsx", "类目数据.xlsx", "产品标题.xlsx"];
    const missing: string[] = [];

    for (const file of requiredFiles) {
      const exists = await window.electronAPI.checkFileExists(
        `${path}\\${file}`
      );
      if (!exists) missing.push(file);
    }

    if (missing.length > 0) {
      ElMessage.warning(`目录缺少文件：${missing.join("，")}`);
      return false;
    }

    return true;
  } catch {
    return false;
  }
};
const importProjectData = async (project: Project) => {
  const result = checkFolderExists;
  if (!result) {
    ElMessageBox.alert(
      `<p>请手动将以下文件放入目录: <span style="font-weight: bolder;color: #000">${project.folderPath}</span></p>` +
        `<p>✅ 图片URL.xlsx</p>
      <p>✅ 类目数据.xlsx</p>
      <p>✅ 产品标题.xlsx</p>` +
        `<p>完成后请刷新页面或重新进入以更新状态</p>`,
      "📁 导入提示",
      {
        confirmButtonText: "我知道了",
        dangerouslyUseHTMLString: true,
      }
    );
  }

  // 弹出对话框
  currentProject.value = project;
  dialogVisible.value = true;
};

const exportExcel = async () => {
  if (!currentProject.value) return;
  try {
    const { folderPath } = currentProject.value;
    const imageUrlData = await readExcelToJson(`${folderPath}\\图片URL.xlsx`);
    const fixedData = await readExcelToJson(`${folderPath}\\固定数据.xlsx`);
    const titlesData = await readExcelToJson(`${folderPath}\\产品标题.xlsx`);
    const categoryData = await readExcelToJson(`${folderPath}\\类目数据.xlsx`);

    generateImportExcel({
      imageUrlData,
      fixedData,
      titlesData,
      categoryData,
      variantCount: fixedData.length,
      mode: dialogForm.value.mode,
      path: folderPath,
      fileName: "导入数据",
    });
  } catch (err) {
    ElMessage.error("❌ 导入失败，请检查文件或格式");
    console.error(err);
  }
};
//用于合并相同产品的不同变体
const groupProductVariants = (data) => {
  if (!data || data.length === 0) return [];

  // 创建一个Map来存储分组后的产品
  const productGroups = new Map();

  // 定义变种特有的字段（这些字段在不同变体间可以不同）
  const variantSpecificFields = [
    "预览图",
    "变种属性值一",
    "申报价格",
    "长",
    "宽",
    "高",
    "重量",
    "建议零售价(建议零售价币种)",
    "SKU货号",
  ];

  // 定义用于分组的字段（这些字段在同一产品的不同变体间应该相同）
  const groupByFields = [
    "产品标题",
    "分类id",
    "产品属性",
    "轮播图",
    "产品素材图",
    "外包装图片",
    "产品描述",
  ];

  // 遍历所有产品数据
  data.forEach((item) => {
    // 从变种属性值一中提取产品组标识（如"A-1"）
    const variantValue = item["变种属性值一"] || "";
    const productGroupId = variantValue.split("-").slice(0, 2).join("-");

    if (!productGroupId) return; // 跳过没有有效分组标识的项

    // 如果是新的产品组，则创建一个新条目
    if (!productGroups.has(productGroupId)) {
      // 创建基础产品对象（包含共享字段）
      const baseProduct = {};
      groupByFields.forEach((field) => {
        baseProduct[field] = item[field];
      });

      // 初始化变体数组
      baseProduct.variants = [];

      productGroups.set(productGroupId, baseProduct);
    }

    // 获取当前产品组
    const group = productGroups.get(productGroupId);

    // 创建变体对象（只包含变体特有字段）
    const variant = {};
    variantSpecificFields.forEach((field) => {
      variant[field] = item[field];
    });

    // 将变体添加到产品组的变体数组中
    group.variants.push(variant);
  });

  // 将Map转换为数组
  return Array.from(productGroups.values());
};

// 在预览数据之前应用分组
const preparePreviewData = () => {
  // 获取原始数据
  const originalData = previewData.value;

  // 应用分组逻辑
  const groupedData = groupProductVariants(originalData);

  // 更新状态
  groupedPreviewData.value = groupedData;
};
const handleDialogConfirm = async () => {
  if (!currentProject.value) return;
  importLoading.value = true;
  let selectedAccount: any;
  // 检查是否选择了账号
  if (dialogForm.value.selectedAccount >= 0 && accounts.value.length > 0) {
    selectedAccount = accounts.value[dialogForm.value.selectedAccount - 1];
  } else {
    ElMessage.error("请选择一个账号");
    importLoading.value = false;
    return;
  }

  // ✅ 文件是否存在
  const rawPath = `${currentProject.value.folderPath}\\导入数据.xlsx`;
  const filePath = rawPath.replace(/\\/g, "/");
  const exists = await window.electronAPI.checkFileExists(filePath);
  if (!exists) {
    ElMessage.error("请先生成导入文档！");
    importLoading.value = false;
    return;
  }

  // ✅ 店铺选择校验
  if (!multipleSelection.value.length) {
    ElMessage.error("至少选择一个店铺导入");
    importLoading.value = false;
    return;
  }

  // 读取Excel数据并显示在表格中进行预览
  try {
    const importData = await window.electronAPI.readExcel(filePath);
    previewData.value = importData;

    // 准备分组数据
    groupedPreviewData.value = groupProductVariants(importData);
    showPreviewTable.value = true;
    importLoading.value = false;
  } catch (err) {
    console.error("读取导入数据失败:", err);
    ElMessage.error("读取导入数据失败，请检查文件格式");
    importLoading.value = false;
  }
};

// 确认导入数据
const confirmImport = async () => {
  if (!currentProject.value || !previewData.value.length) return;
  importLoading.value = true;

  const selectedAccount = accounts.value[dialogForm.value.selectedAccount - 1];
  const filePath = `${currentProject.value.folderPath}/导入数据.xlsx`;

  ElMessage.success("开始导入中...");

  try {
    // 读取文件内容
    const fileBuffer = await window.electronAPI.readFile(filePath);
    const fileName = "导入数据.xlsx";
    // 获取文件的 ArrayBuffer 数据

    // 使用 ArrayBuffer 创建 Blob 对象
    const blob = new Blob([new Uint8Array(fileBuffer)], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    // 使用 Blob 创建 File 对象
    const file = new File([blob], "导入数据.xlsx", { type: blob.type });

    // ✅ 遍历每个选中的店铺
    for (const val of multipleSelection.value) {
      const shopId = val.id;
      const shopName = val.name;

      try {
        // 创建FormData对象
        const formData = new FormData();
        formData.append("file", file);
        formData.append("shopId", shopId);
        formData.append("cookie", selectedAccount.cookie);
        const response = await fetch(
          "http://121.41.45.224:3100/dxm/uploadImport",
          {
            method: "POST",
            body: formData,
          }
        );
        const data = await response.json();

        if (data.success && data.uuid) {
          ElMessage.success(`✅ 店铺 ${shopName} 上传成功，开始检测状态...`);

          // ✅ 启动轮询状态检查
          // 使用函数的代码部分
          await pollImportStatus({
            cookie: selectedAccount.cookie,
            uuid: data.uuid,
            onUpdate: (status) => {
              // 只显示第一行状态信息作为更新提示
              console.log(`店铺 ${shopName} 状态：${status.split("<br/>")[0]}`);
            },
            onSuccess: (status) => {
              ElMessage.success(`🎉 店铺 ${shopName} 导入完成！`);
            },
            onFail: (shortMsg, fullMsg) => {
              // 计算错误数量
              const errorCount = (fullMsg.match(/<br\/>/g) || []).length;

              // 显示简短的错误提示
              ElMessage.error(
                `❌ 店铺 ${shopName} 导入失败: ${shortMsg}${
                  errorCount > 0 ? `（共 ${errorCount} 处错误）` : ""
                }`
              );

              // 使用Element Plus对话框显示详细错误信息
              showErrorDetails(shopName, fullMsg);
            },
          });
        } else {
          ElMessage.error(
            `❌ 店铺 ${shopName} 上传失败：${data.message || "未知错误"}`
          );
        }
      } catch (err) {
        console.error(`❌ 导入异常: ${shopName}`, err);
        ElMessage.error(`❌ 店铺 ${shopName} 导入异常`);
      }
    }
  } catch (err) {
    console.error("文件处理错误:", err);
    ElMessage.error(`❌ 文件处理错误: ${err.message}`);
  } finally {
    importLoading.value = false;
    dialogVisible.value = false;
    showPreviewTable.value = false;
  }
};

// 删除单个项目
const removeProject = async (index: number) => {
  const project = projectList.value[index];
  const prefix = `${project.timestampDir}/`;

  ElMessageBox.confirm("确定要删除此项目吗？数据不可恢复!!!", "警告", {
    type: "warning",
  }).then(async () => {
    try {
      // 修正：正确调用删除目录接口
      const res = await fetch("http://121.41.45.224:3100/delete-dir", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prefix, // 使用正确的前缀格式
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "删除失败");
      }

      // 删除本地记录
      projectList.value.splice(index, 1);
      validityMap.value.splice(index, 1);
      await window.electronAPI.saveProjectList(
        JSON.stringify(projectList.value)
      );
      ElMessage.success("项目已删除");
    } catch (err) {
      ElMessage.warning("删除失败，请检查网络或手动清理");
      console.error(err);
    }
  });
};

// 清空所有项目
const clearAllProjects = async () => {
  ElMessageBox.confirm("确定要清空所有项目数据吗？数据不可恢复!!!", "警告", {
    type: "error",
  }).then(async () => {
    try {
      // 遍历所有项目，调用删除云端目录接口
      for (const project of projectList.value) {
        const prefix = `${project.folderName}/`; // 每个项目一个目录
        const response = await fetch("http://121.41.45.224:3100/delete-dir", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prefix }),
        });

        const data = await response.json();
        if (!data.success) {
          console.warn(
            `删除项目 ${project.folderName} 失败: ${data.error || "未知错误"}`
          );
        }
      }

      // 清空本地项目记录
      projectList.value = [];
      validityMap.value = [];
      await window.electronAPI.saveProjectList(JSON.stringify([]));

      ElMessage.success("✅ 所有项目已清空");
    } catch (error) {
      console.error("清空项目失败:", error);
      ElMessage.error("清空失败，请检查网络连接或后端状态");
    }
  });
};

// 更改文件夹路径
const changeFolderPath = async (index: number) => {
  const newPath = await window.electronAPI.selectDirectory();
  if (!newPath) return;

  const project = projectList.value[index];
  project.folderPath = newPath;

  // 🔍 添加路径是否存在检查
  const isValid = await window.electronAPI.existsFolder(newPath);
  project.isValid = isValid;

  // ✅ 重新保存项目列表
  await window.electronAPI.saveProjectList(JSON.stringify(projectList.value));

  ElMessage.success("路径更新成功");
};
// 读取 xlsx 文件并转为对象数组
async function readExcelToJson(filePath: string) {
  return await window.electronAPI.readExcel(filePath);
}
function showErrorDetails(shopName, errorMsg) {
  // 将错误信息分割成行
  const lines = errorMsg.split("<br/>");
  const summary = lines[0]; // 第一行通常是摘要信息

  // 提取错误信息，构建表格数据
  const errorRows = [];
  const errorPattern = /第(\d+)行数据异常:(.*)/;

  for (let i = 1; i < lines.length; i++) {
    const match = lines[i].match(errorPattern);
    if (match) {
      errorRows.push({
        row: match[1],
        error: match[2].trim(),
      });
    }
  }

  // 构建HTML表格，增加红色警示元素
  let htmlContent = `
    <div style="color: #D32F2F; font-weight: bold; font-size: 16px; margin-bottom: 10px;">
      <i class="el-icon-warning" style="margin-right: 5px;"></i>${summary}
    </div>
  `;

  if (errorRows.length > 0) {
    htmlContent += `
      <div style="margin-top: 10px; max-height: 350px; overflow-y: auto;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #FFEBEE;">
              <th style="border: 1px solid #ffcdd2; padding: 8px; text-align: left; color: #D32F2F;">行号</th>
              <th style="border: 1px solid #ffcdd2; padding: 8px; text-align: left; color: #D32F2F;">错误详情</th>
            </tr>
          </thead>
          <tbody>
    `;

    errorRows.forEach((row) => {
      htmlContent += `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold; color: #D32F2F;">${row.row}</td>
          <td style="border: 1px solid #ddd; padding: 8px; color: #D32F2F;">${row.error}</td>
        </tr>
      `;
    });

    htmlContent += `
          </tbody>
        </table>
      </div>
      <div style="margin-top: 15px; color: #D32F2F; font-size: 14px;">
        <i class="el-icon-info-circle" style="margin-right: 5px;"></i>请修正上述错误后重新上传
      </div>
    `;
  }

  ElMessageBox.alert(htmlContent, `${shopName} 导入错误详情`, {
    confirmButtonText: "知道了",
    dangerouslyUseHTMLString: true,
    customClass: "error-details-dialog",
    type: "error", // 使用error类型的对话框
    callback: () => {
      console.log("用户已查看错误详情");
    },
  });
}

async function pollImportStatus({
  cookie,
  uuid,
  interval = 3000,
  onUpdate,
  onSuccess,
  onFail,
}: {
  cookie: string;
  uuid: string;
  interval?: number;
  onUpdate?: (status: string) => void;
  onSuccess?: (status: string, details?: string) => void;
  onFail?: (status: string, details?: string) => void;
}) {
  const query = async () => {
    try {
      const res = await fetch("http://121.41.45.224:3100/dxm/checkStatus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cookie, uuid }),
      });

      const json = await res.json();
      const processMsg = json.result?.data?.processMsg;
      const code = processMsg?.code;
      const msg = processMsg?.msg || "状态未知";

      if (onUpdate) onUpdate(msg); // 提示状态文本

      // 检查导入结果是否有问题
      const hasImportErrors =
        msg.includes("已成功导入0条") || msg.includes("数据异常");

      if (code === 1) {
        if (hasImportErrors) {
          // 虽然状态码是1（成功），但实际上导入有问题
          if (onFail) onFail(msg.split("<br/>")[0], msg);
        } else {
          if (onSuccess) onSuccess(msg, msg);
        }
        return true;
      } else if (code === -1 || code === 2) {
        if (onFail) onFail(msg, msg);
        return true;
      }

      return false;
    } catch (e) {
      console.error("状态查询失败：", e);
      if (onFail) onFail(`查询状态出错: ${e.message}`);
      return true;
    }
  };

  const loop = async () => {
    const done = await query();
    if (!done) {
      setTimeout(loop, interval);
    }
  };

  loop();
}

onMounted(async () => {
  try {
    const data = await window.electronAPI.loadProjectList();
    const parsed = JSON.parse(data || "[]");
    projectList.value = parsed;

    // 检查每个路径是否有效
    validityMap.value = parsed.map((p: any) => checkFolderExists(p.folderPath));

    // 加载账号
    loadAccounts();
  } catch (err) {
    console.error("加载项目失败:", err);
    ElMessage.error("无法加载项目列表");
    projectList.value = [];
    validityMap.value = [];
  }
});
</script>

<style scoped>
.project-table {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  max-width: 1200px;
  height: 100%;
  margin: 20px auto;
  padding: 20px;
}

.action-buttons {
  display: flex;
  gap: 10px;
}

.import-dialog-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.import-preview {
  margin-top: 20px;
}

.image-preview-cell {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.image-count-badge {
  position: absolute;
  top: 0;
  right: 0;
}

.image-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 80px;
  width: 80px;
  color: #909399;
  font-size: 12px;
  background-color: #f5f7fa;
}

.error-details-dialog .el-message-box__title {
  color: #d32f2f !important;
}

.error-details-dialog .el-message-box__header {
  background-color: #ffebee;
  border-bottom: 1px solid #ffcdd2;
}

.error-details-dialog .el-message-box__content {
  max-height: 500px;
  overflow-y: auto;
}

/* 自定义预览样式 */
:deep(.el-image-viewer__wrapper) {
  z-index: 2050; /* 确保在对话框之上 */
}
:deep(.el-table__cell) {
  position: static !important;
}
</style>
