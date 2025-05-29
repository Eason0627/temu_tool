// temu-api-client.js
/**
 * Temu开放平台API请求脚本
 * 包含签名生成、请求发送、错误处理等完整功能
 * 支持接口：bg.open.accesstoken.info.get 及其他需要签名的API
 */

const crypto = require("crypto-js");

// 配置参数（建议通过环境变量管理敏感信息）
const config = {
  apiHost: "https://openapi-b-global.temu.com",
  apiPath: "/openapi/router",
  appKey: "4ebbc9190ae410443d65b4c2faca981f", // 替换为实际app_key
  appSecret: "4782d2d827276688bf4758bed55dbdd4bbe79a79", // 替换为实际app_secret
  accessToken: "uplv3hfyt5kcwoymrgnajnbl1ow5qxlz4sqhev6hl3xosz5dejrtyl2jre7", // 通过OAuth流程获取的实际access_token
};

// 生成符合规范的签名
function generateSignature(params) {
  // 1. 参数按ASCII码升序排序
  const sortedKeys = Object.keys(params).sort();

  // 2. 构建待签名字符串
  const signString =
    sortedKeys
      .map((key) => `${key}=${encodeURIComponent(params[key])}`)
      .join("&") + config.appSecret;

  // 3. SHA256加密并转大写
  return crypto.SHA256(signString).toString(crypto.enc.Hex).toUpperCase();
}

// 获取当前UNIX时间戳（秒级）
function getCurrentTimestamp() {
  return Math.floor(Date.now() / 1000);
}

// 发起API请求
async function callTemuAPI(methodName) {
  try {
    // 1. 组装基础参数
    const baseParams = {
      method: methodName,
      type: methodName,
      app_key: config.appKey,
      timestamp: getCurrentTimestamp(),
      access_token: config.accessToken,
      data_type: "JSON",
    };

    // 2. 生成签名
    const signature = generateSignature({
      app_key: baseParams.app_key,
      timestamp: baseParams.timestamp,
    });

    // 3. 构建完整请求体
    const requestBody = {
      ...baseParams,
      sign: signature,
    };

    // 4. 发送请求
    const response = await fetch(`${config.apiHost}${config.apiPath}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Request-ID": generateRequestId(), // 可选的请求追踪ID
      },
      body: JSON.stringify(requestBody),
    });

    // 5. 处理响应
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();

    // 6. 签名验证（可选安全校验）
    if (!verifyResponseSignature(responseData)) {
      throw new Error("Response signature verification failed");
    }

    return responseData;
  } catch (error) {
    console.error("API请求失败:", error);
    // 可扩展重试逻辑
    throw error;
  }
}

// 生成唯一请求ID（用于日志追踪）
function generateRequestId() {
  return "temu-" + crypto.lib.WordArray.random(16).toString();
}

// 响应签名验证（可选）
function verifyResponseSignature(response) {
  // 此处实现响应签名验证逻辑（如果有）
  return true; // 示例默认返回true
}

// 使用示例
(async () => {
  try {
    const result = await callTemuAPI("bg.open.accesstoken.info.get");
    console.log("API调用成功:");
    console.log("授权API列表:", result.result?.apiScopeList);
    console.log("店铺ID:", result.result?.mallId);
    console.log("过期时间:", new Date(result.result?.expireTime * 1000));
  } catch (error) {
    console.error("执行失败:", error.message);
    process.exit(1);
  }
})();
