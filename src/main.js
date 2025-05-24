import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./router";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";

// 检查electronAPI是否可用
console.log("检查electronAPI:", window.electronAPI ? "已加载" : "未加载");
if (window.electronAPI) {
  console.log("可用的electronAPI方法:", Object.keys(window.electronAPI));
} else {
  console.warn("electronAPI未检测到，Electron功能将不可用");
}

// 确保七牛云SDK可用
if (!window.qiniu) {
  console.warn("七牛云SDK未检测到，某些上传功能可能不可用");
}

const app = createApp(App);
app.use(router);
app.use(ElementPlus);
app.mount("#app");

