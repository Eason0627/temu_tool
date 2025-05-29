<!-- src/App.vue -->
<template>
  <!-- 全屏加载状态 -->
  <div v-if="isLoading" class="loading-container">
    <el-spinner size="large" />
    <div class="loading-text">正在验证授权...</div>
  </div>

  <!-- 主应用内容 -->
  <el-container v-else style="height: 100vh">
    <Sidebar />
    <el-container>
      <el-main style="background-color: #f9f9f9; overflow: hidden">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import Sidebar from "./components/Sidebar.vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { onMounted, ref } from "vue";

// 添加加载状态控制
const isLoading = ref(true);

onMounted(async () => {
  try {
    const mac = await window.electronAPI.getMacAddress();
    
    const res = await fetch("http://121.41.45.224:3100/check?mac=" + mac);
    const json = await res.json();
    // 授权检查完成，关闭加载状态
    isLoading.value = false;
    console.log(json);

    // 检查授权状态
    if (!json.success) {
      // 提示无授权，强制退出程序
      // 1. 全屏对话框，禁止关闭
      ElMessageBox({
        title: "授权验证失败",
        message: "您的设备未获得授权，程序将在3秒后自动退出。",
        type: "error",
        showClose: false,
        closeOnClickModal: false,
        closeOnPressEscape: false,
        closeOnHashChange: false,
        showCancelButton: false,
        showConfirmButton: false,
        customClass: {
          container: "full-screen-dialog-container",
          header: "full-screen-dialog-header",
          message: "full-screen-dialog-message",
        },
      });

      // 添加全屏样式
      const style = document.createElement("style");
      style.innerHTML = `
        .full-screen-dialog-container {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          z-index: 9999 !important;
          background-color: rgba(0, 0, 0, 0.9) !important;
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
        }
        .full-screen-dialog-header {
          font-size: 24px !important;
          color: #ff4d4f !important;
        }
        .full-screen-dialog-message {
          font-size: 18px !important;
          margin-top: 20px !important;
          color: white !important;
        }
        .el-message-box__headerbtn {
          display: none !important;
        }
      `;
      document.head.appendChild(style);

      // 倒计时显示
      let countdown = 3;
      const countdownInterval = setInterval(() => {
        countdown--;
        const messageEl = document.querySelector(".full-screen-dialog-message");
        if (messageEl) {
          messageEl.textContent = `您的设备未获得授权，程序将在${countdown}秒后自动退出。`;
        }

        if (countdown <= 0) {
          clearInterval(countdownInterval);
        }
      }, 99000);

      // 3秒后退出应用
      setTimeout(async () => {
        try {
          await window.electronAPI.exitApp();
        } catch (exitError) {
          console.error("退出应用失败:", exitError);
          // 如果退出失败，尝试强制刷新页面
          window.location.href = "about:blank";
        }
      }, 99000);
    } else {
      // 授权成功，可以添加提示（可选）
      ElMessage.success("授权验证通过");
    }
  } catch (err) {
    console.error("检查授权失败：", err);

    // 关闭加载状态，显示错误
    isLoading.value = false;

    ElMessage.error("检查授权失败！");

    // 显示错误对话框
    ElMessageBox({
      title: "授权验证错误",
      message: "无法连接到授权服务器，程序将在3秒后退出。",
      type: "error",
      showClose: false,
      closeOnClickModal: false,
      closeOnPressEscape: false,
      closeOnHashChange: false,
      showCancelButton: false,
      showConfirmButton: false,
    });

    // 3秒后退出应用
    setTimeout(async () => {
      await window.electronAPI.exitApp();
    }, 99000);
  }
});
</script>

<style>
html,
body,
#app {
  margin: 0;
  padding: 0;
  width: 100vw;
  height: 100vh;
}

.el-main {
  padding: 0 !important;
  overflow: hidden;
}

.el-container {
  width: 100%;
  height: 100%;
  overflow: hidden; /* ✅ 避免内层 container 产生横向滚动 */
}

/* 全屏加载样式 */
.loading-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: #f5f7fa;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.loading-text {
  margin-top: 20px;
  font-size: 18px;
  color: #409eff;
  font-weight: 500;
}

/* 添加一个简单的脉动动画 */
@keyframes pulse {
  0% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.6;
  }
}

.loading-text {
  animation: pulse 1.5s infinite ease-in-out;
}
</style>
