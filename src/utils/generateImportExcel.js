import * as XLSX from "xlsx";

// 提取规格名（如“红色”）自列名“预览图1[红色]”
function extractSpecsFromPreview(headers) {
  return headers
    .filter((h) => h.includes("[") && h.includes("]"))
    .map((h) => h.split("[")[1].split("]")[0]);
}

// 主函数
export function generateImportExcel({
  imageUrlData,
  fixedData,
  titlesData,
  categoryData,
  variantCount = 4,
  mode = "multiple",
  path,
  fileName,
}) {
  // 检查字符串是否已经被URL编码
  const isAlreadyEncoded = (str) => {
    // 检查是否包含百分号编码
    return /%[0-9A-F]{2}/i.test(str);
  };

  // 智能编码URL函数
  const encodeUrlSafely = (url) => {
    if (!url || typeof url !== "string") return "";

    try {
      // 分离协议和域名部分
      const urlParts = url.match(/^(https?:\/\/[^\/]+)(\/.*)?$/);
      if (urlParts) {
        const domain = urlParts[1]; // 协议和域名
        const path = urlParts[2] || ""; // 路径部分

        // 编码整个路径部分，确保所有特殊字符都被编码
        // 但要避免对已编码的部分再次编码
        if (isAlreadyEncoded(path)) {
          // 如果路径已包含编码，需要先解码再重新编码以确保一致性
          // 但这可能有风险，因为可能有些部分已编码有些未编码

          // 按路径分段处理
          const encodedPath = path
            .split("/")
            .map((segment) => {
              // 如果段为空，则不处理
              if (!segment) return "";

              try {
                // 尝试解码，如果成功则重新编码
                const decoded = decodeURIComponent(segment);
                return encodeURIComponent(decoded);
              } catch (e) {
                // 如果解码失败，说明可能不是有效的编码或包含特殊字符
                // 直接编码整个段，确保所有特殊字符都被编码
                return encodeURIComponent(segment);
              }
            })
            .join("/");

          return domain + encodedPath;
        } else {
          // 如果路径未编码，直接编码整个路径
          const segments = path.split("/");
          const encodedSegments = segments.map((segment) =>
            segment ? encodeURIComponent(segment) : ""
          );
          return domain + encodedSegments.join("/");
        }
      }

      // 如果无法分离协议和域名，尝试直接编码整个URL
      // 这种情况不太可能发生，但作为后备处理
      return encodeURI(url);
    } catch (error) {
      console.error("URL编码失败:", error, url);
      // 如果所有方法都失败，返回原始URL
      return url;
    }
  };

  // 处理图片URL函数
  const processImageUrl = (url) => {
    if (!url || typeof url !== "string") return "";

    // 处理多个URL（以换行符分隔的情况）
    if (url.includes("\n")) {
      return url
        .split("\n")
        .map((u) => encodeUrlSafely(u.trim()))
        .filter(Boolean)
        .join("\n");
    }

    return encodeUrlSafely(url.trim());
  };

  // 申报价格，长，宽，高，重量必须为数字类型
  fixedData.forEach((row) => {
    ["申报价格", "长", "宽", "高", "重量"].forEach((col) => {
      row[col] = Number(row[col]);
    });
  });

  const allPreviewHeaders = imageUrlData.reduce((acc, row) => {
    Object.keys(row).forEach((key) => acc.add(key));
    return acc;
  }, new Set());
  const specs = extractSpecsFromPreview([...allPreviewHeaders]).slice(
    0,
    variantCount
  );
  const defaultRow = fixedData[0];

  const finalRows = [];
  const specDataMap = {};
  fixedData.forEach((row) => {
    const spec = (row["规格名"] || "").trim();
    if (spec) specDataMap[spec] = row;
  });

  const categoryLetters = Array.from(
    { length: categoryData.length },
    (_, i) => {
      let s = "",
        n = i;
      while (n >= 0) {
        s = String.fromCharCode((n % 26) + 65) + s;
        n = Math.floor(n / 26) - 1;
      }
      return s;
    }
  );

  // 处理规格数据
  if (mode === "multiple") {
    categoryData.forEach((cat, catIdx) => {
      const categoryLetter = categoryLetters[catIdx];
      const matchingTitles = titlesData.filter((t) => t.分类id == cat.分类id);
      // 异常处理：当分类下无对应标题时
      if (matchingTitles.length === 0) {
        console.warn(`分类ID ${cat.分类id} 下未找到匹配的产品标题`);
        return;
      }
      imageUrlData.forEach((imgRow, imageIdx) => {
        // 确保标题索引在类目内循环
        const titleIndex = imageIdx % matchingTitles.length;
        const productTitle = matchingTitles[titleIndex]?.["产品标题"] || "";

        specs.forEach((spec) => {
          // 精确匹配规格列
          const previewCol =
            Object.keys(imgRow).find((k) => k.includes(`[${spec}]`)) || "";

          const specData = specDataMap[spec] || defaultRow;

          const row = {
            ...specData,
            产品标题: productTitle,
            分类id: cat["分类id"],
            产品属性: cat["产品属性"],
            变种属性值一: `${categoryLetter}-${imageIdx + 1}-${spec}`,
            轮播图: processImageUrl(imgRow["轮播图"]) || "",
            预览图: processImageUrl(imgRow[previewCol]) || "",
            产品素材图:
              processImageUrl(imgRow["产品素材图"]) ||
              processImageUrl(imgRow["轮播图"]?.split("\n")[0]) ||
              "",
            外包装图片:
              processImageUrl(imgRow["外包装图片"]) ||
              processImageUrl(imgRow["轮播图"]?.split("\n")[0]) ||
              "",
            产品描述: imgRow["产品描述"] || "",
          };
          finalRows.push(row);
        });
      });
    });
  } else if (mode === "single") {
    const minLen = Math.min(imageUrlData.length, titlesData.length);
    let categoryIndex = 0;

    for (let idx = 0; idx < minLen; idx++) {
      const imgRow = imageUrlData[idx];
      const productTitle = titlesData[idx]["产品标题"];
      const cat = categoryData[categoryIndex];
      const categoryLetter = categoryLetters[categoryIndex];
      categoryIndex = (categoryIndex + 1) % categoryData.length;

      specs.forEach((spec) => {
        const previewCol =
          Object.keys(imgRow).find((k) => k.includes(`[${spec}]`)) || "";
        const specData = specDataMap[spec] || defaultRow;

        const row = {
          ...specData,
          产品标题: productTitle,
          分类id: cat["分类id"],
          产品属性: cat["产品属性"],
          变种属性值一: `${categoryLetter}-${idx + 1}-${spec}`,
          轮播图: processImageUrl(imgRow["轮播图"]) || "",
          预览图: processImageUrl(imgRow[previewCol]) || "",
          产品素材图:
            processImageUrl(imgRow["产品素材图"]) ||
            processImageUrl(imgRow["轮播图"]?.split("\n")[0]) ||
            "",
          外包装图片:
            processImageUrl(imgRow["外包装图片"]) ||
            processImageUrl(imgRow["轮播图"]?.split("\n")[0]) ||
            "",
          产品描述: imgRow["产品描述"] || "",
        };

        finalRows.push(row);
      });
    }
  } else {
    throw new Error(`Unsupported mode: ${mode}`);
  }

  // 统一列格式
  const standardColumns = [
    "产品标题",
    "英文标题",
    "产品描述",
    "产品货号",
    "变种属性名称一",
    "变种属性值一",
    "变种属性名称二",
    "变种属性值二",
    "预览图",
    "申报价格",
    "SKU货号",
    "长",
    "宽",
    "高",
    "重量",
    "识别码类型",
    "识别码",
    "站外产品链接",
    "轮播图",
    "产品素材图",
    "外包装形状",
    "外包装类型",
    "外包装图片",
    "建议零售价(建议零售价币种)",
    "分类id",
    "产品属性",
    "SKC属性",
    "SKU属性",
    "产地",
    "SKU分类",
    "SKU分类数量",
    "SKU分类单位",
    "视频Url",
  ];

  const result = finalRows.map((row) => {
    const newRow = {};
    standardColumns.forEach((col) => {
      newRow[col] = row[col] || "";
    });
    return newRow;
  });

  const worksheet = XLSX.utils.json_to_sheet(result);
  const workbook = XLSX.utils.book_new();
  workbook.Props = {
    Title: fileName || "导入数据",
    Subject: "Import Data",
    Author: "System Generated",
    CreatedDate: new Date(),
  };
  XLSX.utils.book_append_sheet(workbook, worksheet, fileName || "导入数据");
  // 写入为Blob（二进制数据）
  const blob = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
    cellStyles: false,
    compression: false,
  });
  const fileBuffer = new Blob([blob], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;",
  });

  const fileReader = new FileReader();
  fileReader.onload = async function () {
    const arrayBuffer = this.result;

    try {
      const filePath = await window.electronAPI.saveFile(
        arrayBuffer,
        "导入数据.xlsx",
        path
      );
    } catch (err) {
      console.error("保存失败:", err);
      ElMessage.error("导出失败：" + (err.message || "未知错误"));
    }
  };

  fileReader.readAsArrayBuffer(fileBuffer);
}
