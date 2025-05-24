<template>
  <el-aside width="220px" style="background-color: #2d3a4b; min-height: 100vh">
    <div style="padding: 20px; color: #fff; font-weight: bold; font-size: 18px">
      🧩 Temu 工具箱
    </div>
    <el-menu
      :default-active="activeIndex"
      class="el-menu-vertical-demo"
      background-color="#2d3a4b"
      text-color="#fff"
      active-text-color="#ffd04b"
      router
    >
      <!-- <el-menu-item index="/comfyUi">
        <el-icon><Pointer /></el-icon>
        <span>AI作图</span>
      </el-menu-item> -->
      <el-menu-item index="/prepare">
        <el-icon><Upload /></el-icon>
        <span>上品准备</span>
      </el-menu-item>
      <el-menu-item index="/picture">
        <el-icon><Picture /></el-icon>
        <span>产品图片</span>
      </el-menu-item>
      <el-menu-item index="/property">
        <el-icon><Menu /></el-icon>
        <span>产品属性</span>
      </el-menu-item>
      <el-menu-item index="/category">
        <el-icon><Document /></el-icon>
        <span>产品分类</span>
      </el-menu-item>
      <el-menu-item index="/title">
        <el-icon><Edit /></el-icon>
        <span>产品标题</span>
      </el-menu-item>
      <el-menu-item index="/folders">
        <el-icon><Folder /></el-icon>
        <span>项目管理</span>
      </el-menu-item>
      <el-menu-item index="/changePicture">
        <el-icon><Picture /></el-icon>
        <span>图片修改</span>
      </el-menu-item>
      <el-menu-item index="/addMac">
        <el-icon><User /></el-icon>
        <span>用户管理</span>
      </el-menu-item>
    </el-menu>
  </el-aside>
</template>

<script setup>
import {
  Upload,
  Picture,
  Folder,
  Menu,
  Document,
  Edit,
  Pointer,
  User,
} from "@element-plus/icons-vue";
import { ref, computed, onMounted, watch } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();

// 计算当前激活的菜单项
const activeIndex = computed(() => {
  return route.path;
});
</script>

<style scoped>
/* 修复 Folder 图标大小写问题 */
.el-menu-item [class*="el-icon-"] {
  margin-right: 5px;
  width: 24px;
  text-align: center;
  font-size: 18px;
}

/* 确保菜单项高度一致 */
.el-menu-item {
  height: 56px;
  line-height: 56px;
}
</style>
