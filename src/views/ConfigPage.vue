<template>
  <div class="config-container">
    <el-row>
      <el-col :span="20" class="main-content">
        <div class="content-wrapper">
          <el-form :model="config" label-width="180px" label-position="left">
            <!-- 选择目录 -->
            <el-form-item label="选择项目目录">
              <el-button @click="selectProjectDirectory">选择目录</el-button>
              <span style="margin-left: 10px"
                >当前目录：<strong>{{ projectPath || "未选择" }}</strong></span
              >
            </el-form-item>

            <!-- 展示自动扫描到的文件夹分类 -->
            <template v-if="folderNames.length">
              <el-divider content-position="left"
                >📁 扫描到的子文件夹</el-divider
              >
              <div style="margin-bottom: 10px">
                <el-tag
                  v-for="(f, i) in folderNames"
                  :key="i"
                  style="margin-right: 6px"
                  >{{ f }}</el-tag
                >
              </div>
            </template>

            <!-- account -->
            <el-divider content-position="left">账号配置 [account]</el-divider>
            <el-form-item label="用户名">
              <el-input v-model="config.account.username" />
            </el-form-item>
            <el-form-item label="密码">
              <el-input v-model="config.account.password" />
            </el-form-item>

            <!-- captcha -->
            <el-divider content-position="left"
              >验证码配置 [captcha]</el-divider
            >
            <el-form-item label="接口地址">
              <el-input v-model="config.captcha.url" />
            </el-form-item>
            <el-form-item label="用户名">
              <el-input v-model="config.captcha.username" />
            </el-form-item>
            <el-form-item label="密码">
              <el-input v-model="config.captcha.password" />
            </el-form-item>
            <el-form-item label="软件ID">
              <el-input v-model="config.captcha.soft_id" />
            </el-form-item>
            <el-form-item label="验证码类型">
              <el-input v-model="config.captcha.code_type" />
            </el-form-item>

            <!-- settings -->
            <el-divider content-position="left">系统配置 [settings]</el-divider>
            <el-form-item label="是否无头模式">
              <el-radio-group v-model="config.settings.headless">
                <el-radio-button :label="true">是</el-radio-button>
                <el-radio-button :label="false">否</el-radio-button>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="多进程数">
              <el-input-number
                v-model="config.settings.multi_process"
                :min="1"
              />
            </el-form-item>
            <el-form-item label="进度文件">
              <el-input v-model="config.settings.progress_file" disabled />
            </el-form-item>
            <el-form-item label="项目名称">
              <el-input v-model="config.settings.product_name" />
            </el-form-item>
            <el-form-item label="轮播图最少文件夹">
              <el-input-number
                v-model="config.settings.min_carousel_folders"
                :min="1"
              />
            </el-form-item>
            <el-form-item label="尺寸图最少文件夹">
              <el-input-number
                v-model="config.settings.min_size_folders"
                :min="1"
              />
            </el-form-item>
            <el-form-item label="产品规格数">
              <el-input-number
                v-model="config.settings.product_variants"
                :min="1"
              />
            </el-form-item>
            <el-form-item label="生成模式">
              <el-radio-group v-model="config.settings.generate_mode">
                <el-radio-button label="single">single</el-radio-button>
                <el-radio-button label="multiple">multiple</el-radio-button>
              </el-radio-group>
            </el-form-item>

            <!-- excel -->
            <el-divider content-position="left">Excel 配置 [excel]</el-divider>
            <el-form-item label="固定数据文件">
              <el-input v-model="config.excel.fixed_data" disabled />
            </el-form-item>
            <el-form-item label="图片URL文件">
              <el-input v-model="config.excel.image_urls" disabled />
            </el-form-item>
            <el-form-item label="产品标题文件">
              <el-input v-model="config.excel.product_titles" disabled />
            </el-form-item>
            <el-form-item label="类目数据文件">
              <el-input v-model="config.excel.category_data" disabled />
            </el-form-item>
            <el-form-item label="导入模板文件">
              <el-input v-model="config.excel.template_path" disabled />
            </el-form-item>

            <!-- folders -->
            <el-divider content-position="left"
              >文件夹配置 [folders]</el-divider
            >
            <el-form-item label="轮播图文件夹（多选）">
              <el-select v-model="config.folders.carousel_folders" multiple>
                <el-option
                  v-for="folder in allFolders.numeric"
                  :key="folder"
                  :label="folder"
                  :value="folder"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="尺寸图文件夹">
              <el-select v-model="config.folders.size_folders">
                <el-option
                  v-for="folder in allFolders.size"
                  :key="folder"
                  :label="folder"
                  :value="folder"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="预览图文件夹（多选）">
              <el-select v-model="config.folders.preview_folders" multiple>
                <el-option
                  v-for="folder in allFolders.preview"
                  :key="folder"
                  :label="folder"
                  :value="folder"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="介绍图文件夹">
              <el-select v-model="config.folders.goods_folders">
                <el-option
                  v-for="folder in allFolders.goods"
                  :key="folder"
                  :label="folder"
                  :value="folder"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="产品素材图文件夹">
              <el-select v-model="config.folders.material_folders">
                <el-option
                  v-for="folder in allFolders.material"
                  :key="folder"
                  :label="folder"
                  :value="folder"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="外包装图文件夹">
              <el-select v-model="config.folders.outerbox_folders">
                <el-option
                  v-for="folder in allFolders.outerbox"
                  :key="folder"
                  :label="folder"
                  :value="folder"
                />
              </el-select>
            </el-form-item>

            <!-- image validation -->
            <el-divider content-position="left"
              >图片校验 [image_validation]</el-divider
            >
            <el-form-item label="最小宽度">
              <el-input-number
                v-model="config.image_validation.min_width"
                :min="1"
              />
            </el-form-item>
            <el-form-item label="最小高度">
              <el-input-number
                v-model="config.image_validation.min_height"
                :min="1"
              />
            </el-form-item>
            <el-form-item label="允许格式">
              <el-input v-model="config.image_validation.allowed_formats" />
            </el-form-item>

            <!-- 配置预览 -->
            <el-divider content-position="left">配置预览</el-divider>
            <el-radio-group v-model="previewType">
              <el-radio-button label="json">JSON</el-radio-button>
              <el-radio-button label="ini">INI</el-radio-button>
            </el-radio-group>
            <el-input
              type="textarea"
              :value="previewOutput"
              rows="18"
              readonly
            />

            <el-button type="primary" @click="saveConfig">保存配置</el-button>
            <el-button @click="copyToClipboard">
              {{ previewType === "json" ? "复制 JSON" : "复制 INI" }}
            </el-button>
          </el-form>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from "vue";
