<script setup>
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useRouter } from "vue-router";
import axios from "axios";

const router = useRouter();

// 状态管理
const state = reactive({
  loading: true,
  isAuthenticated: !!sessionStorage.getItem("admin_key"),
  authLoading: false,
  authError: "",
  macAddresses: [],
  dialogs: {
    add: false,
    edit: false,
  },
  forms: {
    auth: { adminKey: "" },
    addMac: { macAddress: "" },
    editMac: { oldMac: "", newMac: "" },
  },
});

// API 客户端配置
const apiClient = axios.create({
  baseURL: "http://121.41.45.224:3100",
  headers: {
    Authorization: `Bearer ${sessionStorage.getItem("admin_key")}`,
  },
});

// 路由返回
const goBack = () => router.back();

// 管理员认证
const authenticateAdmin = async () => {
  try {
    state.authLoading = true;

    const { data } = await apiClient.post("/admin/validateKey", {
      adminKey: state.forms.auth.adminKey,
    });
    console.log("认证结果:", data);

    if (data.success) {
      sessionStorage.setItem("admin_key", state.forms.auth.adminKey);
      state.isAuthenticated = true;
      await fetchMacAddresses();
      ElMessage.success("认证成功");
    }
  } catch (error) {
    handleAuthError(error);
  } finally {
    state.authLoading = false;
  }
};

// 错误处理
const handleAuthError = (error) => {
  const response = error.response?.data;
  state.authError = response?.message || "认证失败，请检查网络连接";

  if (response?.code === "IP_BLOCKED") {
    ElMessage.error(`IP已被封禁: ${response.detail}`);
  }
};

// MAC地址操作
const fetchMacAddresses = async () => {
  try {
    const { data } = await apiClient.get("/admin/macs");
    state.macAddresses = data.data.map((mac) => ({
      macAddress: mac.value,
      status: mac.status,
    }));
  } catch (error) {
    handleDataError(error, "获取列表失败");
  }
};

const addMacAddress = async () => {
  try {
    const { data } = await apiClient.post("/admin/macs", {
      mac: state.forms.addMac.macAddress,
    });

    if (data.success) {
      state.dialogs.add = false;
      await fetchMacAddresses();
      ElMessage.success(`已添加: ${data.addedMac}`);
    }
  } catch (error) {
    handleDataError(error, "添加失败");
  }
};

const updateMacAddress = async () => {
  try {
    const { data } = await apiClient.put(
      `/admin/macs/${state.forms.editMac.oldMac}`,
      { newMac: state.forms.editMac.newMac }
    );

    if (data.success) {
      state.dialogs.edit = false;
      await fetchMacAddresses();
      ElMessage.success(`已更新: ${data.updated.old} → ${data.updated.new}`);
    }
  } catch (error) {
    handleDataError(error, "更新失败");
  }
};

const deleteMacAddress = async (mac) => {
  try {
    await ElMessageBox.confirm(`确认删除 ${mac}？此操作不可逆！`, "警告");

    const { data } = await apiClient.delete(`/admin/macs/${mac}`);
    if (data.success) {
      await fetchMacAddresses();
      ElMessage.success(`已删除: ${data.removedMac}`);
    }
  } catch (error) {
    if (error !== "cancel") handleDataError(error, "删除失败");
  }
};

// 通用错误处理
const handleDataError = (error, defaultMsg) => {
  const response = error.response?.data;
  ElMessage.error(response?.message || `${defaultMsg}: ${error.message}`);

  if (response?.code === "ADMIN_AUTH_FAILED") {
    sessionStorage.removeItem("admin_key");
    state.isAuthenticated = false;
  }
};

// 生命周期
onMounted(async () => {
  if (state.isAuthenticated) {
    try {
      await fetchMacAddresses();
    } catch {
      state.isAuthenticated = false;
    }
  }
  state.loading = false;
});
</script>

<template>
  <div class="mac-management">
    <!-- 加载状态 -->
    <el-skeleton v-if="state.loading" :rows="6" animated />

    <!-- 认证界面 -->
    <el-card v-else-if="!state.isAuthenticated" class="auth-card">
      <h2>管理员认证</h2>
      <el-alert v-if="state.authError" :title="state.authError" type="error" />

      <el-form @submit.prevent="authenticateAdmin">
        <el-form-item label="管理员密钥">
          <el-input
            v-model="state.forms.auth.adminKey"
            type="password"
            show-password
            placeholder="输入管理员密钥"
          />
        </el-form-item>

        <el-button
          type="primary"
          native-type="submit"
          :loading="state.authLoading"
        >
          验证身份
        </el-button>
      </el-form>
    </el-card>

    <!-- 管理界面 -->
    <div v-else>
      <div class="toolbar">
        <el-button type="primary" @click="state.dialogs.add = true">
          <i class="el-icon-plus" /> 新增地址
        </el-button>
        <el-button @click="goBack"> <i class="el-icon-back" /> 返回 </el-button>
      </div>

      <el-table :data="state.macAddresses" empty-text="暂无授权设备">
        <el-table-column prop="macAddress" label="MAC地址" />
        <el-table-column label="授权状态" prop="status">
          <template #default="{ row }">
            <el-tag :type="row.status === '已授权' ? 'success' : 'danger'">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button
              size="mini"
              @click="
                state.forms.editMac = {
                  oldMac: row.macAddress,
                  newMac: row.macAddress,
                };
                state.dialogs.edit = true;
              "
            >
              编辑
            </el-button>
            <el-button
              type="danger"
              size="mini"
              @click="deleteMacAddress(row.macAddress)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 新增对话框 -->
    <el-dialog title="新增MAC地址" v-model="state.dialogs.add">
      <el-form :model="state.forms.addMac">
        <el-form-item label="MAC地址" required>
          <el-input
            v-model="state.forms.addMac.macAddress"
            placeholder="格式: XX-XX-XX-XX-XX-XX"
            clearable
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="state.dialogs.add = false">取消</el-button>
        <el-button type="primary" @click="addMacAddress">确认添加</el-button>
      </template>
    </el-dialog>

    <!-- 编辑对话框 -->
    <el-dialog title="编辑MAC地址" v-model="state.dialogs.edit">
      <el-form :model="state.forms.editMac">
        <el-form-item label="原地址">
          <el-input v-model="state.forms.editMac.oldMac" disabled />
        </el-form-item>
        <el-form-item label="新地址" required>
          <el-input
            v-model="state.forms.editMac.newMac"
            placeholder="输入新MAC地址"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="state.dialogs.edit = false">取消</el-button>
        <el-button type="primary" @click="updateMacAddress">确认修改</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.mac-management {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.auth-card {
  width: 500px;
  margin: 40px auto;
  padding: 20px;
}

.toolbar {
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
}

.el-table {
  margin-top: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}
</style>
