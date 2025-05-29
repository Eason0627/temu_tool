<template>
  <el-dialog
    v-model="visible"
    title="编辑属性"
    width="80%"
    :close-on-click-modal="false"
  >
    <el-scrollbar max-height="600px">
      <el-form
        :model="formData"
        :rules="rules"
        ref="attrFormRef"
        label-width="150px"
        style="padding: 30px"
      >
        <template v-for="attr in displayedAttrs" :key="attr.templatePid">
          <el-form-item
            :label="attr.name"
            :prop="String(attr.templatePid)"
            :required="attr.required"
          >
            <!-- 单选 -->
            <el-select
              v-if="attr.controlType === 1 && attr.chooseMaxNum === 1"
              v-model="formData[attr.templatePid]"
              placeholder="请选择"
              clearable
              filterable
              style="width: 300px"
              @change="
                (val) => {
                  console.log('选择变更:', attr.name, val);
                  // 找到选中选项的文本值
                  const selectedOption = Array.isArray(attr.values)
                    ? attr.values.find((opt) => opt.vid === val)
                    : null;

                  if (selectedOption) {
                    // 保存显示文本
                    formDataDisplay[attr.templatePid] = selectedOption.value;
                  }
                  updateDependentFields();
                }
              "
            >
              <el-option
                v-for="opt in attr.values"
                :key="opt.vid"
                :label="opt.value"
                :value="opt.vid"
              />
            </el-select>

            <div v-else-if="attr.controlType === 1 && attr.chooseMaxNum > 1">
              <el-checkbox
                v-for="opt in attr.values"
                :key="opt.vid"
                v-model="checkboxModels[attr.templatePid + '_' + opt.vid]"
                @change="
                  (val) => {
                    if (!Array.isArray(formData[attr.templatePid])) {
                      formData[attr.templatePid] = [];
                    }

                    if (val) {
                      // 添加选项
                      if (!formData[attr.templatePid].includes(opt.vid)) {
                        formData[attr.templatePid].push(opt.vid);
                      }
                    } else {
                      // 移除选项
                      formData[attr.templatePid] = formData[
                        attr.templatePid
                      ].filter((v) => v !== opt.vid);
                    }

                    console.log(
                      '选择变更:',
                      attr.name,
                      formData[attr.templatePid]
                    );
                    updateDependentFields();
                  }
                "
              >
                {{ opt.value }}
              </el-checkbox>
            </div>

            <!-- 数字输入 -->
            <el-input-number
              v-else-if="attr.propertyValueType === 1"
              v-model="formData[attr.templatePid]"
              :min="Number(attr.minValue || 0)"
              :max="Number(attr.maxValue || 999999)"
              :precision="fixPrecision(attr.valuePrecision)"
              controls-position="right"
              style="width: 300px"
            />

            <!-- 文本兜底 -->
            <el-input
              v-else
              v-model="formData[attr.templatePid]"
              placeholder="请输入"
              clearable
              style="width: 300px"
            />
          </el-form-item>
        </template>
      </el-form>
    </el-scrollbar>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="submit">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, reactive, computed, onMounted } from "vue";
import { ElMessage } from "element-plus";

const props = defineProps({
  visible: Boolean,
  attributeList: Array,
  attrMatch: Object,
});
const emit = defineEmits(["update:visible", "submit"]);

const visible = ref(props.visible);
watch(
  () => props.visible,
  (val) => (visible.value = val)
);
watch(visible, (val) => emit("update:visible", val));

const attrFormRef = ref(null); // 添加表单引用
const localAttributeList = ref([]);
const localAttrMatch = ref({});
const formData = reactive({});
const rules = reactive({});
const formDataDisplay = reactive({});

// 修改：在属性列表变化时生成验证规则
watch(
  () => props.attributeList,
  (list) => {
    // 清空旧规则
    Object.keys(rules).forEach((key) => delete rules[key]);

    // 为每个必填属性添加验证规则
    (list || []).forEach((attr) => {
      if (attr.required) {
        rules[attr.templatePid] = [
          {
            required: true,
            message: `${attr.name}为必填项`,
            trigger: "change",
            validator: (rule, value, callback) => {
              if (
                value === undefined ||
                value === null ||
                value === "" ||
                (Array.isArray(value) && value.length === 0)
              ) {
                callback(new Error(rule.message));
              } else {
                callback();
              }
            },
          },
        ];
      }
    });

    console.log("生成的验证规则:", rules);
  },
  { immediate: true }
);

