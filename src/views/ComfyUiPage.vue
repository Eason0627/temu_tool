<template>
  <div class="comfyui">
    <div class="comfyui-container">
      <div v-if="!isReady" class="loading">
        <el-icon class="spinner"><Loading /></el-icon>
        <p>正在连接云平台，请稍候...</p>
      </div>

      <div v-else-if="loadFailed" class="fallback">
        <p>⚠️ 连接云平台失败，请检查网络或输入其他地址：</p>
        <el-input
          v-model="comfyUrl"
          placeholder="请输入 ComfyUI 云平台地址，如 http://your-domain:8188/"
          style="margin: 10px 0"
        />
        <el-button type="primary" @click="connectRemote"
          >连接云平台</el-button
        >
      </div>

      <webview
        v-else
        ref="webview"
        class="comfyui-frame"
        :src="comfyUrl"
        allowpopups
      />
    </div>
    <div class="reload" @click="reloadComfyUI">
      <el-icon><Refresh /></el-icon>
    </div>
    <div class="fullScreen" @click="toggleFullScreen()">
      <el-icon><FullScreen /></el-icon>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
// @ts-ignore 忽略类型检查,因为Vue单文件组件没有类型定义
import { Loading, FullScreen, Refresh } from "@element-plus/icons-vue";

const isReady = ref(false);
const loadFailed = ref(false);
const comfyUrl = ref("https://your-cloud-comfyui-url.com"); // 替换为您的云平台地址
const webview = ref<HTMLElement>();
const fullScreen = ref(false);

const toggleFullScreen = () => {
  fullScreen.value = !fullScreen.value;
  (webview.value as HTMLElement).style.position = fullScreen.value
    ? "none"
    : "absolute";
  (webview.value as HTMLElement).style.width = fullScreen.value
    ? "100vw"
    : "calc(100% - 220px)";
  (webview.value as HTMLElement).style.left = fullScreen.value ? "0" : "unset";
};

const reloadComfyUI = async () => {
  if (webview.value) {
    (webview.value as any).reload();
  }
};

function connectRemote() {
  if (!comfyUrl.value || !/^https?:\/\//.test(comfyUrl.value)) {
    ElMessage.warning("请输入合法的云平台地址");
    return;
  }
  
  checkCloudConnection();
}

async function checkCloudConnection() {
  isReady.value = false;
  loadFailed.value = false;
  
  try {
    // 检查云平台连接
    const response = await fetch(comfyUrl.value, { 
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-cache',
      timeout: 5000
    }).catch(() => null);
    
    if (response) {
      isReady.value = true;
      localStorage.setItem('comfyui_cloud_url', comfyUrl.value);
      ElMessage.success('云平台连接成功');
    } else {
      loadFailed.value = true;
      ElMessage.error('云平台连接失败，请检查地址或网络');
    }
  } catch (error) {
    console.error('连接云平台出错:', error);
    loadFailed.value = true;
    ElMessage.error('连接云平台出错');
  }
}

onMounted(async () => {
  // 尝试从本地存储加载上次使用的云平台地址
  const savedUrl = localStorage.getItem('comfyui_cloud_url');
  if (savedUrl) {
    comfyUrl.value = savedUrl;
  }
  
  await checkCloudConnection();
});
</script>
