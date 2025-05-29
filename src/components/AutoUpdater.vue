<template>
    <div class="auto-updater">
      <el-button 
        type="primary" 
        @click="checkForUpdates" 
        :loading="checking"
        size="small"
      >
        检查更新
      </el-button>
      
      <el-dialog
        v-model="updateAvailable"
        title="发现新版本"
        width="400px"
      >
        <div class="update-info">
          <p><strong>当前版本:</strong> {{ currentVersion }}</p>
          <p><strong>最新版本:</strong> {{ newVersion }}</p>
          <p><strong>更新内容:</strong> {{ updateDescription }}</p>
          <el-progress 
            v-if="downloading" 
            :percentage="downloadProgress" 
            :format="progressFormat"
          ></el-progress>
        </div>
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="updateAvailable = false">稍后更新</el-button>
            <el-button 
              type="primary" 
              @click="installUpdate"
              :disabled="!updateDownloaded"
            >
              {{ updateDownloaded ? '立即安装并重启' : '正在下载...' }}
            </el-button>
          </span>
        </template>
      </el-dialog>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue';
  import { ElMessage } from 'element-plus';
  
  const checking = ref(false);
  const updateAvailable = ref(false);
  const updateDownloaded = ref(false);
  const downloading = ref(false);
  const downloadProgress = ref(0);
  const currentVersion = ref('');
  const newVersion = ref('');
  const updateDescription = ref('');
  const isDev = ref(process.env.NODE_ENV === 'development');
  
  // 格式化进度条文本
  const progressFormat = (percentage) => {
    return `${percentage.toFixed(2)}%`;
  };
  
  // 检查更新
  const checkForUpdates = async () => {
    if (isDev.value) {
      ElMessage.info('开发环境下无法检查更新，请在打包后的应用中使用此功能');
      return;
    }
    
    if (!window.updateAPI) {
      ElMessage.error('更新API不可用');
      return;
    }
    
    checking.value = true;
    try {
      await window.updateAPI.checkForUpdates();
      checking.value = false;
    } catch (error) {
      console.error('检查更新失败:', error);
      ElMessage.error('检查更新失败: ' + error.message);
      checking.value = false;
    }
  };
  
  // 安装更新
  const installUpdate = () => {
    if (updateDownloaded.value && window.updateAPI) {
      window.updateAPI.quitAndInstall();
    }
  };
  
  onMounted(() => {
    // 在开发环境中显示提示
    if (isDev.value) {
      console.log('当前为开发环境，自动更新功能已禁用');
      return;
    }
    
    // 监听更新事件
    if (window.updateAPI) {
      window.updateAPI.onUpdateMessage((message) => {
        console.log('更新消息:', message);
      });
      
      window.updateAPI.onUpdateAvailable((info) => {
        currentVersion.value = info.currentVersion || '未知';
        newVersion.value = info.version || '未知';
        updateDescription.value = info.releaseNotes || '无更新说明';
        updateAvailable.value = true;
        downloading.value = true;
        updateDownloaded.value = false;
      });
      
      window.updateAPI.onUpdateNotAvailable(() => {
        ElMessage.success('当前已是最新版本');
      });
      
      window.updateAPI.onDownloadProgress((progressObj) => {
        downloadProgress.value = progressObj.percent || 0;
      });
      
      window.updateAPI.onUpdateDownloaded(() => {
        downloading.value = false;
        updateDownloaded.value = true;
        ElMessage.success('更新已下载完成，可以安装');
      });
      
      window.updateAPI.onUpdateError((err) => {
        ElMessage.error('更新出错: ' + (err.message || err));
      });
    }
  });
  </script>
  
  <style scoped>
  .auto-updater {
    margin: 10px 0;
  }
  
  .update-info {
    margin: 20px 0;
  }
  </style>