function normalizeAttrList(attrList) {
  return attrList.map((attr) => {
    try {
      if (typeof attr.values === "string")
        attr.values = JSON.parse(attr.values);
    } catch {
      attr.values = [];
    }
    try {
      if (typeof attr.showCondition === "string") {
        attr.showCondition = JSON.parse(attr.showCondition);
      }
    } catch {
      attr.showCondition = null;
    }
    try {
      if (typeof attr.templatePropertyValueParent === "string") {
        attr.templatePropertyValueParent = JSON.parse(
          attr.templatePropertyValueParent
        );
      }
    } catch {
      attr.templatePropertyValueParent = null;
    }
    if (Array.isArray(attr.values)) {
      attr._rawValues = [...attr.values];
    }
    return attr;
  });
}

function fixPrecision(p) {
  const num = Number(p);
  return Number.isFinite(num) && num >= 0 && num <= 20 ? num : 0;
}

function isAttrVisible(attr) {
  const isShownByCondition =
    !attr.showCondition ||
    (Array.isArray(attr.showCondition) &&
      attr.showCondition.some((cond) => {
        const parentVal = formData[cond.parentRefPid];
        const selected = Array.isArray(parentVal) ? parentVal : [parentVal];
        return selected.some((v) => cond.parentVids.includes(v));
      }));

  const isShownByTemplateParent =
    !attr.templatePropertyValueParent ||
    (Array.isArray(attr.templatePropertyValueParent) &&
      attr.templatePropertyValueParent.some((cond) => {
        return cond.parentVidList?.some((vid) => {
          // 修改：确保空值不会导致错误
          const allValues = Object.values(formData).filter(
            (v) => v !== null && v !== undefined
          );
          const flatValues = allValues.flatMap((v) =>
            Array.isArray(v) ? v : [v]
          );
          return flatValues.includes(vid);
        });
      }));

  return isShownByCondition && isShownByTemplateParent;
}

const displayedAttrs = computed(() => {
  return localAttributeList.value
    .filter((attr) => isAttrVisible(attr))
    .sort((a, b) => Number(b.required) - Number(a.required));
});

// 添加到 script setup 部分
const checkboxModels = reactive({});

// 在 watch 函数中初始化 checkboxModels
watch(
  () => props.attributeList,
  (list) => {
    const parsed = normalizeAttrList(list || []).map((attr) => ({
      ...attr,
      pid: attr.pid,
      refPid: attr.refPid,
      templatePid: attr.templatePid,
    }));
    localAttributeList.value = parsed;

    // 清空旧数据
    Object.keys(formData).forEach((key) => {
      delete formData[key];
      delete formDataDisplay[key];
    });

    // 处理 attrMatch 数据（聚合成 templatePid -> [item, item, ...]）
    let attrMatchArray = [];
    if (typeof props.attrMatch === "string") {
      try {
        attrMatchArray = JSON.parse(props.attrMatch);
      } catch (e) {
        console.error("解析 attrMatch 失败:", e);
        attrMatchArray = [];
      }
    } else if (Array.isArray(props.attrMatch)) {
      attrMatchArray = props.attrMatch;
    } else if (props.attrMatch && typeof props.attrMatch === "object") {
      attrMatchArray = Object.keys(props.attrMatch).map((templatePid) => ({
        templatePid,
        vid: props.attrMatch[templatePid],
      }));
    }

    // 构建 templatePid -> 多个属性值
    const attrMatchObj = {};
    attrMatchArray.forEach((item) => {
      const templatePid = item.templatePid;
      if (!attrMatchObj[templatePid]) attrMatchObj[templatePid] = [];
      attrMatchObj[templatePid].push(item);
    });

    parsed.forEach((attr) => {
      const templatePid = attr.templatePid;
      const defaultAttrs = attrMatchObj[templatePid] || [];

      if (defaultAttrs.length) {
        if (attr.chooseMaxNum > 1) {
          // 多选情况
          formData[templatePid] = defaultAttrs.map((i) => Number(i.vid));
        } else {
          // 单选情况
          formData[templatePid] = Number(defaultAttrs[0].vid);
        }

        // 初始化显示文本
        if (Array.isArray(attr.values)) {
          if (attr.chooseMaxNum > 1) {
            const selectedTexts = formData[templatePid]
              .map((vid) => {
                const opt = attr.values.find(
                  (o) => Number(o.vid) === Number(vid)
                );
                return opt?.value || "";
              })
              .filter((v) => !!v);
            formDataDisplay[templatePid] = selectedTexts.join(", ");
          } else {
            const selected = attr.values.find(
              (o) => Number(o.vid) === Number(formData[templatePid])
            );
            formDataDisplay[templatePid] =
              selected?.value || defaultAttrs[0].propValue || "";
          }
        }
      }

      // 初始化 checkboxModels（仅多选字段用）
      if (attr.chooseMaxNum > 1 && Array.isArray(attr.values)) {
        attr.values.forEach((opt) => {
          const key = templatePid + "_" + opt.vid;
          checkboxModels[key] =
            Array.isArray(formData[templatePid]) &&
            formData[templatePid].includes(Number(opt.vid));
        });
      }
    });

    updateDependentFields();

    console.log("初始化后的表单数据:", formData);
    console.log("初始化后的显示数据:", formDataDisplay);
  },
  { immediate: true }
);

