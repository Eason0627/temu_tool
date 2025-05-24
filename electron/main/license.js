const crypto = require("crypto");
const os = require("os");
const fs = require("fs");
const path = require("path");
const { app, dialog } = require("electron");
const fetch = require("node-fetch");

// Cloudflare Workers API 端点
const CLOUDFLARE_API = "http://121.41.45.224:3100/check";

// 密钥盐值 - 必须与生成许可证时使用的相同
const SECRET_SALT = "YOUR_SECRET_SALT_VALUE_CHANGE_THIS";

// 获取 MAC 地址
function getMacAddress() {
  try {
    const networkInterfaces = os.networkInterfaces();

    // 遍历所有网络接口
    for (const interfaceName in networkInterfaces) {
      const interfaces = networkInterfaces[interfaceName];

      // 查找非内部、非虚拟的物理网卡
      for (const iface of interfaces) {
        // 跳过内部接口、IPv6 和没有 MAC 地址的接口
        if (
          !iface.internal &&
          iface.mac !== "00:00:00:00:00:00" &&
          iface.family === "IPv4"
        ) {
          // 转换 MAC 地址格式：小写冒号分隔 -> 大写连字符分隔
          return formatMacAddress(iface.mac);
        }
      }
    }

    // 如果没有找到合适的 MAC 地址，返回第一个可用的
    for (const interfaceName in networkInterfaces) {
      const interfaces = networkInterfaces[interfaceName];
      for (const iface of interfaces) {
        if (iface.mac && iface.mac !== "00:00:00:00:00:00") {
          // 转换 MAC 地址格式
          return formatMacAddress(iface.mac);
        }
      }
    }

    return null;
  } catch (error) {
    console.error("获取 MAC 地址失败:", error);
    return null;
  }
}

// 将 MAC 地址从 "d8:5e:d3:a6:c5:e8" 格式转换为 "04-7C-16-D2-C7-D8" 格式
function formatMacAddress(mac) {
  if (!mac) return null;

  // 将冒号替换为连字符，并转换为大写
  return mac.replace(/:/g, "-").toUpperCase();
}

// 检查设备授权
async function checkDeviceAuthorization() {
  const macAddress = getMacAddress();

  if (!macAddress) {
    console.error("无法获取设备 MAC 地址，请检查网卡或权限！");
    dialog.showErrorBox(
      "授权错误",
      "无法获取设备 MAC 地址，请检查网卡或权限！"
    );
    return false;
  }

  try {
    // 打印用于调试的信息
    console.log(`正在验证设备MAC地址: ${macAddress}`);
    console.log(
      `请求URL: ${CLOUDFLARE_API}?mac=${encodeURIComponent(macAddress)}`
    );
    const response = await fetch(
      `${CLOUDFLARE_API}?mac=${encodeURIComponent(macAddress)}`
    );

    // 打印响应状态
    console.log(`响应状态: ${response.status}`);

    const authData = await response.json();

    // 打印响应数据
    console.log("授权响应:", authData);

    if (authData.authorized) {
      console.log(`设备 ${macAddress} 通过授权！`);
      return true;
    } else {
      console.error("设备未授权，请联系管理员！");
      dialog.showErrorBox("授权错误", "设备未授权，请联系管理员！");
      return false;
    }
  } catch (error) {
    console.error("授权检查失败:", error);
    dialog.showErrorBox("授权错误", `网络错误: ${error.message}`);
    return false;
  }
}

// 生成机器 ID
function getMachineId() {
  const cpus = os.cpus();
  const network = Object.values(os.networkInterfaces())
    .flat()
    .filter((item) => !item.internal && item.mac !== "00:00:00:00:00:00")
    .map((item) => item.mac)
    .join("");

  const id = cpus[0].model + network + os.hostname() + os.totalmem();
  return crypto.createHash("sha256").update(id).digest("hex");
}

// 验证许可证
function verifyLicense(licenseKey) {
  try {
    // 解码许可证
    const licenseJson = Buffer.from(licenseKey, "base64").toString("utf8");
    const license = JSON.parse(licenseJson);

    // 检查机器ID
    const currentMachineId = getMachineId();
    if (license.machineId !== currentMachineId) {
      console.log("许可证机器ID不匹配");
      return false;
    }

    // 检查过期日期
    if (license.expiry) {
      const expiryDate = new Date(license.expiry);
      if (expiryDate < new Date()) {
        console.log("许可证已过期");
        return false;
      }
    }

    // 验证签名
    const { signature, ...licenseData } = license;
    const dataString = JSON.stringify(licenseData);
    const expectedSignature = crypto
      .createHmac("sha256", SECRET_SALT)
      .update(dataString)
      .digest("hex");

    if (signature !== expectedSignature) {
      console.log("许可证签名无效");
      return false;
    }

    return true;
  } catch (error) {
    console.error("验证许可证时出错:", error);
    return false;
  }
}

// 保存许可证
function saveLicense(licenseKey) {
  try {
    const licensePath = path.join(app.getPath("userData"), "license.dat");

    // 加密许可证数据
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      "aes-256-cbc",
      crypto.scryptSync("YOUR_SECRET_PASSWORD", "salt", 32),
      iv
    );

    let encrypted = cipher.update(licenseKey, "utf8", "hex");
    encrypted += cipher.final("hex");

    // 保存加密的许可证和 IV
    fs.writeFileSync(
      licensePath,
      JSON.stringify({
        iv: iv.toString("hex"),
        data: encrypted,
      })
    );

    return true;
  } catch (error) {
    console.error("保存许可证时出错:", error);
    return false;
  }
}

// 加载许可证
function loadLicense() {
  try {
    const licensePath = path.join(app.getPath("userData"), "license.dat");
    if (!fs.existsSync(licensePath)) {
      return null;
    }

    const licenseData = JSON.parse(fs.readFileSync(licensePath, "utf8"));

    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      crypto.scryptSync("YOUR_SECRET_PASSWORD", "salt", 32),
      Buffer.from(licenseData.iv, "hex")
    );

    let decrypted = decipher.update(licenseData.data, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("加载许可证失败", error);
    return null;
  }
}

module.exports = {
  getMachineId,
  getMacAddress,
  verifyLicense,
  saveLicense,
  loadLicense,
  checkDeviceAuthorization,
};