import { ElMessage } from "element-plus";

const projectPath = ref("");
const folderNames = ref([]);
const previewType = ref("json");

const config = reactive({
  account: { username: "Hu9527aa", password: "Hu1464263252" },
  captcha: {
    url: "http://upload.chaojiying.net/Upload/Processing.php",
    username: "1464263252",
    password: "hu1464263252",
    soft_id: "968142",
    code_type: "1004",
  },
  settings: {
    headless: true,
    multi_process: 6,
    progress_file: "upload_progress.json",
    product_name: "",
    min_carousel_folders: 4,
    min_size_folders: 1,
    product_variants: 1,
    generate_mode: "multiple",
  },
  excel: {
    fixed_data: "固定数据.xlsx",
    image_urls: "图片URL.xlsx",
    product_titles: "产品标题.xlsx",
    category_data: "类目数据.xlsx",
    template_path: "product_导入数据.xlsx",
  },
  folders: {
    carousel_folders: [],
    size_folders: "",
    preview_folders: [],
    goods_folders: "",
    material_folders: "",
    outerbox_folders: "",
  },
  image_validation: {
    min_width: 800,
    min_height: 800,
    allowed_formats: "jpg,png,jpeg",
  },
});

const allFolders = reactive({
  numeric: [],
  size: [],
  preview: [],
  goods: [],
  material: [],
  outerbox: [],
});

const previewOutput = computed(() =>
  previewType.value === "json" ? JSON.stringify(config, null, 2) : toIni(config)
);

function toIni(obj) {
  let ini = "";
  for (const [section, content] of Object.entries(obj)) {
    ini += `[${section}]\n`;
    for (const [k, v] of Object.entries(content)) {
      ini += `${k} = ${Array.isArray(v) ? v.join(",") : v}\n`;
    }
    ini += "\n";
  }
  return ini.trim();
}

async function selectProjectDirectory() {
  try {
    // 使用Electron的API选择目录
    const selectedPath = await window.electronAPI.selectDirectory();
    
    if (!selectedPath) return;
    
    projectPath.value = selectedPath;
    
    // 读取目录内容
    const folders = window.electronAPI.readDirectory(selectedPath);
    folderNames.value = folders;
    
    // 分类文件夹
    const allFolders = {
      numeric: [],
      size: [],
      preview: [],
      goods: [],
      material: [],
      outerbox: [],
    };

    for (const name of folders) {
      if (/^\d+$/.test(name)) allFolders.numeric.push(name);
      else if (name.includes("尺寸图")) allFolders.size.push(name);
      else if (name.startsWith("预览图")) allFolders.preview.push(name);
      else if (name === "产品素材图") allFolders.material.push(name);
      else if (name === "外包装图") allFolders.outerbox.push(name);
      else allFolders.goods.push(name);
    }

    // 自动填充 config.folders 字段
    config.folders.carousel_folders = [...allFolders.numeric];
    config.folders.size_folders = allFolders.size[0] || "";
    config.folders.preview_folders = [...allFolders.preview];
    config.folders.goods_folders = allFolders.goods[0] || "";
    config.folders.material_folders = allFolders.material[0] || "";
    config.folders.outerbox_folders = allFolders.outerbox[0] || "";

    ElMessage.success("目录选择成功，已扫描到子文件夹,自动填充配置项");
  } catch (e) {
    console.warn("目录选择取消或出错", e);
    ElMessage.error("选择目录失败: " + e.message);
  }
}

function saveConfig() {
  if (!projectPath.value) return ElMessage.warning("请先选择项目目录");

  const jsonContent = JSON.stringify(config, null, 2);
  const iniContent = toIni(config);

  // 使用Electron的API保存文件
  Promise.all([
    window.electronAPI.saveFile(jsonContent, "config.json", projectPath.value),
    window.electronAPI.saveFile(iniContent, "config.ini", projectPath.value)
  ]).then(() => {
    ElMessage.success("配置文件已保存");
  }).catch(err => {
    ElMessage.error("保存配置文件失败: " + err.message);
  });
}

function copyToClipboard() {
  const content =
    previewType.value === "json"
      ? JSON.stringify(config, null, 2)
      : toIni(config);

  navigator.clipboard.writeText(content).then(() => {
    ElMessage.success(`已复制${previewType.value.toUpperCase()}到剪贴板`);
  });
}

function downloadBlob(blob, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
</script>

<style scoped>
.config-container {
  height: 100vh;
  overflow: hidden;
  overflow-y: auto;
}
.main-content {
  height: 100%;
  padding: 30px;
}
.content-wrapper {
  max-width: 1000px;
  margin: 0 auto;
}
</style>