watch(
  () => props.attrMatch,
  (val) => (localAttrMatch.value = val)
);

function updateDependentFields() {
  // 添加日志以便调试
  // 记录当前选择的材质值
  const materialtemplatePid = localAttributeList.value.find(
    (attr) => attr.name === "材质"
  )?.templatePid;
  if (materialtemplatePid) {
    console.log("当前材质值:", formData[materialtemplatePid]);
  }

  localAttributeList.value = localAttributeList.value.map((attr) => {
    if (!Array.isArray(attr.templatePropertyValueParent)) return attr;

    const rawOptions = attr._rawValues || [];
    let validVids = new Set();

    attr.templatePropertyValueParent.forEach((condition) => {
      // 修改：确保空值不会导致错误
      const allValues = Object.values(formData).filter(
        (v) => v !== null && v !== undefined
      );
      const flatValues = allValues.flatMap((v) => (Array.isArray(v) ? v : [v]));

      const match = condition.parentVidList?.some((vid) =>
        flatValues.some((v) => String(v) === String(vid))
      );
      if (match && Array.isArray(condition.vidList)) {
        condition.vidList.forEach((v) => validVids.add(String(v)));
      }
    });

    if (validVids.size > 0) {
      attr.values = rawOptions.filter((v) => validVids.has(String(v.vid)));
    } else {
      attr.values = rawOptions;
    }

    return attr;
  });

  // 添加日志以便调试
  console.log("更新后的表单数据:", JSON.stringify(formData));
}

function handleMaxSelection(attr) {
  const selected = formData[attr.templatePid];

  // 确保 selected 是数组
  if (!Array.isArray(selected)) {
    formData[attr.templatePid] = [];
    return;
  }

  if (selected.length > attr.chooseMaxNum) {
    // 保留最新选择的项目
    const newSelected = selected.slice(-attr.chooseMaxNum);
    formData[attr.templatePid] = newSelected;
    ElMessage.warning(`最多可选择 ${attr.chooseMaxNum} 项`);
  }

  // 手动触发更新
  console.log("选择变更:", attr.name, formData[attr.templatePid]);
}

function submit() {
  // 首先验证表单
  if (!attrFormRef.value) {
    console.error("表单引用不存在");
    return;
  }

  attrFormRef.value.validate((valid) => {
    if (!valid) {
      ElMessage.warning("请填写所有必填项");
      return;
    }

    // 验证通过后，格式化数据
    const formattedData = [];

    localAttributeList.value.forEach((attr) => {
      const templatePid = attr.templatePid;
      const value = formData[templatePid];

      // 跳过未选择的属性
      if (value === undefined || value === null || value === "") return;

      if (attr.controlType === 1) {
        if (attr.chooseMaxNum > 1 && Array.isArray(value)) {
          // 多选情况，每个选中的值生成一个属性项
          value.forEach((vid) => {
            const opt = attr.values.find((o) => String(o.vid) === String(vid));
            if (opt) {
              formattedData.push({
                valueUnit: "",
                propValue: opt.value,
                propName: attr.name,
                vid: vid,
                pid: attr.pid,
                refPid: attr.refPid,
                templatePid: attr.templatePid,
                numberInputValue: "",
                valueExtendInfo: attr.valueExtendInfo || "",
              });
            }
          });
        } else {
          // 单选情况
          const selectedOption = attr.values.find(
            (o) => String(o.vid) === String(value)
          );
          if (selectedOption) {
            formattedData.push({
              valueUnit: "",
              propValue: selectedOption.value,
              propName: attr.name,
              vid: value,
              pid: attr.pid,
              refPid: attr.refPid,
              templatePid: attr.templatePid,
              numberInputValue: "",
              valueExtendInfo: attr.valueExtendInfo || "",
            });
          }
        }
      } else {
        // 其他类型的控件
        formattedData.push({
          valueUnit: "",
          propValue: formDataDisplay[templatePid] || value,
          propName: attr.name,
          vid: value,
          pid: attr.pid,
          refPid: attr.refPid,
          templatePid: attr.templatePid,
          numberInputValue: attr.propertyValueType === 1 ? String(value) : "",
          valueExtendInfo: attr.valueExtendInfo || "",
        });
      }
    });

    console.log("提交数据:", formattedData);
    emit("submit", formattedData);
    visible.value = false;
  });
}
</script>
