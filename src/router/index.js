// src/router/index.ts 或 index.js
import { createRouter, createWebHashHistory } from "vue-router";

import FolderPage from "../views/FolderPage.vue";
import LogPage from "../views/LogPage.vue";
import PreparePage from "../views/PreparePage.vue";
import PicturePage from "../views/PicturePage.vue";
import PropertyPage from "../views/PropertyPagePage.vue";
import CategoryPage from "../views/CategoryPage.vue";
import TitlePage from "../views/TitlePage.vue";
import ComfyUiPage from "../views/ComfyUiPage.vue";
import TemuPage from "../views/TemuPage.vue";
import ChangePicturePage from "../views/ChangePicturePage.vue";
import AddMacPage from "../views/AddMacPage.vue";

const routes = [
  { path: "/", redirect: "/prepare" },
  { path: "/prepare", name: "prepare", component: PreparePage },
  { path: "/picture", name: "picture", component: PicturePage },
  { path: "/folders", name: "folders", component: FolderPage },
  { path: "/property", name: "property", component: PropertyPage },
  { path: "/category", name: "category", component: CategoryPage },
  { path: "/title", name: "title", component: TitlePage },
  { path: "/comfyUi", name: "comfyUi", component: ComfyUiPage },
  { path: "/temu", name: "temu", component: TemuPage },
  {
    path: "/changePicture",
    name: "changePicture",
    component: ChangePicturePage,
  },
  { path: "/addMac", name: "addMac", component: AddMacPage },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

